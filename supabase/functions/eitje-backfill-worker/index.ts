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

    console.log('[eitje-backfill-worker] Starting worker', { progress_id });

    // Fetch sync configuration
    const { data: config } = await supabaseClient
      .from('eitje_sync_config')
      .select('*')
      .single();

    if (!config) {
      throw new Error('Sync configuration not found');
    }

    // Check quiet hours (skip processing during configured hours)
    const currentHour = new Date().getUTCHours();
    if (currentHour >= config.quiet_hours_start && currentHour < config.quiet_hours_end) {
      console.log('[eitje-backfill-worker] Skipping - within quiet hours', {
        current_hour: currentHour,
        quiet_hours: `${config.quiet_hours_start}:00-${config.quiet_hours_end}:00 UTC`
      });
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Skipped - quiet hours',
        quiet_hours: true,
        current_hour: currentHour
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if mode is paused
    if (config.mode === 'paused') {
      console.log('[eitje-backfill-worker] Skipping - sync is paused');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Skipped - sync paused',
        paused: true
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find the next ready chunk
    let query = supabaseClient
      .from('eitje_backfill_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(1);

    if (progress_id) {
      query = query.eq('progress_id', progress_id);
    }

    const { data: jobs, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch job: ${fetchError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('[eitje-backfill-worker] No ready jobs found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No jobs ready to process'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = jobs[0];
    console.log('[eitje-backfill-worker] Processing job', {
      job_id: job.id,
      chunk: `${job.chunk_start} to ${job.chunk_end}`,
      endpoints: job.endpoints,
      attempt: job.attempt + 1
    });

    // Mark as processing
    const { error: updateError } = await supabaseClient
      .from('eitje_backfill_queue')
      .update({
        status: 'processing',
        attempt: job.attempt + 1
      })
      .eq('id', job.id);

    if (updateError) {
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }

    // Process each endpoint
    let totalRecordsInserted = 0;
    const endpointResults: any[] = [];

    for (const endpoint of job.endpoints) {
      try {
        console.log(`[eitje-backfill-worker] Syncing ${endpoint}`);

        const result = await supabaseClient.functions.invoke('eitje-api-sync', {
          body: {
            endpoint,
            start_date: job.chunk_start,
            end_date: job.chunk_end,
            sync_mode: 'backfill',
            test_mode: false
          }
        });

        if (result.error) {
          throw result.error;
        }

        const data = result.data;
        if (data?.success) {
          totalRecordsInserted += data.records_inserted || 0;
          endpointResults.push({
            endpoint,
            success: true,
            records: data.records_inserted
          });
          console.log(`[eitje-backfill-worker] ${endpoint}: ${data.records_inserted} records`);
        }
      } catch (endpointError) {
        console.error(`[eitje-backfill-worker] Error syncing ${endpoint}:`, endpointError);
        endpointResults.push({
          endpoint,
          success: false,
          error: endpointError instanceof Error ? endpointError.message : 'Unknown error'
        });
      }
    }

    // Check if all endpoints succeeded
    const allSucceeded = endpointResults.every(r => r.success);

    if (allSucceeded) {
      // Mark job as completed
      await supabaseClient
        .from('eitje_backfill_queue')
        .update({ status: 'completed' })
        .eq('id', job.id);

      // Update progress
      const { data: progress } = await supabaseClient
        .from('eitje_backfill_progress')
        .select('completed_chunks, total_chunks, records_fetched')
        .eq('id', job.progress_id)
        .single();

      if (progress) {
        const newCompletedChunks = progress.completed_chunks + 1;
        const newRecordsFetched = (progress.records_fetched || 0) + totalRecordsInserted;
        const isComplete = newCompletedChunks >= progress.total_chunks;

        const updateData: any = {
          completed_chunks: newCompletedChunks,
          records_fetched: newRecordsFetched,
          current_chunk_start: null,
          current_chunk_end: null
        };

        if (isComplete) {
          updateData.status = 'completed';
          updateData.completed_at = new Date().toISOString();
          
          // Phase 5: Automatic mode transition to incremental
          console.log('[eitje-backfill-worker] Backfill complete! Switching to incremental mode');
          
          await supabaseClient
            .from('eitje_sync_config')
            .update({ mode: 'incremental' })
            .single();
          
          // Update cron schedule to hourly incremental sync
          await supabaseClient.rpc('update_sync_cron_schedule', {
            sync_mode: 'incremental'
          });
          
          console.log('[eitje-backfill-worker] Switched to incremental sync mode with hourly schedule');
        }

        await supabaseClient
          .from('eitje_backfill_progress')
          .update(updateData)
          .eq('id', job.progress_id);

        console.log('[eitje-backfill-worker] Job completed', {
          completed_chunks: newCompletedChunks,
          total_chunks: progress.total_chunks,
          records_inserted: totalRecordsInserted,
          backfill_complete: isComplete,
          mode_switched: isComplete ? 'incremental' : 'backfill'
        });

        return new Response(
          JSON.stringify({
            success: true,
            job_id: job.id,
            chunk: `${job.chunk_start} to ${job.chunk_end}`,
            records_inserted: totalRecordsInserted,
            completed_chunks: newCompletedChunks,
            total_chunks: progress.total_chunks,
            backfill_status: isComplete ? 'completed' : 'in_progress',
            endpoint_results: endpointResults
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Mark job as failed
      const failedEndpoints = endpointResults.filter(r => !r.success);
      const errorMessage = `Failed endpoints: ${failedEndpoints.map(e => `${e.endpoint}: ${e.error}`).join('; ')}`;

      await supabaseClient
        .from('eitje_backfill_queue')
        .update({
          status: 'failed',
          last_error: errorMessage
        })
        .eq('id', job.id);

      console.error('[eitje-backfill-worker] Job failed', { errorMessage });

      return new Response(
        JSON.stringify({
          success: false,
          job_id: job.id,
          error: errorMessage,
          endpoint_results: endpointResults
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('[eitje-backfill-worker] Fatal error:', error);
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

  return new Response(
    JSON.stringify({ success: true, message: 'Processing complete' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
