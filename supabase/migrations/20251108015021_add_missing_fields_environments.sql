-- =====================================================
-- Add Missing Fields to eitje_environments
-- =====================================================
-- Extracts additional fields from raw_data JSONB

-- Add missing columns
ALTER TABLE IF EXISTS public.eitje_environments
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

-- Backfill address from raw_data
UPDATE public.eitje_environments
SET address = raw_data->>'address'
WHERE address IS NULL AND raw_data->>'address' IS NOT NULL;

-- Backfill postal_code from raw_data
UPDATE public.eitje_environments
SET postal_code = raw_data->>'postal_code'
WHERE postal_code IS NULL AND raw_data->>'postal_code' IS NOT NULL;

-- Backfill timezone from raw_data
UPDATE public.eitje_environments
SET timezone = raw_data->>'timezone'
WHERE timezone IS NULL AND raw_data->>'timezone' IS NOT NULL;

-- Backfill code from raw_data
UPDATE public.eitje_environments
SET code = raw_data->>'code'
WHERE code IS NULL AND raw_data->>'code' IS NOT NULL;

-- Backfill type from raw_data
UPDATE public.eitje_environments
SET type = raw_data->>'type'
WHERE type IS NULL AND raw_data->>'type' IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.eitje_environments.address IS 'Physical address of the environment (from raw_data.address)';
COMMENT ON COLUMN public.eitje_environments.postal_code IS 'Postal code of the environment (from raw_data.postal_code)';
COMMENT ON COLUMN public.eitje_environments.timezone IS 'Timezone of the environment (from raw_data.timezone)';
COMMENT ON COLUMN public.eitje_environments.code IS 'Code/identifier for the environment (from raw_data.code)';
COMMENT ON COLUMN public.eitje_environments.type IS 'Type of environment (from raw_data.type)';







