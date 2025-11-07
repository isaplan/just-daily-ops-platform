-- Add branch_name column to roadmap_items
ALTER TABLE roadmap_items 
ADD COLUMN IF NOT EXISTS branch_name TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_items_branch_name 
ON roadmap_items(branch_name) 
WHERE branch_name IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN roadmap_items.branch_name IS 'Git branch name created when roadmap item status changes to "doing"';

