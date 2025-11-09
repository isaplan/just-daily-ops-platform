-- =====================================================
-- Allow anon users to INSERT, UPDATE, and DELETE worker_profiles
-- =====================================================
-- This is needed for the Excel import script which uses anon key

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Allow anon users to insert worker profiles" ON public.worker_profiles;
DROP POLICY IF EXISTS "Allow anon users to update worker profiles" ON public.worker_profiles;
DROP POLICY IF EXISTS "Allow anon users to delete worker profiles" ON public.worker_profiles;

-- Create policies for anon users
CREATE POLICY "Allow anon users to insert worker profiles" ON public.worker_profiles
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon users to update worker profiles" ON public.worker_profiles
    FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon users to delete worker profiles" ON public.worker_profiles
    FOR DELETE TO anon USING (true);

