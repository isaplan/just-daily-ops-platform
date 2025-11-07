import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface DailySyncRequest {
  date: string; // YYYYMMDD format
  location_ids: string[];
  override: boolean;
}

interface BorkCredentials {
  location_id: string;
  base_url?: string;
  api_key?: string;
  api_url?: string;
  username?: string;
  password?: string;
}

interface SyncResult {
  location_id: string;
  success: boolean;
  records_stored: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date, location_ids, override }: DailySyncRequest = await req.json()
    
    if (!date || !location_ids || location_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: date, location_ids' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate date format (YYYYMMDD)
    if (!/^\d{8}$/.test(date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Expected YYYYMMDD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Load active Bork credentials - try unified table first, fallback to old table
    let credentials: BorkCredentials[] = []
    let credsError: any = null

    // Try unified api_credentials table first
    const { data: unifiedCreds, error: unifiedError } = await supabase
      .from('api_credentials')
      .select('location_id, base_url, api_key')
      .eq('provider', 'bork')
      .eq('is_active', true)
      .in('location_id', location_ids)

    if (!unifiedError && unifiedCreds && unifiedCreds.length > 0) {
      console.log('✅ Using unified api_credentials table')
      console.log(`📋 Loaded ${unifiedCreds.length} credentials from unified table`)
      credentials = unifiedCreds
    } else {
      // Fallback to old bork_api_credentials table
      console.log('⚠️ Unified table not available, using bork_api_credentials')
      const { data: borkCreds, error: borkError } = await supabase
        .from('bork_api_credentials')
        .select('location_id, api_url, username, password')
        .eq('is_active', true)
        .in('location_id', location_ids)

      if (borkError) {
        credsError = borkError
        console.error('❌ Error loading bork_api_credentials:', borkError)
      } else {
        credentials = borkCreds || []
        console.log(`📋 Loaded ${credentials.length} credentials from bork_api_credentials table`)
        credentials.forEach(cred => {
          console.log(`  - Location ${cred.location_id}: ${cred.api_url || cred.base_url} (key: ${(cred.username || cred.api_key || '').substring(0, 8)}...)`)
        })
      }
    }

    if (credsError) {
      console.error('❌ Failed to load credentials:', credsError)
      return new Response(
        JSON.stringify({ error: 'Failed to load credentials', details: credsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active Bork credentials found for specified locations' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: SyncResult[] = []

    // Process each location
    for (const cred of credentials) {
      try {
        console.log(`🔄 Syncing ${date} for location ${cred.location_id}...`)

        // Optional: Delete existing data if override is true
        if (override) {
          const { error: deleteError } = await supabase
            .from('bork_sales_data')
            .delete()
            .eq('location_id', cred.location_id)
            .eq('date', date)

          if (deleteError) {
            console.warn(`⚠️ Failed to delete existing data for ${cred.location_id}:`, deleteError)
          } else {
            console.log(`🗑️ Deleted existing data for ${cred.location_id} on ${date}`)
          }
        }

        // Call Bork API - handle both credential formats
        const baseUrl = cred.base_url || cred.api_url
        const apiKey = cred.api_key || cred.username // Using username as API key for old format
        
        if (!baseUrl) {
          throw new Error('No base URL found in credentials')
        }
        
        console.log(`🔧 Credentials for ${cred.location_id}:`)
        console.log(`   Base URL: ${baseUrl}`)
        console.log(`   API Key: ${apiKey?.substring(0, 8)}... (using ${cred.api_key ? 'api_key' : 'username'} field)`)
        console.log(`   Source: ${cred.base_url ? 'base_url' : 'api_url'} field`)
        
        // Use appid query parameter instead of Authorization header (per Bork API docs)
        const borkUrl = `${baseUrl}/ticket/day.json/${date}?appid=${apiKey}`
        console.log(`🌐 Calling Bork API: ${borkUrl.replace(apiKey!, '[API_KEY]')}`)
        
        const borkResponse = await fetch(borkUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        console.log(`📡 Bork API response status: ${borkResponse.status} ${borkResponse.statusText}`)

        if (!borkResponse.ok) {
          const errorText = await borkResponse.text()
          console.error(`❌ Bork API error response: ${errorText}`)
          throw new Error(`Bork API error: ${borkResponse.status} ${borkResponse.statusText}`)
        }

        const borkData = await borkResponse.json()
        const dataPreview = JSON.stringify(borkData).substring(0, 200)
        console.log(`📊 Bork API response for ${cred.location_id}: ${dataPreview}... (${JSON.stringify(borkData).length} chars total)`)

        // Store raw data
        const { data: insertData, error: insertError } = await supabase
          .from('bork_sales_data')
          .insert({
            location_id: cred.location_id,
            date: date,
            category: 'STEP1_RAW_DATA',
            raw_data: {
              api_url: borkUrl,
              response: borkData,
              timestamp: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
          })
          .select()

        if (insertError) {
          throw new Error(`Database insert error: ${insertError.message}`)
        }

        // Log sync activity - try unified table first, fallback to old table
        try {
          await supabase
            .from('api_sync_logs')
            .insert({
              provider: 'bork',
              location_id: cred.location_id,
              sync_type: 'daily',
              date_range_start: date,
              date_range_end: date,
              status: 'success',
              records_fetched: 1,
              records_inserted: insertData?.length || 0,
              metadata: {
                api_url: borkUrl,
                records_stored: insertData?.length || 0,
              },
            })
        } catch (logError) {
          // Fallback to old bork_api_sync_logs table
          console.log('⚠️ Using fallback sync logs table')
          await supabase
            .from('bork_api_sync_logs')
            .insert({
              location_id: cred.location_id,
              sync_type: 'daily',
              date_range_start: date,
              date_range_end: date,
              status: 'success',
              records_fetched: 1,
              records_inserted: insertData?.length || 0,
              metadata: {
                api_url: borkUrl,
                records_stored: insertData?.length || 0,
              },
            })
        }

        results.push({
          location_id: cred.location_id,
          success: true,
          records_stored: insertData?.length || 0,
        })

        console.log(`✅ Successfully synced ${date} for ${cred.location_id}`)

        // Rate limiting: 2 second delay between locations
        if (credentials.indexOf(cred) < credentials.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.error(`❌ Sync failed for ${cred.location_id}:`, error)
        
        // Log failed sync - try unified table first, fallback to old table
        try {
          await supabase
            .from('api_sync_logs')
            .insert({
              provider: 'bork',
              location_id: cred.location_id,
              sync_type: 'daily',
              date_range_start: date,
              date_range_end: date,
              status: 'error',
              records_fetched: 0,
              records_inserted: 0,
              error_message: error.message,
              metadata: {
                error: error.message,
              },
            })
        } catch (logError) {
          // Fallback to old bork_api_sync_logs table
          console.log('⚠️ Using fallback sync logs table for error')
          await supabase
            .from('bork_api_sync_logs')
            .insert({
              location_id: cred.location_id,
              sync_type: 'daily',
              date_range_start: date,
              date_range_end: date,
              status: 'error',
              records_fetched: 0,
              records_inserted: 0,
              error_message: error.message,
              metadata: {
                error: error.message,
              },
            })
        }

        results.push({
          location_id: cred.location_id,
          success: false,
          records_stored: 0,
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily sync completed for ${date}`,
        date: date,
        results: results,
        total_locations: credentials.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Daily sync function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
