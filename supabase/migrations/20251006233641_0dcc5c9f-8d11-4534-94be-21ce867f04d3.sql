-- Create function to update stock when order is received
CREATE OR REPLACE FUNCTION public.process_order_receipt(
  _order_group_id UUID,
  _user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _current_stock NUMERIC;
  _storage_location_id UUID;
BEGIN
  -- Get the first active storage location for the order's location
  SELECT sl.id INTO _storage_location_id
  FROM storage_locations sl
  INNER JOIN order_groups og ON og.location_id = sl.location_id
  WHERE og.id = _order_group_id
    AND sl.is_active = true
  ORDER BY sl.display_order
  LIMIT 1;

  -- If no storage location exists, skip stock updates
  IF _storage_location_id IS NULL THEN
    RAISE NOTICE 'No storage location found for order group %', _order_group_id;
    RETURN;
  END IF;

  -- Loop through each order item
  FOR _order IN
    SELECT 
      o.product_id,
      COALESCE(o.received_quantity, o.quantity) as quantity_received
    FROM orders o
    WHERE o.order_group_id = _order_group_id
      AND COALESCE(o.received_quantity, o.quantity) > 0
  LOOP
    -- Get or create stock level record
    INSERT INTO stock_levels (
      product_id,
      storage_location_id,
      quantity,
      last_counted_at,
      last_counted_by_user_id
    )
    VALUES (
      _order.product_id,
      _storage_location_id,
      0,
      now(),
      _user_id
    )
    ON CONFLICT (product_id, storage_location_id)
    DO NOTHING;

    -- Get current stock
    SELECT quantity INTO _current_stock
    FROM stock_levels
    WHERE product_id = _order.product_id
      AND storage_location_id = _storage_location_id;

    -- Create transaction record
    INSERT INTO stock_transactions (
      product_id,
      storage_location_id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_id,
      reference_type,
      notes,
      created_by_user_id
    )
    VALUES (
      _order.product_id,
      _storage_location_id,
      'order_receipt',
      _order.quantity_received,
      _current_stock,
      _current_stock + _order.quantity_received,
      _order_group_id,
      'order_group',
      'Stock updated from order receipt',
      _user_id
    );

    -- Update stock level
    UPDATE stock_levels
    SET 
      quantity = quantity + _order.quantity_received,
      last_counted_at = now(),
      last_counted_by_user_id = _user_id
    WHERE product_id = _order.product_id
      AND storage_location_id = _storage_location_id;

  END LOOP;

END;
$$;

-- Create trigger function to auto-update stock when order status changes
CREATE OR REPLACE FUNCTION public.trigger_order_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process when status changes to 'received' or 'completed'
  IF (NEW.status IN ('received', 'completed')) 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('received', 'completed'))
     AND NEW.checked_by_user_id IS NOT NULL THEN
    
    -- Call the stock processing function
    PERFORM public.process_order_receipt(
      NEW.id,
      NEW.checked_by_user_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on order_groups table
DROP TRIGGER IF EXISTS order_stock_update_trigger ON public.order_groups;
CREATE TRIGGER order_stock_update_trigger
  AFTER UPDATE ON public.order_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_order_stock_update();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_order_groups_status ON public.order_groups(status);