-- Create tables for all Eitje endpoints

-- Time registration shifts (actual worked hours - PRIORITY)
CREATE TABLE IF NOT EXISTS public.eitje_time_registration_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eitje_shift_id INTEGER UNIQUE NOT NULL,
  environment_id UUID REFERENCES public.eitje_environments(id),
  team_id UUID REFERENCES public.eitje_teams(id),
  user_id UUID REFERENCES public.eitje_users(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  hours_worked NUMERIC NOT NULL,
  wage_cost NUMERIC,
  skill_set TEXT,
  shift_type TEXT,
  import_id UUID REFERENCES public.data_imports(id),
  location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_reg_date ON public.eitje_time_registration_shifts(date);
CREATE INDEX IF NOT EXISTS idx_time_reg_location ON public.eitje_time_registration_shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_time_reg_environment ON public.eitje_time_registration_shifts(environment_id);

-- Planning shifts (scheduled/forecast shifts)
CREATE TABLE IF NOT EXISTS public.eitje_planning_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eitje_shift_id INTEGER UNIQUE NOT NULL,
  environment_id UUID REFERENCES public.eitje_environments(id),
  team_id UUID REFERENCES public.eitje_teams(id),
  user_id UUID REFERENCES public.eitje_users(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  hours_worked NUMERIC NOT NULL,
  wage_cost NUMERIC,
  skill_set TEXT,
  shift_type TEXT,
  status TEXT DEFAULT 'planned',
  import_id UUID REFERENCES public.data_imports(id),
  location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_date ON public.eitje_planning_shifts(date);
CREATE INDEX IF NOT EXISTS idx_planning_location ON public.eitje_planning_shifts(location_id);

-- Revenue days (daily revenue data)
CREATE TABLE IF NOT EXISTS public.eitje_revenue_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  environment_id UUID REFERENCES public.eitje_environments(id),
  revenue_amount NUMERIC NOT NULL,
  revenue_group TEXT,
  revenue_team TEXT,
  import_id UUID REFERENCES public.data_imports(id),
  location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_date_env ON public.eitje_revenue_days(date, environment_id);

-- Shift types (master data)
CREATE TABLE IF NOT EXISTS public.eitje_shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eitje_shift_type_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backfill progress tracking
CREATE TABLE IF NOT EXISTS public.eitje_backfill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_chunks INTEGER NOT NULL,
  completed_chunks INTEGER DEFAULT 0,
  current_chunk_start DATE,
  current_chunk_end DATE,
  status TEXT DEFAULT 'pending',
  records_fetched INTEGER DEFAULT 0,
  last_error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.eitje_time_registration_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_planning_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_revenue_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_backfill_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time registration shifts
CREATE POLICY "Authenticated users can view time_registration_shifts"
  ON public.eitje_time_registration_shifts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert time_registration_shifts"
  ON public.eitje_time_registration_shifts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update time_registration_shifts"
  ON public.eitje_time_registration_shifts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for planning shifts
CREATE POLICY "Authenticated users can view planning_shifts"
  ON public.eitje_planning_shifts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert planning_shifts"
  ON public.eitje_planning_shifts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update planning_shifts"
  ON public.eitje_planning_shifts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for revenue days
CREATE POLICY "Authenticated users can view revenue_days"
  ON public.eitje_revenue_days FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert revenue_days"
  ON public.eitje_revenue_days FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for shift types
CREATE POLICY "Authenticated users can view shift_types"
  ON public.eitje_shift_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert shift_types"
  ON public.eitje_shift_types FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update shift_types"
  ON public.eitje_shift_types FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for backfill progress
CREATE POLICY "Authenticated users can view backfill_progress"
  ON public.eitje_backfill_progress FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage backfill_progress"
  ON public.eitje_backfill_progress FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Gap detection function
CREATE OR REPLACE FUNCTION public.detect_eitje_data_gaps()
RETURNS TABLE(missing_date DATE, days_missing INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT d::DATE as missing_date, COUNT(*)::INTEGER as days_missing
  FROM generate_series('2024-01-01'::DATE, (CURRENT_DATE - 1)::DATE, '1 day'::INTERVAL) d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.eitje_time_registration_shifts 
    WHERE date = d::DATE
  )
  GROUP BY d::DATE
  ORDER BY d::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;