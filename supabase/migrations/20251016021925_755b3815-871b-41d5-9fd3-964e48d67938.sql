-- Add status column to time_registration_shifts
ALTER TABLE eitje_time_registration_shifts 
ADD COLUMN IF NOT EXISTS status TEXT;

-- Add Eitje integer ID columns for planning_shifts
ALTER TABLE eitje_planning_shifts
ADD COLUMN IF NOT EXISTS eitje_team_id INTEGER,
ADD COLUMN IF NOT EXISTS eitje_user_id INTEGER;

-- Add Eitje integer ID columns for time_registration_shifts  
ALTER TABLE eitje_time_registration_shifts
ADD COLUMN IF NOT EXISTS eitje_team_id INTEGER,
ADD COLUMN IF NOT EXISTS eitje_user_id INTEGER;

-- Make the UUID foreign key columns nullable since we'll store Eitje IDs separately
ALTER TABLE eitje_planning_shifts
ALTER COLUMN team_id DROP NOT NULL,
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE eitje_time_registration_shifts
ALTER COLUMN team_id DROP NOT NULL,
ALTER COLUMN user_id DROP NOT NULL;