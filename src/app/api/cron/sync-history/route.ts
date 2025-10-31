import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Get sync history for Bork and Eitje cron jobs
 * Returns last N sync attempts with success/failure status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const provider = searchParams.get('provider'); // 'bork', 'eitje', or null for both

    const supabase = await createClient();

    // Query BOTH tables: api_sync_logs (unified) AND bork_api_sync_logs (legacy)
    // Bork writes to bork_api_sync_logs, Eitje writes to api_sync_logs
    
    const allLogs: any[] = [];
    
    // 1. Query unified api_sync_logs (for Eitje and newer Bork syncs)
    try {
      const baseColumns = ['id', 'location_id', 'sync_type', 'status', 'started_at', 'completed_at'];
      const optionalColumns: string[] = [];
      
      // Test which optional columns exist
      const columnsToTest = [
        'error_message',
        'records_inserted',
        'records_fetched',
        'provider',
        'metadata'
      ];
      
      for (const col of columnsToTest) {
        try {
          const testResult = await supabase
            .from('api_sync_logs')
            .select(col)
            .limit(1);
          
          if (!testResult.error) {
            optionalColumns.push(col);
          }
        } catch (e) {
          // Column doesn't exist, skip
        }
      }
      
      // Build select query
      const allColumns = [...baseColumns, ...optionalColumns];
      let selectFields = allColumns.join(', ');
      
      if (baseColumns.includes('location_id')) {
        selectFields += ', locations:location_id (name)';
      }
      
      let query = supabase.from('api_sync_logs').select(selectFields);
      
      // Apply provider filter if provider column exists
      if (optionalColumns.includes('provider')) {
        if (provider) {
          query = query.eq('provider', provider);
        } else {
          query = query.in('provider', ['bork', 'eitje']);
        }
      }
      
      const { data: unifiedLogs, error: unifiedError } = await query
        .order('started_at', { ascending: false })
        .limit(limit * 2);
      
      if (!unifiedError && unifiedLogs) {
        // Mark these as from unified table
        unifiedLogs.forEach((log: any) => {
          log._source = 'api_sync_logs';
          allLogs.push(log);
        });
      }
    } catch (e) {
      console.log('[API /cron/sync-history] Error querying api_sync_logs:', e);
    }
    
    // 2. Query legacy bork_api_sync_logs (for older Bork syncs)
    if (!provider || provider === 'bork') {
      try {
        const { data: borkLogs, error: borkError } = await supabase
          .from('bork_api_sync_logs')
          .select('id, location_id, sync_type, status, started_at, completed_at, records_inserted, records_fetched, error_message, metadata, locations:location_id (name)')
          .order('started_at', { ascending: false })
          .limit(limit * 2);
        
        if (!borkError && borkLogs) {
          // Mark these as from legacy table and add provider
          borkLogs.forEach((log: any) => {
            log._source = 'bork_api_sync_logs';
            log.provider = 'bork'; // Explicitly set provider
            allLogs.push(log);
          });
        }
      } catch (e) {
        console.log('[API /cron/sync-history] Error querying bork_api_sync_logs:', e);
      }
    }
    
    // Filter to show recent automated syncs (last 24 hours for hourly cron jobs)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filteredLogs = allLogs
      .filter(log => {
        if (!log.started_at) return false;
        const logDate = new Date(log.started_at);
        return logDate >= oneDayAgo;
      })
      .sort((a, b) => {
        // Sort by started_at descending
        const dateA = new Date(a.started_at).getTime();
        const dateB = new Date(b.started_at).getTime();
        return dateB - dateA;
      })
      .slice(0, limit); // Limit to requested number

    // Get cron job status from config tables (infer from mode)
    let cronStatus = { bork: false, eitje: false };
    try {
      // Use .limit(1) instead of .single() to avoid errors if no rows exist
      const { data: borkConfigs } = await supabase
        .from('bork_sync_config')
        .select('mode')
        .limit(1);
      
      const { data: eitjeConfigs } = await supabase
        .from('eitje_sync_config')
        .select('mode')
        .limit(1);

      const borkConfig = borkConfigs && borkConfigs.length > 0 ? borkConfigs[0] : null;
      const eitjeConfig = eitjeConfigs && eitjeConfigs.length > 0 ? eitjeConfigs[0] : null;

      cronStatus = {
        bork: borkConfig?.mode === 'active',
        eitje: eitjeConfig?.mode === 'incremental'
      };
    } catch (e) {
      console.log('[API /cron/sync-history] Could not determine cron job status:', e);
    }

    // Format results
    const history = filteredLogs.map((log: any) => {
      // Infer provider from metadata or sync_type if provider column doesn't exist
      let inferredProvider: 'bork' | 'eitje' | 'unknown' = 'unknown';
      if (log.provider) {
        inferredProvider = log.provider;
      } else if (log.sync_type) {
        // Try to infer from sync_type
        const syncType = String(log.sync_type).toLowerCase();
        if (syncType.includes('bork')) {
          inferredProvider = 'bork';
        } else if (syncType.includes('eitje')) {
          inferredProvider = 'eitje';
        }
      } else if (log.metadata?.provider) {
        inferredProvider = log.metadata.provider;
      }
      
      // Safely extract records_inserted from various possible locations
      let recordsInserted = 0;
      if (log.records_inserted !== undefined) {
        recordsInserted = log.records_inserted;
      } else if (log.metadata && typeof log.metadata === 'object') {
        recordsInserted = (log.metadata as any)?.records_inserted ?? 
                          (log.metadata as any)?.recordsInserted ?? 
                          (log.metadata as any)?.records_inserted ?? 0;
      }
      
      return {
        id: log.id,
        provider: inferredProvider,
        location: log.locations?.name || log.location_id,
        locationId: log.location_id,
        syncType: log.sync_type,
        status: log.status,
        success: log.status === 'completed',
        recordsInserted: recordsInserted,
        errorMessage: log.error_message || null,
        startedAt: log.started_at,
        completedAt: log.completed_at || null,
        duration: log.completed_at && log.started_at
          ? new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()
          : null,
        metadata: log.metadata || null
      };
    });

    // cronStatus is already set above

    return NextResponse.json({
      success: true,
      data: {
        history,
        cronStatus,
        total: history.length
      }
    });

  } catch (error) {
    console.error('[API /cron/sync-history] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

