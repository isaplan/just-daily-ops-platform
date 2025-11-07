-- Fix: Delete old aggregated records without user_id and re-aggregate
-- This script helps clean up old aggregated data that doesn't have user_id

-- Step 1: Delete old aggregated records (optional - only if you want to start fresh)
-- DELETE FROM eitje_labor_hours_aggregated WHERE user_id IS NULL;

-- Step 2: Check if raw data has user_id populated
SELECT 
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_missing_user_id
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01' AND date <= '2025-10-31';

-- Step 3: Check raw_data JSONB for user info
SELECT 
  id,
  user_id as normalized_user_id,
  raw_data->'user'->>'id' as user_id_from_jsonb,
  raw_data->'user'->>'name' as user_name_from_jsonb
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-30'
LIMIT 5;

