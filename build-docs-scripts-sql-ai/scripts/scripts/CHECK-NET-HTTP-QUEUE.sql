-- Check pg_net HTTP request queue (fixed column names)
-- Run this in Supabase SQL Editor

-- Check recent HTTP requests made via pg_net
SELECT 
  id,
  url,
  method,
  status,
  created_at,
  updated_at
FROM net.http_request_queue
WHERE url LIKE '%eitje-incremental-sync%'
ORDER BY created_at DESC
LIMIT 10;

-- Check completed requests (with response)
-- Note: column names may vary, adjust based on your pg_net version
SELECT 
  id,
  url,
  method,
  status,
  created_at,
  updated_at
FROM net.http_request_queue
WHERE url LIKE '%eitje-incremental-sync%'
ORDER BY created_at DESC
LIMIT 10;

