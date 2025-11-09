-- =====================================================
-- Create eitje_time_registration_shifts_processed_v2 Table
-- =====================================================
-- V2 processed table that correctly unpacks raw_data JSONB
-- Only extracts fields that actually exist in raw_data
-- No JSONB storage columns (all unpacked)

CREATE TABLE IF NOT EXISTS public.eitje_time_registration_shifts_processed_v2 (
  id SERIAL PRIMARY KEY,
  eitje_id INTEGER NOT NULL,
  date DATE NOT NULL,
  
  -- User fields (extracted from nested user object)
  user_id INTEGER,
  user_name TEXT,
  
  -- Environment fields (extracted from nested environment object)
  environment_id INTEGER,
  environment_name TEXT,
  
  -- Team fields (extracted from nested team object)
  team_id INTEGER,
  team_name TEXT,
  
  -- Time fields
  start TIMESTAMPTZ,
  end TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  
  -- Break fields
  break_minutes INTEGER DEFAULT 0,
  
  -- Cost fields (extracted from raw_data for aggregation)
  wage_cost DECIMAL(10,2),
  
  -- Type fields (extracted from nested type object)
  type_name TEXT,
  shift_type TEXT,
  
  -- Metadata
  remarks TEXT,
  approved BOOLEAN,
  meals JSONB,
  check_in_ids INTEGER[],
  planning_shift_id INTEGER,
  exported_to_hr_integration BOOLEAN,
  
  -- API timestamps
  api_created_at TIMESTAMPTZ,
  api_updated_at TIMESTAMPTZ,
  
  -- Raw data (keep for reference)
  raw_data JSONB NOT NULL,
  raw_data_hash TEXT,
  
  -- DB timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(eitje_id, date, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_reg_shifts_processed_v2_date ON public.eitje_time_registration_shifts_processed_v2(date);
CREATE INDEX IF NOT EXISTS idx_time_reg_shifts_processed_v2_environment_id ON public.eitje_time_registration_shifts_processed_v2(environment_id);
CREATE INDEX IF NOT EXISTS idx_time_reg_shifts_processed_v2_team_id ON public.eitje_time_registration_shifts_processed_v2(team_id);
CREATE INDEX IF NOT EXISTS idx_time_reg_shifts_processed_v2_user_id ON public.eitje_time_registration_shifts_processed_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_time_reg_shifts_processed_v2_eitje_id ON public.eitje_time_registration_shifts_processed_v2(eitje_id);
CREATE INDEX IF NOT EXISTS idx_time_reg_shifts_processed_v2_date_env ON public.eitje_time_registration_shifts_processed_v2(date, environment_id);

-- Add comments for documentation
COMMENT ON TABLE public.eitje_time_registration_shifts_processed_v2 IS 'V2 processed time registration shifts with all fields correctly extracted from raw_data JSONB';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed_v2.user_name IS 'User name extracted from raw_data.user.name';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed_v2.environment_name IS 'Environment name extracted from raw_data.environment.name';
COMMENT ON COLUMN public.eitje_time_registration_shifts_processed_v2.team_name IS 'Team name extracted from raw_data.team.name';

-- =====================================================
-- ROW-LEVEL SECURITY POLICIES
-- =====================================================
-- Following proven pattern from 20250128000001_create_eitje_raw_tables.sql

ALTER TABLE public.eitje_time_registration_shifts_processed_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2
    FOR SELECT TO anon USING (true);

