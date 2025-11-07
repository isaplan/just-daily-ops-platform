-- CURSOR-DEV: Step 1 - Create table for raw Bork API data storage
-- This table stores the complete raw API response without any processing

CREATE TABLE IF NOT EXISTS public.bork_raw_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES public.locations(id),
    date DATE NOT NULL,
    raw_response JSONB NOT NULL, -- Complete API response stored as-is
    api_url TEXT, -- The API URL that was called
    record_count INTEGER DEFAULT 0, -- Number of records in the response
    sync_log_id UUID REFERENCES public.bork_api_sync_logs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    step TEXT DEFAULT 'raw_data_storage' -- Track which step this data is from
    
    -- No constraints on raw data - we want to store everything as-is
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_bork_raw_data_location_date ON public.bork_raw_data(location_id, date);
CREATE INDEX IF NOT EXISTS idx_bork_raw_data_created_at ON public.bork_raw_data(created_at);
CREATE INDEX IF NOT EXISTS idx_bork_raw_data_sync_log ON public.bork_raw_data(sync_log_id);

-- Add comment
COMMENT ON TABLE public.bork_raw_data IS 'CURSOR-DEV: Raw Bork API data storage - Step 1 of data processing pipeline';
COMMENT ON COLUMN public.bork_raw_data.raw_response IS 'Complete unprocessed API response from Bork API';
COMMENT ON COLUMN public.bork_raw_data.step IS 'Processing step this data represents (raw_data_storage, data_access, etc.)';
