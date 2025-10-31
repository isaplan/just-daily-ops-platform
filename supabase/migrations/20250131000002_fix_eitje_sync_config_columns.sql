-- Fix eitje_sync_config table - add all missing columns
-- This migration ensures all required columns exist

-- Add mode column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'mode'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN mode TEXT NOT NULL DEFAULT 'manual' 
    CHECK (mode IN ('manual', 'backfill', 'incremental'));
  END IF;
END $$;

-- Add incremental_interval_minutes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'incremental_interval_minutes'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN incremental_interval_minutes INTEGER DEFAULT 60 
    CHECK (incremental_interval_minutes IN (5, 10, 15, 30, 60));
  END IF;
END $$;

-- Add worker_interval_minutes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'worker_interval_minutes'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN worker_interval_minutes INTEGER DEFAULT 5 
    CHECK (worker_interval_minutes IN (1, 5, 10, 15, 30, 60));
  END IF;
END $$;

-- Add backfill_interval_minutes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'backfill_interval_minutes'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN backfill_interval_minutes INTEGER DEFAULT 60 
    CHECK (backfill_interval_minutes IN (5, 10, 15, 30, 60));
  END IF;
END $$;

-- Add quiet_hours_start column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'quiet_hours_start'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN quiet_hours_start TIME DEFAULT '02:00:00';
  END IF;
END $$;

-- Add quiet_hours_end column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'quiet_hours_end'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN quiet_hours_end TIME DEFAULT '06:00:00';
  END IF;
END $$;

-- Add gap_check_hour column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'gap_check_hour'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN gap_check_hour INTEGER DEFAULT 3 
    CHECK (gap_check_hour >= 0 AND gap_check_hour < 24);
  END IF;
END $$;

-- Add enabled_endpoints column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eitje_sync_config' 
    AND column_name = 'enabled_endpoints'
  ) THEN
    ALTER TABLE eitje_sync_config 
    ADD COLUMN enabled_endpoints TEXT[] 
    DEFAULT ARRAY['time_registration_shifts', 'planning_shifts', 'revenue_days']::TEXT[];
  END IF;
END $$;

