-- Phase 1: Unified API Credentials System
-- Create enum for API providers
CREATE TYPE api_provider AS ENUM (
  'bork',
  'eitje',
  'formitable',
  'order_management',
  'stock_management',
  'supplier_import'
);

-- Create unified api_credentials table
CREATE TABLE public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider api_provider NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  api_key TEXT,
  base_url TEXT,
  additional_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID,
  CONSTRAINT unique_provider_location UNIQUE(provider, location_id)
);

-- Create unified api_sync_logs table
CREATE TABLE public.api_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider api_provider NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  triggered_by_user_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_credentials (owner-only access)
CREATE POLICY "Only owners can view API credentials"
  ON public.api_credentials
  FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can insert API credentials"
  ON public.api_credentials
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can update API credentials"
  ON public.api_credentials
  FOR UPDATE
  USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can delete API credentials"
  ON public.api_credentials
  FOR DELETE
  USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for api_sync_logs (authenticated users can view, authenticated can insert)
CREATE POLICY "Authenticated users can view sync logs"
  ON public.api_sync_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sync logs"
  ON public.api_sync_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sync logs"
  ON public.api_sync_logs
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Migrate existing Bork credentials to new table
INSERT INTO public.api_credentials (
  provider,
  location_id,
  api_key,
  base_url,
  is_active,
  last_sync_at,
  created_at,
  updated_at,
  created_by_user_id
)
SELECT
  'bork'::api_provider,
  location_id,
  api_key,
  base_url,
  is_active,
  last_sync_at,
  created_at,
  updated_at,
  created_by_user_id
FROM public.bork_api_credentials;

-- Migrate existing Bork sync logs to new table
INSERT INTO public.api_sync_logs (
  provider,
  location_id,
  sync_type,
  date_range_start,
  date_range_end,
  status,
  records_fetched,
  records_inserted,
  error_message,
  metadata,
  triggered_by_user_id,
  started_at,
  completed_at
)
SELECT
  'bork'::api_provider,
  location_id,
  sync_type,
  date_range_start,
  date_range_end,
  status,
  records_fetched,
  records_inserted,
  error_message,
  metadata,
  triggered_by_user_id,
  started_at,
  completed_at
FROM public.bork_api_sync_logs;

-- Create indexes for performance
CREATE INDEX idx_api_credentials_provider_location ON public.api_credentials(provider, location_id);
CREATE INDEX idx_api_credentials_active ON public.api_credentials(is_active) WHERE is_active = true;
CREATE INDEX idx_api_sync_logs_provider_location ON public.api_sync_logs(provider, location_id);
CREATE INDEX idx_api_sync_logs_status ON public.api_sync_logs(status);
CREATE INDEX idx_api_sync_logs_started_at ON public.api_sync_logs(started_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_api_credentials_updated_at
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.api_credentials IS 'Unified table for storing API credentials for all integration providers';
COMMENT ON TABLE public.api_sync_logs IS 'Unified table for logging all API synchronization activities';
COMMENT ON TYPE api_provider IS 'Enum for supported API integration providers';