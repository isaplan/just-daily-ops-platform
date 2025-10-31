-- Fix Eitje cron trigger function
-- This updates the function to use pg_net (more reliable) if available
-- Or keeps http.post if pg_net is not available
-- Run this in Supabase SQL Editor

-- First, try to use pg_net if available (more reliable for edge functions)
DO $$
DECLARE
  has_pg_net BOOLEAN;
  has_http BOOLEAN;
BEGIN
  -- Check if pg_net extension exists
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) INTO has_pg_net;
  
  -- Check if http extension exists
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'http'
  ) INTO has_http;
  
  IF has_pg_net THEN
    -- Use pg_net (preferred method)
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
    
    RAISE NOTICE 'Updated trigger function to use pg_net extension';
    
  ELSIF has_http THEN
    -- Use http extension (fallback)
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
    
    RAISE NOTICE 'Updated trigger function to use http extension';
    
  ELSE
    RAISE EXCEPTION 'Neither pg_net nor http extension is available. Please enable one in Database → Extensions';
  END IF;
END $$;

-- Verify the function was updated
SELECT 
  routine_name,
  'Function updated successfully' as status
FROM information_schema.routines
WHERE routine_name = 'trigger_eitje_incremental_sync'
  AND routine_schema = 'public';

