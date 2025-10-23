-- Ensure pg_trgm extension exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Replace function to fully-qualify similarity to avoid search_path issues
DROP FUNCTION IF EXISTS public.match_location_fuzzy(TEXT);

CREATE OR REPLACE FUNCTION public.match_location_fuzzy(p_location_name TEXT)
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
    pg_trgm.similarity(l.name, p_location_name) as similarity_score
  FROM public.locations l
  WHERE pg_trgm.similarity(l.name, p_location_name) > 0.3
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$;