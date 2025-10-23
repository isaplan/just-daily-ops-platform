-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_location_fuzzy(TEXT);

-- Create the fuzzy location matching function
CREATE OR REPLACE FUNCTION match_location_fuzzy(p_location_name TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    similarity(l.name, p_location_name) as similarity_score
  FROM locations l
  WHERE similarity(l.name, p_location_name) > 0.3
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;