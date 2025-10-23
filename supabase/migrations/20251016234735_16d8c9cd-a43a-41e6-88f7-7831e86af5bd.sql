-- Create bork_sync_config table for automation settings
CREATE TABLE IF NOT EXISTS public.bork_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'paused' CHECK (mode IN ('active', 'paused')),
  sync_interval_minutes INTEGER NOT NULL DEFAULT 1440,
  sync_hour INTEGER NOT NULL DEFAULT 6 CHECK (sync_hour >= 0 AND sync_hour < 24),
  enabled_locations UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bork_sync_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view bork sync config"
  ON public.bork_sync_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update bork sync config"
  ON public.bork_sync_config FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert bork sync config"
  ON public.bork_sync_config FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default config if not exists
INSERT INTO public.bork_sync_config (mode, enabled_locations)
SELECT 'paused', COALESCE(ARRAY_AGG(l.id), '{}')
FROM public.locations l
WHERE EXISTS (
  SELECT 1 FROM public.bork_api_credentials c 
  WHERE c.location_id = l.id AND c.is_active = true
)
ON CONFLICT DO NOTHING;

-- Add sync_type column to api_sync_logs if not exists
ALTER TABLE public.api_sync_logs 
ADD COLUMN IF NOT EXISTS sync_trigger TEXT DEFAULT 'manual' CHECK (sync_trigger IN ('manual', 'automated'));

-- Create cron job for daily Bork sync at 6:00 AM UTC
SELECT cron.schedule(
  'bork-daily-sync',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/bork-incremental-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);