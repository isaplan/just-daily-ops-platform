-- Add foreign key constraint from orders.product_id to products.id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_product_id_fkey'
  ) THEN
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES public.products(id) 
    ON DELETE CASCADE;
  END IF;
END $$;