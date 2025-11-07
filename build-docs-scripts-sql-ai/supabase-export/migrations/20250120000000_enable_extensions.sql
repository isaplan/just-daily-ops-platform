-- Enable required extensions for the application
-- This migration enables the http extension for HTTP requests in edge functions

-- Enable the http extension for HTTP requests (built-in to Supabase)
CREATE EXTENSION IF NOT EXISTS "http";

-- Enable other commonly used extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
