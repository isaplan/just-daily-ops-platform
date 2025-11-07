-- Update return_items status to support new workflow
-- First, update existing 'approved' status to 'in_progress' for items not yet confirmed
UPDATE return_items 
SET status = 'in_progress' 
WHERE status = 'approved' AND action_taken NOT IN ('dispose', 'keep');

UPDATE return_items 
SET status = 'confirmed' 
WHERE status = 'approved' AND action_taken IN ('dispose', 'keep');

-- Add stock_adjusted column to track if inventory has been updated
ALTER TABLE return_items 
ADD COLUMN IF NOT EXISTS stock_adjusted boolean DEFAULT false;

-- Add stock_adjustment_notes column to log what happened
ALTER TABLE return_items 
ADD COLUMN IF NOT EXISTS stock_adjustment_notes text;

-- Add transfer_to_location_id for transfer actions
ALTER TABLE return_items 
ADD COLUMN IF NOT EXISTS transfer_to_location_id uuid REFERENCES locations(id);

-- Update the status check constraint if it exists, or create comment for valid values
COMMENT ON COLUMN return_items.status IS 'Valid values: pending, approved, in_progress, confirmed, rejected';