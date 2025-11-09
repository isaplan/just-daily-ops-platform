-- =====================================================
-- Schedule Eitje V2 cron jobs and pause V1 once live
-- =====================================================
-- Creates new cron jobs:
--  - eitje-incremental-sync-v2-hourly (0 * * * *)
--  - eitje-backfill-worker-v2-frequent (*/5 * * * *)
-- Then unschedules the V1 jobs:
--  - eitje-incremental-sync-hourly
--  - eitje-backfill-worker-frequent
-- =====================================================

-- 1) Schedule V2 incremental hourly
SELECT cron.schedule(
  'eitje-incremental-sync-v2-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/eitje-incremental-sync-v2',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 2) Schedule V2 backfill worker frequent (every 5 minutes)
SELECT cron.schedule(
  'eitje-backfill-worker-v2-frequent',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/eitje-backfill-worker-v2',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 3) Unschedule V1 jobs (pause once V2 is live)
DO $$
BEGIN
  PERFORM cron.unschedule('eitje-incremental-sync-hourly');
EXCEPTION WHEN OTHERS THEN
  -- ignore if not existing
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('eitje-backfill-worker-frequent');
EXCEPTION WHEN OTHERS THEN
  -- ignore if not existing
  NULL;
END $$;


