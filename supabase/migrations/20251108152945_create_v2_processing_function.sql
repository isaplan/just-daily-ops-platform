-- =====================================================
-- SQL Function to Process Raw Data into Processed V2 Table
-- =====================================================
-- V2 processing function that correctly extracts only existing fields
-- Follows proven pattern from 20251108015025_create_processing_functions.sql
-- Only unpacks raw_data, no calculations

CREATE OR REPLACE FUNCTION process_time_registration_shifts_v2(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_count INTEGER := 0;
  raw_record RECORD;
BEGIN
  -- Process records in date range (or all if no range specified)
  FOR raw_record IN
    SELECT *
    FROM eitje_time_registration_shifts_raw
    WHERE (start_date IS NULL OR date >= start_date)
      AND (end_date IS NULL OR date <= end_date)
  LOOP
    -- Extract all fields from raw_data JSONB
    -- Only extract fields that exist in raw_data
    INSERT INTO eitje_time_registration_shifts_processed_v2 (
      eitje_id, date,
      user_id, user_name,
      environment_id, environment_name,
      team_id, team_name,
      start, "end", start_time, end_time, start_datetime, end_datetime,
      break_minutes,
      wage_cost,
      type_name, shift_type,
      remarks,
      approved, meals, check_in_ids, planning_shift_id, exported_to_hr_integration,
      raw_data, raw_data_hash,
      api_created_at, api_updated_at
    )
    VALUES (
      raw_record.eitje_id, raw_record.date,
      -- User fields (extract from nested user object)
      (raw_record.raw_data->'user'->>'id')::INTEGER,
      raw_record.raw_data->'user'->>'name',
      -- Environment fields (extract from nested environment object)
      (raw_record.raw_data->'environment'->>'id')::INTEGER,
      raw_record.raw_data->'environment'->>'name',
      -- Team fields (extract from nested team object)
      (raw_record.raw_data->'team'->>'id')::INTEGER,
      raw_record.raw_data->'team'->>'name',
      -- Time fields (extract from root level)
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      -- Break fields
      COALESCE((raw_record.raw_data->>'break_minutes')::INTEGER, 0),
      -- Cost fields (extract from raw_data)
      (raw_record.raw_data->>'wage_cost')::DECIMAL,
      -- Type fields (extract from nested type object)
      raw_record.raw_data->'type'->>'name',
      raw_record.raw_data->>'shift_type',
      -- Metadata
      raw_record.raw_data->>'remarks',
      (raw_record.raw_data->>'approved')::BOOLEAN,
      raw_record.raw_data->'meals',
      CASE 
        WHEN raw_record.raw_data->'check_in_ids' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(raw_record.raw_data->'check_in_ids'))::INTEGER[]
        ELSE NULL
      END,
      (raw_record.raw_data->>'planning_shift_id')::INTEGER,
      (raw_record.raw_data->>'exported_to_hr_integration')::BOOLEAN,
      -- Raw data
      raw_record.raw_data,
      encode(digest(raw_record.raw_data::text, 'sha256'), 'hex'),
      -- API timestamps
      (raw_record.raw_data->>'created_at')::TIMESTAMPTZ,
      (raw_record.raw_data->>'updated_at')::TIMESTAMPTZ
    )
    ON CONFLICT (eitje_id, date, user_id) 
    DO UPDATE SET
      user_name = EXCLUDED.user_name,
      environment_name = EXCLUDED.environment_name,
      team_name = EXCLUDED.team_name,
      start = EXCLUDED.start,
      "end" = EXCLUDED."end",
      break_minutes = EXCLUDED.break_minutes,
      wage_cost = EXCLUDED.wage_cost,
      type_name = EXCLUDED.type_name,
      shift_type = EXCLUDED.shift_type,
      remarks = EXCLUDED.remarks,
      approved = EXCLUDED.approved,
      meals = EXCLUDED.meals,
      check_in_ids = EXCLUDED.check_in_ids,
      planning_shift_id = EXCLUDED.planning_shift_id,
      exported_to_hr_integration = EXCLUDED.exported_to_hr_integration,
      api_created_at = EXCLUDED.api_created_at,
      api_updated_at = EXCLUDED.api_updated_at,
      raw_data = EXCLUDED.raw_data,
      raw_data_hash = EXCLUDED.raw_data_hash,
      updated_at = now();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION process_time_registration_shifts_v2 IS 'V2 processing function that extracts fields from raw_data JSONB into processed_v2 table. Only unpacks data, no calculations.';

