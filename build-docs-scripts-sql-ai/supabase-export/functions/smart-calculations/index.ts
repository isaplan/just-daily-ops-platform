import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalculationTrigger {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  location_id: string;
}

interface CalculationResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  result: any;
  created_at: string;
  completed_at?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { trigger, location_id } = await req.json();

    console.log('🧠 Smart Calculation Trigger:', { trigger, location_id });

    // Create calculation status record
    const { data: calcRecord, error: calcError } = await supabaseClient
      .from('calculation_status')
      .insert({
        name: `Location ${location_id} Data Processing`,
        status: 'running',
        progress: 0,
        trigger_type: trigger,
        location_id: location_id
      })
      .select()
      .single();

    if (calcError) throw calcError;

    // 1. Calculate Revenue Summary
    console.log('💰 Calculating revenue summary...');
    await supabaseClient
      .from('calculation_status')
      .update({ progress: 25 })
      .eq('id', calcRecord.id);

    const { data: revenueData, error: revenueError } = await supabaseClient
      .from('bork_sales_data')
      .select('revenue, quantity, price, date')
      .eq('location_id', location_id)
      .eq('category', 'STEP6_STORED_DATA');

    if (revenueError) throw revenueError;

    const revenueSummary = {
      total_revenue: revenueData?.reduce((sum, item) => sum + (item.revenue || 0), 0) || 0,
      total_quantity: revenueData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      average_price: revenueData?.length ? 
        revenueData.reduce((sum, item) => sum + (item.price || 0), 0) / revenueData.length : 0,
      record_count: revenueData?.length || 0,
      date_range: {
        earliest: revenueData?.length ? Math.min(...revenueData.map(d => new Date(d.date).getTime())) : null,
        latest: revenueData?.length ? Math.max(...revenueData.map(d => new Date(d.date).getTime())) : null
      }
    };

    // 2. Calculate Product Categories
    console.log('📊 Calculating product categories...');
    await supabaseClient
      .from('calculation_status')
      .update({ progress: 50 })
      .eq('id', calcRecord.id);

    const { data: categoryData, error: categoryError } = await supabaseClient
      .from('bork_sales_data')
      .select('category, revenue, quantity')
      .eq('location_id', location_id)
      .eq('category', 'STEP6_STORED_DATA')
      .not('category', 'is', null);

    if (categoryError) throw categoryError;

    const categorySummary = categoryData?.reduce((acc, item) => {
      const cat = item.category || 'Unknown';
      if (!acc[cat]) {
        acc[cat] = { revenue: 0, quantity: 0, count: 0 };
      }
      acc[cat].revenue += item.revenue || 0;
      acc[cat].quantity += item.quantity || 0;
      acc[cat].count += 1;
      return acc;
    }, {} as Record<string, any>) || {};

    // 3. Calculate Top Products
    console.log('🏆 Calculating top products...');
    await supabaseClient
      .from('calculation_status')
      .update({ progress: 75 })
      .eq('id', calcRecord.id);

    const { data: productData, error: productError } = await supabaseClient
      .from('bork_sales_data')
      .select('product_name, revenue, quantity')
      .eq('location_id', location_id)
      .eq('category', 'STEP6_STORED_DATA')
      .not('product_name', 'is', null);

    if (productError) throw productError;

    const productSummary = productData?.reduce((acc, item) => {
      const product = item.product_name || 'Unknown';
      if (!acc[product]) {
        acc[product] = { revenue: 0, quantity: 0, count: 0 };
      }
      acc[product].revenue += item.revenue || 0;
      acc[product].quantity += item.quantity || 0;
      acc[product].count += 1;
      return acc;
    }, {} as Record<string, any>) || {};

    const topProducts = Object.entries(productSummary)
      .sort(([,a], [,b]) => (b as any).revenue - (a as any).revenue)
      .slice(0, 10);

    // 4. Store Results
    console.log('💾 Storing calculation results...');
    await supabaseClient
      .from('calculation_status')
      .update({ progress: 90 })
      .eq('id', calcRecord.id);

    const calculationResult = {
      revenue_summary: revenueSummary,
      category_summary: categorySummary,
      top_products: topProducts,
      calculated_at: new Date().toISOString(),
      location_id: location_id,
      trigger: trigger
    };

    // Store in calculation_results table
    const { error: resultError } = await supabaseClient
      .from('calculation_results')
      .insert({
        calculation_id: calcRecord.id,
        location_id: location_id,
        result_data: calculationResult,
        status: 'completed'
      });

    if (resultError) throw resultError;

    // Mark calculation as completed
    await supabaseClient
      .from('calculation_status')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        result: calculationResult
      })
      .eq('id', calcRecord.id);

    console.log('✅ Smart calculation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        calculation_id: calcRecord.id,
        result: calculationResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Smart calculation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
