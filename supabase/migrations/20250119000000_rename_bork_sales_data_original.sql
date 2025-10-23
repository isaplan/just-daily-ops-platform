-- Rename existing bork_sales_data table to preserve old data
-- This is part of the API Clean Slate - V1 approach

-- Rename the existing table to preserve old data
ALTER TABLE public.bork_sales_data RENAME TO bork_sales_data_original;

-- Create a new clean bork_sales_data table for API Clean Slate - V1
CREATE TABLE public.bork_sales_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL,
    import_id UUID,
    date DATE NOT NULL,
    product_name TEXT,
    category TEXT,
    quantity DECIMAL(10,2) DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_bork_sales_data_location_id ON public.bork_sales_data(location_id);
CREATE INDEX idx_bork_sales_data_date ON public.bork_sales_data(date);
CREATE INDEX idx_bork_sales_data_category ON public.bork_sales_data(category);
CREATE INDEX idx_bork_sales_data_created_at ON public.bork_sales_data(created_at);

-- Add RLS policies
ALTER TABLE public.bork_sales_data ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write
CREATE POLICY "Allow authenticated users to read bork_sales_data" ON public.bork_sales_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert bork_sales_data" ON public.bork_sales_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update bork_sales_data" ON public.bork_sales_data
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete bork_sales_data" ON public.bork_sales_data
    FOR DELETE USING (auth.role() = 'authenticated');
