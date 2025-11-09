-- =====================================================
-- Add Missing Fields to eitje_users
-- =====================================================
-- Extracts additional fields from raw_data JSONB

-- Add missing columns
ALTER TABLE IF EXISTS public.eitje_users
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Backfill name from raw_data
UPDATE public.eitje_users
SET name = raw_data->>'name'
WHERE name IS NULL AND raw_data->>'name' IS NOT NULL;

-- Backfill code from raw_data
UPDATE public.eitje_users
SET code = raw_data->>'code'
WHERE code IS NULL AND raw_data->>'code' IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.eitje_users.name IS 'Full name of the user (from raw_data.name)';
COMMENT ON COLUMN public.eitje_users.code IS 'Code/identifier for the user (from raw_data.code)';

-- Note: contract_type, hourly_wage, contract_hours will be added via worker_profiles table
-- as part of the unified entities feature




