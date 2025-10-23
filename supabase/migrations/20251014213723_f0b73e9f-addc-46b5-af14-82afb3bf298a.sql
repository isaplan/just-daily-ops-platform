-- Create pnl_line_items table for hierarchical P&L data
CREATE TABLE pnl_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  import_id UUID REFERENCES data_imports(id) ON DELETE SET NULL,
  
  -- Time Dimensions
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2050),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- Hierarchical Categories
  category_level_1 TEXT NOT NULL,
  category_level_2 TEXT,
  category_level_3 TEXT,
  
  -- GL Account Details
  gl_account TEXT NOT NULL,
  gl_description TEXT,
  
  -- Financial Data
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT pnl_line_items_unique UNIQUE (location_id, year, month, gl_account)
);

-- Performance Indexes for pnl_line_items
CREATE INDEX idx_pnl_line_items_location_period ON pnl_line_items(location_id, year, month);
CREATE INDEX idx_pnl_line_items_category_l1 ON pnl_line_items(category_level_1);
CREATE INDEX idx_pnl_line_items_category_l2 ON pnl_line_items(category_level_2) WHERE category_level_2 IS NOT NULL;

-- Enable RLS for pnl_line_items
ALTER TABLE pnl_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pnl_line_items"
  ON pnl_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pnl_line_items"
  ON pnl_line_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pnl_line_items"
  ON pnl_line_items FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create pnl_monthly_summary table for pre-aggregated data
CREATE TABLE pnl_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  import_id UUID REFERENCES data_imports(id) ON DELETE SET NULL,
  
  -- Time Dimensions
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2050),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- Revenue
  revenue_net NUMERIC(15,2) NOT NULL DEFAULT 0,
  revenue_gross NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- COGS
  cogs_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  cogs_kitchen NUMERIC(15,2) NOT NULL DEFAULT 0,
  cogs_beer_wine NUMERIC(15,2) NOT NULL DEFAULT 0,
  cogs_spirits NUMERIC(15,2) NOT NULL DEFAULT 0,
  cogs_non_alcoholic NUMERIC(15,2) NOT NULL DEFAULT 0,
  cogs_other NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Labor Costs
  labor_cost_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  labor_wages_salaries NUMERIC(15,2) NOT NULL DEFAULT 0,
  labor_social_charges NUMERIC(15,2) NOT NULL DEFAULT 0,
  labor_pension NUMERIC(15,2) NOT NULL DEFAULT 0,
  labor_other NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Operating Expenses
  opex_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  opex_rent NUMERIC(15,2) NOT NULL DEFAULT 0,
  opex_utilities NUMERIC(15,2) NOT NULL DEFAULT 0,
  opex_maintenance NUMERIC(15,2) NOT NULL DEFAULT 0,
  opex_marketing NUMERIC(15,2) NOT NULL DEFAULT 0,
  opex_insurance NUMERIC(15,2) NOT NULL DEFAULT 0,
  opex_administrative NUMERIC(15,2) NOT NULL DEFAULT 0,
  opex_other NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Depreciation & Finance
  depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
  finance_costs NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Calculated Metrics (generated columns)
  gross_profit NUMERIC(15,2) GENERATED ALWAYS AS (revenue_net - cogs_total) STORED,
  ebitda NUMERIC(15,2) GENERATED ALWAYS AS (revenue_net - cogs_total - labor_cost_total - opex_total + depreciation) STORED,
  ebit NUMERIC(15,2) GENERATED ALWAYS AS (revenue_net - cogs_total - labor_cost_total - opex_total) STORED,
  net_profit NUMERIC(15,2) GENERATED ALWAYS AS (revenue_net - cogs_total - labor_cost_total - opex_total - depreciation - finance_costs) STORED,
  
  -- Percentages
  gross_margin_pct NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN revenue_net > 0 THEN ((revenue_net - cogs_total) / revenue_net * 100) ELSE 0 END
  ) STORED,
  labor_cost_pct NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN revenue_net > 0 THEN (labor_cost_total / revenue_net * 100) ELSE 0 END
  ) STORED,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT pnl_monthly_summary_unique UNIQUE (location_id, year, month)
);

-- Performance Indexes for pnl_monthly_summary
CREATE INDEX idx_pnl_monthly_summary_location_period ON pnl_monthly_summary(location_id, year, month);
CREATE INDEX idx_pnl_monthly_summary_period ON pnl_monthly_summary(year, month);

-- Enable RLS for pnl_monthly_summary
ALTER TABLE pnl_monthly_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pnl_monthly_summary"
  ON pnl_monthly_summary FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pnl_monthly_summary"
  ON pnl_monthly_summary FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pnl_monthly_summary"
  ON pnl_monthly_summary FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pnl_monthly_summary"
  ON pnl_monthly_summary FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);