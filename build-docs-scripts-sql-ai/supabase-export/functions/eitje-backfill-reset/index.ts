import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { progress_id } = await req.json().catch(() => ({}));

    console.log('[eitje-backfill-reset] Resetting chunk schedule', { progress_id });

    // Update all pending chunks to run immediately
    let query = supabaseClient
      .from('eitje_backfill_queue')
      .update({ next_run_at: new Date().toISOString() })
      .eq('status', 'pending');

    if (progress_id) {
      query = query.eq('progress_id', progress_id);
    }

    const { data, error, count } = await query.select();

    if (error) {
      throw new Error(`Failed to reset chunks: ${error.message}`);
    }

    console.log('[eitje-backfill-reset] Reset complete', { chunks_updated: data?.length || 0 });

    return new Response(
      JSON.stringify({
        success: true,
        chunks_updated: data?.length || 0,
        message: 'Chunk schedule reset successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[eitje-backfill-reset] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
