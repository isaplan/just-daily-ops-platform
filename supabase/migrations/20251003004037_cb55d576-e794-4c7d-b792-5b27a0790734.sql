-- Add status and checked_at to order_groups table
ALTER TABLE public.order_groups 
ADD COLUMN status text DEFAULT 'waiting_for_check',
ADD COLUMN checked_at timestamp with time zone;

-- Add received_quantity to orders table to track confirmed amounts
ALTER TABLE public.orders
ADD COLUMN received_quantity numeric;