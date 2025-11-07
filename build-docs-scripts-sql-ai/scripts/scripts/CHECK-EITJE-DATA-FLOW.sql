-- Check Eitje data flow: Raw → Aggregated
-- Run this in Supabase SQL Editor

-- 1. Check recent raw data inserts
SELECT 
  'Raw Time Registration Shifts' as table_name,
  COUNT(*) as total_records,
  MAX(created_at) as latest_record,
  MIN(created_at) as oldest_record
FROM eitje_time_registration_shifts_raw
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'Raw Revenue Days' as table_name,
  COUNT(*) as total_records,
  MAX(created_at) as latest_record,
  MIN(created_at) as oldest_record
FROM eitje_revenue_days_raw
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 2. Check raw data sample (most recent)
SELECT 
  'Recent Time Registration' as source,
  id,
  date,
  created_at
FROM eitje_time_registration_shifts_raw
ORDER BY created_at DESC
LIMIT 5

UNION ALL

SELECT 
  'Recent Revenue Days' as source,
  id::text,
  date,
  created_at
FROM eitje_revenue_days_raw
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check aggregated data (should match raw data dates)
SELECT 
  'Aggregated Labor Hours' as table_name,
  COUNT(*) as total_records,
  MAX(date) as latest_date,
  MAX(created_at) as latest_created
FROM eitje_labor_hours_aggregated
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'Aggregated Revenue Days' as table_name,
  COUNT(*) as total_records,
  MAX(date) as latest_date,
  MAX(created_at) as latest_created
FROM eitje_revenue_days_aggregated
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 4. Check sync state (shows what dates were synced)
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error,
  updated_at
FROM eitje_sync_state
ORDER BY updated_at DESC;

-- 5. Check if there's a gap between raw and aggregated data
SELECT 
  'Date Gap Check' as check_type,
  r.date as raw_date,
  r.created_at as raw_created,
  a.date as aggregated_date,
  a.created_at as aggregated_created,
  CASE 
    WHEN a.date IS NULL THEN 'Missing in aggregated'
    ELSE 'OK'
  END as status
FROM (
  SELECT DISTINCT date, MAX(created_at) as created_at
  FROM eitje_time_registration_shifts_raw
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY date
) r
LEFT JOIN (
  SELECT DISTINCT date, MAX(created_at) as created_at
  FROM eitje_labor_hours_aggregated
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY date
) a ON r.date = a.date
ORDER BY r.date DESC
LIMIT 10;

