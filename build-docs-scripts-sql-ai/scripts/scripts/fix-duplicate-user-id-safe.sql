-- Safe approach: Update user_id only where it won't create duplicates
-- This script handles the duplicate key constraint violation

-- Step 1: First, check what we're dealing with
SELECT 
  'Current state' as check_type,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_missing_user_id
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01' AND date <= '2025-10-31';

-- Step 2: Check for potential duplicates after update
SELECT 
  'Potential duplicates' as check_type,
  eitje_id,
  date,
  (raw_data->'user'->>'id')::INTEGER as user_id_from_jsonb,
  COUNT(*) as count
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01'
  AND user_id IS NULL
  AND raw_data->'user'->>'id' IS NOT NULL
GROUP BY eitje_id, date, (raw_data->'user'->>'id')::INTEGER
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- Step 3: Check if there are existing records with the same (eitje_id, date, user_id) that would conflict
SELECT 
  'Conflicting records' as check_type,
  r1.eitje_id,
  r1.date,
  (r1.raw_data->'user'->>'id')::INTEGER as user_id_from_jsonb,
  COUNT(*) as conflicting_count
FROM eitje_time_registration_shifts_raw r1
WHERE r1.date >= '2025-10-01'
  AND r1.user_id IS NULL
  AND r1.raw_data->'user'->>'id' IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM eitje_time_registration_shifts_raw r2
    WHERE r2.eitje_id = r1.eitje_id
      AND r2.date = r1.date
      AND r2.user_id = (r1.raw_data->'user'->>'id')::INTEGER
      AND r2.id != r1.id
  )
GROUP BY r1.eitje_id, r1.date, (r1.raw_data->'user'->>'id')::INTEGER
LIMIT 10;

-- Step 4: Delete duplicate NULL user_id records (keep the one with lowest id)
-- This removes records that would create duplicates if we updated them
DELETE FROM eitje_time_registration_shifts_raw
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY eitje_id, date, (raw_data->'user'->>'id')::INTEGER 
        ORDER BY id
      ) as rn
    FROM eitje_time_registration_shifts_raw
    WHERE date >= '2025-10-01'
      AND user_id IS NULL
      AND raw_data->'user'->>'id' IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM eitje_time_registration_shifts_raw r2
        WHERE r2.eitje_id = eitje_time_registration_shifts_raw.eitje_id
          AND r2.date = eitje_time_registration_shifts_raw.date
          AND r2.user_id = (eitje_time_registration_shifts_raw.raw_data->'user'->>'id')::INTEGER
          AND r2.id != eitje_time_registration_shifts_raw.id
      )
  ) sub
  WHERE rn > 1
);

-- Step 5: Now safely update records that won't create duplicates
UPDATE eitje_time_registration_shifts_raw
SET user_id = (raw_data->'user'->>'id')::INTEGER
WHERE user_id IS NULL 
  AND raw_data->'user'->>'id' IS NOT NULL
  AND date >= '2025-10-01'
  AND NOT EXISTS (
    SELECT 1 
    FROM eitje_time_registration_shifts_raw r2
    WHERE r2.eitje_id = eitje_time_registration_shifts_raw.eitje_id
      AND r2.date = eitje_time_registration_shifts_raw.date
      AND r2.user_id = (eitje_time_registration_shifts_raw.raw_data->'user'->>'id')::INTEGER
      AND r2.id != eitje_time_registration_shifts_raw.id
  );

-- Step 6: Verify final state
SELECT 
  'Final state' as check_type,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_still_missing_user_id
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01' AND date <= '2025-10-31';

-- Step 7: Show sample of updated records
SELECT 
  id,
  eitje_id,
  date,
  user_id,
  environment_id,
  raw_data->'user'->>'name' as user_name
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-30'
  AND user_id IS NOT NULL
ORDER BY date DESC, user_id
LIMIT 10;

