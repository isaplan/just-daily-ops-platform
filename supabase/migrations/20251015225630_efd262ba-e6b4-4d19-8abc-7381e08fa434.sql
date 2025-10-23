-- Add unique constraint to prevent duplicate API credentials per provider/location
ALTER TABLE api_credentials 
ADD CONSTRAINT api_credentials_provider_location_unique 
UNIQUE (provider, location_id);