-- Phase 1: Create combined_products table
CREATE TABLE combined_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  sub_category TEXT,
  matched_to_type TEXT CHECK (matched_to_type IN ('product', 'recipe')),
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  matched_recipe_id UUID REFERENCES product_recipes(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint on name to prevent duplicates
CREATE UNIQUE INDEX idx_combined_products_name ON combined_products(LOWER(name));

-- Add indexes for faster lookups
CREATE INDEX idx_combined_products_category ON combined_products(category);
CREATE INDEX idx_combined_products_matched_product ON combined_products(matched_product_id);
CREATE INDEX idx_combined_products_matched_recipe ON combined_products(matched_recipe_id);

-- Add RLS policies
ALTER TABLE combined_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view combined_products" ON combined_products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert combined_products" ON combined_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update combined_products" ON combined_products FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete combined_products" ON combined_products FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_combined_products_updated_at 
  BEFORE UPDATE ON combined_products
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Phase 2: Update sales_import_items table
ALTER TABLE sales_import_items 
  ADD COLUMN combined_product_id UUID REFERENCES combined_products(id) ON DELETE SET NULL;

CREATE INDEX idx_sales_import_items_combined_product ON sales_import_items(combined_product_id);