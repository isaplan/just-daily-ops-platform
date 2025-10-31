-- Test Eitje Incremental Sync Manually
-- Run these queries to verify and trigger the sync

-- 1. Check if cron job is scheduled
SELECT 
  jobid,
  schedule,
  jobname,
  active,
  command
FROM cron.job
WHERE jobname = 'eitje-incremental-sync-hourly';

-- 2. Check if edge function can be called (via function)
SELECT * FROM public.trigger_eitje_incremental_sync();

-- 3. Verify sync state table exists and is ready
SELECT 
  'eitje_sync_state table exists' as status,
  COUNT(*) as current_entries
FROM eitje_sync_state;

-- 4. Check if sync config is set to incremental mode
SELECT 
  mode,
  incremental_interval_minutes,
  enabled_endpoints
FROM eitje_sync_config
ORDER BY updated_at DESC
LIMIT 1;

