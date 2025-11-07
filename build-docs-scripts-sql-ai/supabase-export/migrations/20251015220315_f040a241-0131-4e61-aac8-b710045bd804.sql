-- Drop old Eitje tables
DROP TABLE IF EXISTS public.eitje_labor_hours CASCADE;
DROP TABLE IF EXISTS public.eitje_productivity_data CASCADE;

-- Create eitje_users table
CREATE TABLE public.eitje_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eitje_user_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create eitje_teams table
CREATE TABLE public.eitje_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eitje_team_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create eitje_environments table
CREATE TABLE public.eitje_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eitje_environment_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  fuzzy_match_confidence REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create eitje_shifts table
CREATE TABLE public.eitje_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eitje_shift_id INTEGER NOT NULL UNIQUE,
  user_id UUID REFERENCES public.eitje_users(id) NOT NULL,
  team_id UUID REFERENCES public.eitje_teams(id) NOT NULL,
  environment_id UUID REFERENCES public.eitje_environments(id) NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  hours_worked NUMERIC NOT NULL,
  wage_cost NUMERIC,
  skill_set TEXT,
  import_id UUID REFERENCES public.data_imports(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_eitje_shifts_date ON public.eitje_shifts(date);
CREATE INDEX idx_eitje_shifts_location ON public.eitje_shifts(location_id);
CREATE INDEX idx_eitje_shifts_user ON public.eitje_shifts(user_id);
CREATE INDEX idx_eitje_shifts_team ON public.eitje_shifts(team_id);
CREATE INDEX idx_eitje_shifts_environment ON public.eitje_shifts(environment_id);

-- Enable RLS on all tables
ALTER TABLE public.eitje_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eitje_users
CREATE POLICY "Authenticated users can view eitje_users"
  ON public.eitje_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert eitje_users"
  ON public.eitje_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update eitje_users"
  ON public.eitje_users FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for eitje_teams
CREATE POLICY "Authenticated users can view eitje_teams"
  ON public.eitje_teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert eitje_teams"
  ON public.eitje_teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update eitje_teams"
  ON public.eitje_teams FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for eitje_environments
CREATE POLICY "Authenticated users can view eitje_environments"
  ON public.eitje_environments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert eitje_environments"
  ON public.eitje_environments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update eitje_environments"
  ON public.eitje_environments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for eitje_shifts
CREATE POLICY "Authenticated users can view eitje_shifts"
  ON public.eitje_shifts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert eitje_shifts"
  ON public.eitje_shifts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update eitje_shifts"
  ON public.eitje_shifts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add triggers for updated_at
CREATE TRIGGER update_eitje_users_updated_at
  BEFORE UPDATE ON public.eitje_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eitje_teams_updated_at
  BEFORE UPDATE ON public.eitje_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eitje_environments_updated_at
  BEFORE UPDATE ON public.eitje_environments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eitje_shifts_updated_at
  BEFORE UPDATE ON public.eitje_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();