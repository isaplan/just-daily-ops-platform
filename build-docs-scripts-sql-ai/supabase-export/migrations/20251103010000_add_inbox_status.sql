-- Add 'inbox' status and remove 'done' status from roadmap_items
ALTER TABLE roadmap_items 
DROP CONSTRAINT IF EXISTS roadmap_items_status_check;

ALTER TABLE roadmap_items 
ADD CONSTRAINT roadmap_items_status_check 
CHECK (status IN ('doing', 'next-up', 'someday', 'inbox'));

-- Update default status to 'inbox' for new items
ALTER TABLE roadmap_items 
ALTER COLUMN status SET DEFAULT 'inbox';

-- Update existing records with NULL status to 'inbox'
UPDATE roadmap_items 
SET status = 'inbox'
WHERE status IS NULL;

-- Convert 'done' status to 'inbox' (if any exist)
UPDATE roadmap_items 
SET status = 'inbox', is_active = false
WHERE status = 'done';


