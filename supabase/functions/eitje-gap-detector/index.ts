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

    console.log('[eitje-gap-detector] Starting gap detection');

    // Use the existing detect_eitje_data_gaps() database function
    const { data: gaps, error: gapsError } = await supabaseClient
      .rpc('detect_eitje_data_gaps');

    if (gapsError) {
      throw new Error(`Failed to detect gaps: ${gapsError.message}`);
    }

    const gapsFound = gaps && gaps.length > 0;
    
    console.log(`[eitje-gap-detector] Found ${gaps?.length || 0} days with missing data`);

    // Update last_gap_check_at
    const { error: updateError } = await supabaseClient
      .from('eitje_sync_config')
      .update({ last_gap_check_at: new Date().toISOString() })
      .single();

    if (updateError) {
      console.error('[eitje-gap-detector] Failed to update last_gap_check_at:', updateError);
    }

    if (gapsFound) {
      // Log gaps for review
      console.log('[eitje-gap-detector] Missing data details:', gaps);
      
      // Optionally: Create a backfill job for the gaps
      // For now, we just report them
      const gapSummary = {
        total_missing_days: gaps.length,
        date_range: gaps.length > 0 ? {
          earliest: gaps[0].missing_date,
          latest: gaps[gaps.length - 1].missing_date
        } : null,
        gaps: gaps.slice(0, 10) // First 10 gaps
      };

      return new Response(
        JSON.stringify({
          success: true,
          gaps_found: true,
          gap_count: gaps.length,
          summary: gapSummary,
          message: `Found ${gaps.length} days with missing data`,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        gaps_found: false,
        gap_count: 0,
        message: 'No gaps detected - data is complete',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[eitje-gap-detector] Fatal error:', error);
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
