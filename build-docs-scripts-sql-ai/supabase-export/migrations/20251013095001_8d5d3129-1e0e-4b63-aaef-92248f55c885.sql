-- Fix search_path for match_location_fuzzy function
DROP FUNCTION IF EXISTS match_location_fuzzy(TEXT);

CREATE OR REPLACE FUNCTION match_location_fuzzy(p_location_name TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  similarity_score REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;