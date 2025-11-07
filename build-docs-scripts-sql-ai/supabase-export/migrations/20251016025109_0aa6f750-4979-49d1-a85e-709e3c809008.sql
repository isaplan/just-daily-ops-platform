-- Drop old UUID columns that conflict with new integer columns

-- Drop old team_id and user_id UUID columns from time_registration_shifts
ALTER TABLE eitje_time_registration_shifts 
DROP COLUMN IF EXISTS team_id CASCADE,
DROP COLUMN IF EXISTS user_id CASCADE;

-- Drop old team_id and user_id UUID columns from planning_shifts
ALTER TABLE eitje_planning_shifts 
DROP COLUMN IF EXISTS team_id CASCADE,
DROP COLUMN IF EXISTS user_id CASCADE;

-- Add comments for clarity
COMMENT ON COLUMN eitje_time_registration_shifts.eitje_team_id IS 'Eitje team integer ID';
COMMENT ON COLUMN eitje_time_registration_shifts.eitje_user_id IS 'Eitje user integer ID';
COMMENT ON COLUMN eitje_planning_shifts.eitje_team_id IS 'Eitje team integer ID';
COMMENT ON COLUMN eitje_planning_shifts.eitje_user_id IS 'Eitje user integer ID';