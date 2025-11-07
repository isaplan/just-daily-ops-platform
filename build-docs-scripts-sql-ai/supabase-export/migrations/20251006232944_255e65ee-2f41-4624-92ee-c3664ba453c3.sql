-- Create storage_locations table for different storage areas within a location
CREATE TABLE public.storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(location_id, name)
);

-- Create stock_levels table to track current stock per product per storage location
CREATE TABLE public.stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC DEFAULT 0 NOT NULL,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  last_counted_by_user_id UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(product_id, storage_location_id)
);

-- Create stock_transactions table to log all stock movements
CREATE TABLE public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'order_receipt', 'sale', 'adjustment', 'transfer', 'waste', 'monthly_count'
  quantity_change NUMERIC NOT NULL, -- positive for increases, negative for decreases
  quantity_before NUMERIC NOT NULL,
  quantity_after NUMERIC NOT NULL,
  reference_id UUID, -- link to order_group_id, sales_import_id, monthly_count_id, etc.
  reference_type TEXT, -- 'order_group', 'sales_import', 'monthly_count', 'manual_adjustment'
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create monthly_stock_counts table for end-of-month physical counts
CREATE TABLE public.monthly_stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  count_date DATE NOT NULL,
  status TEXT DEFAULT 'in_progress' NOT NULL, -- 'in_progress', 'completed', 'confirmed', 'sent'
  started_by_user_id UUID,
  completed_by_user_id UUID,
  confirmed_by_user_id UUID,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_value_ex_btw NUMERIC,
  total_value_btw_high NUMERIC,
  total_value_btw_low NUMERIC,
  total_value_inc_btw NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create monthly_stock_count_items to store individual product counts
CREATE TABLE public.monthly_stock_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_stock_count_id UUID REFERENCES public.monthly_stock_counts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE CASCADE NOT NULL,
  counted_quantity NUMERIC NOT NULL,
  system_quantity NUMERIC NOT NULL,
  variance NUMERIC GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  variance_percentage NUMERIC,
  value_ex_btw NUMERIC,
  value_btw NUMERIC,
  value_inc_btw NUMERIC,
  notes TEXT,
  counted_by_user_id UUID,
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create product_recipes table for cocktails and unit conversions
CREATE TABLE public.product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_name TEXT NOT NULL, -- e.g., "Pornstar Martini", "Single Shot Vodka"
  recipe_type TEXT NOT NULL, -- 'cocktail', 'single_shot', 'mixed_drink'
  unit_size_ml NUMERIC, -- for single shots, the shot size
  units_per_bottle NUMERIC, -- calculated units per bottle for single shots
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create product_recipe_ingredients to store recipe components
CREATE TABLE public.product_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.product_recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity_ml NUMERIC NOT NULL,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create sales_imports table to track imported sales data
CREATE TABLE public.sales_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  import_date DATE NOT NULL,
  sales_date DATE NOT NULL,
  file_name TEXT,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'completed', 'error'
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  error_message TEXT,
  imported_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create sales_import_items to store individual sales records
CREATE TABLE public.sales_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_import_id UUID REFERENCES public.sales_imports(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  matched_product_id UUID REFERENCES public.products(id),
  matched_recipe_id UUID REFERENCES public.product_recipes(id),
  quantity NUMERIC NOT NULL,
  sale_timestamp TIMESTAMP WITH TIME ZONE,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'matched', 'unmatched', 'processed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_import_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storage_locations
CREATE POLICY "Anyone can view storage_locations" ON public.storage_locations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert storage_locations" ON public.storage_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update storage_locations" ON public.storage_locations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete storage_locations" ON public.storage_locations FOR DELETE USING (true);

-- RLS Policies for stock_levels
CREATE POLICY "Anyone can view stock_levels" ON public.stock_levels FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stock_levels" ON public.stock_levels FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stock_levels" ON public.stock_levels FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete stock_levels" ON public.stock_levels FOR DELETE USING (true);

-- RLS Policies for stock_transactions
CREATE POLICY "Anyone can view stock_transactions" ON public.stock_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stock_transactions" ON public.stock_transactions FOR INSERT WITH CHECK (true);

-- RLS Policies for monthly_stock_counts
CREATE POLICY "Anyone can view monthly_stock_counts" ON public.monthly_stock_counts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert monthly_stock_counts" ON public.monthly_stock_counts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update monthly_stock_counts" ON public.monthly_stock_counts FOR UPDATE USING (true);

-- RLS Policies for monthly_stock_count_items
CREATE POLICY "Anyone can view monthly_stock_count_items" ON public.monthly_stock_count_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert monthly_stock_count_items" ON public.monthly_stock_count_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update monthly_stock_count_items" ON public.monthly_stock_count_items FOR UPDATE USING (true);

-- RLS Policies for product_recipes
CREATE POLICY "Anyone can view product_recipes" ON public.product_recipes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert product_recipes" ON public.product_recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product_recipes" ON public.product_recipes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete product_recipes" ON public.product_recipes FOR DELETE USING (true);

-- RLS Policies for product_recipe_ingredients
CREATE POLICY "Anyone can view product_recipe_ingredients" ON public.product_recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Anyone can insert product_recipe_ingredients" ON public.product_recipe_ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product_recipe_ingredients" ON public.product_recipe_ingredients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete product_recipe_ingredients" ON public.product_recipe_ingredients FOR DELETE USING (true);

-- RLS Policies for sales_imports
CREATE POLICY "Anyone can view sales_imports" ON public.sales_imports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sales_imports" ON public.sales_imports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sales_imports" ON public.sales_imports FOR UPDATE USING (true);

-- RLS Policies for sales_import_items
CREATE POLICY "Anyone can view sales_import_items" ON public.sales_import_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sales_import_items" ON public.sales_import_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sales_import_items" ON public.sales_import_items FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_storage_locations_location_id ON public.storage_locations(location_id);
CREATE INDEX idx_stock_levels_product_id ON public.stock_levels(product_id);
CREATE INDEX idx_stock_levels_storage_location_id ON public.stock_levels(storage_location_id);
CREATE INDEX idx_stock_transactions_product_id ON public.stock_transactions(product_id);
CREATE INDEX idx_stock_transactions_created_at ON public.stock_transactions(created_at DESC);
CREATE INDEX idx_monthly_stock_counts_location_id ON public.monthly_stock_counts(location_id);
CREATE INDEX idx_monthly_stock_count_items_count_id ON public.monthly_stock_count_items(monthly_stock_count_id);
CREATE INDEX idx_sales_imports_location_id ON public.sales_imports(location_id);
CREATE INDEX idx_sales_imports_sales_date ON public.sales_imports(sales_date DESC);
CREATE INDEX idx_sales_import_items_import_id ON public.sales_import_items(sales_import_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_storage_locations_updated_at
  BEFORE UPDATE ON public.storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_levels_updated_at
  BEFORE UPDATE ON public.stock_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_stock_counts_updated_at
  BEFORE UPDATE ON public.monthly_stock_counts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_recipes_updated_at
  BEFORE UPDATE ON public.product_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_imports_updated_at
  BEFORE UPDATE ON public.sales_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();