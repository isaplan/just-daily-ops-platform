-- Temporarily disable RLS for testing
-- This allows us to test the aggregation functionality

-- Disable RLS temporarily
ALTER TABLE public.powerbi_pnl_aggregated DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerbi_pnl_aggregated_subcategories DISABLE ROW LEVEL SECURITY;

-- Note: Remember to re-enable RLS after testing with:
-- ALTER TABLE public.powerbi_pnl_aggregated ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.powerbi_pnl_aggregated_subcategories ENABLE ROW LEVEL SECURITY;


