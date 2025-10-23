-- Clean up duplicate Eitje API credentials
-- Keep the newer credential with all 4 values (partner + API credentials)
DELETE FROM api_credentials 
WHERE id = 'bf7d02c4-4632-4f7f-bed8-75e76eb04ac3';