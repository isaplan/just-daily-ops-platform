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

    const { current_progress_id } = await req.json().catch(() => ({}));

    console.log('[eitje-backfill-cleanup] Starting cleanup', { current_progress_id });

    let cancelledLogs = 0;
    let failedProgress = 0;
    let failedQueue = 0;

    // 1. Cancel stale api_sync_logs (pending Eitje syncs with >7 day ranges)
    const { data: staleLogs, error: logsError } = await supabaseClient
      .from('api_sync_logs')
      .update({
        status: 'failed',
        error_message: 'Superseded by 7-day chunk limit',
        completed_at: new Date().toISOString()
      })
      .eq('provider', 'eitje')
      .eq('status', 'pending')
      .not('date_range_start', 'is', null)
      .not('date_range_end', 'is', null)
      .select();

    if (logsError) {
      console.error('[eitje-backfill-cleanup] Error cancelling logs:', logsError);
    } else {
      cancelledLogs = staleLogs?.length || 0;
      console.log('[eitje-backfill-cleanup] Cancelled stale logs', { count: cancelledLogs });
    }

    // 2. Mark old backfill progress as failed (except current)
    let progressQuery = supabaseClient
      .from('eitje_backfill_progress')
      .update({
        status: 'failed',
        last_error: 'Superseded by new backfill',
        completed_at: new Date().toISOString()
      })
      .in('status', ['pending', 'in_progress']);

    if (current_progress_id) {
      progressQuery = progressQuery.neq('id', current_progress_id);
    }

    const { data: oldProgress, error: progressError } = await progressQuery.select();

    if (progressError) {
      console.error('[eitje-backfill-cleanup] Error failing old progress:', progressError);
    } else {
      failedProgress = oldProgress?.length || 0;
      console.log('[eitje-backfill-cleanup] Failed old progress records', { count: failedProgress });
    }

    // 3. Mark old queue entries as failed (except current progress)
    let queueQuery = supabaseClient
      .from('eitje_backfill_queue')
      .update({
        status: 'failed',
        error_message: 'Superseded by new backfill'
      })
      .in('status', ['pending', 'processing']);

    if (current_progress_id) {
      queueQuery = queueQuery.neq('progress_id', current_progress_id);
    }

    const { data: oldQueue, error: queueError } = await queueQuery.select();

    if (queueError) {
      console.error('[eitje-backfill-cleanup] Error failing old queue:', queueError);
    } else {
      failedQueue = oldQueue?.length || 0;
      console.log('[eitje-backfill-cleanup] Failed old queue entries', { count: failedQueue });
    }

    console.log('[eitje-backfill-cleanup] Cleanup complete', {
      cancelledLogs,
      failedProgress,
      failedQueue
    });

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_logs: cancelledLogs,
        failed_progress: failedProgress,
        failed_queue: failedQueue,
        message: 'Cleanup completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[eitje-backfill-cleanup] Error:', error);
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
