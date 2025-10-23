-- Make start_time and end_time nullable for shifts that don't have times set yet

ALTER TABLE eitje_time_registration_shifts 
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

ALTER TABLE eitje_planning_shifts 
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN eitje_time_registration_shifts.start_time IS 'Start time (nullable for shifts without scheduled times)';
COMMENT ON COLUMN eitje_time_registration_shifts.end_time IS 'End time (nullable for shifts without scheduled times)';
COMMENT ON COLUMN eitje_planning_shifts.start_time IS 'Start time (nullable for planned shifts without scheduled times)';
COMMENT ON COLUMN eitje_planning_shifts.end_time IS 'End time (nullable for planned shifts without scheduled times)';