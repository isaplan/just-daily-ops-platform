-- =====================================================
-- Create worker_profiles Table
-- =====================================================
-- Stores editable worker profiles with hourly wages, contract types
-- Links to eitje_user_id for V2 (can migrate to unified_users later)

CREATE TABLE IF NOT EXISTS public.worker_profiles (
  id SERIAL PRIMARY KEY,
  eitje_user_id INTEGER,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Editable fields
  contract_type TEXT, -- 'full_time', 'part_time', 'contractor', etc.
  contract_hours DECIMAL(5,2), -- Weekly contract hours
  hourly_wage DECIMAL(8,2), -- Override hourly wage (editable)
  wage_override BOOLEAN DEFAULT false, -- If true, use hourly_wage instead of calculated
  
  -- Time-based profiles
  effective_from DATE, -- When this profile becomes active
  effective_to DATE, -- When this profile expires (NULL = active)
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one active profile per user per location
  UNIQUE(eitje_user_id, location_id, effective_from)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_profiles_eitje_user_id ON public.worker_profiles(eitje_user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_location_id ON public.worker_profiles(location_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_effective_dates ON public.worker_profiles(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_active ON public.worker_profiles(eitje_user_id, location_id) WHERE effective_to IS NULL;

-- Add comments for documentation
COMMENT ON TABLE public.worker_profiles IS 'Editable worker profiles with hourly wages and contract information';
COMMENT ON COLUMN public.worker_profiles.hourly_wage IS 'Override hourly wage (editable). Used when wage_override = true';
COMMENT ON COLUMN public.worker_profiles.wage_override IS 'If true, use hourly_wage instead of calculated rate from wage_cost/hours';
COMMENT ON COLUMN public.worker_profiles.effective_to IS 'NULL means profile is currently active';

-- =====================================================
-- ROW-LEVEL SECURITY POLICIES
-- =====================================================
-- Following proven pattern from 20250128000001_create_eitje_raw_tables.sql

ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to worker profiles" ON public.worker_profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to worker profiles" ON public.worker_profiles
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow authenticated users to insert worker profiles" ON public.worker_profiles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow anon users to insert worker profiles" ON public.worker_profiles
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update worker profiles" ON public.worker_profiles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete worker profiles" ON public.worker_profiles
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow anon read access to worker profiles" ON public.worker_profiles
    FOR SELECT TO anon USING (true);

-- =====================================================
-- Populate worker_profiles from processed_v2 table
-- =====================================================
-- Extract unique users from processed data
-- location_id will be NULL initially (can be set via UI or mapping later)

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
