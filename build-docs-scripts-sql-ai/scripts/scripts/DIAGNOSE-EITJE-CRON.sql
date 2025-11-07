-- Diagnostic script for Eitje cron job
-- Run this in Supabase SQL Editor

-- 1. Check if cron job is actually executing
SELECT 
  j.jobid,
  j.jobname,
  j.active,
  j.schedule,
  COUNT(d.jobid) as execution_count,
  MAX(d.start_time) as last_execution,
  MAX(d.end_time) as last_completion,
  MAX(d.status) as last_status
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE '%eitje%'
GROUP BY j.jobid, j.jobname, j.active, j.schedule;

-- 2. Check recent execution history
SELECT 
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = 2  -- Replace with your actual jobid from step 1
ORDER BY start_time DESC
LIMIT 10;

-- 3. Test the trigger function manually (this should work)
SELECT * FROM public.trigger_eitje_incremental_sync();

-- 4. Check if http extension exists and works
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('http', 'pg_net');

-- 5. Verify edge function URL is correct
-- (The function uses hardcoded URL - verify it matches your project)
SELECT 
  'Function uses URL: https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-incremental-sync' as info,
  'Check if this matches your Supabase project URL' as note;

-- 6. Check if there are any errors in the function definition
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'trigger_eitje_incremental_sync'
  AND routine_schema = 'public';

