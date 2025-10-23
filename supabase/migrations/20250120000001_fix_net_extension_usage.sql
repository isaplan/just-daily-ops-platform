-- Fix migrations that use net.http_post() to use http.post() instead
-- This migration updates all functions that use the net extension

-- Update the eitje backfill cron function to use http extension
CREATE OR REPLACE FUNCTION public.update_eitje_backfill_cron(interval_minutes INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cron_schedule TEXT;
  cron_command TEXT;
BEGIN
  -- Unschedule any existing eitje backfill worker jobs
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname LIKE 'eitje-backfill-worker%';
  
  -- Build the cron schedule string
  cron_schedule := format('*/%s * * * *', interval_minutes);
  
  -- Build the command to execute using http extension instead of net
  cron_command := 'SELECT http.post(url:=''https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-backfill-worker'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o"}''::jsonb, body:=''{}''::jsonb) as request_id;';
  
  -- Schedule new job with updated interval
  PERFORM cron.schedule(
    'eitje-backfill-worker',
    cron_schedule,
    cron_command
  );
END;
$$;

-- Update the bork backfill cron function to use http extension
CREATE OR REPLACE FUNCTION public.update_bork_backfill_cron(interval_minutes INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cron_schedule TEXT;
  cron_command TEXT;
BEGIN
  -- Unschedule any existing bork backfill worker jobs
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname LIKE 'bork-backfill-worker%';
  
  -- Build the cron schedule string
  cron_schedule := format('*/%s * * * *', interval_minutes);
  
  -- Build the command to execute using http extension instead of net
  cron_command := 'SELECT http.post(url:=''https://vrucbxdudchboznunndz.supabase.co/functions/v1/bork-backfill-worker'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o"}''::jsonb, body:=''{}''::jsonb) as request_id;';
  
  -- Schedule new job with updated interval
  PERFORM cron.schedule(
    'bork-backfill-worker',
    cron_schedule,
    cron_command
  );
END;
$$;

-- Update the bork incremental sync function to use http extension
CREATE OR REPLACE FUNCTION public.trigger_bork_incremental_sync()
RETURNS TABLE(request_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    http.post(
      url:='https://vrucbxdudchboznunndz.supabase.co/functions/v1/bork-incremental-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
END;
$$;

-- Update the eitje backfill worker trigger function to use http extension
CREATE OR REPLACE FUNCTION public.trigger_eitje_backfill_worker()
RETURNS TABLE(request_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    http.post(
      url:='https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-backfill-worker',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
END;
$$;
