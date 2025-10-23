-- Make import_id nullable for Eitje tables since backfills don't use data_imports tracking

ALTER TABLE eitje_time_registration_shifts 
ALTER COLUMN import_id DROP NOT NULL;

ALTER TABLE eitje_planning_shifts 
ALTER COLUMN import_id DROP NOT NULL;

ALTER TABLE eitje_revenue_days 
ALTER COLUMN import_id DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN eitje_time_registration_shifts.import_id IS 'Optional import tracking ID';
COMMENT ON COLUMN eitje_planning_shifts.import_id IS 'Optional import tracking ID';
COMMENT ON COLUMN eitje_revenue_days.import_id IS 'Optional import tracking ID';