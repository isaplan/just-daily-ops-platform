import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[eitje-incremental-sync] Starting incremental sync');

    // Fetch sync configuration
    const { data: config } = await supabaseClient
      .from('eitje_sync_config')
      .select('*')
      .single();

    if (!config) {
      throw new Error('Sync configuration not found');
    }

    // Check if mode is incremental
    if (config.mode !== 'incremental') {
      console.log('[eitje-incremental-sync] Skipping - mode is not incremental:', config.mode);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Skipped - mode is ${config.mode}`,
        mode: config.mode
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check quiet hours
    const currentHour = new Date().getUTCHours();
    if (currentHour >= config.quiet_hours_start && currentHour < config.quiet_hours_end) {
      console.log('[eitje-incremental-sync] Skipping - within quiet hours');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Skipped - quiet hours',
        quiet_hours: true
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log('[eitje-incremental-sync] Syncing yesterday\'s data:', dateStr);

    // Get enabled endpoints from config
    const endpoints = Array.isArray(config.enabled_endpoints) 
      ? config.enabled_endpoints 
      : ['time_registration_shifts', 'planning_shifts', 'revenue_days'];

    let totalRecordsInserted = 0;
    const endpointResults: any[] = [];

    // Sync each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`[eitje-incremental-sync] Syncing ${endpoint}`);

        const result = await supabaseClient.functions.invoke('eitje-api-sync', {
          body: {
            endpoint,
            start_date: dateStr,
            end_date: dateStr,
            sync_mode: 'incremental',
            test_mode: false
          }
        });

        if (result.error) {
          throw result.error;
        }

        const data = result.data;
        if (data?.success) {
          totalRecordsInserted += data.records_inserted || 0;
          endpointResults.push({
            endpoint,
            success: true,
            records: data.records_inserted
          });
          console.log(`[eitje-incremental-sync] ${endpoint}: ${data.records_inserted} records`);

          // Automatically aggregate the data after successful sync
          try {
            console.log(`[eitje-incremental-sync] Triggering automatic aggregation for ${endpoint}...`);
            const { data: aggregateResult, error: aggregateError } = await supabaseClient.functions.invoke('eitje-aggregate-data', {
              body: {
                endpoint,
                startDate: dateStr,
                endDate: dateStr
              }
            });

            if (aggregateError) {
              console.warn(`[eitje-incremental-sync] Aggregation failed for ${endpoint}:`, aggregateError);
            } else {
              console.log(`[eitje-incremental-sync] Successfully aggregated ${endpoint}:`, aggregateResult);
            }
          } catch (aggError: any) {
            console.warn(`[eitje-incremental-sync] Aggregation error for ${endpoint}:`, aggError?.message || aggError);
            // Don't fail the sync if aggregation fails
          }
        }
      } catch (endpointError) {
        console.error(`[eitje-incremental-sync] Error syncing ${endpoint}:`, endpointError);
        endpointResults.push({
          endpoint,
          success: false,
          error: endpointError instanceof Error ? endpointError.message : 'Unknown error'
        });
      }
    }

    const allSucceeded = endpointResults.every(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSucceeded,
        date_synced: dateStr,
        total_records: totalRecordsInserted,
        endpoint_results: endpointResults,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[eitje-incremental-sync] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
