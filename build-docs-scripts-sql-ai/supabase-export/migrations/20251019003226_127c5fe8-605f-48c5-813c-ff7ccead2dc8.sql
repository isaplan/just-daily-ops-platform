-- Drop existing indexes if they exist
DROP INDEX IF EXISTS public.idx_bork_sales_data_location_id;
DROP INDEX IF EXISTS public.idx_bork_sales_data_date;
DROP INDEX IF EXISTS public.idx_bork_sales_data_import_id;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view bork_sales_data" ON public.bork_sales_data;
DROP POLICY IF EXISTS "Authenticated users can insert bork_sales_data" ON public.bork_sales_data;
DROP POLICY IF EXISTS "Authenticated users can delete bork_sales_data" ON public.bork_sales_data;

-- Drop new table if it exists
DROP TABLE IF EXISTS public.bork_sales_data CASCADE;

-- Rename existing table to preserve data (only if not already renamed)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bork_sales_data_original') THEN
        -- Table was already renamed, do nothing
        NULL;
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bork_sales_data') THEN
        ALTER TABLE public.bork_sales_data RENAME TO bork_sales_data_original;
    END IF;
END $$;

-- Create new simplified bork_sales_data table
CREATE TABLE public.bork_sales_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES public.locations(id),
    import_id UUID REFERENCES public.data_imports(id),
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

-- Create indexes for performance
CREATE INDEX idx_bork_sales_data_location_id ON public.bork_sales_data(location_id);
CREATE INDEX idx_bork_sales_data_date ON public.bork_sales_data(date);
CREATE INDEX idx_bork_sales_data_import_id ON public.bork_sales_data(import_id);

-- Enable RLS
ALTER TABLE public.bork_sales_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view bork_sales_data" 
ON public.bork_sales_data 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert bork_sales_data" 
ON public.bork_sales_data 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete bork_sales_data" 
ON public.bork_sales_data 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp 
BEFORE UPDATE ON public.bork_sales_data 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();