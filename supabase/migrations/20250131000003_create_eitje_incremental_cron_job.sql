-- Create Eitje incremental sync cron job
-- This schedules the eitje-incremental-sync edge function to run hourly
-- 
-- NOTE: pg_cron must be enabled in Supabase Dashboard first:
-- 1. Go to Database → Extensions
-- 2. Enable "pg_cron" extension
-- 3. Or contact Supabase support to enable it

-- First, ensure we have the pg_net extension (more reliable than http)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Try to enable pg_cron (will fail gracefully if not available)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron extension could not be enabled. Please enable it in Supabase Dashboard → Database → Extensions.';
END $$;

-- Create a function to trigger Eitje incremental sync
CREATE OR REPLACE FUNCTION public.trigger_eitje_incremental_sync()
RETURNS TABLE(request_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    net.http_post(
      url:='https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-incremental-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
END;
$$;

-- Unschedule any existing eitje-incremental-sync jobs
-- Only if pg_cron extension is enabled
DO $$
DECLARE
  job_record RECORD;
  extension_exists BOOLEAN;
BEGIN
  -- Check if pg_cron extension exists
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO extension_exists;
  
  IF extension_exists THEN
    -- Check if cron.job table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'cron' AND table_name = 'job'
    ) THEN
      FOR job_record IN 
        SELECT jobname FROM cron.job 
        WHERE jobname LIKE 'eitje-incremental-sync%'
      LOOP
        PERFORM cron.unschedule(job_record.jobname);
      END LOOP;
    END IF;
  END IF;
END $$;

-- Schedule the hourly cron job (only if pg_cron is available)
-- This runs at minute 0 of every hour (e.g., 12:00, 13:00, 14:00)
DO $$
BEGIN
  -- Check if pg_cron is enabled and cron.job table exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    -- Schedule the cron job
    PERFORM cron.schedule(
      'eitje-incremental-sync-hourly',
      '0 * * * *', -- Every hour at minute 0
      $$
      SELECT * FROM public.trigger_eitje_incremental_sync();
      $$
    );
    RAISE NOTICE 'Eitje incremental sync cron job scheduled successfully';
  ELSE
    RAISE WARNING 'pg_cron extension is not available. Cannot schedule cron job.';
    RAISE WARNING 'To enable: Go to Supabase Dashboard → Database → Extensions → Enable "pg_cron"';
  END IF;
END $$;

-- Add comment
COMMENT ON FUNCTION public.trigger_eitje_incremental_sync() IS 
  'Triggers the eitje-incremental-sync edge function. Called by pg_cron hourly.';

