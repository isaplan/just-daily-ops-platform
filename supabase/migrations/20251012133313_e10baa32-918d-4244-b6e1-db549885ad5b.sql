-- Add base_hourly_wage column to eitje_labor_hours table
ALTER TABLE eitje_labor_hours 
ADD COLUMN base_hourly_wage NUMERIC;

-- Add comments for clarity on what each field represents
COMMENT ON COLUMN eitje_labor_hours.hourly_rate 
IS 'Fully-loaded labor cost per hour (Loonkosten per uur) - includes taxes, benefits, overhead';

COMMENT ON COLUMN eitje_labor_hours.base_hourly_wage 
IS 'Base hourly wage (uurloon) - gross wage paid to employee before overhead';