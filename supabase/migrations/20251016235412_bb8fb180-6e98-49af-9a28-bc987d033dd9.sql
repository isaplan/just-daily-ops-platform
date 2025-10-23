-- Add lookback_days to bork_sync_config for configurable sync timeframe
ALTER TABLE public.bork_sync_config 
ADD COLUMN IF NOT EXISTS lookback_days INTEGER NOT NULL DEFAULT 1 CHECK (lookback_days > 0 AND lookback_days <= 90);