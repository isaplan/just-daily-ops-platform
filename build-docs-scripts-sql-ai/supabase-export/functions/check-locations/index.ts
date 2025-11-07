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

  console.log('🔧 CURSOR-DEV: Check locations function called...')

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if locations table exists and what locations are available
    console.log('🔧 CURSOR-DEV: Checking locations table...');
    const { data: locations, error: locationsError } = await supabaseClient
      .from('locations')
      .select('*');

    console.log('🔧 CURSOR-DEV: Locations result:', { locations, locationsError });

    // Check the schema of bork_sales_data table
    console.log('🔧 CURSOR-DEV: Checking bork_sales_data table structure...');
    const { data: salesData, error: salesError } = await supabaseClient
      .from('bork_sales_data')
      .select('*')
      .limit(1);

    console.log('🔧 CURSOR-DEV: Sales data result:', { salesData, salesError });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Locations check completed',
        results: {
          locations: { data: locations, error: locationsError },
          salesData: { data: salesData, error: salesError }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.log('🔧 CURSOR-DEV: Check locations error:', error);
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

