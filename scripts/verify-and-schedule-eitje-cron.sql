-- Verify pg_cron is enabled and schedule Eitje incremental sync
-- Run this in Supabase SQL Editor

-- 1. Verify pg_cron is enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_cron';

-- 2. Check existing cron jobs
SELECT jobid, schedule, jobname, active, command
FROM cron.job
ORDER BY jobid;

-- 3. Create function to trigger Eitje incremental sync (if not exists)
CREATE OR REPLACE FUNCTION public.trigger_eitje_incremental_sync()
RETURNS TABLE(request_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    http.post(
      url:='https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-incremental-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
END;
$$;

-- 4. Unschedule any existing eitje-incremental-sync jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobname FROM cron.job 
    WHERE jobname LIKE 'eitje-incremental-sync%'
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
    RAISE NOTICE 'Unscheduled existing job: %', job_record.jobname;
  END LOOP;
END $$;

-- 5. Schedule the hourly cron job
SELECT cron.schedule(
  'eitje-incremental-sync-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT * FROM public.trigger_eitje_incremental_sync();
  $$
) as job_id;

-- 6. Verify the job was scheduled
SELECT jobid, schedule, jobname, active
FROM cron.job
WHERE jobname = 'eitje-incremental-sync-hourly';

