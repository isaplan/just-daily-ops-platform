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

    console.log('[eitje-backfill-worker-v2] Starting worker');

    // Fetch a pending job from the existing queue (reuse v1 queue)
    let query = supabaseClient
      .from('eitje_backfill_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(1);

    const { data: jobs, error: fetchError } = await query;
    if (fetchError) throw new Error(`Failed to fetch job: ${fetchError.message}`);
    if (!jobs || jobs.length === 0) {
      console.log('[eitje-backfill-worker-v2] No ready jobs found');
      return new Response(JSON.stringify({ success: true, message: 'No jobs ready' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const job = jobs[0];
    console.log('[eitje-backfill-worker-v2] Processing job', {
      job_id: job.id,
      chunk: `${job.chunk_start} to ${job.chunk_end}`,
      endpoints: job.endpoints
    });

    // Mark job processing
    const { error: updErr } = await supabaseClient
      .from('eitje_backfill_queue')
      .update({ status: 'processing', attempt: job.attempt + 1 })
      .eq('id', job.id);
    if (updErr) throw new Error(`Failed to update job: ${updErr.message}`);

    const endpointResults: Array<{ endpoint: string; success: boolean; error?: string; inserted?: number }> = [];
    let totalInserted = 0;

    for (const endpoint of job.endpoints as string[]) {
      try {
        console.log(`[eitje-backfill-worker-v2] Syncing ${endpoint}`);
        // Step 1: Fetch via existing function (unchanged)
        const { data: syncData, error: syncErr } = await supabaseClient.functions.invoke('eitje-api-sync', {
          body: {
            endpoint,
            start_date: job.chunk_start,
            end_date: job.chunk_end,
            sync_mode: 'backfill',
            test_mode: false
          }
        });
        if (syncErr) throw syncErr;
        const inserted = syncData?.records_inserted || 0;
        totalInserted += inserted;

        // Step 2: V2 process+aggregate for hours
        if (endpoint === 'time_registration_shifts') {
          console.log('[eitje-backfill-worker-v2] Processing V2 (raw -> processed_v2)...');
          const { data: procCount, error: procErr } = await supabaseClient.rpc('process_time_registration_shifts_v2', {
            start_date: job.chunk_start,
            end_date: job.chunk_end
          });
          if (procErr) throw new Error(`process_time_registration_shifts_v2 failed: ${procErr.message}`);
          console.log('[eitje-backfill-worker-v2] process_time_registration_shifts_v2:', procCount ?? 0);

          console.log('[eitje-backfill-worker-v2] Aggregating V2 (processed_v2 -> aggregated_v2)...');
          const { data: aggCount, error: aggErr } = await supabaseClient.rpc('aggregate_hours_v2', {
            start_date: job.chunk_start,
            end_date: job.chunk_end
          });
          if (aggErr) throw new Error(`aggregate_hours_v2 failed: ${aggErr.message}`);
          console.log('[eitje-backfill-worker-v2] aggregate_hours_v2:', aggCount ?? 0);
        }

        endpointResults.push({ endpoint, success: true, inserted });
      } catch (endpointError: any) {
        console.error(`[eitje-backfill-worker-v2] Error syncing ${endpoint}:`, endpointError?.message || endpointError);
        endpointResults.push({ endpoint, success: false, error: endpointError?.message || 'Unknown error' });
      }
    }

    const allOk = endpointResults.every(r => r.success);
    // Complete or fail job
    if (allOk) {
      await supabaseClient.from('eitje_backfill_queue').update({ status: 'completed' }).eq('id', job.id);
    } else {
      await supabaseClient.from('eitje_backfill_queue').update({ status: 'failed', last_error: JSON.stringify(endpointResults.filter(r => !r.success)) }).eq('id', job.id);
    }

    return new Response(JSON.stringify({
      success: allOk,
      job_id: job.id,
      chunk_start: job.chunk_start,
      chunk_end: job.chunk_end,
      totalInserted,
      endpointResults
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[eitje-backfill-worker-v2] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


