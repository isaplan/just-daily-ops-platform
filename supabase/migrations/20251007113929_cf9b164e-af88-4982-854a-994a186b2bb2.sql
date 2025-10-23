-- Add division enum type
CREATE TYPE division_type AS ENUM ('beverages', 'food');

-- Add division column to products table
ALTER TABLE products 
ADD COLUMN division division_type DEFAULT 'beverages';

-- Add division column to product_recipes table
ALTER TABLE product_recipes 
ADD COLUMN division division_type DEFAULT 'beverages';

-- Add division column to combined_products table
ALTER TABLE combined_products 
ADD COLUMN division division_type DEFAULT 'beverages';

-- Add division column to sales_import_items table
ALTER TABLE sales_import_items 
ADD COLUMN division division_type DEFAULT 'beverages';

-- Create index for filtering by division
CREATE INDEX idx_products_division ON products(division);
CREATE INDEX idx_combined_products_division ON combined_products(division);
CREATE INDEX idx_sales_import_items_division ON sales_import_items(division);

-- Backfill existing products based on hoofdcategorie patterns
UPDATE products 
SET division = 'beverages'
WHERE hoofdcategorie IN ('Bier', 'Wijn', 'Sterk', 'Drank', 'Warme Drank', 'Frisdrank', 'Spirits', 'Liqueur');

-- Set any NULL divisions to beverages as default
UPDATE products SET division = 'beverages' WHERE division IS NULL;
UPDATE product_recipes SET division = 'beverages' WHERE division IS NULL;
UPDATE combined_products SET division = 'beverages' WHERE division IS NULL;
UPDATE sales_import_items SET division = 'beverages' WHERE division IS NULL;