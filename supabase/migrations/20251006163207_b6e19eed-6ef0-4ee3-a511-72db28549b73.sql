-- Create returns table
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  order_group_id UUID REFERENCES public.order_groups(id),
  location_id UUID REFERENCES public.locations(id) NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id),
  approved_by_user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  return_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create return_items table with approval tracking
CREATE TABLE public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity NUMERIC NOT NULL,
  expected_product_id UUID REFERENCES public.products(id),
  reason TEXT,
  action_taken TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  approved_by_user_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  supplier_return_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for returns
CREATE POLICY "Anyone can view returns"
ON public.returns
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert returns"
ON public.returns
FOR INSERT
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Owners can update returns"
ON public.returns
FOR UPDATE
USING (has_role(auth.uid(), 'owner'::app_role) OR auth.uid() = created_by_user_id);

CREATE POLICY "Owners can delete returns"
ON public.returns
FOR DELETE
USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS policies for return_items
CREATE POLICY "Anyone can view return_items"
ON public.return_items
FOR SELECT
USING (true);

CREATE POLICY "Users can insert return_items for their returns"
ON public.return_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.returns
    WHERE returns.id = return_items.return_id
    AND returns.created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update return_items"
ON public.return_items
FOR UPDATE
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete return_items"
ON public.return_items
FOR DELETE
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_returns_updated_at
BEFORE UPDATE ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();