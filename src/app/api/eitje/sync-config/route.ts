import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Eitje Sync Configuration API
 * Get and update eitje_sync_config settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: config, error } = await supabase
      .from('eitje_sync_config')
      .select('*')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: config || null
    });

  } catch (error) {
    console.error('[API /eitje/sync-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, incremental_interval_minutes, worker_interval_minutes, enabled_endpoints } = body;

    const supabase = await createClient();

    // Upsert config (update or insert)
    const { data: existing, error: checkError } = await supabase
      .from('eitje_sync_config')
      .select('id')
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // Build config data - all columns should exist now
    const configData: any = {
      mode: mode || 'manual',
      incremental_interval_minutes: incremental_interval_minutes || 60,
      worker_interval_minutes: worker_interval_minutes || 5,
      enabled_endpoints: enabled_endpoints || ['time_registration_shifts', 'planning_shifts', 'revenue_days']
    };
    
    console.log('[API /eitje/sync-config] Saving config:', { 
      existing: !!existing, 
      mode: configData.mode,
      hasEndpoints: !!configData.enabled_endpoints,
      columns: Object.keys(configData)
    });

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('eitje_sync_config')
        .update({
          ...configData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*, created_at, updated_at')
        .single();

      if (error) {
        console.error('[API /eitje/sync-config] Update error:', error);
        console.error('[API /eitje/sync-config] Update error details:', JSON.stringify(error, null, 2));
        throw new Error(`Update failed: ${error.message || error.code || 'Unknown error'}. Code: ${error.code || 'N/A'}`);
      }
      result = data;
      console.log('[API /eitje/sync-config] Config updated successfully:', result.id);
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('eitje_sync_config')
        .insert(configData)
        .select('*, created_at, updated_at')
        .single();

      if (error) {
        console.error('[API /eitje/sync-config] Insert error:', error);
        console.error('[API /eitje/sync-config] Insert error details:', JSON.stringify(error, null, 2));
        throw new Error(`Insert failed: ${error.message || error.code || 'Unknown error'}. Code: ${error.code || 'N/A'}`);
      }
      result = data;
      console.log('[API /eitje/sync-config] Config created successfully:', result.id);
    }

    // Toggle cron jobs based on mode
    if (mode === 'incremental') {
      const { error: cronError } = await supabase.rpc('toggle_eitje_cron_jobs', { enabled: true });
      if (cronError) {
        console.warn('[API /eitje/sync-config] Cron job toggle warning:', cronError);
        // Don't fail the request if cron toggle fails
      }
    } else {
      const { error: cronError } = await supabase.rpc('toggle_eitje_cron_jobs', { enabled: false });
      if (cronError) {
        console.warn('[API /eitje/sync-config] Cron job toggle warning:', cronError);
        // Don't fail the request if cron toggle fails
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[API /eitje/sync-config] Error:', error);
    console.error('[API /eitje/sync-config] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Provide more detailed error information
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common Supabase errors
      if (error.message.includes('permission denied') || error.message.includes('new row violates row-level security')) {
        errorMessage = 'Permission denied: Row-level security policy violation. Please ensure you are authenticated.';
      } else if (error.message.includes('null value') || error.message.includes('not-null constraint')) {
        errorMessage = 'Missing required fields. Please check all configuration values are set.';
      } else if (error.message.includes('violates check constraint')) {
        errorMessage = 'Invalid configuration value. Please check the allowed values for each field.';
      } else if (error.message.includes('Insert failed:')) {
        errorMessage = error.message; // Keep the detailed message we added
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        hint: (error as any).hint,
        details: (error as any).details
      } : undefined
    }, { status: 500 });
  }
}

