-- Create supplier_orders table to track order status per supplier within each order group
CREATE TABLE public.supplier_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_group_id UUID NOT NULL REFERENCES public.order_groups(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready_to_order',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_group_id, supplier_name)
);

-- Enable RLS
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view supplier_orders"
ON public.supplier_orders
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert supplier_orders"
ON public.supplier_orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update supplier_orders"
ON public.supplier_orders
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete supplier_orders"
ON public.supplier_orders
FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_supplier_orders_updated_at
BEFORE UPDATE ON public.supplier_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();