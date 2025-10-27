import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/bypass-rls-sync] Starting RLS bypass sync...');
    
    const { locationId, endpoints } = await request.json();
    
    const supabase = await createClient();
    
    // Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('provider', 'bork')
      .single();

    if (credError || !credentials) {
      return NextResponse.json({
        success: false,
        error: `No API credentials found for location ${locationId}`
      }, { status: 404 });
    }

    const { api_url: baseUrl, api_key: apiKey } = credentials;
    
    const endpointUrls = {
      product_groups: '/catalog/productgrouplist.json',
      payment_methods: '/catalog/paymodegrouplist.json',
      cost_centers: '/centers.json',
      users: '/users.json'
    };

    const results = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`Syncing ${endpoint}...`);
        
        const url = `${baseUrl}${endpointUrls[endpoint]}?appid=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Received ${Array.isArray(data) ? data.length : 'unknown'} items for ${endpoint}`);
        
        // For now, just return the data without inserting due to RLS
        results.push({
          endpoint,
          success: true,
          records_fetched: Array.isArray(data) ? data.length : 0,
          sample_data: Array.isArray(data) ? data.slice(0, 2) : data,
          message: 'Data fetched successfully but not inserted due to RLS policies'
        });

        console.log(`✅ ${endpoint} fetched: ${Array.isArray(data) ? data.length : 0} records`);

      } catch (error) {
        console.error(`❌ ${endpoint} failed:`, error);
        results.push({
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Master data fetch completed (RLS bypass mode)',
      results,
      note: 'Data was fetched but not inserted due to RLS policies. Please disable RLS on master data tables to enable full sync.'
    });

  } catch (error) {
    console.error('[API /bork/bypass-rls-sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

