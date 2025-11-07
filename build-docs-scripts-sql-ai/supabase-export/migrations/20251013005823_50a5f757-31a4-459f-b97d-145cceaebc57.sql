-- Create execution_logs table for TanStack Query logging
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_type TEXT NOT NULL CHECK (execution_type IN ('query', 'mutation')),
  query_key JSONB NOT NULL,
  duration_ms NUMERIC NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_created_at ON execution_logs(created_at DESC);
CREATE INDEX idx_execution_logs_success ON execution_logs(success);
CREATE INDEX idx_execution_logs_type ON execution_logs(execution_type);

-- RLS Policies for execution_logs
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own logs"
  ON execution_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view execution logs"
  ON execution_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create RPC function for fuzzy location matching
CREATE OR REPLACE FUNCTION match_location_fuzzy(
  p_location_name TEXT
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  similarity_score NUMERIC
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
    similarity(LOWER(l.name), LOWER(p_location_name)) AS similarity_score
  FROM locations l
  WHERE similarity(LOWER(l.name), LOWER(p_location_name)) > 0.3
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$;

-- Create RPC function for transactional batch insert
CREATE OR REPLACE FUNCTION insert_finance_data_batch(
  p_import_id UUID,
  p_import_type TEXT,
  p_location_id UUID,
  p_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name TEXT;
  v_record JSONB;
  v_processed_count INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_sql TEXT;
BEGIN
  -- Determine target table based on import type
  CASE p_import_type
    WHEN 'bork_sales' THEN v_table_name := 'bork_sales_data';
    WHEN 'eitje_labor' THEN v_table_name := 'eitje_labor_hours';
    WHEN 'eitje_productivity' THEN v_table_name := 'eitje_productivity_data';
    WHEN 'powerbi_pnl' THEN v_table_name := 'powerbi_pnl_data';
    ELSE
      RAISE EXCEPTION 'Invalid import type: %', p_import_type;
  END CASE;

  -- Loop through records and insert one by one (allows partial success)
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    BEGIN
      -- Add system fields
      v_record := v_record || jsonb_build_object(
        'import_id', p_import_id,
        'location_id', p_location_id,
        'created_at', NOW()
      );

      -- Dynamic insert based on table name
      v_sql := format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, $1)', 
                      v_table_name, v_table_name);
      
      EXECUTE v_sql USING v_record;
      
      v_processed_count := v_processed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other records
      v_errors := v_errors || jsonb_build_object(
        'record', v_record,
        'error', SQLERRM
      );
    END;
  END LOOP;

  -- Return summary of processing
  RETURN jsonb_build_object(
    'processed_count', v_processed_count,
    'error_count', jsonb_array_length(v_errors),
    'errors', v_errors
  );
END;
$$;