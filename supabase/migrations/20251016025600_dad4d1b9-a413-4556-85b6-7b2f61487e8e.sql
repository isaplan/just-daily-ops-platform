-- Drop foreign key constraints on import_id since data_imports table doesn't exist

ALTER TABLE eitje_time_registration_shifts 
DROP CONSTRAINT IF EXISTS eitje_time_registration_shifts_import_id_fkey CASCADE;

ALTER TABLE eitje_planning_shifts 
DROP CONSTRAINT IF EXISTS eitje_planning_shifts_import_id_fkey CASCADE;

ALTER TABLE eitje_revenue_days 
DROP CONSTRAINT IF EXISTS eitje_revenue_days_import_id_fkey CASCADE;