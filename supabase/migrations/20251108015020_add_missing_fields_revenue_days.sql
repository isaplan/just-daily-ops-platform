-- =====================================================
-- Add Missing Fields to eitje_revenue_days_aggregated
-- =====================================================
-- Extracts API timestamps from raw_data JSONB

-- Add missing columns
ALTER TABLE IF EXISTS public.eitje_revenue_days_aggregated
ADD COLUMN IF NOT EXISTS api_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS api_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS raw_data_hash TEXT;

-- Backfill api_created_at from raw table's raw_data
UPDATE public.eitje_revenue_days_aggregated erda
SET api_created_at = (
  SELECT (raw_data->>'created_at')::TIMESTAMPTZ
  FROM public.eitje_revenue_days_raw erdr
  WHERE erdr.environment_id = erda.environment_id
    AND erdr.date = erda.date
    AND erdr.raw_data->>'created_at' IS NOT NULL
  LIMIT 1
)
WHERE api_created_at IS NULL;

-- Backfill api_updated_at from raw table's raw_data
UPDATE public.eitje_revenue_days_aggregated erda
SET api_updated_at = (
  SELECT (raw_data->>'updated_at')::TIMESTAMPTZ
  FROM public.eitje_revenue_days_raw erdr
  WHERE erdr.environment_id = erda.environment_id
    AND erdr.date = erda.date
    AND erdr.raw_data->>'updated_at' IS NOT NULL
  LIMIT 1
)
WHERE api_updated_at IS NULL;

-- Backfill raw_data_hash (calculate hash of raw_data for deduplication)
UPDATE public.eitje_revenue_days_aggregated erda
SET raw_data_hash = (
  SELECT encode(digest(raw_data::text, 'sha256'), 'hex')
  FROM public.eitje_revenue_days_raw erdr
  WHERE erdr.environment_id = erda.environment_id
    AND erdr.date = erda.date
  LIMIT 1
)
WHERE raw_data_hash IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.api_created_at IS 'Original created_at timestamp from Eitje API (from raw_data.created_at)';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.api_updated_at IS 'Original updated_at timestamp from Eitje API (from raw_data.updated_at)';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.raw_data_hash IS 'SHA256 hash of raw_data for deduplication purposes';




