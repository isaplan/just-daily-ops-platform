-- =====================================================
-- Create eitje_hours_aggregated_v2 Table
-- =====================================================
-- V2 aggregated table with per day per user per location per team calculations
-- Groups processed_v2 data and calculates hours_worked, hourly_rate, labor_cost

CREATE TABLE IF NOT EXISTS public.eitje_hours_aggregated_v2 (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  environment_id INTEGER,
  environment_name TEXT,
  team_id INTEGER,
  team_name TEXT,
  
  -- Calculated fields
  hours_worked DECIMAL(8,2) DEFAULT 0,
  hourly_rate DECIMAL(8,2), -- From worker_profiles or calculated
  hourly_cost DECIMAL(10,2), -- Same as hourly_rate
  labor_cost DECIMAL(10,2), -- hours_worked * hourly_rate
  
  -- Metadata
  shift_count INTEGER DEFAULT 0,
  total_breaks_minutes INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one record per day per user per location per team
  UNIQUE(date, user_id, environment_id, team_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_v2_date ON public.eitje_hours_aggregated_v2(date);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_v2_user_id ON public.eitje_hours_aggregated_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_v2_environment_id ON public.eitje_hours_aggregated_v2(environment_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_v2_team_id ON public.eitje_hours_aggregated_v2(team_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_v2_date_env ON public.eitje_hours_aggregated_v2(date, environment_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_v2_date_user ON public.eitje_hours_aggregated_v2(date, user_id);

-- Add comments for documentation
COMMENT ON TABLE public.eitje_hours_aggregated_v2 IS 'V2 aggregated hours data per day per user per location per team';
COMMENT ON COLUMN public.eitje_hours_aggregated_v2.hourly_rate IS 'Hourly rate from worker_profiles (if wage_override) or calculated from wage_cost/hours';
COMMENT ON COLUMN public.eitje_hours_aggregated_v2.hourly_cost IS 'Same as hourly_rate';
COMMENT ON COLUMN public.eitje_hours_aggregated_v2.labor_cost IS 'Calculated as hours_worked * hourly_rate';

-- =====================================================
-- ROW-LEVEL SECURITY POLICIES
-- =====================================================
-- Following proven pattern from 20250128000001_create_eitje_raw_tables.sql

ALTER TABLE public.eitje_hours_aggregated_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2
    FOR SELECT TO anon USING (true);

