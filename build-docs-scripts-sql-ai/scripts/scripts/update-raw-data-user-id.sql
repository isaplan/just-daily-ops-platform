-- Update raw data to extract user_id from JSONB if missing
-- This fixes records that were synced before the sync process extracted user_id

UPDATE eitje_time_registration_shifts_raw
SET user_id = COALESCE(
  user_id,  -- Keep existing if present
  (raw_data->'user'->>'id')::INTEGER,  -- Extract from JSONB user.id
  NULL
)
WHERE user_id IS NULL 
  AND raw_data->'user'->>'id' IS NOT NULL
  AND date >= '2025-10-01';

-- Verify the update
SELECT 
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_still_missing_user_id
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01' AND date <= '2025-10-31';

-- Show sample of updated records
SELECT 
  id,
  date,
  user_id,
  environment_id,
  raw_data->'user'->>'id' as user_id_from_jsonb,
  raw_data->'user'->>'name' as user_name_from_jsonb
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-30'
  AND user_id IS NOT NULL
LIMIT 10;

