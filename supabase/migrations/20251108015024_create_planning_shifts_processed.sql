-- =====================================================
-- Create eitje_planning_shifts_processed Table
-- =====================================================
-- Mirrors structure of eitje_time_registration_shifts_processed
-- Extracts all fields from raw_data JSONB for planning shifts

CREATE TABLE IF NOT EXISTS public.eitje_planning_shifts_processed (
  id SERIAL PRIMARY KEY,
  idx INTEGER,
  eitje_id INTEGER NOT NULL,
  date DATE NOT NULL,
  
  -- User fields (extracted from nested user object)
  user_id INTEGER,
  user_name TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  user_code TEXT,
  user_active BOOLEAN,
  user_raw JSONB,
  
  -- Environment fields (extracted from nested environment object)
  environment_id INTEGER,
  environment_name TEXT,
  environment_code TEXT,
  environment_type TEXT,
  environment_active BOOLEAN,
  environment_raw JSONB,
  
  -- Team fields (extracted from nested team object)
  team_id INTEGER,
  team_name TEXT,
  team_code TEXT,
  team_active BOOLEAN,
  team_raw JSONB,
  
  -- Time fields
  start TIMESTAMPTZ,
  end TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  
  -- Break fields
  break_minutes INTEGER DEFAULT 0,
  breaks INTEGER DEFAULT 0,
  break_minutes_actual INTEGER DEFAULT 0,
  break_minutes_planned INTEGER DEFAULT 0,
  
  -- Hours fields
  planned_hours DECIMAL(5,2),
  hours DECIMAL(5,2),
  total_hours DECIMAL(5,2),
  
  -- Cost fields
  planned_cost DECIMAL(10,2),
  wage_cost DECIMAL(10,2),
  wage_cost_cents INTEGER,
  costs_wage DECIMAL(10,2),
  costs_wage_cost DECIMAL(10,2),
  costs_total DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  laborCost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  totalCost DECIMAL(10,2),
  cost DECIMAL(10,2),
  price DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  costs JSONB,
  
  -- Status fields
  status VARCHAR(50) DEFAULT 'planned',
  shift_type VARCHAR(100),
  type_name TEXT,
  type_raw JSONB,
  
  -- Metadata
  skill_set VARCHAR(100),
  skillSet VARCHAR(100),
  notes TEXT,
  remarks TEXT,
  
  -- Additional fields from raw_data
  approved BOOLEAN,
  meals JSONB,
  check_in_ids INTEGER[],
  planning_shift_id INTEGER,
  exported_to_hr_integration BOOLEAN,
  
  -- Raw data
  raw_data JSONB NOT NULL,
  raw_data_hash TEXT,
  
  -- API timestamps
  api_created_at TIMESTAMPTZ,
  api_updated_at TIMESTAMPTZ,
  
  -- DB timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(eitje_id, date, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_planning_shifts_processed_date ON public.eitje_planning_shifts_processed(date);
CREATE INDEX IF NOT EXISTS idx_planning_shifts_processed_environment_id ON public.eitje_planning_shifts_processed(environment_id);
CREATE INDEX IF NOT EXISTS idx_planning_shifts_processed_team_id ON public.eitje_planning_shifts_processed(team_id);
CREATE INDEX IF NOT EXISTS idx_planning_shifts_processed_user_id ON public.eitje_planning_shifts_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_shifts_processed_eitje_id ON public.eitje_planning_shifts_processed(eitje_id);

-- Add comments for documentation
COMMENT ON TABLE public.eitje_planning_shifts_processed IS 'Processed planning shifts with all fields extracted from raw_data JSONB';
COMMENT ON COLUMN public.eitje_planning_shifts_processed.planned_hours IS 'Planned hours for the shift';
COMMENT ON COLUMN public.eitje_planning_shifts_processed.planned_cost IS 'Planned cost for the shift';
COMMENT ON COLUMN public.eitje_planning_shifts_processed.status IS 'Status of the planned shift (planned, confirmed, cancelled)';




