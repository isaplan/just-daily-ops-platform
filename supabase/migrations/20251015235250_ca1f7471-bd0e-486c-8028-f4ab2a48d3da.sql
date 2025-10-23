-- Delete the older duplicate global Eitje credential
DELETE FROM public.api_credentials
WHERE id = '64e74965-a7de-41bf-9e81-c0f831334c6c';

-- Add partial unique index for global credentials (location_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_api_credentials_provider_global 
ON public.api_credentials (provider) 
WHERE location_id IS NULL;

-- Add partial unique index for location-specific credentials (location_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_api_credentials_provider_location 
ON public.api_credentials (provider, location_id) 
WHERE location_id IS NOT NULL;