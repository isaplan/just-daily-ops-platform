-- Quick fix: Delete NULL user_id records that would conflict with existing records
-- This keeps the record that already has user_id populated

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

-- Then update the remaining NULL records
UPDATE eitje_time_registration_shifts_raw
SET user_id = (raw_data->'user'->>'id')::INTEGER
WHERE user_id IS NULL 
  AND raw_data->'user'->>'id' IS NOT NULL
  AND date >= '2025-10-01';

