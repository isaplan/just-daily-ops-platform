-- =====================================================
-- Create function to sync worker_profiles from processed_v2
-- =====================================================
-- This function can be called after processing to auto-populate worker_profiles
-- Safe to call multiple times (uses ON CONFLICT DO NOTHING)

CREATE OR REPLACE FUNCTION sync_worker_profiles_v2()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profiles_created INTEGER := 0;
BEGIN
  -- Insert new worker profiles from processed_v2
  INSERT INTO public.worker_profiles (
    eitje_user_id,
    location_id,
    contract_type,
    hourly_wage,
    wage_override,
    effective_from,
    effective_to,
    notes
  )
  SELECT DISTINCT
    p.user_id,
    NULL::UUID as location_id, -- Will be set later via eitje_environments mapping or UI
    NULL::TEXT as contract_type, -- Will be editable via UI
    NULL::DECIMAL(8,2) as hourly_wage, -- Will be editable via UI
    false as wage_override, -- Default: use calculated rate
    MIN(p.date) as effective_from, -- Start from first shift date
    NULL::DATE as effective_to, -- NULL = active
    'Auto-created from processed data' as notes
  FROM public.eitje_time_registration_shifts_processed_v2 p
  WHERE p.user_id IS NOT NULL
    AND NOT EXISTS (
      -- Avoid duplicates: check if profile already exists
      SELECT 1
      FROM public.worker_profiles wp
      WHERE wp.eitje_user_id = p.user_id
        AND wp.location_id IS NULL
        AND wp.effective_to IS NULL
    )
  GROUP BY p.user_id
  ON CONFLICT (eitje_user_id, location_id, effective_from) DO NOTHING;
  
  GET DIAGNOSTICS profiles_created = ROW_COUNT;
  
  RETURN profiles_created;
END;
$$;

-- Run the function to populate existing data
SELECT sync_worker_profiles_v2();

-- Add comments
COMMENT ON FUNCTION sync_worker_profiles_v2 IS 'Syncs worker_profiles table with unique users from processed_v2. Safe to call multiple times.';
COMMENT ON TABLE public.worker_profiles IS 'Editable worker profiles with hourly wages and contract information. Populated from processed_v2 data via sync_worker_profiles_v2().';

