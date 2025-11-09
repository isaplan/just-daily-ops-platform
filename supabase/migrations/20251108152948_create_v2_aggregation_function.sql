-- =====================================================
-- SQL Function to Aggregate Processed V2 Data
-- =====================================================
-- V2 aggregation function that groups processed_v2 by date, user, location, team
-- Calculates hours_worked, hourly_rate, labor_cost
-- Uses worker_profiles for hourly_rate when wage_override is true

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

-- Add comment for documentation
COMMENT ON FUNCTION aggregate_hours_v2 IS 'V2 aggregation function that groups processed_v2 data by date, user, location, team and calculates hours_worked, hourly_rate, and labor_cost. Hourly rate priority: 1) worker_profiles override, 2) calculated from wage_cost/hours, 3) average from last 30 days for same team + contract_type, 4) default 15.00.';

