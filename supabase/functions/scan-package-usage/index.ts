import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const scanType = new URL(req.url).searchParams.get('type') || 'incremental';
    
    console.log(`Starting ${scanType} package scan...`);

    // Mock implementation - in production, this would scan actual files
    const scanResult = {
      scan_date: new Date().toISOString(),
      scan_type: scanType,
      files_scanned: 0,
      changes_detected: 0,
      status: 'no_changes',
      new_usages: {},
      deprecated_usages: {},
      orphaned_functions: {}
    };

    // Insert scan result
    const { error } = await supabase
      .from('package_usage_logs')
      .insert(scanResult);

    if (error) throw error;

    console.log(`Scan complete: ${scanResult.status}`);

    return new Response(
      JSON.stringify({ success: true, result: scanResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
