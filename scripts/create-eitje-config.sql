-- Create default Eitje sync config if it doesn't exist
-- Run this in Supabase Dashboard → SQL Editor

INSERT INTO eitje_sync_config (
  mode,
  incremental_interval_minutes,
  worker_interval_minutes,
  quiet_hours_start,
  quiet_hours_end,
  enabled_endpoints
)
VALUES (
  'manual',  -- Start as manual, user must enable incremental in UI
  60,        -- Incremental interval
  5,         -- Worker interval
  '02:00:00'::TIME,  -- Quiet hours start
  '06:00:00'::TIME,  -- Quiet hours end
  ARRAY['time_registration_shifts', 'planning_shifts', 'revenue_days']::TEXT[]  -- Enabled endpoints
)
ON CONFLICT DO NOTHING;

-- Verify it was created
SELECT * FROM eitje_sync_config;

