// CURSOR-DEV: Step 1 - Store Raw Data Only
// Promise: Only store raw data, no processing, no transformation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  locationId: string;
  startDate: string;
  endDate: string;
  syncType: 'manual' | 'scheduled';
}

serve(async (req) => {
  // CURSOR-DEV: Deployment tracking - this log will show when function is deployed
  const deploymentTime = new Date().toISOString();
  const version = `CURSOR-DEV-v1.2.0-${new Date().toISOString().split('T')[0]}`;
  console.log('🚀 CURSOR-DEV: bork-api-sync function deployed at:', deploymentTime);
  console.log('🚀 CURSOR-DEV: Function version:', version);
  console.log('🚀 CURSOR-DEV: Deployment source: CURSOR-DEV via Lovable');
  console.log('🚀 CURSOR-DEV: Features: Step 1 raw data storage + debugging');
  
  console.log('🚀 CURSOR-DEV: Step 1 - Raw Data Storage Started');
  console.log('🚀 CURSOR-DEV: Request method:', req.method);
  console.log('🚀 CURSOR-DEV: Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('📡 CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 CURSOR-DEV: Step 1 - Processing request...');
    console.log('🔧 CURSOR-DEV: Step 1 - Creating Supabase client...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    console.log('🔧 CURSOR-DEV: Step 1 - Supabase client created');

    // For API sync, we'll allow unauthenticated requests
    // but log the authentication status for debugging
    console.log('🔧 CURSOR-DEV: Step 1 - Checking authentication...');
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.log('⚠️ CURSOR-DEV: No authenticated user, proceeding with sync anyway');
    } else {
      console.log('✅ CURSOR-DEV: Authenticated user found:', user.id);
    }

    const { locationId, startDate, endDate, syncType }: SyncRequest = await req.json();
    console.log('🔧 CURSOR-DEV: Step 1 - Request data:', { locationId, startDate, endDate, syncType });

    // Validate inputs
    if (!locationId || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API credentials for location
    console.log('🔧 CURSOR-DEV: Step 1 - Getting API credentials...');
    console.log('🔧 CURSOR-DEV: Step 1 - Looking for location_id:', locationId);
    
    const { data: credentials, error: credError } = await supabaseClient
      .from('bork_api_credentials')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .single();

    console.log('🔧 CURSOR-DEV: Step 1 - Credentials query result:', { 
      credentials: !!credentials, 
      error: credError?.message,
      locationId 
    });

    if (credError) {
      console.error('❌ CURSOR-DEV: Step 1 - Credentials error:', credError);
      throw new Error(`Credentials query failed: ${credError.message}`);
    }

    if (!credentials) {
      console.error('❌ CURSOR-DEV: Step 1 - No credentials found for location:', locationId);
      throw new Error(`No API credentials found for location ${locationId}`);
    }

    console.log('🔧 CURSOR-DEV: Step 1 - Credentials found:', {
      location_id: credentials.location_id,
      api_url: credentials.api_url,
      has_api_key: !!credentials.api_key
    });

    console.log('🔧 CURSOR-DEV: Step 1 - API credentials found');

    // Create sync log in database
    console.log('🔧 CURSOR-DEV: Step 1 - Creating sync log...');
    const { data: syncLog, error: logError } = await supabaseClient
      .from('bork_api_sync_logs')
      .insert({
        location_id: locationId,
        date_range_start: startDate,
        date_range_end: endDate,
        status: 'started',
        sync_type: syncType,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.log('🔧 CURSOR-DEV: Step 1 - Sync log creation failed, continuing without logging:', logError);
    } else {
      console.log('🔧 CURSOR-DEV: Step 1 - Sync log created:', syncLog.id);
    }

    const syncLogId = syncLog?.id || crypto.randomUUID();

    // Generate date range
    const dates = generateDateRange(startDate, endDate);
    console.log('🔧 CURSOR-DEV: Step 1 - Processing dates:', dates);

    let totalRawRecordsStored = 0;

    // Process each date - STEP 1: JUST STORE RAW DATA
    for (const date of dates) {
      console.log(`🔧 CURSOR-DEV: Step 1 - Processing date: ${date}`);
      
    // Build API URL
    const apiUrl = `${credentials.api_url}/ticket/day.json/${date}?appid=${credentials.api_key}&IncInternal=True&IncOpen=True`;
      console.log(`🔧 CURSOR-DEV: Step 1 - API URL: ${apiUrl}`);

      // Fetch data from Bork API
      console.log(`🔧 CURSOR-DEV: Step 1 - Fetching data from Bork API...`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawApiResponse = await response.json();
      console.log(`🔧 CURSOR-DEV: Step 1 - Received ${rawApiResponse.length} raw records for ${date}`);

      // STEP 1: JUST STORE RAW DATA - NO PROCESSING
      console.log(`🔧 CURSOR-DEV: Step 1 - Storing raw data for ${date}...`);
      
      // TEMPORARY: Store raw data in existing table structure
      const rawDataRecord = {
        location_id: locationId,
        import_id: syncLogId,
        date: date,
        product_name: 'RAW_DATA_STORAGE',
        category: 'STEP1_RAW_DATA',
        quantity: rawApiResponse.length,
        price: 0,
        revenue: 0,
        raw_data: {
          raw_response: rawApiResponse, // Store the entire API response as-is
          api_url: apiUrl,
          record_count: rawApiResponse.length,
          step: 'raw_data_storage',
          created_at: new Date().toISOString()
        }
      };

      console.log(`🔧 CURSOR-DEV: Step 1 - Attempting to insert raw data...`);
      const { data: insertData, error: insertError } = await supabaseClient
        .from('bork_sales_data') // Use existing table temporarily
        .insert(rawDataRecord)
        .select();

      if (insertError) {
        console.error(`❌ CURSOR-DEV: Step 1 - Insert error details:`, insertError);
        console.error(`❌ CURSOR-DEV: Step 1 - Insert error code:`, insertError.code);
        console.error(`❌ CURSOR-DEV: Step 1 - Insert error hint:`, insertError.hint);
        throw new Error(`Failed to store raw data: ${insertError.message} (Code: ${insertError.code})`);
      }

      console.log(`✅ CURSOR-DEV: Step 1 - Raw data inserted successfully:`, insertData);

      totalRawRecordsStored++;
      console.log(`✅ CURSOR-DEV: Step 1 - Raw data stored for ${date}`);
    }

    // Update sync log with completion status
    if (syncLog) {
      try {
        await supabaseClient
          .from('bork_api_sync_logs')
          .update({
            status: 'completed',
            records_fetched: totalRawRecordsStored,
            records_inserted: totalRawRecordsStored,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLog.id);
        console.log('🔧 CURSOR-DEV: Step 1 - Sync log updated successfully');
      } catch (updateError) {
        console.log('🔧 CURSOR-DEV: Step 1 - Sync log update failed:', updateError);
      }
    }

    // Log completion
    console.log('🔧 CURSOR-DEV: Step 1 - Sync completed successfully');
    console.log(`🔧 CURSOR-DEV: Step 1 - Total records stored: ${totalRawRecordsStored}`);

    console.log('✅ CURSOR-DEV: Step 1 - Raw data storage completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Step 1: Raw data stored successfully',
        step: 'raw_data_storage',
        records_stored: totalRawRecordsStored,
        sync_log_id: syncLogId,
        next_step: 'test_data_access'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ CURSOR-DEV: Step 1 - Error in raw data storage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        step: 'raw_data_storage',
        timestamp: new Date().toISOString(),
        source: 'cursor-dev-step1'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to generate date range in YYYYMMDD format for Bork API
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Convert to YYYYMMDD format (no dashes) for Bork API
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}${month}${day}`);
  }
  
  return dates;
}