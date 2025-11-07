-- =====================================================
-- FIX RLS INSERT POLICIES FOR PROCESSED TABLES
-- =====================================================
-- The existing "FOR ALL" policies may not cover INSERT operations properly
-- This migration adds explicit INSERT policies with WITH CHECK clause

-- Drop existing service role policies if they exist (we'll recreate them properly)
DROP POLICY IF EXISTS "Allow service role full access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow service role full access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow service role full access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

-- =====================================================
-- TIME REGISTRATION SHIFTS PROCESSED
-- =====================================================

-- Service role: Full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Allow service role full access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR ALL TO service_role 
USING (true)
WITH CHECK (true);

-- =====================================================
-- PLANNING SHIFTS PROCESSED
-- =====================================================

-- Service role: Full access
CREATE POLICY "Allow service role full access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR ALL TO service_role 
USING (true)
WITH CHECK (true);

-- =====================================================
-- REVENUE DAYS PROCESSED
-- =====================================================

-- Service role: Full access
CREATE POLICY "Allow service role full access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR ALL TO service_role 
USING (true)
WITH CHECK (true);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';


