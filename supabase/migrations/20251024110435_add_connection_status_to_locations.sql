-- Add connection test status columns to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS bork_connection_status TEXT DEFAULT 'not_tested',
ADD COLUMN IF NOT EXISTS bork_connection_tested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bork_connection_message TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN public.locations.bork_connection_status IS 'Status of Bork API connection test: not_tested, success, failed';
COMMENT ON COLUMN public.locations.bork_connection_tested_at IS 'Timestamp of last connection test';
COMMENT ON COLUMN public.locations.bork_connection_message IS 'Message from last connection test';

-- Create RPC function to update connection status
CREATE OR REPLACE FUNCTION update_location_connection_status(
  location_id UUID,
  status TEXT,
  tested_at TIMESTAMP WITH TIME ZONE,
  message TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.locations
  SET 
    bork_connection_status = status,
    bork_connection_tested_at = tested_at,
    bork_connection_message = message,
    updated_at = NOW()
  WHERE id = location_id;
END;
$$ LANGUAGE plpgsql;

