-- =====================================================
-- EITJE DATA VIEWS
-- - user_identities: unified users with aggregated external IDs
-- - unified_user_latest_hourly_rate: latest hourly_rate per unified user and location
-- =====================================================
-- Safe to re-run: uses CREATE OR REPLACE VIEW
-- =====================================================

-- 1) Aggregated external identities per unified user
CREATE OR REPLACE VIEW public.user_identities AS
SELECT
  uu.id AS unified_user_id,
  uu.first_name,
  uu.last_name,
  uu.email,
  jsonb_object_agg(usm.system_name, usm.external_id ORDER BY usm.system_name) FILTER (WHERE usm.system_name IS NOT NULL) AS external_ids
FROM public.unified_users uu
LEFT JOIN public.user_system_mappings usm
  ON usm.unified_user_id = uu.id
GROUP BY uu.id, uu.first_name, uu.last_name, uu.email;

COMMENT ON VIEW public.user_identities IS 'Aggregates all external system IDs for each unified user into a single row (external_ids JSONB).';

-- 2) Latest hourly_rate per unified user and location from Eitje time registration shifts
--    Joins:
--      - user_system_mappings(system_name=''eitje'') to map Eitje user_id -> unified_user_id
--      - eitje_environments to resolve environment_id -> location_id
CREATE OR REPLACE VIEW public.unified_user_latest_hourly_rate AS
SELECT DISTINCT ON (usm.unified_user_id, ee.location_id)
  usm.unified_user_id,
  ee.location_id,
  trs.date,
  trs.hourly_rate
FROM public.eitje_time_registration_shifts_processed trs
JOIN public.user_system_mappings usm
  ON usm.system_name = 'eitje'
 AND usm.external_id = trs.user_id::text
JOIN public.eitje_environments ee
  ON ee.eitje_environment_id = trs.environment_id
WHERE trs.hourly_rate IS NOT NULL
ORDER BY usm.unified_user_id, ee.location_id, trs.date DESC;

COMMENT ON VIEW public.unified_user_latest_hourly_rate IS 'Latest available hourly_rate per (unified_user, location) from Eitje time registration shifts.';

-- Helpful grants (optional; views inherit underlying table RLS)
-- GRANT SELECT ON public.user_identities TO anon, authenticated;
-- GRANT SELECT ON public.unified_user_latest_hourly_rate TO anon, authenticated;



<<<<<<< HEAD




=======
>>>>>>> eitje-data-views



