-- Step 1: Check for duplicates before updating
SELECT 
  eitje_id,
  date,
  user_id,
  COUNT(*) as duplicate_count
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01'
GROUP BY eitje_id, date, user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Step 2: Check records that would become duplicates after update
SELECT 
  eitje_id,
  date,
  (raw_data->'user'->>'id')::INTEGER as user_id_from_jsonb,
  COUNT(*) as would_be_duplicates
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01'
  AND user_id IS NULL
  AND raw_data->'user'->>'id' IS NOT NULL
GROUP BY eitje_id, date, (raw_data->'user'->>'id')::INTEGER
HAVING COUNT(*) > 1
ORDER BY would_be_duplicates DESC
LIMIT 20;

-- Step 3: Update only records that won't create duplicates
-- This updates records where the (eitje_id, date, user_id_from_jsonb) combination doesn't already exist
UPDATE eitje_time_registration_shifts_raw r1
SET user_id = (r1.raw_data->'user'->>'id')::INTEGER
WHERE r1.user_id IS NULL 
  AND r1.raw_data->'user'->>'id' IS NOT NULL
  AND date >= '2025-10-01'
  AND NOT EXISTS (
    SELECT 1 
    FROM eitje_time_registration_shifts_raw r2
    WHERE r2.eitje_id = r1.eitje_id
      AND r2.date = r1.date
      AND r2.user_id = (r1.raw_data->'user'->>'id')::INTEGER
      AND r2.id != r1.id
  );

-- Step 4: For records that would create duplicates, keep only the first one (by id)
-- Delete duplicates, keeping the one with the lowest id
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
  ) sub
  WHERE rn > 1
);

-- Step 5: Now update the remaining records
UPDATE eitje_time_registration_shifts_raw
SET user_id = (raw_data->'user'->>'id')::INTEGER
WHERE user_id IS NULL 
  AND raw_data->'user'->>'id' IS NOT NULL
  AND date >= '2025-10-01';

-- Step 6: Verify the update
SELECT 
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_still_missing_user_id
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01' AND date <= '2025-10-31';

