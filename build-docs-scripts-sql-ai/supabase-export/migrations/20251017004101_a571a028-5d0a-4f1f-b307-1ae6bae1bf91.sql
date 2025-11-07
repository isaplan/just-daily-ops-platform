-- Create eitje_sync_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS eitje_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'backfill', 'incremental')),
  backfill_interval_minutes INTEGER DEFAULT 60 CHECK (backfill_interval_minutes IN (5, 10, 15, 30, 60)),
  incremental_interval_minutes INTEGER DEFAULT 60 CHECK (incremental_interval_minutes IN (5, 10, 15, 30, 60)),
  worker_interval_minutes INTEGER DEFAULT 5 CHECK (worker_interval_minutes IN (1, 5, 10, 15, 30, 60)),
  quiet_hours_start TIME DEFAULT '02:00:00',
  quiet_hours_end TIME DEFAULT '06:00:00',
  gap_check_hour INTEGER DEFAULT 3 CHECK (gap_check_hour >= 0 AND gap_check_hour < 24),
  enabled_endpoints TEXT[] DEFAULT ARRAY['time_registration_shifts', 'planning_shifts', 'revenue_days'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE eitje_sync_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and update sync config
CREATE POLICY "Authenticated users can view eitje_sync_config"
  ON eitje_sync_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update eitje_sync_config"
  ON eitje_sync_config FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert eitje_sync_config"
  ON eitje_sync_config FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default config if none exists
INSERT INTO eitje_sync_config (mode, worker_interval_minutes)
VALUES ('manual', 5)
ON CONFLICT DO NOTHING;

-- Create function to update Eitje backfill worker cron schedule
CREATE OR REPLACE FUNCTION public.update_eitje_backfill_cron(interval_minutes INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cron_schedule TEXT;
  cron_command TEXT;
BEGIN
  -- Unschedule any existing eitje backfill worker jobs
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname LIKE 'eitje-backfill-worker%';
  
  -- Build the cron schedule string
  cron_schedule := format('*/%s * * * *', interval_minutes);
  
  -- Build the command to execute
  cron_command := 'SELECT net.http_post(url:=''https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/eitje-backfill-worker'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}''::jsonb, body:=''{}''::jsonb) as request_id;';
  
  -- Schedule new job with updated interval
  PERFORM cron.schedule(
    'eitje-backfill-worker',
    cron_schedule,
    cron_command
  );
END;
$$;