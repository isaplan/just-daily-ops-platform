import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[bork-incremental-sync] Starting daily automated sync');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get sync configuration
    const { data: syncConfig, error: configError } = await supabase
      .from('bork_sync_config')
      .select('*')
      .single();

    if (configError) {
      console.error('[bork-incremental-sync] Error fetching sync config:', configError);
      throw new Error(`Failed to fetch sync config: ${configError.message}`);
    }

    console.log('[bork-incremental-sync] Sync config:', syncConfig);

    // Check if sync is active
    if (syncConfig.mode !== 'active') {
      console.log('[bork-incremental-sync] Sync is paused, skipping execution');
      return new Response(
        JSON.stringify({ 
          status: 'skipped', 
          reason: 'Sync mode is paused',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if there are enabled locations
    if (!syncConfig.enabled_locations || syncConfig.enabled_locations.length === 0) {
      console.log('[bork-incremental-sync] No enabled locations, skipping execution');
      return new Response(
        JSON.stringify({ 
          status: 'skipped', 
          reason: 'No enabled locations',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate yesterday's date (data is typically available D-1)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const syncDate = yesterday.toISOString().split('T')[0];

    console.log(`[bork-incremental-sync] Syncing data for date: ${syncDate}`);

    // Get location details and credentials
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name')
      .in('id', syncConfig.enabled_locations);

    if (locationsError) {
      console.error('[bork-incremental-sync] Error fetching locations:', locationsError);
      throw new Error(`Failed to fetch locations: ${locationsError.message}`);
    }

    const { data: credentials, error: credentialsError } = await supabase
      .from('bork_api_credentials')
      .select('location_id, api_key, base_url, is_active')
      .in('location_id', syncConfig.enabled_locations)
      .eq('is_active', true);

    if (credentialsError) {
      console.error('[bork-incremental-sync] Error fetching credentials:', credentialsError);
      throw new Error(`Failed to fetch credentials: ${credentialsError.message}`);
    }

    console.log(`[bork-incremental-sync] Found ${credentials.length} active credentials for ${locations.length} locations`);

    const results = [];

    // Sync each location
    for (const location of locations) {
      const locationCredentials = credentials.find(c => c.location_id === location.id);

      if (!locationCredentials) {
        console.warn(`[bork-incremental-sync] No active credentials for location ${location.name}, skipping`);
        results.push({
          locationId: location.id,
          locationName: location.name,
          status: 'skipped',
          reason: 'No active credentials'
        });
        continue;
      }

      console.log(`[bork-incremental-sync] Syncing location: ${location.name}`);

      try {
        // Invoke bork-api-sync for this location
        const { data: syncResult, error: syncError } = await supabase.functions.invoke('bork-api-sync', {
          body: {
            locationId: location.id,
            startDate: syncDate,
            endDate: syncDate,
            syncType: 'daily',
            syncTrigger: 'automated'
          }
        });

        if (syncError) {
          console.error(`[bork-incremental-sync] Error syncing ${location.name}:`, syncError);
          results.push({
            locationId: location.id,
            locationName: location.name,
            status: 'error',
            error: syncError.message,
            recordsFetched: 0
          });
        } else {
          console.log(`[bork-incremental-sync] Successfully synced ${location.name}:`, syncResult);
          results.push({
            locationId: location.id,
            locationName: location.name,
            status: 'success',
            recordsFetched: syncResult.recordsFetched || 0,
            recordsInserted: syncResult.recordsInserted || 0
          });
        }
      } catch (err: any) {
        console.error(`[bork-incremental-sync] Exception syncing ${location.name}:`, err);
        results.push({
          locationId: location.id,
          locationName: location.name,
          status: 'error',
          error: err.message,
          recordsFetched: 0
        });
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + (r.recordsFetched || 0), 0);
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`[bork-incremental-sync] Completed: ${successCount} succeeded, ${errorCount} failed, ${totalRecords} total records`);

    return new Response(
      JSON.stringify({
        status: 'completed',
        syncDate,
        totalLocations: locations.length,
        successCount,
        errorCount,
        totalRecords,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[bork-incremental-sync] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
