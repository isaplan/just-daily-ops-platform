-- =====================================================
-- Fix RLS Policies for V2 Tables and Functions
-- =====================================================
-- Adds missing INSERT/UPDATE policies and SECURITY DEFINER to functions

-- Fix processed_v2 table RLS policies
DROP POLICY IF EXISTS "Allow authenticated insert access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2;
CREATE POLICY "Allow authenticated insert access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2;
CREATE POLICY "Allow authenticated update access to eitje time registration shifts processed v2" ON public.eitje_time_registration_shifts_processed_v2
    FOR UPDATE TO authenticated USING (true);

-- Fix aggregated_v2 table RLS policies
DROP POLICY IF EXISTS "Allow authenticated insert access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2;
CREATE POLICY "Allow authenticated insert access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2;
CREATE POLICY "Allow authenticated update access to eitje hours aggregated v2" ON public.eitje_hours_aggregated_v2
    FOR UPDATE TO authenticated USING (true);

-- Fix processing function - add SECURITY DEFINER
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

-- Fix aggregation function - add SECURITY DEFINER
CREATE OR REPLACE FUNCTION aggregate_hours_v2(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  aggregated_count INTEGER := 0;
  processed_record RECORD;
  group_key TEXT;
  grouped_data JSONB := '{}'::JSONB;
  hours_worked DECIMAL(8,2);
  hourly_rate DECIMAL(8,2);
  labor_cost DECIMAL(10,2);
  profile_record RECORD;
  group_key_item TEXT;
  group_data JSONB;
  total_hours DECIMAL(8,2);
  total_wage_cost DECIMAL(10,2);
  shift_count INTEGER;
  total_breaks INTEGER;
  agg_date DATE;
  agg_user_id INTEGER;
  agg_environment_id INTEGER;
  agg_team_id INTEGER;
  agg_user_name TEXT;
  agg_environment_name TEXT;
  agg_team_name TEXT;
  user_contract_type TEXT;
  avg_hourly_rate DECIMAL(8,2);
BEGIN
  -- Process all records in date range
  FOR processed_record IN
    SELECT *
    FROM eitje_time_registration_shifts_processed_v2
    WHERE (start_date IS NULL OR date >= start_date)
      AND (end_date IS NULL OR date <= end_date)
      AND user_id IS NOT NULL
  LOOP
    -- Create group key: date-user_id-environment_id-team_id
    group_key := processed_record.date::TEXT || '-' || 
                 processed_record.user_id::TEXT || '-' ||
                 COALESCE(processed_record.environment_id::TEXT, 'null') || '-' ||
                 COALESCE(processed_record.team_id::TEXT, 'null');
    
    -- Initialize group if not exists
    IF NOT (grouped_data ? group_key) THEN
      grouped_data := grouped_data || jsonb_build_object(
        group_key, jsonb_build_object(
          'date', processed_record.date,
          'user_id', processed_record.user_id,
          'user_name', processed_record.user_name,
          'environment_id', processed_record.environment_id,
          'environment_name', processed_record.environment_name,
          'team_id', processed_record.team_id,
          'team_name', processed_record.team_name,
          'hours_worked', 0,
          'total_wage_cost', 0,
          'shift_count', 0,
          'total_breaks_minutes', 0
        )
      );
    END IF;
    
    -- Calculate hours worked from start/end times
    IF processed_record.start IS NOT NULL AND processed_record."end" IS NOT NULL THEN
      hours_worked := EXTRACT(EPOCH FROM (processed_record."end" - processed_record.start)) / 3600.0;
      -- Subtract break minutes
      hours_worked := hours_worked - (COALESCE(processed_record.break_minutes, 0) / 60.0);
      hours_worked := GREATEST(0, hours_worked);
    ELSE
      hours_worked := 0;
    END IF;
    
    -- Update group totals
    grouped_data := jsonb_set(
      grouped_data,
      ARRAY[group_key, 'hours_worked'],
      to_jsonb((grouped_data->group_key->>'hours_worked')::DECIMAL + hours_worked)
    );
    
    grouped_data := jsonb_set(
      grouped_data,
      ARRAY[group_key, 'total_wage_cost'],
      to_jsonb((grouped_data->group_key->>'total_wage_cost')::DECIMAL + COALESCE(processed_record.wage_cost, 0))
    );
    
    grouped_data := jsonb_set(
      grouped_data,
      ARRAY[group_key, 'shift_count'],
      to_jsonb((grouped_data->group_key->>'shift_count')::INTEGER + 1)
    );
    
    grouped_data := jsonb_set(
      grouped_data,
      ARRAY[group_key, 'total_breaks_minutes'],
      to_jsonb((grouped_data->group_key->>'total_breaks_minutes')::INTEGER + COALESCE(processed_record.break_minutes, 0))
    );
  END LOOP;
  
  -- Insert/update aggregated records from grouped data
  -- Loop through all groups
    FOR group_key_item IN SELECT jsonb_object_keys(grouped_data)
    LOOP
      group_data := grouped_data->group_key_item;
      
      -- Extract group data
      agg_date := (group_data->>'date')::DATE;
      agg_user_id := (group_data->>'user_id')::INTEGER;
      agg_user_name := group_data->>'user_name';
      agg_environment_id := (group_data->>'environment_id')::INTEGER;
      agg_environment_name := group_data->>'environment_name';
      agg_team_id := CASE WHEN group_data->>'team_id' = 'null' THEN NULL ELSE (group_data->>'team_id')::INTEGER END;
      agg_team_name := group_data->>'team_name';
      total_hours := (group_data->>'hours_worked')::DECIMAL;
      total_wage_cost := (group_data->>'total_wage_cost')::DECIMAL;
      shift_count := (group_data->>'shift_count')::INTEGER;
      total_breaks := (group_data->>'total_breaks_minutes')::INTEGER;
      
      -- Get hourly_rate from worker_profiles (if wage_override) or calculate
      hourly_rate := NULL;
      user_contract_type := NULL;
      avg_hourly_rate := NULL;
      
      -- Get contract_type from worker_profiles for this user
      SELECT contract_type INTO user_contract_type
      FROM worker_profiles
      WHERE eitje_user_id = agg_user_id
        AND (effective_to IS NULL OR effective_to >= agg_date)
        AND (effective_from IS NULL OR effective_from <= agg_date)
      ORDER BY effective_from DESC NULLS LAST
      LIMIT 1;
      
      -- Check worker_profiles for override
      SELECT hourly_wage INTO profile_record
      FROM worker_profiles
      WHERE eitje_user_id = agg_user_id
        AND wage_override = true
        AND (effective_to IS NULL OR effective_to >= agg_date)
        AND (effective_from IS NULL OR effective_from <= agg_date)
      ORDER BY effective_from DESC NULLS LAST
      LIMIT 1;
      
      IF FOUND AND profile_record.hourly_wage IS NOT NULL THEN
        hourly_rate := profile_record.hourly_wage;
      ELSIF total_hours > 0 AND total_wage_cost > 0 THEN
        -- Calculate from wage_cost / hours
        hourly_rate := total_wage_cost / total_hours;
      ELSIF agg_team_id IS NOT NULL AND user_contract_type IS NOT NULL THEN
        -- Calculate average hourly_rate from last 30 days for same team + contract_type
        SELECT AVG(a.hourly_rate) INTO avg_hourly_rate
        FROM eitje_hours_aggregated_v2 a
        INNER JOIN worker_profiles wp ON wp.eitje_user_id = a.user_id
        WHERE a.date >= agg_date - INTERVAL '30 days'
          AND a.date < agg_date
          AND a.team_id = agg_team_id
          AND wp.contract_type = user_contract_type
          AND a.hourly_rate IS NOT NULL
          AND a.hourly_rate > 0;
        
        IF avg_hourly_rate IS NOT NULL AND avg_hourly_rate > 0 THEN
          hourly_rate := avg_hourly_rate;
        ELSE
          -- Fallback to default
          hourly_rate := 15.00;
        END IF;
      ELSE
        -- Fallback to default
        hourly_rate := 15.00;
      END IF;
      
      -- Calculate labor_cost
      labor_cost := total_hours * hourly_rate;
      
      -- Insert or update aggregated record
      INSERT INTO eitje_hours_aggregated_v2 (
        date, user_id, user_name,
        environment_id, environment_name,
        team_id, team_name,
        hours_worked, hourly_rate, hourly_cost, labor_cost,
        shift_count, total_breaks_minutes
      )
      VALUES (
        agg_date,
        agg_user_id,
        agg_user_name,
        agg_environment_id,
        agg_environment_name,
        agg_team_id,
        agg_team_name,
        ROUND(total_hours, 2),
        ROUND(hourly_rate, 2),
        ROUND(hourly_rate, 2), -- hourly_cost same as hourly_rate
        ROUND(labor_cost, 2),
        shift_count,
        total_breaks
      )
      ON CONFLICT (date, user_id, environment_id, team_id)
      DO UPDATE SET
        hours_worked = EXCLUDED.hours_worked,
        hourly_rate = EXCLUDED.hourly_rate,
        hourly_cost = EXCLUDED.hourly_cost,
        labor_cost = EXCLUDED.labor_cost,
        shift_count = EXCLUDED.shift_count,
        total_breaks_minutes = EXCLUDED.total_breaks_minutes,
        updated_at = now();
      
      aggregated_count := aggregated_count + 1;
    END LOOP;
  
  RETURN aggregated_count;
END;
$$;

-- Add comments
COMMENT ON FUNCTION process_time_registration_shifts_v2 IS 'V2 processing function that extracts fields from raw_data JSONB into processed_v2 table. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION aggregate_hours_v2 IS 'V2 aggregation function that groups processed_v2 data by date, user, location, team and calculates hours_worked, hourly_rate, and labor_cost. Hourly rate priority: 1) worker_profiles override, 2) calculated from wage_cost/hours, 3) average from last 30 days for same team + contract_type, 4) default 15.00. Uses SECURITY DEFINER to bypass RLS.';

