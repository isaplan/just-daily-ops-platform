import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.10.0'
import { corsHeaders } from '../_shared/cors.ts'

interface MasterDataRequest {
  location_ids: string[];
  endpoints?: string[]; // Optional: sync specific endpoints only
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { location_ids, endpoints = ['product_groups', 'payment_methods', 'cost_centers', 'users'] } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`🔄 Starting master data sync for ${location_ids.length} locations`)
    console.log(`📋 Endpoints to sync: ${endpoints.join(', ')}`)

    // Get credentials for all locations
    const { data: credentials, error: credsError } = await supabase
      .from('bork_api_credentials')
      .select('location_id, api_url, username')
      .eq('is_active', true)
      .in('location_id', location_ids)

    if (credsError || !credentials?.length) {
      console.error('❌ No active credentials found:', credsError)
      return new Response(
        JSON.stringify({ error: 'No active credentials found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Found ${credentials.length} active credentials`)

    const results = []

    for (const cred of credentials) {
      console.log(`🔄 Processing location: ${cred.location_id}`)
      const locationResults = { location_id: cred.location_id, endpoints: {} }
      
      for (const endpoint of endpoints) {
        try {
          console.log(`  📡 Syncing ${endpoint}...`)
          const endpointResult = await syncMasterDataEndpoint(
            supabase, 
            cred, 
            endpoint
          )
          locationResults.endpoints[endpoint] = endpointResult
          console.log(`  ✅ ${endpoint} synced: ${endpointResult.records_synced} records`)
        } catch (error) {
          console.error(`  ❌ ${endpoint} failed:`, error.message)
          locationResults.endpoints[endpoint] = { 
            success: false, 
            error: error.message 
          }
        }
      }
      
      results.push(locationResults)
    }

    console.log(`🎉 Master data sync completed for ${results.length} locations`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Master data sync completed for ${results.length} locations`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Master data sync failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function syncMasterDataEndpoint(supabase: any, cred: any, endpoint: string) {
  const endpointUrls = {
    product_groups: '/catalog/productgrouplist.json',
    payment_methods: '/catalog/paymodegrouplist.json',
    cost_centers: '/centers.json',
    users: '/users.json'
  }

  const tableNames = {
    product_groups: 'bork_product_groups',
    payment_methods: 'bork_payment_methods',
    cost_centers: 'bork_cost_centers',
    users: 'bork_users'
  }

  const url = `${cred.api_url}${endpointUrls[endpoint]}?appid=${cred.username}`
  console.log(`    🌐 Calling: ${url.replace(cred.username, '[API_KEY]')}`)
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`    📊 Received ${Array.isArray(data) ? data.length : 'unknown'} items`)
  
  // Clear existing data for this location
  const { error: deleteError } = await supabase
    .from(tableNames[endpoint])
    .delete()
    .eq('location_id', cred.location_id)

  if (deleteError) {
    console.warn(`    ⚠️ Delete warning: ${deleteError.message}`)
  }

  // Insert new data
  const records = data.map((item: any) => ({
    location_id: cred.location_id,
    bork_id: item.id || item.ID,
    name: item.name || item.Name,
    description: item.description || item.Description,
    email: item.email || item.Email,
    role: item.role || item.Role,
    raw_data: item,
    updated_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from(tableNames[endpoint])
    .insert(records)

  if (error) throw error

  return {
    success: true,
    records_synced: records.length,
    endpoint: endpoint
  }
}

