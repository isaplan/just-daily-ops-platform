-- Fix schema issues for Eitje sync

-- 1. Rename gap_check_hour to daily_gap_check_hour in eitje_sync_config
ALTER TABLE eitje_sync_config 
  RENAME COLUMN gap_check_hour TO daily_gap_check_hour;

-- 2. Add raw_data columns to shift tables
ALTER TABLE eitje_planning_shifts 
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE eitje_time_registration_shifts 
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- 3. Force PostgREST schema cache refresh by notifying pgrst
NOTIFY pgrst, 'reload schema';