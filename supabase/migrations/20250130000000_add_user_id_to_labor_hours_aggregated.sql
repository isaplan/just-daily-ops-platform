-- Add user_id column to eitje_labor_hours_aggregated for per-worker aggregation
ALTER TABLE public.eitje_labor_hours_aggregated 
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Drop old unique constraint
ALTER TABLE public.eitje_labor_hours_aggregated 
DROP CONSTRAINT IF EXISTS eitje_labor_hours_aggregated_date_environment_id_team_id_key;

-- Add new unique constraint with user_id
ALTER TABLE public.eitje_labor_hours_aggregated 
ADD CONSTRAINT eitje_labor_hours_aggregated_date_env_team_user_key 
UNIQUE(date, environment_id, team_id, user_id);

-- Create index for user_id queries
CREATE INDEX IF NOT EXISTS idx_eitje_labor_hours_user ON public.eitje_labor_hours_aggregated(user_id);
CREATE INDEX IF NOT EXISTS idx_eitje_labor_hours_date_user ON public.eitje_labor_hours_aggregated(date, user_id);

