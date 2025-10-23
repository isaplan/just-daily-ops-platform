-- Add enhanced columns to sales_import_items
ALTER TABLE sales_import_items
ADD COLUMN IF NOT EXISTS main_category text,
ADD COLUMN IF NOT EXISTS sub_category text,
ADD COLUMN IF NOT EXISTS total_price_inc_btw numeric,
ADD COLUMN IF NOT EXISTS total_price_ex_btw numeric,
ADD COLUMN IF NOT EXISTS btw_percentage numeric;

-- Add enhanced columns to sales_imports
ALTER TABLE sales_imports
ADD COLUMN IF NOT EXISTS grand_total_inc_btw numeric,
ADD COLUMN IF NOT EXISTS grand_total_ex_btw numeric,
ADD COLUMN IF NOT EXISTS date_range_start date,
ADD COLUMN IF NOT EXISTS date_range_end date,
ADD COLUMN IF NOT EXISTS location_name text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_import_items_main_category ON sales_import_items(main_category);
CREATE INDEX IF NOT EXISTS idx_sales_import_items_sub_category ON sales_import_items(sub_category);