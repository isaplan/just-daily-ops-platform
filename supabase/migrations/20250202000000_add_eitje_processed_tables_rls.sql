-- =====================================================
-- ADD RLS POLICIES FOR EITJE PROCESSED TABLES
-- =====================================================
-- The processed tables were created without RLS policies
-- This migration adds the missing policies to allow data access

-- Enable RLS on processed tables
ALTER TABLE public.eitje_time_registration_shifts_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_planning_shifts_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_revenue_days_processed ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TIME REGISTRATION SHIFTS PROCESSED POLICIES
-- =====================================================

CREATE POLICY "Allow authenticated read access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow service role full access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR ALL TO service_role 
USING (true);

CREATE POLICY "Allow anon read access to eitje time registration shifts processed" 
ON public.eitje_time_registration_shifts_processed
FOR SELECT TO anon 
USING (true);

-- =====================================================
-- PLANNING SHIFTS PROCESSED POLICIES
-- =====================================================

CREATE POLICY "Allow authenticated read access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow service role full access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR ALL TO service_role 
USING (true);

CREATE POLICY "Allow anon read access to eitje planning shifts processed" 
ON public.eitje_planning_shifts_processed
FOR SELECT TO anon 
USING (true);

-- =====================================================
-- REVENUE DAYS PROCESSED POLICIES
-- =====================================================

CREATE POLICY "Allow authenticated read access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow service role full access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR ALL TO service_role 
USING (true);

CREATE POLICY "Allow anon read access to eitje revenue days processed" 
ON public.eitje_revenue_days_processed
FOR SELECT TO anon 
USING (true);
