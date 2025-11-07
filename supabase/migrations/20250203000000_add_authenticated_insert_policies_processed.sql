-- =====================================================
-- ADD INSERT POLICIES FOR AUTHENTICATED AND ANON USERS
-- =====================================================
-- Allow authenticated and anon users to INSERT into processed tables
-- The process endpoint uses anon key, so we need INSERT policies for both roles

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Allow authenticated insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed;

DROP POLICY IF EXISTS "Allow authenticated insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed;

DROP POLICY IF EXISTS "Allow authenticated insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

DROP POLICY IF EXISTS "Allow anon insert access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed;

-- =====================================================
-- TIME REGISTRATION SHIFTS PROCESSED
-- =====================================================

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

