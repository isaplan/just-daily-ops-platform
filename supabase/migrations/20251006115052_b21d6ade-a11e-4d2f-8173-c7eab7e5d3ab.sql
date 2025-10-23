-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for locations
CREATE POLICY "Anyone can view locations"
  ON public.locations
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert locations"
  ON public.locations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update locations"
  ON public.locations
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete locations"
  ON public.locations
  FOR DELETE
  USING (true);

-- Create product_locations junction table for many-to-many relationship
CREATE TABLE public.product_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

-- Enable RLS
ALTER TABLE public.product_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_locations
CREATE POLICY "Anyone can view product_locations"
  ON public.product_locations
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert product_locations"
  ON public.product_locations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update product_locations"
  ON public.product_locations
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete product_locations"
  ON public.product_locations
  FOR DELETE
  USING (true);

-- Add location_id to order_groups
ALTER TABLE public.order_groups
ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- Insert default locations
INSERT INTO public.locations (name) VALUES
  ('van Kinsbergen'),
  ('Bar Bea'),
  ('l''Amour-Toujours');

-- Create trigger for updating updated_at on locations
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();