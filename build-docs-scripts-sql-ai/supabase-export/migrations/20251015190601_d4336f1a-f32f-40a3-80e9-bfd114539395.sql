-- Create roadmap_items table
CREATE TABLE roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  user_story text,
  expected_results text,
  
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT false,
  
  department text NOT NULL,
  category text,
  triggers jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for ordering
CREATE INDEX idx_roadmap_items_display_order ON roadmap_items(display_order);

-- Enable RLS
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view roadmap items
CREATE POLICY "Anyone can view roadmap items"
ON roadmap_items FOR SELECT
USING (true);

-- Only owners can manage roadmap items
CREATE POLICY "Only owners can insert roadmap items"
ON roadmap_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can update roadmap items"
ON roadmap_items FOR UPDATE
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can delete roadmap items"
ON roadmap_items FOR DELETE
USING (has_role(auth.uid(), 'owner'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_roadmap_items_updated_at
BEFORE UPDATE ON roadmap_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();