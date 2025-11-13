-- =====================================================
-- SQL Functions to Process Raw Data into Processed Tables
-- =====================================================
-- These functions extract all fields from raw_data JSONB and populate processed tables

-- Function to process time registration shifts from raw to processed
-- This will be called by the edge function or can be triggered on insert
CREATE OR REPLACE FUNCTION process_time_registration_shifts(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  processed_count INTEGER := 0;
  raw_record RECORD;
  processed_record JSONB;
BEGIN
  -- Process records in date range (or all if no range specified)
  FOR raw_record IN
    SELECT *
    FROM eitje_time_registration_shifts_raw
    WHERE (start_date IS NULL OR date >= start_date)
      AND (end_date IS NULL OR date <= end_date)
  LOOP
    -- Extract all fields from raw_data JSONB
    INSERT INTO eitje_time_registration_shifts_processed (
      eitje_id, date,
      user_id, user_name, user_first_name, user_last_name, user_email, user_phone, user_code, user_active, user_raw,
      environment_id, environment_name, environment_code, environment_type, environment_active, environment_raw,
      team_id, team_name, team_code, team_active, team_raw,
      start, end, start_time, end_time, start_datetime, end_datetime,
      break_minutes, breaks, break_minutes_actual, break_minutes_planned,
      hours_worked, hours, total_hours,
      wage_cost, wage_cost_cents, costs_wage, costs_wage_cost, costs_total,
      labor_cost, "laborCost", total_cost, "totalCost", cost, price, hourly_rate, costs,
      status, shift_type, type_name, type_raw,
      skill_set, "skillSet", notes, remarks,
      approved, meals, check_in_ids, planning_shift_id, exported_to_hr_integration,
      raw_data, raw_data_hash,
      api_created_at, api_updated_at
    )
    VALUES (
      raw_record.eitje_id, raw_record.date,
      (raw_record.raw_data->'user'->>'id')::INTEGER,
      raw_record.raw_data->'user'->>'name',
      raw_record.raw_data->'user'->>'first_name',
      raw_record.raw_data->'user'->>'last_name',
      raw_record.raw_data->'user'->>'email',
      raw_record.raw_data->'user'->>'phone',
      raw_record.raw_data->'user'->>'code',
      (raw_record.raw_data->'user'->>'active')::BOOLEAN,
      raw_record.raw_data->'user',
      (raw_record.raw_data->'environment'->>'id')::INTEGER,
      raw_record.raw_data->'environment'->>'name',
      raw_record.raw_data->'environment'->>'code',
      raw_record.raw_data->'environment'->>'type',
      (raw_record.raw_data->'environment'->>'active')::BOOLEAN,
      raw_record.raw_data->'environment',
      (raw_record.raw_data->'team'->>'id')::INTEGER,
      raw_record.raw_data->'team'->>'name',
      raw_record.raw_data->'team'->>'code',
      (raw_record.raw_data->'team'->>'active')::BOOLEAN,
      raw_record.raw_data->'team',
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'break_minutes')::INTEGER,
      (raw_record.raw_data->>'breaks')::INTEGER,
      (raw_record.raw_data->>'break_minutes')::INTEGER,
      (raw_record.raw_data->>'break_minutes_planned')::INTEGER,
      (raw_record.raw_data->>'hours_worked')::DECIMAL,
      (raw_record.raw_data->>'hours')::DECIMAL,
      (raw_record.raw_data->>'total_hours')::DECIMAL,
      (raw_record.raw_data->>'wage_cost')::DECIMAL,
      (raw_record.raw_data->>'wage_cost_cents')::INTEGER,
      (raw_record.raw_data->'costs'->>'wage')::DECIMAL,
      (raw_record.raw_data->'costs'->>'wage_cost')::DECIMAL,
      (raw_record.raw_data->'costs'->>'total')::DECIMAL,
      (raw_record.raw_data->>'labor_cost')::DECIMAL,
      (raw_record.raw_data->>'laborCost')::DECIMAL,
      (raw_record.raw_data->>'total_cost')::DECIMAL,
      (raw_record.raw_data->>'totalCost')::DECIMAL,
      (raw_record.raw_data->>'cost')::DECIMAL,
      (raw_record.raw_data->>'price')::DECIMAL,
      CASE 
        WHEN (raw_record.raw_data->>'wage_cost')::DECIMAL > 0 
         AND (raw_record.raw_data->>'hours_worked')::DECIMAL > 0
        THEN (raw_record.raw_data->>'wage_cost')::DECIMAL / (raw_record.raw_data->>'hours_worked')::DECIMAL
        ELSE NULL
      END,
      raw_record.raw_data->'costs',
      raw_record.raw_data->>'status',
      raw_record.raw_data->>'shift_type',
      raw_record.raw_data->'type'->>'name',
      raw_record.raw_data->'type',
      raw_record.raw_data->>'skill_set',
      raw_record.raw_data->>'skillSet',
      raw_record.raw_data->>'notes',
      raw_record.raw_data->>'remarks',
      (raw_record.raw_data->>'approved')::BOOLEAN,
      raw_record.raw_data->'meals',
      ARRAY(SELECT jsonb_array_elements_text(raw_record.raw_data->'check_in_ids'))::INTEGER[],
      (raw_record.raw_data->>'planning_shift_id')::INTEGER,
      (raw_record.raw_data->>'exported_to_hr_integration')::BOOLEAN,
      raw_record.raw_data,
      encode(digest(raw_record.raw_data::text, 'sha256'), 'hex'),
      (raw_record.raw_data->>'created_at')::TIMESTAMPTZ,
      (raw_record.raw_data->>'updated_at')::TIMESTAMPTZ
    )
    ON CONFLICT (eitje_id, date, user_id) 
    DO UPDATE SET
      user_name = EXCLUDED.user_name,
      environment_name = EXCLUDED.environment_name,
      team_name = EXCLUDED.team_name,
      hours_worked = EXCLUDED.hours_worked,
      wage_cost = EXCLUDED.wage_cost,
      hourly_rate = EXCLUDED.hourly_rate,
      approved = EXCLUDED.approved,
      meals = EXCLUDED.meals,
      check_in_ids = EXCLUDED.check_in_ids,
      planning_shift_id = EXCLUDED.planning_shift_id,
      exported_to_hr_integration = EXCLUDED.exported_to_hr_integration,
      api_created_at = EXCLUDED.api_created_at,
      api_updated_at = EXCLUDED.api_updated_at,
      updated_at = now();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

-- Function to process planning shifts from raw to processed
CREATE OR REPLACE FUNCTION process_planning_shifts(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  processed_count INTEGER := 0;
  raw_record RECORD;
BEGIN
  FOR raw_record IN
    SELECT *
    FROM eitje_planning_shifts_raw
    WHERE (start_date IS NULL OR date >= start_date)
      AND (end_date IS NULL OR date <= end_date)
  LOOP
    -- Similar extraction logic as time_registration_shifts
    INSERT INTO eitje_planning_shifts_processed (
      eitje_id, date,
      user_id, user_name, user_first_name, user_last_name, user_email, user_phone, user_code, user_active, user_raw,
      environment_id, environment_name, environment_code, environment_type, environment_active, environment_raw,
      team_id, team_name, team_code, team_active, team_raw,
      start, end, start_time, end_time, start_datetime, end_datetime,
      break_minutes, breaks, break_minutes_actual, break_minutes_planned,
      planned_hours, hours, total_hours,
      planned_cost, wage_cost, costs,
      status, shift_type, type_name, type_raw,
      skill_set, "skillSet", notes, remarks,
      approved, meals, check_in_ids, planning_shift_id, exported_to_hr_integration,
      raw_data, raw_data_hash,
      api_created_at, api_updated_at
    )
    VALUES (
      raw_record.eitje_id, raw_record.date,
      (raw_record.raw_data->'user'->>'id')::INTEGER,
      raw_record.raw_data->'user'->>'name',
      raw_record.raw_data->'user'->>'first_name',
      raw_record.raw_data->'user'->>'last_name',
      raw_record.raw_data->'user'->>'email',
      raw_record.raw_data->'user'->>'phone',
      raw_record.raw_data->'user'->>'code',
      (raw_record.raw_data->'user'->>'active')::BOOLEAN,
      raw_record.raw_data->'user',
      (raw_record.raw_data->'environment'->>'id')::INTEGER,
      raw_record.raw_data->'environment'->>'name',
      raw_record.raw_data->'environment'->>'code',
      raw_record.raw_data->'environment'->>'type',
      (raw_record.raw_data->'environment'->>'active')::BOOLEAN,
      raw_record.raw_data->'environment',
      (raw_record.raw_data->'team'->>'id')::INTEGER,
      raw_record.raw_data->'team'->>'name',
      raw_record.raw_data->'team'->>'code',
      (raw_record.raw_data->'team'->>'active')::BOOLEAN,
      raw_record.raw_data->'team',
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'start')::TIMESTAMPTZ,
      (raw_record.raw_data->>'end')::TIMESTAMPTZ,
      (raw_record.raw_data->>'break_minutes')::INTEGER,
      (raw_record.raw_data->>'breaks')::INTEGER,
      (raw_record.raw_data->>'break_minutes')::INTEGER,
      (raw_record.raw_data->>'break_minutes_planned')::INTEGER,
      (raw_record.raw_data->>'planned_hours')::DECIMAL,
      (raw_record.raw_data->>'hours')::DECIMAL,
      (raw_record.raw_data->>'total_hours')::DECIMAL,
      (raw_record.raw_data->>'planned_cost')::DECIMAL,
      (raw_record.raw_data->>'wage_cost')::DECIMAL,
      raw_record.raw_data->'costs',
      raw_record.raw_data->>'status',
      raw_record.raw_data->>'shift_type',
      raw_record.raw_data->'type'->>'name',
      raw_record.raw_data->'type',
      raw_record.raw_data->>'skill_set',
      raw_record.raw_data->>'skillSet',
      raw_record.raw_data->>'notes',
      raw_record.raw_data->>'remarks',
      (raw_record.raw_data->>'approved')::BOOLEAN,
      raw_record.raw_data->'meals',
      ARRAY(SELECT jsonb_array_elements_text(raw_record.raw_data->'check_in_ids'))::INTEGER[],
      (raw_record.raw_data->>'planning_shift_id')::INTEGER,
      (raw_record.raw_data->>'exported_to_hr_integration')::BOOLEAN,
      raw_record.raw_data,
      encode(digest(raw_record.raw_data::text, 'sha256'), 'hex'),
      (raw_record.raw_data->>'created_at')::TIMESTAMPTZ,
      (raw_record.raw_data->>'updated_at')::TIMESTAMPTZ
    )
    ON CONFLICT (eitje_id, date, user_id)
    DO UPDATE SET
      user_name = EXCLUDED.user_name,
      environment_name = EXCLUDED.environment_name,
      team_name = EXCLUDED.team_name,
      planned_hours = EXCLUDED.planned_hours,
      planned_cost = EXCLUDED.planned_cost,
      status = EXCLUDED.status,
      updated_at = now();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

COMMENT ON FUNCTION process_time_registration_shifts IS 'Processes raw time registration shifts into processed table with all fields extracted from raw_data JSONB';
COMMENT ON FUNCTION process_planning_shifts IS 'Processes raw planning shifts into processed table with all fields extracted from raw_data JSONB';







