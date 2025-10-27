-- Add performance indexes for bork_sales_data table
-- This migration addresses database timeout issues by adding proper indexes

-- Index for created_at column (most common ordering)
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_created_at 
ON bork_sales_data (created_at DESC);

-- Index for location_id column (common filtering)
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_location_id 
ON bork_sales_data (location_id);

-- Composite index for common queries (location_id + created_at)
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_location_created 
ON bork_sales_data (location_id, created_at DESC);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_category 
ON bork_sales_data (category);

-- Partial index for raw data records only
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_raw_records 
ON bork_sales_data (created_at DESC) 
WHERE category = 'STEP1_RAW_DATA';

-- Analyze table to update statistics
ANALYZE bork_sales_data;

