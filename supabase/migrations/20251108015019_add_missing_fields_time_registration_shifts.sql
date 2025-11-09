-- =====================================================
-- Add Missing Fields to eitje_time_registration_shifts_processed
-- =====================================================
-- Extracts additional fields from raw_data JSONB that were not previously extracted

-- Add missing columns
ALTER TABLE IF EXISTS public.eitje_time_registration_shifts_processed
ADD COLUMN IF NOT EXISTS approved BOOLEAN,
ADD COLUMN IF NOT EXISTS meals JSONB,
ADD COLUMN IF NOT EXISTS check_in_ids INTEGER[],
ADD COLUMN IF NOT EXISTS planning_shift_id INTEGER,
ADD COLUMN IF NOT EXISTS exported_to_hr_integration BOOLEAN,
ADD COLUMN IF NOT EXISTS api_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS api_updated_at TIMESTAMPTZ;

-- Backfill approved from raw_data
UPDATE public.eitje_time_registration_shifts_processed
SET approved = (raw_data->>'approved')::BOOLEAN
WHERE approved IS NULL AND raw_data->>'approved' IS NOT NULL;

-- Backfill meals from raw_data
UPDATE public.eitje_time_registration_shifts_processed
SET meals = raw_data->'meals'
WHERE meals IS NULL AND raw_data->'meals' IS NOT NULL;

-- Backfill check_in_ids from raw_data (convert JSON array to INTEGER[])
UPDATE public.eitje_time_registration_shifts_processed
SET check_in_ids = ARRAY(
  SELECT jsonb_array_elements_text(raw_data->'check_in_ids')
)::INTEGER[]
WHERE check_in_ids IS NULL 
  AND raw_data->'check_in_ids' IS NOT NULL 
  AND jsonb_typeof(raw_data->'check_in_ids') = 'array';

-- Backfill planning_shift_id from raw_data
UPDATE public.eitje_time_registration_shifts_processed
SET planning_shift_id = (raw_data->>'planning_shift_id')::INTEGER
WHERE planning_shift_id IS NULL AND raw_data->>'planning_shift_id' IS NOT NULL;

-- Backfill exported_to_hr_integration from raw_data
UPDATE public.eitje_time_registration_shifts_processed
SET exported_to_hr_integration = (raw_data->>'exported_to_hr_integration')::BOOLEAN
WHERE exported_to_hr_integration IS NULL AND raw_data->>'exported_to_hr_integration' IS NOT NULL;

-- Backfill api_created_at from raw_data
UPDATE public.eitje_time_registration_shifts_processed
SET api_created_at = (raw_data->>'created_at')::TIMESTAMPTZ
WHERE api_created_at IS NULL AND raw_data->>'created_at' IS NOT NULL;

-- Backfill api_updated_at from raw_data
UPDATE public.eitje_time_registration_shifts_processed
SET api_updated_at = (raw_data->>'updated_at')::TIMESTAMPTZ
WHERE api_updated_at IS NULL AND raw_data->>'updated_at' IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed.approved IS 'Whether the shift has been approved (from raw_data.approved)';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed.meals IS 'Meals associated with the shift (from raw_data.meals)';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed.check_in_ids IS 'Array of check-in IDs (from raw_data.check_in_ids)';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed.planning_shift_id IS 'Reference to planning shift if applicable (from raw_data.planning_shift_id)';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed.exported_to_hr_integration IS 'Whether shift has been exported to HR integration (from raw_data.exported_to_hr_integration)';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed.api_created_at IS 'Original created_at timestamp from Eitje API (from raw_data.created_at)';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed.api_updated_at IS 'Original updated_at timestamp from Eitje API (from raw_data.updated_at)';




