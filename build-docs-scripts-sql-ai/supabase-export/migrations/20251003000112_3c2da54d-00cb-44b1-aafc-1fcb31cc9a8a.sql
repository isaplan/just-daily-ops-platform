-- Add supplier column to products table
ALTER TABLE public.products 
ADD COLUMN supplier text;

-- Create order_groups table to group products into single orders
CREATE TABLE public.order_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on order_groups
ALTER TABLE public.order_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for order_groups
CREATE POLICY "Anyone can view order_groups" 
ON public.order_groups 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert order_groups" 
ON public.order_groups 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update order_groups" 
ON public.order_groups 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete order_groups" 
ON public.order_groups 
FOR DELETE 
USING (true);

-- Add order_group_id to orders table
ALTER TABLE public.orders 
ADD COLUMN order_group_id uuid REFERENCES public.order_groups(id) ON DELETE CASCADE;

-- Create trigger for order_groups updated_at
CREATE TRIGGER update_order_groups_updated_at
BEFORE UPDATE ON public.order_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();