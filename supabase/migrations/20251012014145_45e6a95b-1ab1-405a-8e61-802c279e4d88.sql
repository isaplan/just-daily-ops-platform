-- Create table for storing encrypted API credentials per location
CREATE TABLE bork_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by_user_id UUID REFERENCES profiles(user_id),
  UNIQUE(location_id)
);

-- Enable RLS on API credentials table
ALTER TABLE bork_api_credentials ENABLE ROW LEVEL SECURITY;

-- Only owners can view API credentials
CREATE POLICY "Only owners can view API credentials"
  ON bork_api_credentials FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Only owners can insert API credentials
CREATE POLICY "Only owners can insert API credentials"
  ON bork_api_credentials FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Only owners can update API credentials
CREATE POLICY "Only owners can update API credentials"
  ON bork_api_credentials FOR UPDATE
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Only owners can delete API credentials
CREATE POLICY "Only owners can delete API credentials"
  ON bork_api_credentials FOR DELETE
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Create table for tracking API sync operations
CREATE TABLE bork_api_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  sync_type TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  triggered_by_user_id UUID REFERENCES profiles(user_id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on sync logs table
ALTER TABLE bork_api_sync_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view sync logs
CREATE POLICY "Authenticated users can view sync logs"
  ON bork_api_sync_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert sync logs
CREATE POLICY "Authenticated users can insert sync logs"
  ON bork_api_sync_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update sync logs
CREATE POLICY "Authenticated users can update sync logs"
  ON bork_api_sync_logs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updating updated_at on bork_api_credentials
CREATE TRIGGER update_bork_api_credentials_updated_at
BEFORE UPDATE ON bork_api_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();