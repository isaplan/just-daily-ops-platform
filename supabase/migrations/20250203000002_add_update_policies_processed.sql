-- =====================================================
-- ADD UPDATE POLICIES FOR PROCESSED TABLES
-- =====================================================
-- UPSERT operations require UPDATE policies in addition to INSERT policies
-- This migration adds the missing UPDATE policies for anon and authenticated users

-- Drop existing UPDATE policies if they exist (idempotent)
DROP POLICY IF EXISTS "Allow authenticated update access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow anon update access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow authenticated update access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow anon update access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow authenticated update access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

DROP POLICY IF EXISTS "Allow anon update access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

-- =====================================================
-- TIME REGISTRATION SHIFTS PROCESSED
-- =====================================================

CREATE POLICY "Allow authenticated update access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR UPDATE TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon update access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR UPDATE TO anon 
USING (true)
WITH CHECK (true);

-- =====================================================
-- PLANNING SHIFTS PROCESSED
-- =====================================================

CREATE POLICY "Allow authenticated update access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR UPDATE TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon update access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR UPDATE TO anon 
USING (true)
WITH CHECK (true);

-- =====================================================
-- REVENUE DAYS PROCESSED
-- =====================================================

CREATE POLICY "Allow authenticated update access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR UPDATE TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon update access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR UPDATE TO anon 
USING (true)
WITH CHECK (true);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';


