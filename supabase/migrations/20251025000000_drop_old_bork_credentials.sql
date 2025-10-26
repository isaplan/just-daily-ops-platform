-- Drop old bork_api_credentials table and related objects
-- This table has been replaced by the unified api_credentials table

-- Drop RLS policies first
DROP POLICY IF EXISTS "Only owners can view API credentials" ON bork_api_credentials;
DROP POLICY IF EXISTS "Only owners can insert API credentials" ON bork_api_credentials;
DROP POLICY IF EXISTS "Only owners can update API credentials" ON bork_api_credentials;
DROP POLICY IF EXISTS "Only owners can delete API credentials" ON bork_api_credentials;

-- Drop the table
DROP TABLE IF EXISTS bork_api_credentials;

-- Also drop the old bork_api_sync_logs table (replaced by api_sync_logs)
DROP TABLE IF EXISTS bork_api_sync_logs;
