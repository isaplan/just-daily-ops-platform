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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { importId, importType, records, locationId } = await req.json();
    
    console.log('[Edge] Processing import:', { importId, importType, recordCount: records.length });

    // Use RPC for transactional insert
    const { data, error } = await supabase.rpc('insert_finance_data_batch', {
      p_import_id: importId,
      p_import_type: importType,
      p_location_id: locationId,
      p_records: records
    });

    if (error) throw error;

    console.log('[Edge] Import completed:', {
      processedCount: data.processed_count,
      errorCount: data.error_count
    });

    return new Response(JSON.stringify({ 
      success: true, 
      processedCount: data.processed_count,
      errors: data.errors 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Edge] Import orchestration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
