-- =====================================================
-- FIX RLS POLICY CONFLICTS FOR PROCESSED TABLES
-- =====================================================
-- The error "(USING expression)" suggests policy conflicts
-- This migration ensures all INSERT policies are correctly structured
-- and removes any conflicting policies

-- =====================================================
-- TIME REGISTRATION SHIFTS PROCESSED
-- =====================================================

-- Drop all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow service role insert to eitje time registration shifts pro" 
ON public.eitje_time_registration_shifts_processed;

-- Recreate INSERT policies with proper structure (FOR INSERT only, no USING clause)
CREATE POLICY "Allow authenticated insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anon insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR INSERT TO anon 
WITH CHECK (true);

-- =====================================================
-- PLANNING SHIFTS PROCESSED
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow service role insert to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

CREATE POLICY "Allow authenticated insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anon insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR INSERT TO anon 
WITH CHECK (true);

-- =====================================================
-- REVENUE DAYS PROCESSED
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

DROP POLICY IF EXISTS "Allow service role insert to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

CREATE POLICY "Allow authenticated insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anon insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR INSERT TO anon 
WITH CHECK (true);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- FIX RLS POLICY CONFLICTS FOR PROCESSED TABLES
-- =====================================================
-- The error "(USING expression)" suggests policy conflicts
-- This migration ensures all INSERT policies are correctly structured
-- and removes any conflicting policies that might interfere

-- =====================================================
-- TIME REGISTRATION SHIFTS PROCESSED
-- =====================================================

-- Drop all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow service role insert to eitje time registration shifts pro" 
ON public.eitje_time_registration_shifts_processed;

-- Recreate INSERT policies with proper structure (FOR INSERT only, WITH CHECK only, no USING)
CREATE POLICY "Allow authenticated insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anon insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR INSERT TO anon 
WITH CHECK (true);

-- =====================================================
-- PLANNING SHIFTS PROCESSED
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow service role insert to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

CREATE POLICY "Allow authenticated insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anon insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR INSERT TO anon 
WITH CHECK (true);

-- =====================================================
-- REVENUE DAYS PROCESSED
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

DROP POLICY IF EXISTS "Allow service role insert to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

CREATE POLICY "Allow authenticated insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anon insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR INSERT TO anon 
WITH CHECK (true);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';



