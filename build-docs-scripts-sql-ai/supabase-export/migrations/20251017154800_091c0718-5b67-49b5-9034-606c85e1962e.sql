-- Stop all Bork cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobname FROM cron.job WHERE jobname ILIKE '%bork%'
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;
END $$;

-- Clear enabled locations (mode is already 'paused')
UPDATE public.bork_sync_config 
SET enabled_locations = '{}';

-- Push any pending backfill jobs to 7 days in the future
UPDATE public.bork_backfill_queue 
SET next_run_at = NOW() + INTERVAL '7 days'
WHERE status = 'pending';