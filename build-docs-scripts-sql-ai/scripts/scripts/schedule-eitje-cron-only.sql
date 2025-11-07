-- Schedule Eitje incremental sync cron job
-- Run this in Supabase SQL Editor (pg_cron must already be enabled)

-- 1. Create function to trigger Eitje incremental sync
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

-- 2. Unschedule any existing eitje-incremental-sync jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobname FROM cron.job 
    WHERE jobname LIKE 'eitje-incremental-sync%'
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;
END $$;

-- 3. Schedule the hourly cron job (runs at :00 every hour)
SELECT cron.schedule(
  'eitje-incremental-sync-hourly',
  '0 * * * *',
  $$
  SELECT * FROM public.trigger_eitje_incremental_sync();
  $$
) as job_id;

-- 4. Verify it was scheduled
SELECT 
  jobid, 
  schedule, 
  jobname, 
  active,
  'Scheduled successfully!' as status
FROM cron.job
WHERE jobname = 'eitje-incremental-sync-hourly';

