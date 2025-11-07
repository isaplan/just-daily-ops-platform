-- Add raw_data columns to remaining Eitje tables for complete traceability
ALTER TABLE public.eitje_teams 
ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.eitje_users 
ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.eitje_environments 
ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;