-- SAFE Verification queries for Eitje incremental sync
-- These queries only use columns that definitely exist
-- Run these in Supabase SQL Editor

-- 1. Check sync state (PRIMARY VERIFICATION - this is the key check)
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error,
  updated_at
FROM eitje_sync_state
ORDER BY endpoint, updated_at DESC;

-- 2. Check sync logs (using only columns that definitely exist)
SELECT 
  id,
  started_at,
  status,
  sync_type,
  error_message
FROM api_sync_logs
WHERE sync_type LIKE '%eitje%' 
   OR sync_type LIKE '%time_registration%'
   OR sync_type LIKE '%revenue%'
ORDER BY started_at DESC
LIMIT 10;

-- 3. Check recent raw data inserts (these tables definitely exist)
SELECT 
  'time_registration_shifts' as table_name,
  COUNT(*) as total_records,
  MAX(created_at) as newest_record,
  MAX(date) as latest_date
FROM eitje_time_registration_shifts_raw
WHERE created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'revenue_days' as table_name,
  COUNT(*) as total_records,
  MAX(created_at) as newest_record,
  MAX(date) as latest_date
FROM eitje_revenue_days_raw
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 4. Check sync status summary
SELECT 
  endpoint,
  last_synced_date,
  CASE 
    WHEN last_synced_date = CURRENT_DATE - 1 THEN '✅ Up to date (yesterday)'
    WHEN last_synced_date < CURRENT_DATE - 1 THEN '⚠️ Behind by ' || (CURRENT_DATE - 1 - last_synced_date) || ' day(s)'
    ELSE 'ℹ️ Status unknown'
  END as sync_status,
  last_successful_sync_at,
  records_synced
FROM eitje_sync_state;

-- 5. Simple check: Does sync state table exist and have data?
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ No sync state entries yet (first run not completed)'
    ELSE '✅ Sync state exists with ' || COUNT(*) || ' endpoint(s)'
  END as status,
  COUNT(*) as endpoint_count,
  MIN(last_synced_date) as oldest_sync_date,
  MAX(last_synced_date) as newest_sync_date
FROM eitje_sync_state;

