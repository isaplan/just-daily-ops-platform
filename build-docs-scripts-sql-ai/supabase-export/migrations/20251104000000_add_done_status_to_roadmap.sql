-- Add 'done' status back to roadmap_items
ALTER TABLE roadmap_items 
DROP CONSTRAINT IF EXISTS roadmap_items_status_check;

ALTER TABLE roadmap_items 
ADD CONSTRAINT roadmap_items_status_check 
CHECK (status IN ('doing', 'next-up', 'someday', 'inbox', 'done'));

