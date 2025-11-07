import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('🔧 CURSOR-DEV: Debug DB function called...')

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    console.log('🔧 CURSOR-DEV: Supabase URL:', supabaseUrl);
    console.log('🔧 CURSOR-DEV: Service role key available:', serviceRoleKey ? 'Yes' : 'No');
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Test 1: Check if table exists
    console.log('🔧 CURSOR-DEV: Testing table existence...');
    const { data: tableCheck, error: tableError } = await supabaseClient
      .from('bork_sales_data')
      .select('*')
      .limit(1);

    console.log('🔧 CURSOR-DEV: Table check result:', { tableCheck, tableError });

    // Test 2: Try to insert test data
    console.log('🔧 CURSOR-DEV: Testing data insert...');
    const testRecord = {
      location_id: '29dfaf69-4e95-44c8-9743-3305b4f1fa54', // Use Bar Bea's UUID
      date: '2025-01-20',
      product_name: 'DEBUG_TEST',
      category: 'DEBUG',
      quantity: 1,
      price: 0,
      revenue: 0,
      raw_data: {
        test: true,
        created_at: new Date().toISOString()
      }
    };

    const { data: insertData, error: insertError } = await supabaseClient
      .from('bork_sales_data')
      .insert(testRecord)
      .select();

    console.log('🔧 CURSOR-DEV: Insert result:', { insertData, insertError });

    // Test 3: Check if data was actually inserted
    console.log('🔧 CURSOR-DEV: Checking if data was inserted...');
    const { data: verifyData, error: verifyError } = await supabaseClient
      .from('bork_sales_data')
      .select('*')
      .eq('location_id', '29dfaf69-4e95-44c8-9743-3305b4f1fa54')
      .eq('product_name', 'DEBUG_TEST');

    console.log('🔧 CURSOR-DEV: Verify result:', { verifyData, verifyError });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database debug completed',
        results: {
          tableCheck: { data: tableCheck, error: tableError },
          insertResult: { data: insertData, error: insertError },
          verifyResult: { data: verifyData, error: verifyError }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.log('🔧 CURSOR-DEV: Debug DB error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
