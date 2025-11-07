-- Add status and have_state columns to roadmap_items
ALTER TABLE roadmap_items 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'next-up' CHECK (status IN ('doing', 'done', 'next-up', 'someday')),
ADD COLUMN IF NOT EXISTS have_state TEXT DEFAULT 'Could' CHECK (have_state IN ('Must', 'Should', 'Could', 'Want'));

-- Update existing records to have default values
UPDATE roadmap_items 
SET status = 'next-up',
    have_state = 'Could'
WHERE status IS NULL OR have_state IS NULL;

