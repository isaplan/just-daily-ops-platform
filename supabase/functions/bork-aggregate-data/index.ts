import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Bork Data Aggregation Edge Function
 * Aggregates raw Bork sales data into aggregated format
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationId, startDate, endDate } = await req.json();
    
    console.log('[bork-aggregate-data] Starting aggregation:', { locationId, startDate, endDate });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate date range
    const dates = generateDateRange(startDate, endDate);
    let totalAggregated = 0;
    const aggregatedDates: string[] = [];

    for (const date of dates) {
      try {
        // Query raw data for this location and date
        const { data: rawData, error: queryError } = await supabase
          .from('bork_sales_data')
          .select('*')
          .eq('location_id', locationId)
          .eq('date', date);

        if (queryError) {
          console.error(`[bork-aggregate-data] Query error for ${date}:`, queryError);
          continue;
        }

        if (!rawData || rawData.length === 0) {
          console.log(`[bork-aggregate-data] No raw data for ${locationId} on ${date}`);
          continue;
        }

        // Calculate aggregated metrics
        const aggregated = calculateAggregatedMetrics(rawData);

        // Upsert into aggregated table
        const { error: upsertError } = await supabase
          .from('bork_sales_aggregated')
          .upsert({
            location_id: locationId,
            date: date,
            ...aggregated,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'location_id,date'
          });

        if (upsertError) {
          console.error(`[bork-aggregate-data] Upsert error for ${date}:`, upsertError);
          continue;
        }

        totalAggregated++;
        aggregatedDates.push(date);
        console.log(`[bork-aggregate-data] Aggregated ${date}: ${aggregated.total_revenue}€ revenue, ${aggregated.total_quantity} items`);

      } catch (dateError: any) {
        console.error(`[bork-aggregate-data] Error processing date ${date}:`, dateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        locationId,
        dateRange: { startDate, endDate },
        totalAggregated,
        aggregatedDates,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[bork-aggregate-data] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

function calculateAggregatedMetrics(rawData: any[]): {
  total_revenue: number;
  total_quantity: number;
  total_transactions: number;
  average_revenue_per_transaction: number;
} {
  let totalRevenue = 0;
  let totalQuantity = 0;
  const uniqueTransactions = new Set<string>();

  for (const record of rawData) {
    // Skip raw data storage records
    if (record.category === 'STEP1_RAW_DATA' || record.product_name === 'RAW_DATA_STORAGE') {
      continue;
    }

    totalRevenue += record.revenue || 0;
    totalQuantity += record.quantity || 0;
    
    // Track unique transactions (if transaction_id exists)
    if (record.transaction_id) {
      uniqueTransactions.add(record.transaction_id);
    }
  }

  const totalTransactions = uniqueTransactions.size || 1; // Fallback to 1 if no transaction IDs
  const averageRevenuePerTransaction = totalRevenue / totalTransactions;

  return {
    total_revenue: totalRevenue,
    total_quantity: totalQuantity,
    total_transactions: totalTransactions,
    average_revenue_per_transaction: averageRevenuePerTransaction
  };
}

