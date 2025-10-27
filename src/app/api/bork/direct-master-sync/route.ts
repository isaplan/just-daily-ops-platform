import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/direct-master-sync] Starting direct master data sync...');
    
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

    const tableNames = {
      product_groups: 'bork_product_groups',
      payment_methods: 'bork_payment_methods',
      cost_centers: 'bork_cost_centers',
      users: 'bork_users'
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
        
        // Clear existing data for this location
        const { error: deleteError } = await supabase
          .from(tableNames[endpoint])
          .delete()
          .eq('location_id', locationId);

        if (deleteError) {
          console.warn(`Delete warning for ${endpoint}:`, deleteError.message);
        }

        // Insert new data - only include email/role for users table
        const records = data.map((item: any) => {
          const baseRecord = {
            location_id: locationId,
            bork_id: item.id || item.ID,
            name: item.name || item.Name,
            description: item.description || item.Description,
            raw_data: item,
            updated_at: new Date().toISOString()
          };

          // Only add email and role for users table
          if (endpoint === 'users') {
            return {
              ...baseRecord,
              email: item.email || item.Email,
              role: item.role || item.Role
            };
          }

          return baseRecord;
        });

        const { error: insertError } = await supabase
          .from(tableNames[endpoint])
          .insert(records);

        if (insertError) {
          console.error(`Insert error for ${endpoint}:`, insertError);
          throw insertError;
        }

        results.push({
          endpoint,
          success: true,
          records_synced: records.length
        });

        console.log(`✅ ${endpoint} synced: ${records.length} records`);

      } catch (error) {
        console.error(`❌ ${endpoint} failed:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error details:`, error);
        results.push({
          endpoint,
          success: false,
          error: errorMessage
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Direct master data sync completed',
      results
    });

  } catch (error) {
    console.error('[API /bork/direct-master-sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
