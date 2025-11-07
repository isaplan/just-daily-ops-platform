-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule eitje-backfill-worker to run every hour
SELECT cron.schedule(
  'eitje-backfill-worker-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/eitje-backfill-worker',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);