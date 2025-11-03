-- =====================================================
-- EXPAND EITJE AGGREGATED TABLES
-- =====================================================
-- Add all revenue columns to eitje_revenue_days_aggregated
-- Extract data from normalized raw table columns (no JSONB storage)
-- Compliance: No JSONB columns in aggregated tables

-- 1. EXPAND REVENUE DAYS AGGREGATED TABLE
ALTER TABLE public.eitje_revenue_days_aggregated
-- VAT fields
ADD COLUMN IF NOT EXISTS total_revenue_excl_vat DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue_incl_vat DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_vat_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_vat_rate DECIMAL(5,2) DEFAULT 0,

-- Payment method fields
ADD COLUMN IF NOT EXISTS total_cash_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_card_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_digital_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_other_revenue DECIMAL(12,2) DEFAULT 0,

-- Payment method percentages
ADD COLUMN IF NOT EXISTS cash_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS digital_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_percentage DECIMAL(5,2) DEFAULT 0,

-- Transaction metrics
ADD COLUMN IF NOT EXISTS max_transaction_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_transaction_value DECIMAL(10,2) DEFAULT 0,

-- Additional fields
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS net_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_revenue DECIMAL(12,2) DEFAULT 0;

-- 2. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.total_revenue_excl_vat IS 'Total revenue excluding VAT';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.total_revenue_incl_vat IS 'Total revenue including VAT';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.total_vat_amount IS 'Total VAT amount';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.avg_vat_rate IS 'Average VAT rate percentage';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.total_cash_revenue IS 'Total revenue from cash payments';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.total_card_revenue IS 'Total revenue from card payments';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.total_digital_revenue IS 'Total revenue from digital payments';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.total_other_revenue IS 'Total revenue from other payment methods';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.cash_percentage IS 'Percentage of total revenue from cash';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.card_percentage IS 'Percentage of total revenue from card';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.digital_percentage IS 'Percentage of total revenue from digital';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.other_percentage IS 'Percentage of total revenue from other methods';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.max_transaction_value IS 'Maximum single transaction value';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.min_transaction_value IS 'Minimum single transaction value';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.currency IS 'Currency code (default: EUR)';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.net_revenue IS 'Net revenue after deductions';
COMMENT ON COLUMN public.eitje_revenue_days_aggregated.gross_revenue IS 'Gross revenue before deductions';

-- 3. ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_total_revenue ON public.eitje_revenue_days_aggregated(total_revenue);
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_vat ON public.eitje_revenue_days_aggregated(total_vat_amount);
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_cash ON public.eitje_revenue_days_aggregated(total_cash_revenue);
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_card ON public.eitje_revenue_days_aggregated(total_card_revenue);

-- 4. VERIFY RLS POLICIES (should already exist, but ensure they're in place)
-- Policies should already exist from the initial table creation migration
-- Verify with: SELECT * FROM pg_policies WHERE tablename = 'eitje_revenue_days_aggregated';

-- 5. COMPLIANCE CHECK: Verify no JSONB columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'eitje_revenue_days_aggregated' 
      AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'COMPLIANCE VIOLATION: JSONB columns found in eitje_revenue_days_aggregated';
  END IF;
END $$;

