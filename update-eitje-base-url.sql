-- UPDATE EITJE BASE URL TO CORRECT ENDPOINT
-- Run this in your Supabase SQL Editor

UPDATE api_credentials 
SET 
    base_url = 'https://open-api.eitje.app/open_api',
    updated_at = NOW()
WHERE provider = 'eitje' 
AND is_active = true;

-- Verify the update
SELECT 
    id,
    provider,
    base_url,
    is_active,
    updated_at,
    additional_config->>'partner_username' as partner_username,
    additional_config->>'api_username' as api_username
FROM api_credentials 
WHERE provider = 'eitje' 
AND is_active = true;

