-- =====================================================
-- Add is_active column to worker_profiles table
-- =====================================================
-- Adds a boolean column that indicates if a worker profile is currently active
-- Based on: effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
-- Updated weekly via cronjob

-- Add is_active column
ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Create index for filtering performance
CREATE INDEX IF NOT EXISTS idx_worker_profiles_is_active ON public.worker_profiles(is_active);

-- Add comment
COMMENT ON COLUMN public.worker_profiles.is_active IS 'Indicates if worker profile is currently active. Based on effective_from and effective_to dates. Updated weekly via cronjob.';

-- =====================================================
-- Create function to update is_active for all records
-- =====================================================
CREATE OR REPLACE FUNCTION update_worker_profiles_is_active()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update is_active based on current date
  -- Active if: effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  UPDATE public.worker_profiles
  SET is_active = (
    effective_from <= CURRENT_DATE 
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION update_worker_profiles_is_active IS 'Updates is_active column for all worker_profiles based on current date. Should be called weekly via cronjob.';

-- =====================================================
-- Initial update: Set is_active for all existing records
-- =====================================================
SELECT update_worker_profiles_is_active();

