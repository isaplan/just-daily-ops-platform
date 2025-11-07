-- Create eitje_sync_state table for tracking incremental sync progress
-- This table tracks the last successfully synced date for each endpoint
-- Enables incremental sync (hour-by-hour) instead of always syncing yesterday

CREATE TABLE IF NOT EXISTS eitje_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL, -- 'time_registration_shifts', 'revenue_days', etc.
  last_successful_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_date DATE NOT NULL, -- Last date fully synced (required, no NULL)
  records_synced INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

-- Index for fast lookups by endpoint
CREATE INDEX IF NOT EXISTS idx_eitje_sync_state_endpoint 
ON eitje_sync_state(endpoint);

-- Index for monitoring (last successful sync)
CREATE INDEX IF NOT EXISTS idx_eitje_sync_state_last_sync 
ON eitje_sync_state(last_successful_sync_at);

-- Enable RLS
ALTER TABLE eitje_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role (edge functions) to manage sync state
CREATE POLICY "Service role can manage eitje sync state"
ON eitje_sync_state FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to read sync state
CREATE POLICY "Authenticated users can read eitje sync state"
ON eitje_sync_state FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE eitje_sync_state IS 
  'Tracks incremental sync state for Eitje endpoints. Stores last successfully synced date per endpoint to enable hour-by-hour incremental sync.';

COMMENT ON COLUMN eitje_sync_state.endpoint IS 
  'Eitje API endpoint name (e.g., time_registration_shifts, revenue_days)';

COMMENT ON COLUMN eitje_sync_state.last_synced_date IS 
  'Last date that was fully synced for this endpoint. Next sync will start from the day after this date.';

COMMENT ON COLUMN eitje_sync_state.last_error IS 
  'Last error message if sync failed, NULL if last sync succeeded.';

