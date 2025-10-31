-- Check sync logs to see if edge function is logging
-- Run this in Supabase SQL Editor

-- Check api_sync_logs for recent Eitje syncs
SELECT 
  id,
  started_at,
  completed_at,
  status,
  sync_type,
  location_id,
  error_message,
  -- Try to get records_inserted if column exists
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'api_sync_logs' AND column_name = 'records_inserted'
    ) THEN records_inserted::text
    ELSE 'N/A (column not found)'
  END as records_inserted
FROM api_sync_logs
WHERE started_at >= NOW() - INTERVAL '1 hour'
  AND (
    sync_type LIKE '%eitje%' 
    OR sync_type LIKE '%time_registration%' 
    OR sync_type LIKE '%revenue%'
    OR sync_type LIKE '%planning%'
  )
ORDER BY started_at DESC
LIMIT 20;

-- Check if eitje_sync_state has been updated
SELECT 
  endpoint,
  last_successful_sync_at,
  last_synced_date,
  records_synced,
  last_error,
  updated_at
FROM eitje_sync_state
ORDER BY updated_at DESC;

