import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper: Get sync state for an endpoint
 */
async function getSyncState(supabaseClient: any, endpoint: string) {
  const { data, error } = await supabaseClient
    .from('eitje_sync_state')
    .select('*')
    .eq('endpoint', endpoint)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.warn(`[eitje-incremental-sync] Error fetching sync state for ${endpoint}:`, error);
  }
  
  return data || null;
}

/**
 * Helper: Calculate date range to sync based on last sync state
 * Returns { startDate, endDate, isIncremental }
 */
function calculateSyncRange(syncState: any): { startDate: string; endDate: string; isIncremental: boolean } {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // First run: no sync state exists, sync yesterday only
  if (!syncState || !syncState.last_synced_date) {
    return {
      startDate: yesterdayStr,
      endDate: yesterdayStr,
      isIncremental: false
    };
  }
  
  // Incremental: start from day after last synced date
  const lastSynced = new Date(syncState.last_synced_date);
  const nextDay = new Date(lastSynced);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  
  // If next day is after yesterday, nothing to sync
  if (nextDayStr > yesterdayStr) {
    return {
      startDate: yesterdayStr,
      endDate: yesterdayStr,
      isIncremental: true
    };
  }
  
  // Sync from next day to yesterday (handles multiple missed days)
  return {
    startDate: nextDayStr,
    endDate: yesterdayStr,
    isIncremental: true
  };
}

/**
 * Helper: Generate array of dates between start and end (inclusive)
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

/**
 * Helper: Update sync state after successful sync
 */
async function updateSyncState(
  supabaseClient: any,
  endpoint: string,
  syncedDate: string,
  recordsInserted: number,
  errorMessage: string | null = null
) {
  const now = new Date().toISOString();
  
  const { error } = await supabaseClient
    .from('eitje_sync_state')
    .upsert({
      endpoint,
      last_successful_sync_at: now,
      last_synced_date: syncedDate,
      records_synced: recordsInserted,
      last_error: errorMessage,
      updated_at: now
    }, {
      onConflict: 'endpoint'
    });
  
  if (error) {
    console.error(`[eitje-incremental-sync] Failed to update sync state for ${endpoint}:`, error);
    throw error;
  }
  
  console.log(`[eitje-incremental-sync] Updated sync state for ${endpoint}: last_synced_date=${syncedDate}, records=${recordsInserted}`);
}

/**
 * Helper: Sync a single day for an endpoint
 */
async function syncEndpointForDate(
  supabaseClient: any,
  endpoint: string,
  dateStr: string,
  baseUrl: string,
  eitjeHeaders: Record<string, string>
): Promise<{ success: boolean; recordsInserted: number; error?: string }> {
  console.log(`[eitje-incremental-sync] Syncing ${endpoint} for date: ${dateStr}`);

  let apiUrl = '';

  // Build API URL with query parameters (GET requests should not have body)
  switch (endpoint) {
    case 'time_registration_shifts':
    case 'planning_shifts':
    case 'revenue_days': {
      const params = new URLSearchParams({
        'filters[start_date]': dateStr,
        'filters[end_date]': dateStr,
        'filters[date_filter_type]': 'resource_date'
      });
      apiUrl = `${baseUrl}/${endpoint}?${params.toString()}`;
      break;
    }
    default:
      return {
        success: false,
        recordsInserted: 0,
        error: `Unsupported endpoint: ${endpoint}`
      };
  }

  // Call Eitje API with GET request (no body)
  const apiResponse = await fetch(apiUrl, {
    method: 'GET',
    headers: eitjeHeaders
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    const errorMsg = `Eitje API error: ${apiResponse.status} - ${errorText}`;
    return { success: false, recordsInserted: 0, error: errorMsg };
  }

  const apiData = await apiResponse.json();
  const items = apiData.items || apiData || [];
  const recordsCount = Array.isArray(items) ? items.length : 0;

  console.log(`[eitje-incremental-sync] Fetched ${recordsCount} records from Eitje API for ${endpoint} on ${dateStr}`);

  // Store data to database
  let insertedCount = 0;
  if (recordsCount > 0 && Array.isArray(items)) {
    const tableMap: Record<string, string> = {
      'time_registration_shifts': 'eitje_time_registration_shifts_raw',
      'planning_shifts': 'eitje_planning_shifts_raw',
      'revenue_days': 'eitje_revenue_days_raw'
    };

    const targetTable = tableMap[endpoint];
    if (!targetTable) {
      return {
        success: false,
        recordsInserted: 0,
        error: `No table mapping found for endpoint: ${endpoint}`
      };
    }

    // Insert data in batches
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const recordsToInsert = batch.map((item: any) => ({
        ...item,
        raw_data: item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: insertedData, error: insertError } = await supabaseClient
        .from(targetTable)
        .upsert(recordsToInsert, { onConflict: 'id', ignoreDuplicates: false })
        .select();

      if (insertError) {
        console.error(`[eitje-incremental-sync] Batch insert error for ${endpoint}:`, insertError);
        return {
          success: false,
          recordsInserted: insertedCount,
          error: insertError.message
        };
      }

      insertedCount += insertedData?.length || 0;
    }
  }

  console.log(`[eitje-incremental-sync] ${endpoint} for ${dateStr}: ${insertedCount} records inserted`);
  return { success: true, recordsInserted: insertedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const syncStartTime = new Date().toISOString();
  let syncLogId: string | null = null;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[eitje-incremental-sync] Starting incremental sync');

    // Create sync log entry
    const syncLogPayload: any = {
      sync_type: 'eitje-incremental-sync',
      status: 'pending',
      started_at: syncStartTime
    };

    const { data: syncLogData, error: syncLogError } = await supabaseClient
      .from('api_sync_logs')
      .insert(syncLogPayload)
      .select()
      .single();

    if (syncLogError) {
      console.warn('[eitje-incremental-sync] Failed to create sync log:', syncLogError);
      // Continue anyway - don't fail if logging fails
    } else {
      syncLogId = syncLogData?.id || null;
      console.log('[eitje-incremental-sync] Created sync log:', syncLogId);
    }

    // Fetch sync configuration
    const { data: config, error: configError } = await supabaseClient
      .from('eitje_sync_config')
      .select('*')
      .maybeSingle();

    if (configError) {
      console.error('[eitje-incremental-sync] Error fetching config:', configError);
      throw new Error(`Failed to fetch sync configuration: ${configError.message}`);
    }

    if (!config) {
      // Create default config
      const defaultConfig = {
        mode: 'manual',
        incremental_interval_minutes: 60,
        enabled_endpoints: ['time_registration_shifts', 'planning_shifts', 'revenue_days']
      };
      
      const { error: insertError } = await supabaseClient
        .from('eitje_sync_config')
        .insert(defaultConfig);
      
      if (insertError) {
        console.error('[eitje-incremental-sync] Failed to create default config:', insertError);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Default config created',
        mode: 'manual'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if sync is enabled
    if (config.mode !== 'incremental') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Sync is in manual mode',
        mode: config.mode
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get enabled endpoints from config
    const endpoints = Array.isArray(config.enabled_endpoints) 
      ? config.enabled_endpoints 
      : ['time_registration_shifts', 'revenue_days'];

    // Get credentials
    const { data: credentialsList } = await supabaseClient
      .from('api_credentials')
      .select('*')
      .eq('provider', 'eitje')
      .eq('is_active', true)
      .limit(1);

    if (!credentialsList || credentialsList.length === 0) {
      throw new Error('No active Eitje credentials found');
    }

    const credentials = credentialsList[0];
    const credConfig = credentials.additional_config as any || {};
    const baseUrl = credentials.base_url || 'https://open-api.eitje.app/open_api';

    // Extract credentials from additional_config
    const partnerUsername = credConfig.partner_username;
    const partnerPassword = credConfig.partner_password;
    const apiUsername = credConfig.api_username;
    const apiPassword = credConfig.api_password;

    if (!partnerUsername || !partnerPassword || !apiUsername || !apiPassword) {
      throw new Error('Missing required Eitje credentials in additional_config');
    }

    // Create headers (same as working manual sync)
    const eitjeHeaders = {
      'Partner-Username': partnerUsername,
      'Partner-Password': partnerPassword,
      'Api-Username': apiUsername,
      'Api-Password': apiPassword,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    let totalRecordsInserted = 0;
    const endpointResults: any[] = [];

    // Sync each endpoint with incremental logic
    for (const endpoint of endpoints) {
      try {
        // Get sync state for this endpoint
        const syncState = await getSyncState(supabaseClient, endpoint);
        
        // Calculate date range to sync
        const { startDate, endDate, isIncremental } = calculateSyncRange(syncState);
        
        console.log(`[eitje-incremental-sync] ${endpoint}: sync range ${startDate} to ${endDate} (incremental: ${isIncremental})`);
        
        // If start > end, nothing to sync (already up to date)
        if (startDate > endDate) {
          console.log(`[eitje-incremental-sync] ${endpoint}: already up to date, skipping`);
          endpointResults.push({
            endpoint,
            success: true,
            records: 0,
            message: 'Already up to date',
            dateRange: { startDate, endDate }
          });
          continue;
        }

        // Generate list of dates to sync
        const datesToSync = generateDateRange(startDate, endDate);
        console.log(`[eitje-incremental-sync] ${endpoint}: syncing ${datesToSync.length} day(s)`);

        let endpointTotalRecords = 0;
        let lastSuccessfulDate: string | null = null;
        let hasErrors = false;

        // Sync each date sequentially
        for (const dateStr of datesToSync) {
          const syncResult = await syncEndpointForDate(
            supabaseClient,
            endpoint,
            dateStr,
            baseUrl,
            eitjeHeaders
          );

          if (syncResult.success) {
            // Update sync state after each successful day
            await updateSyncState(
              supabaseClient,
              endpoint,
              dateStr,
              syncResult.recordsInserted,
              null
            );
            endpointTotalRecords += syncResult.recordsInserted;
            lastSuccessfulDate = dateStr;
          } else {
            // Record error but continue with next day
            hasErrors = true;
            console.error(`[eitje-incremental-sync] Failed to sync ${endpoint} for ${dateStr}:`, syncResult.error);
            
            // Update sync state with error
            if (lastSuccessfulDate) {
              await updateSyncState(
                supabaseClient,
                endpoint,
                lastSuccessfulDate,
                endpointTotalRecords,
                syncResult.error || 'Unknown error'
              );
            }
            break; // Stop syncing if a day fails (next cron will retry)
          }
        }

        totalRecordsInserted += endpointTotalRecords;
        
        endpointResults.push({
          endpoint,
          success: !hasErrors,
          records: endpointTotalRecords,
          dateRange: { startDate, endDate },
          daysSynced: datesToSync.length,
          lastSyncedDate: lastSuccessfulDate,
          error: hasErrors ? 'Some dates failed to sync' : undefined
        });

        // Trigger processing and aggregation for successfully synced date range
        if (lastSuccessfulDate && !hasErrors) {
          try {
            // Step 1: Trigger processing (unpack JSONB → processed tables)
            console.log(`[eitje-incremental-sync] Triggering processing for ${endpoint} (${startDate} to ${lastSuccessfulDate})...`);
            const processResult = await supabaseClient.functions.invoke('eitje-process-data', {
              body: {
                endpoint,
                startDate,
                endDate: lastSuccessfulDate
              }
            });

            if (processResult.error) {
              console.warn(`[eitje-incremental-sync] Processing error for ${endpoint}:`, processResult.error);
            } else {
              console.log(`[eitje-incremental-sync] Processing completed for ${endpoint}`);
            }

            // Step 2: Trigger aggregation (processed → aggregated tables)
            console.log(`[eitje-incremental-sync] Triggering aggregation for ${endpoint} (${startDate} to ${lastSuccessfulDate})...`);
            const aggResult = await supabaseClient.functions.invoke('eitje-aggregate-data', {
              body: {
                endpoint,
                startDate,
                endDate: lastSuccessfulDate
              }
            });

            if (aggResult.error) {
              console.warn(`[eitje-incremental-sync] Aggregation error for ${endpoint}:`, aggResult.error);
            } else {
              console.log(`[eitje-incremental-sync] Aggregation completed for ${endpoint}`);
            }
          } catch (processError: any) {
            console.warn(`[eitje-incremental-sync] Processing/aggregation failed for ${endpoint}:`, processError?.message || processError);
            // Don't fail the sync if processing/aggregation fails
          }
        }

      } catch (endpointError) {
        console.error(`[eitje-incremental-sync] Error syncing ${endpoint}:`, endpointError);
        
        // Update sync state with error
        const syncState = await getSyncState(supabaseClient, endpoint);
        if (syncState) {
          await updateSyncState(
            supabaseClient,
            endpoint,
            syncState.last_synced_date,
            syncState.records_synced || 0,
            endpointError instanceof Error ? endpointError.message : 'Unknown error'
          );
        }
        
        endpointResults.push({
          endpoint,
          success: false,
          error: endpointError instanceof Error ? endpointError.message : 'Unknown error'
        });
      }
    }

    const syncEndTime = new Date().toISOString();

    // Update sync log on success
    if (syncLogId) {
      const updatePayload: any = {
        status: 'completed',
        completed_at: syncEndTime
      };

      // Try to add records_inserted if column exists
      try {
        const { error: updateError } = await supabaseClient
          .from('api_sync_logs')
          .update({
            ...updatePayload,
            records_inserted: totalRecordsInserted
          })
          .eq('id', syncLogId);

        if (updateError) {
          // Try without records_inserted if column doesn't exist
          await supabaseClient
            .from('api_sync_logs')
            .update(updatePayload)
            .eq('id', syncLogId);
        }
      } catch (e) {
        console.warn('[eitje-incremental-sync] Failed to update sync log:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_records: totalRecordsInserted,
        endpoint_results: endpointResults,
        message: 'Incremental sync completed',
        timestamp: syncEndTime,
        sync_log_id: syncLogId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const syncEndTime = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[eitje-incremental-sync] Error:', error);

    // Update sync log on error
    if (syncLogId) {
      try {
        const updatePayload: any = {
          status: 'failed',
          completed_at: syncEndTime
        };

        // Try to add error_message if column exists
        try {
          await supabaseClient
            .from('api_sync_logs')
            .update({
              ...updatePayload,
              error_message: errorMessage.substring(0, 500) // Limit length
            })
            .eq('id', syncLogId);
        } catch (e) {
          // Try without error_message if column doesn't exist
          await supabaseClient
            .from('api_sync_logs')
            .update(updatePayload)
            .eq('id', syncLogId);
        }
      } catch (logError) {
        console.warn('[eitje-incremental-sync] Failed to update sync log on error:', logError);
      // Continue anyway
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
