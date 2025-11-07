-- Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN derving numeric,
ADD COLUMN inkoopprijs numeric,
ADD COLUMN suggested_price numeric,
ADD COLUMN customer_price numeric,
ADD COLUMN customer_price_margin numeric;