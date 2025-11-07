-- Phase 1: Delete October 2025 data
DELETE FROM bork_sales_data 
WHERE date >= '2025-10-01' AND date < '2025-11-01';

-- Phase 2: Add new VAT, cost, and SKU columns
ALTER TABLE bork_sales_data 
ADD COLUMN revenue_ex_vat NUMERIC,
ADD COLUMN revenue_inc_vat NUMERIC,
ADD COLUMN vat_rate NUMERIC,
ADD COLUMN vat_amount NUMERIC,
ADD COLUMN cost_price NUMERIC,
ADD COLUMN product_sku TEXT;

-- Create indexes for better query performance
CREATE INDEX idx_bork_sales_vat_rate ON bork_sales_data(vat_rate);
CREATE INDEX idx_bork_sales_product_sku ON bork_sales_data(product_sku);

-- Phase 3: Backfill existing data from raw_data JSONB
UPDATE bork_sales_data
SET 
  revenue_ex_vat = CAST(raw_data->>'TotalEx' AS NUMERIC),
  revenue_inc_vat = CAST(raw_data->>'TotalInc' AS NUMERIC),
  vat_rate = CAST(raw_data->>'VatPerc' AS NUMERIC),
  vat_amount = CAST(raw_data->>'TotalInc' AS NUMERIC) - CAST(raw_data->>'TotalEx' AS NUMERIC),
  cost_price = CAST(raw_data->>'CostPrice' AS NUMERIC),
  product_sku = raw_data->>'ProductNr'
WHERE raw_data IS NOT NULL;