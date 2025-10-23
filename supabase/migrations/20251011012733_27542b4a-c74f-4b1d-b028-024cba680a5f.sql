-- Create menu_sections table
CREATE TABLE public.menu_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_version_id UUID NOT NULL REFERENCES public.menu_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id)
);

-- Create menu_section_products table (junction with pricing)
CREATE TABLE public.menu_section_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_section_id UUID NOT NULL REFERENCES public.menu_sections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  product_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  cost_price NUMERIC NOT NULL,
  btw_rate NUMERIC NOT NULL,
  supplier TEXT,
  waste_percentage NUMERIC NOT NULL DEFAULT 0,
  target_margin_percentage NUMERIC NOT NULL DEFAULT 70,
  suggested_price_ex_btw NUMERIC,
  suggested_price_inc_btw NUMERIC,
  consumer_price NUMERIC,
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by_user_id UUID REFERENCES auth.users(id)
);

-- Create menu_product_price_history table
CREATE TABLE public.menu_product_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_section_product_id UUID NOT NULL REFERENCES public.menu_section_products(id) ON DELETE CASCADE,
  menu_version_id UUID NOT NULL REFERENCES public.menu_versions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by_user_id UUID REFERENCES auth.users(id),
  change_reason TEXT
);

-- Update menu_versions table with workflow columns
ALTER TABLE public.menu_versions
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN description TEXT,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN published_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_section_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_product_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_sections
CREATE POLICY "Anyone can view menu_sections"
ON public.menu_sections FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert menu_sections"
ON public.menu_sections FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can update menu_sections"
ON public.menu_sections FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete menu_sections"
ON public.menu_sections FOR DELETE
USING (true);

-- RLS Policies for menu_section_products
CREATE POLICY "Anyone can view menu_section_products"
ON public.menu_section_products FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert menu_section_products"
ON public.menu_section_products FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can update menu_section_products"
ON public.menu_section_products FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete menu_section_products"
ON public.menu_section_products FOR DELETE
USING (true);

-- RLS Policies for menu_product_price_history
CREATE POLICY "Anyone can view menu_product_price_history"
ON public.menu_product_price_history FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert menu_product_price_history"
ON public.menu_product_price_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_menu_sections_menu_version ON public.menu_sections(menu_version_id);
CREATE INDEX idx_menu_section_products_section ON public.menu_section_products(menu_section_id);
CREATE INDEX idx_menu_section_products_product ON public.menu_section_products(product_id);
CREATE INDEX idx_menu_product_price_history_product ON public.menu_product_price_history(menu_section_product_id);

-- Create trigger for updated_at on menu_sections
CREATE TRIGGER update_menu_sections_updated_at
BEFORE UPDATE ON public.menu_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on menu_section_products
CREATE TRIGGER update_menu_section_products_updated_at
BEFORE UPDATE ON public.menu_section_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();