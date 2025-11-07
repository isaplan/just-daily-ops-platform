-- Create powerbi_pnl_aggregated_data table with proper COGS hierarchy
-- This table stores pre-calculated, validated monthly totals for P&L data

CREATE TABLE IF NOT EXISTS powerbi_pnl_aggregated_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- REVENUE CALCULATIONS (all positive values)
  netto_omzet_uit_levering_geproduceerd DECIMAL(15,2) DEFAULT 0,
  netto_omzet_verkoop_handelsgoederen DECIMAL(15,2) DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  
  -- COST OF SALES COGS (all negative values)
  inkoopwaarde_handelsgoederen DECIMAL(15,2) DEFAULT 0,
  
  -- LABOR COST COGS (all negative values)
  lonen_en_salarissen DECIMAL(15,2) DEFAULT 0,
  
  -- OTHER UNDEFINED COGS (all negative values)
  overige_bedrijfskosten DECIMAL(15,2) DEFAULT 0,
  afschrijvingen DECIMAL(15,2) DEFAULT 0,
  financiele_baten_lasten DECIMAL(15,2) DEFAULT 0,
  opbrengst_vorderingen DECIMAL(15,2) DEFAULT 0,
  
  -- CALCULATED TOTALS
  total_cost_of_sales DECIMAL(15,2) DEFAULT 0,
  total_labor_costs DECIMAL(15,2) DEFAULT 0,
  total_other_costs DECIMAL(15,2) DEFAULT 0,
  total_costs DECIMAL(15,2) DEFAULT 0,
  resultaat DECIMAL(15,2) DEFAULT 0,
  
  -- METADATA
  import_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CONSTRAINTS
  UNIQUE(location_id, year, month),
  CHECK (month >= 1 AND month <= 12),
  CHECK (year >= 2020 AND year <= 2030)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_location_year_month 
ON powerbi_pnl_aggregated_data(location_id, year, month);

CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_import_id 
ON powerbi_pnl_aggregated_data(import_id);

-- Add RLS policy
ALTER TABLE powerbi_pnl_aggregated_data ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to access aggregated P&L data" 
ON powerbi_pnl_aggregated_data 
FOR ALL 
TO authenticated 
USING (true);

-- Add comments for documentation
COMMENT ON TABLE powerbi_pnl_aggregated_data IS 'Pre-calculated P&L aggregated data with proper COGS hierarchy';
COMMENT ON COLUMN powerbi_pnl_aggregated_data.netto_omzet_uit_levering_geproduceerd IS 'Revenue from produced goods (Omzet Snacks + Lunch + Diner + Menu + Keuken)';
COMMENT ON COLUMN powerbi_pnl_aggregated_data.netto_omzet_verkoop_handelsgoederen IS 'Revenue from trade goods (Wijnen + Gedestilleerd + Cocktails + Cider + etc.)';
COMMENT ON COLUMN powerbi_pnl_aggregated_data.inkoopwaarde_handelsgoederen IS 'Cost of sales - purchase value of trade goods';
COMMENT ON COLUMN powerbi_pnl_aggregated_data.lonen_en_salarissen IS 'Labor costs - all salary and wage related expenses';
COMMENT ON COLUMN powerbi_pnl_aggregated_data.resultaat IS 'Calculated result: Revenue - Cost of Sales - Labor Costs - Other Costs';


