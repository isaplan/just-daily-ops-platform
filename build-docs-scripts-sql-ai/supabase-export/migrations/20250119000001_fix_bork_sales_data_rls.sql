-- Fix RLS policies for bork_sales_data to allow service_role access
-- This is needed for edge functions to insert data

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read bork_sales_data" ON public.bork_sales_data;
DROP POLICY IF EXISTS "Allow authenticated users to insert bork_sales_data" ON public.bork_sales_data;
DROP POLICY IF EXISTS "Allow authenticated users to update bork_sales_data" ON public.bork_sales_data;
DROP POLICY IF EXISTS "Allow authenticated users to delete bork_sales_data" ON public.bork_sales_data;

-- Create new policies that allow both authenticated users and service_role
CREATE POLICY "Allow read access to bork_sales_data" ON public.bork_sales_data
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow insert access to bork_sales_data" ON public.bork_sales_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow update access to bork_sales_data" ON public.bork_sales_data
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow delete access to bork_sales_data" ON public.bork_sales_data
    FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
