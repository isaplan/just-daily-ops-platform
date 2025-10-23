-- Add new columns to suppliers table
ALTER TABLE public.suppliers 
  ADD COLUMN info_email TEXT,
  ADD COLUMN order_email TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN online_shop TEXT;

-- Remove old columns
ALTER TABLE public.suppliers 
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS shop_link;