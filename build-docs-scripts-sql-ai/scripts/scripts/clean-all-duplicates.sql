-- Step 1: Check the exact problem - see what records exist for this combination
SELECT 
  id,
  eitje_id,
  date,
  user_id,
  (raw_data->'user'->>'id')::INTEGER as user_id_from_jsonb,
  created_at,
  updated_at
FROM eitje_time_registration_shifts_raw
WHERE eitje_id = 22653391 
  AND date = '2025-10-01'
ORDER BY id;

-- Step 2: Find ALL duplicate combinations (including existing ones)
SELECT 
  eitje_id,
  date,
  user_id,
  COUNT(*) as count
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01'
  AND user_id IS NOT NULL
GROUP BY eitje_id, date, user_id
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- Step 3: Delete ALL duplicate records, keeping only the oldest one (lowest id)
DELETE FROM eitje_time_registration_shifts_raw
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY eitje_id, date, user_id 
        ORDER BY id ASC
      ) as rn
    FROM eitje_time_registration_shifts_raw
    WHERE date >= '2025-10-01'
      AND user_id IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Step 4: Now handle NULL user_id records that would create duplicates
-- Delete NULL records where a record with user_id already exists
DELETE FROM eitje_time_registration_shifts_raw
WHERE user_id IS NULL
  AND raw_data->'user'->>'id' IS NOT NULL
  AND date >= '2025-10-01'
  AND EXISTS (
    SELECT 1 
    FROM eitje_time_registration_shifts_raw r2
    WHERE r2.eitje_id = eitje_time_registration_shifts_raw.eitje_id
      AND r2.date = eitje_time_registration_shifts_raw.date
      AND r2.user_id = (eitje_time_registration_shifts_raw.raw_data->'user'->>'id')::INTEGER
      AND r2.user_id IS NOT NULL
  );

-- Step 5: Also delete NULL records that would duplicate each other
DELETE FROM eitje_time_registration_shifts_raw
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY eitje_id, date, (raw_data->'user'->>'id')::INTEGER 
        ORDER BY id ASC
      ) as rn
    FROM eitje_time_registration_shifts_raw
    WHERE date >= '2025-10-01'
      AND user_id IS NULL
      AND raw_data->'user'->>'id' IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Step 6: Now safely update remaining NULL records
UPDATE eitje_time_registration_shifts_raw
SET user_id = (raw_data->'user'->>'id')::INTEGER
WHERE user_id IS NULL 
  AND raw_data->'user'->>'id' IS NOT NULL
  AND date >= '2025-10-01';

-- Step 7: Final verification - check for any remaining duplicates
SELECT 
  'Final check - duplicates' as check_type,
  eitje_id,
  date,
  user_id,
  COUNT(*) as count
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01'
  AND user_id IS NOT NULL
GROUP BY eitje_id, date, user_id
HAVING COUNT(*) > 1;

-- Step 8: Summary
SELECT 
  'Summary' as check_type,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_still_missing_user_id
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01' AND date <= '2025-10-31';

