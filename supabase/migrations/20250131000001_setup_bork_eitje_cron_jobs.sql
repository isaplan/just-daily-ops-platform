-- Setup Cron Jobs for Bork and Eitje Regular Syncs
-- This migration creates scheduled cron jobs that sync data from Bork and Eitje APIs

-- ============================================================================
-- BORK CRON JOB SETUP
-- ============================================================================

-- Remove any existing bork cron jobs first (cleanup)
DO $$
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN ('bork-daily-sync', 'bork-incremental-sync-hourly', 'bork-incremental-sync-daily');
END $$;

-- Create Bork incremental sync cron job (runs every hour)
-- This will sync the last 24 hours of data
SELECT cron.schedule(
  'bork-incremental-sync-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/bork-incremental-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}'::jsonb,
      body:='{"sync_type": "incremental", "hours_back": 24}'::jsonb
    ) as request_id;
  $$
);

-- ============================================================================
-- EITJE CRON JOB SETUP
-- ============================================================================

-- Remove any existing eitje cron jobs first (cleanup)
DO $$
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN ('eitje-incremental-sync-hourly', 'eitje-daily-sync', 'eitje-incremental-sync-daily');
END $$;

-- Create Eitje incremental sync cron job (runs every hour)
-- This will sync yesterday's data (edge function handles date calculation automatically)
SELECT cron.schedule(
  'eitje-incremental-sync-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/eitje-incremental-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================================================
-- HELPER FUNCTIONS TO ENABLE/DISABLE CRON JOBS
-- ============================================================================

-- Function to enable/disable Bork sync
CREATE OR REPLACE FUNCTION public.toggle_bork_cron_jobs(enabled BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF enabled THEN
    -- Enable by scheduling (will replace if exists)
    PERFORM cron.schedule(
      'bork-incremental-sync-hourly',
      '0 * * * *',
      $$
      SELECT
        net.http_post(
          url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/bork-incremental-sync',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}'::jsonb,
          body:='{"sync_type": "incremental", "hours_back": 24}'::jsonb
        ) as request_id;
      $$
    );
  ELSE
    -- Disable by unscheduling
    PERFORM cron.unschedule('bork-incremental-sync-hourly');
  END IF;
END;
$$;

-- Function to enable/disable Eitje sync
CREATE OR REPLACE FUNCTION public.toggle_eitje_cron_jobs(enabled BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF enabled THEN
    -- Enable by scheduling (will replace if exists)
    PERFORM cron.schedule(
      'eitje-incremental-sync-hourly',
      '0 * * * *',
      $$
      SELECT
        net.http_post(
          url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/eitje-incremental-sync',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}'::jsonb,
          body:='{}'::jsonb
        ) as request_id;
      $$
    );
  ELSE
    -- Disable by unscheduling
    PERFORM cron.unschedule('eitje-incremental-sync-hourly');
  END IF;
END;
$$;

-- ============================================================================
-- INITIAL STATE: JOBS ARE ENABLED BY DEFAULT
-- ============================================================================

-- Jobs are created and enabled by default
-- Use toggle functions to disable:
-- SELECT public.toggle_bork_cron_jobs(false);
-- SELECT public.toggle_eitje_cron_jobs(false);

