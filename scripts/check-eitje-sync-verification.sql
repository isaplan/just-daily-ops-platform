-- Verification queries for Eitje incremental sync
-- Run these in Supabase SQL Editor to check sync status

-- 1. Check sync state (primary way to verify incremental sync is working)
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error,
  updated_at
FROM eitje_sync_state
ORDER BY endpoint, updated_at DESC;

-- 2. Check sync logs (without provider column - use sync_type instead)
SELECT 
  id,
  started_at,
  status,
  sync_type,
  records_inserted,
  error_message,
  metadata
FROM api_sync_logs
WHERE sync_type LIKE '%eitje%' 
   OR sync_type LIKE '%time_registration%'
   OR sync_type LIKE '%revenue%'
ORDER BY started_at DESC
LIMIT 10;

-- 3. Check recent raw data inserts
SELECT 
  'time_registration_shifts' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  MAX(date) as latest_date
FROM eitje_time_registration_shifts_raw
WHERE created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'revenue_days' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  MAX(date) as latest_date
FROM eitje_revenue_days_raw
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 4. Check if sync state exists and when last synced
SELECT 
  endpoint,
  last_synced_date,
  CASE 
    WHEN last_synced_date = CURRENT_DATE - 1 THEN '✅ Up to date (yesterday)'
    WHEN last_synced_date < CURRENT_DATE - 1 THEN '⚠️ Behind by ' || (CURRENT_DATE - 1 - last_synced_date) || ' day(s)'
    WHEN last_synced_date = CURRENT_DATE THEN '⚠️ Synced today (should not happen)'
    ELSE 'ℹ️ Status unknown'
  END as sync_status,
  last_successful_sync_at,
  records_synced
FROM eitje_sync_state;

