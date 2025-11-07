-- Step 1: Identify the exact duplicate causing the error
SELECT 
  id,
  eitje_id,
  date,
  user_id,
  (raw_data->'user'->>'id')::INTEGER as user_id_from_jsonb,
  created_at
FROM eitje_time_registration_shifts_raw
WHERE eitje_id = 22653391 
  AND date = '2025-10-01'
ORDER BY id;

-- Step 2: Find ALL records that would create this duplicate
SELECT 
  id,
  eitje_id,
  date,
  user_id,
  (raw_data->'user'->>'id')::INTEGER as user_id_from_jsonb,
  CASE 
    WHEN user_id IS NULL AND (raw_data->'user'->>'id')::INTEGER = 30396 THEN 'NULL that would become 30396'
    WHEN user_id = 30396 THEN 'Already has 30396'
    ELSE 'Other'
  END as status
FROM eitje_time_registration_shifts_raw
WHERE eitje_id = 22653391 
  AND date = '2025-10-01'
ORDER BY id;

-- Step 3: Solution - Delete records with NULL user_id that would duplicate existing records
-- Keep the record that already has user_id set, delete the NULL ones
DELETE FROM eitje_time_registration_shifts_raw
WHERE id IN (
  SELECT r1.id
  FROM eitje_time_registration_shifts_raw r1
  WHERE r1.user_id IS NULL
    AND r1.raw_data->'user'->>'id' IS NOT NULL
    AND r1.date >= '2025-10-01'
    AND EXISTS (
      SELECT 1 
      FROM eitje_time_registration_shifts_raw r2
      WHERE r2.eitje_id = r1.eitje_id
        AND r2.date = r1.date
        AND r2.user_id = (r1.raw_data->'user'->>'id')::INTEGER
        AND r2.id != r1.id
        AND r2.user_id IS NOT NULL  -- The existing record already has user_id
    )
);

-- Step 4: Now safely update remaining NULL records
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

-- Step 5: Verify - check for any remaining duplicates
SELECT 
  eitje_id,
  date,
  user_id,
  COUNT(*) as duplicate_count
FROM eitje_time_registration_shifts_raw
WHERE date >= '2025-10-01'
  AND user_id IS NOT NULL
GROUP BY eitje_id, date, user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

