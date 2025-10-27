-- CHECK ALL CREDENTIALS IN API_CREDENTIALS TABLE
-- Run this in your Supabase SQL Editor

SELECT 
    id,
    provider,
    location_id,
    api_key,
    base_url,
    is_active,
    created_at,
    updated_at,
    additional_config
FROM api_credentials 
ORDER BY provider, created_at DESC;

-- Summary by provider
SELECT 
    provider,
    COUNT(*) as total_credentials,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_credentials,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_credentials
FROM api_credentials 
GROUP BY provider
ORDER BY provider;

