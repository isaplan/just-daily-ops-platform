-- Fix RLS policies for bork_sales_aggregated table
-- This allows the aggregation service to insert data

-- Enable RLS on the table (if not already enabled)
ALTER TABLE public.bork_sales_aggregated ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.bork_sales_aggregated
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow all operations for service role
CREATE POLICY "Allow all operations for service role" ON public.bork_sales_aggregated
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy to allow all operations for anon users (for development)
CREATE POLICY "Allow all operations for anon users" ON public.bork_sales_aggregated
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
