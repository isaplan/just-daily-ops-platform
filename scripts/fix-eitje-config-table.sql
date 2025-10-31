-- Fix eitje_sync_config table - add all missing columns
-- Run this in Supabase Dashboard → SQL Editor

-- Add mode column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'manual' 
CHECK (mode IN ('manual', 'backfill', 'incremental'));

-- Add incremental_interval_minutes column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS incremental_interval_minutes INTEGER DEFAULT 60 
CHECK (incremental_interval_minutes IN (5, 10, 15, 30, 60));

-- Add worker_interval_minutes column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS worker_interval_minutes INTEGER DEFAULT 5 
CHECK (worker_interval_minutes IN (1, 5, 10, 15, 30, 60));

-- Add backfill_interval_minutes column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS backfill_interval_minutes INTEGER DEFAULT 60 
CHECK (backfill_interval_minutes IN (5, 10, 15, 30, 60));

-- Add quiet_hours_start column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '02:00:00';

-- Add quiet_hours_end column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '06:00:00';

-- Add gap_check_hour column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS gap_check_hour INTEGER DEFAULT 3 
CHECK (gap_check_hour >= 0 AND gap_check_hour < 24);

-- Add enabled_endpoints column
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS enabled_endpoints TEXT[] 
DEFAULT ARRAY['time_registration_shifts', 'planning_shifts', 'revenue_days']::TEXT[];

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'eitje_sync_config' 
ORDER BY ordinal_position;

