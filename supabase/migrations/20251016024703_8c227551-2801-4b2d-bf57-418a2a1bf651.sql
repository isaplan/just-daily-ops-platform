
-- Fix environment_id column type to match Eitje's integer IDs (with CASCADE)

-- Drop all foreign key constraints that reference environment IDs
ALTER TABLE eitje_time_registration_shifts 
DROP CONSTRAINT IF EXISTS eitje_time_registration_shifts_environment_id_fkey CASCADE;

ALTER TABLE eitje_planning_shifts 
DROP CONSTRAINT IF EXISTS eitje_planning_shifts_environment_id_fkey CASCADE;

ALTER TABLE eitje_revenue_days 
DROP CONSTRAINT IF EXISTS eitje_revenue_days_environment_id_fkey CASCADE;

ALTER TABLE eitje_shifts
DROP CONSTRAINT IF EXISTS eitje_shifts_environment_id_fkey CASCADE;

-- Drop and recreate environments table primary key
ALTER TABLE eitje_environments
DROP CONSTRAINT IF EXISTS eitje_environments_pkey CASCADE;

ALTER TABLE eitje_environments
ALTER COLUMN eitje_environment_id TYPE INTEGER USING eitje_environment_id::INTEGER;

ALTER TABLE eitje_environments
ADD PRIMARY KEY (eitje_environment_id);

-- Change environment_id from UUID to INTEGER in all dependent tables
ALTER TABLE eitje_time_registration_shifts 
ALTER COLUMN environment_id DROP DEFAULT,
ALTER COLUMN environment_id TYPE INTEGER USING NULL;

ALTER TABLE eitje_planning_shifts 
ALTER COLUMN environment_id DROP DEFAULT,
ALTER COLUMN environment_id TYPE INTEGER USING NULL;

ALTER TABLE eitje_revenue_days 
ALTER COLUMN environment_id DROP DEFAULT,
ALTER COLUMN environment_id TYPE INTEGER USING NULL;

ALTER TABLE eitje_shifts
ALTER COLUMN environment_id DROP DEFAULT,
ALTER COLUMN environment_id TYPE INTEGER USING NULL;

-- Add comments
COMMENT ON COLUMN eitje_time_registration_shifts.environment_id IS 'Eitje environment integer ID';
COMMENT ON COLUMN eitje_planning_shifts.environment_id IS 'Eitje environment integer ID';
COMMENT ON COLUMN eitje_revenue_days.environment_id IS 'Eitje environment integer ID';
COMMENT ON COLUMN eitje_shifts.environment_id IS 'Eitje environment integer ID';
