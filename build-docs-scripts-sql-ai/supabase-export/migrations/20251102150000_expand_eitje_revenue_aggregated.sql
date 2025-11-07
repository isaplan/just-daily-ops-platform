-- =====================================================
-- EXPAND EITJE REVENUE AGGREGATED TABLE
-- =====================================================
-- Add all missing columns from raw table to aggregated table
-- Compliance: No JSONB blobs, all data extracted to columns

ALTER TABLE public.eitje_revenue_days_aggregated
ADD COLUMN IF NOT EXISTS total_revenue_excl_vat DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue_incl_vat DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_vat_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_vat_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cash_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_card_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_digital_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_other_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS digital_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_transaction_value DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_transaction_value DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS net_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_revenue DECIMAL(12,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON TABLE public.eitje_revenue_days_aggregated IS 
'Daily aggregated revenue metrics per environment. All data extracted from raw table columns - NO JSONB blobs for compliance.';

-- =====================================================
-- COMPLIANCE CHECK: Verify no JSONB columns
-- =====================================================

DO $$
DECLARE
    jsonb_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO jsonb_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'eitje_revenue_days_aggregated'
    AND data_type = 'jsonb';
    
    IF jsonb_count > 0 THEN
        RAISE EXCEPTION 'Compliance violation: Found % JSONB columns in eitje_revenue_days_aggregated. All data must be in normalized columns.', jsonb_count;
    END IF;
END $$;

