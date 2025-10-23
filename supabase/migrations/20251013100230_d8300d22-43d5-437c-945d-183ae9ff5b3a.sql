-- Ensure the extensions schema exists
create schema if not exists extensions;

-- Enable pg_trgm in the extensions schema (avoids search_path issues)
create extension if not exists pg_trgm with schema extensions;

-- Recreate fuzzy match function to use the correct schema-qualified similarity
drop function if exists public.match_location_fuzzy(text);

create or replace function public.match_location_fuzzy(p_location_name text)
returns table (
  id uuid,
  name text,
  similarity_score real
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    l.id,
    l.name,
    extensions.similarity(l.name, p_location_name) as similarity_score
  from public.locations l
  where extensions.similarity(l.name, p_location_name) > 0.3
  order by similarity_score desc
  limit 5
$$;