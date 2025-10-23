-- Add foreign key constraint from orders to products
ALTER TABLE public.orders
ADD CONSTRAINT orders_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;