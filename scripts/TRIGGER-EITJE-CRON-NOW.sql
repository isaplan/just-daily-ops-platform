-- Trigger Eitje incremental sync immediately (for testing)
-- Run this in Supabase SQL Editor to test the cron job fix

-- Call the trigger function directly
SELECT * FROM public.trigger_eitje_incremental_sync();

-- Check the result
SELECT 
  'Trigger function called successfully!' as status,
  'Check edge function logs in Supabase Dashboard → Edge Functions → eitje-incremental-sync → Logs' as next_step;

-- Optional: Check if request was made (pg_net keeps a log)
SELECT 
  id,
  url,
  method,
  status_code,
  created_at
FROM net.http_request_queue
WHERE url LIKE '%eitje-incremental-sync%'
ORDER BY created_at DESC
LIMIT 5;

