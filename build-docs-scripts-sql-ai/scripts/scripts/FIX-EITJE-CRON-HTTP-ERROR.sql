-- Fix Eitje cron trigger: Replace http.post with net.http_post
-- The http extension exists but http.post() function is not available
-- pg_net extension's net.http_post() is more reliable for Supabase edge functions
-- Run this in Supabase SQL Editor

-- Update the trigger function to use pg_net instead of http
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

-- Verify the function was updated
SELECT 
  routine_name,
  'Function updated to use pg_net.net.http_post' as status,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'trigger_eitje_incremental_sync'
  AND routine_schema = 'public';

-- Test the function (should work now)
SELECT * FROM public.trigger_eitje_incremental_sync();

