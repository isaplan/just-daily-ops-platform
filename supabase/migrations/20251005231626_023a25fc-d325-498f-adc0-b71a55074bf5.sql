-- Add calculated price columns for comparison
ALTER TABLE public.products 
ADD COLUMN prijs_ex_btw_calculated numeric,
ADD COLUMN prijs_in_btw_calculated numeric;