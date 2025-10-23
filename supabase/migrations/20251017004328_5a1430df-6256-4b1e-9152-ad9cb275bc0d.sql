-- Update default worker intervals to 1 minute (insane mode)
UPDATE bork_sync_config SET worker_interval_minutes = 1;
UPDATE eitje_sync_config SET worker_interval_minutes = 1;

-- Update default values for future records
ALTER TABLE bork_sync_config ALTER COLUMN worker_interval_minutes SET DEFAULT 1;
ALTER TABLE eitje_sync_config ALTER COLUMN worker_interval_minutes SET DEFAULT 1;