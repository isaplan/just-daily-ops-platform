-- =====================================================
-- Add Missing Fields to eitje_teams
-- =====================================================
-- Extracts additional fields from raw_data JSONB

-- Add missing columns
ALTER TABLE IF EXISTS public.eitje_teams
ADD COLUMN IF NOT EXISTS team_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Backfill team_type from raw_data
UPDATE public.eitje_teams
SET team_type = raw_data->>'team_type'
WHERE team_type IS NULL AND raw_data->>'team_type' IS NOT NULL;

-- Backfill code from raw_data
UPDATE public.eitje_teams
SET code = raw_data->>'code'
WHERE code IS NULL AND raw_data->>'code' IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.eitje_teams.team_type IS 'Type of team (from raw_data.team_type)';
COMMENT ON COLUMN public.eitje_teams.code IS 'Code/identifier for the team (from raw_data.code)';




