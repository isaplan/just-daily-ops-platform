import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('[bork-backfill-worker] Starting worker');

    // Check sync configuration
    const { data: config, error: configError } = await supabaseClient
      .from('bork_sync_config')
      .select('mode')
      .single();

    if (configError) {
      throw new Error('Sync configuration not found');
    }

    // Skip if sync is paused
    if (config.mode !== 'active') {
      console.log('[bork-backfill-worker] Sync is paused, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Sync is paused' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch next pending job that's ready to run
    const { data: job, error: jobError } = await supabaseClient
      .from('bork_backfill_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw new Error(`Failed to fetch job: ${jobError.message}`);
    }

    if (!job) {
      console.log('[bork-backfill-worker] No pending jobs ready to run');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[bork-backfill-worker] Processing job', {
      job_id: job.id,
      location_id: job.location_id,
      date: job.chunk_start
    });

    // Mark job as processing
    await supabaseClient
      .from('bork_backfill_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Call bork-api-sync for this specific day and location
    const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke(
      'bork-api-sync',
      {
        body: {
          locationId: job.location_id,
          startDate: job.chunk_start,
          endDate: job.chunk_end,
          syncType: 'backfill',
          syncTrigger: 'automated'
        }
      }
    );

    if (syncError) {
      console.error('[bork-backfill-worker] Sync failed:', syncError);
      
      // Mark job as failed
      await supabaseClient
        .from('bork_backfill_queue')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: syncError.message
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: syncError.message,
          job_id: job.id
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const recordsInserted = syncResult?.records_inserted || 0;

    console.log('[bork-backfill-worker] Sync completed', {
      job_id: job.id,
      records_inserted: recordsInserted
    });

    // Mark job as completed
    await supabaseClient
      .from('bork_backfill_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_inserted: recordsInserted
      })
      .eq('id', job.id);

    // Update progress
    const { data: progress } = await supabaseClient
      .from('bork_backfill_progress')
      .select('*')
      .eq('id', job.progress_id)
      .single();

    if (progress) {
      const newCompletedChunks = progress.completed_chunks + 1;
      const newRecordsFetched = progress.records_fetched + recordsInserted;

      await supabaseClient
        .from('bork_backfill_progress')
        .update({
          completed_chunks: newCompletedChunks,
          records_fetched: newRecordsFetched,
          current_chunk_start: job.chunk_start,
          current_chunk_end: job.chunk_end
        })
        .eq('id', job.progress_id);

      // Check if backfill is complete
      if (newCompletedChunks >= progress.total_chunks) {
        console.log('[bork-backfill-worker] Backfill completed!');
        
        await supabaseClient
          .from('bork_backfill_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.progress_id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        job_id: job.id,
        records_inserted: recordsInserted,
        date: job.chunk_start
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[bork-backfill-worker] Fatal error:', error);
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
