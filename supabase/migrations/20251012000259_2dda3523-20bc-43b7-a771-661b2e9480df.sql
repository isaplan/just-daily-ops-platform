-- Create bork_sales_data table for Bork POS sales imports
CREATE TABLE public.bork_sales_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID REFERENCES public.data_imports(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  date DATE NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC,
  price NUMERIC,
  revenue NUMERIC,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bork_sales_data ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create index for better query performance
CREATE INDEX idx_bork_sales_data_import_id ON public.bork_sales_data(import_id);
CREATE INDEX idx_bork_sales_data_location_date ON public.bork_sales_data(location_id, date);
CREATE INDEX idx_bork_sales_data_date ON public.bork_sales_data(date);