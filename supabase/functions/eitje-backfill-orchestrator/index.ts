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

    // Fetch sync configuration for worker interval
    const { data: syncConfig, error: configError } = await supabaseClient
      .from('eitje_sync_config')
      .select('worker_interval_minutes')
      .single();

    if (configError) {
      throw new Error(`Failed to fetch sync config: ${configError.message}`);
    }

    const workerIntervalMinutes = syncConfig?.worker_interval_minutes || 5;

    const { 
      start_date = '2024-01-01', 
      end_date = new Date().toISOString().split('T')[0],
      endpoints = ['time_registration_shifts', 'planning_shifts', 'revenue_days']
    } = await req.json();

    console.log('[eitje-backfill] Starting backfill orchestration', {
      start_date,
      end_date,
      endpoints
    });

    // Calculate 6-day chunks (SAFE MARGIN: Eitje API limit is 7, use 6 for safety)
    // Per API docs: time_registration_shifts and planning_shifts have 7-day limit
    const chunks = calculateChunks(start_date, end_date, 6);
    
    console.log('[eitje-backfill] Calculated chunks', {
      total_chunks: chunks.length,
      first_chunk: chunks[0],
      last_chunk: chunks[chunks.length - 1]
    });

    // Create progress tracking record
    const { data: progress, error: progressError } = await supabaseClient
      .from('eitje_backfill_progress')
      .insert({
        endpoint: endpoints.join(','),
        start_date,
        end_date,
        total_chunks: chunks.length,
        status: 'in_progress'
      })
      .select()
      .single();

    if (progressError) {
      throw new Error(`Failed to create progress record: ${progressError.message}`);
    }

    console.log('[eitje-backfill] Created progress record:', progress.id);

    // Enqueue chunks for processing
    const queueInserts = chunks.map((chunk, index) => ({
      progress_id: progress.id,
      chunk_start: chunk.start,
      chunk_end: chunk.end,
      endpoints,
      status: 'pending',
      next_run_at: new Date(Date.now() + (index * workerIntervalMinutes * 60 * 1000)).toISOString()
    }));

    const { error: queueError } = await supabaseClient
      .from('eitje_backfill_queue')
      .insert(queueInserts);

    if (queueError) {
      throw new Error(`Failed to enqueue chunks: ${queueError.message}`);
    }

    console.log('[eitje-backfill] Enqueued chunks', {
      total_chunks: chunks.length,
      first_chunk: chunks[0],
      last_chunk: chunks[chunks.length - 1],
      first_run_at: queueInserts[0].next_run_at,
      last_run_at: queueInserts[queueInserts.length - 1].next_run_at
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Backfill started',
        progress_id: progress.id,
        total_chunks: chunks.length,
        worker_interval_minutes: workerIntervalMinutes,
        estimated_duration_hours: Math.ceil((chunks.length * workerIntervalMinutes) / 60),
        chunks: chunks.map(c => ({ start: c.start, end: c.end }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[eitje-backfill] Fatal error:', error);
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

function calculateChunks(
  startDate: string, 
  endDate: string, 
  chunkSize: number
): Array<{ start: string; end: string }> {
  const chunks = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + chunkSize - 1);

    const finalEnd = chunkEnd > end ? end : chunkEnd;

    chunks.push({
      start: current.toISOString().split('T')[0],
      end: finalEnd.toISOString().split('T')[0]
    });

    current = new Date(chunkEnd);
    current.setDate(current.getDate() + 1);
  }

  return chunks;
}
