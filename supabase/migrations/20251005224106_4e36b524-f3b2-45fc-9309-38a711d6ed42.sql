-- Drop the old products table and create new simplified structure
DROP TABLE IF EXISTS public.products CASCADE;

-- Create new products table with simplified structure
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hoofdcategorie TEXT NOT NULL,
  productcategorie TEXT NOT NULL,
  product TEXT NOT NULL,
  leverancier TEXT,
  verpakking TEXT,
  aantal_per_verpakking NUMERIC,
  bestel_eenheid TEXT,
  kost_prijs_per_stuk NUMERIC,
  btw NUMERIC,
  prijs_ex_btw NUMERIC,
  prijs_in_btw NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update products" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete products" 
ON public.products 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();