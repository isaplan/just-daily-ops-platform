-- Fix Eitje raw table constraints
-- Add unique constraints for proper upsert functionality

-- Add unique constraint to eitje_time_registration_shifts_raw
ALTER TABLE eitje_time_registration_shifts_raw 
ADD CONSTRAINT eitje_time_registration_shifts_raw_eitje_id_date_unique 
UNIQUE (eitje_id, date);

-- Add unique constraint to eitje_planning_shifts_raw  
ALTER TABLE eitje_planning_shifts_raw 
ADD CONSTRAINT eitje_planning_shifts_raw_eitje_id_date_unique 
UNIQUE (eitje_id, date);

-- Add unique constraint to eitje_revenue_days_raw
ALTER TABLE eitje_revenue_days_raw 
ADD CONSTRAINT eitje_revenue_days_raw_eitje_id_date_unique 
UNIQUE (eitje_id, date);


