-- =====================================================
-- PHASE 1: Finance Analytics Database Schema
-- =====================================================

-- 1. Data Imports Tracking Table
-- Tracks all file imports (Bork, Eitje, PowerBI)
CREATE TABLE IF NOT EXISTS public.data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type TEXT NOT NULL CHECK (import_type IN ('bork_sales', 'eitje_productivity', 'eitje_hours', 'powerbi_pnl')),
  location_id UUID REFERENCES public.locations(id),
  file_name TEXT NOT NULL,
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  error_message TEXT,
  date_range_start DATE,
  date_range_end DATE,
  metadata JSONB, -- Additional import-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_data_imports_location ON public.data_imports(location_id);
CREATE INDEX idx_data_imports_type ON public.data_imports(import_type);
CREATE INDEX idx_data_imports_status ON public.data_imports(status);

-- 2. Eitje Productivity Data Table
-- Daily aggregated team productivity metrics
CREATE TABLE IF NOT EXISTS public.eitje_productivity_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.data_imports(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  date DATE NOT NULL,
  team_name TEXT NOT NULL, -- 'Keuken' or 'Bar & Bediening'
  hours_worked NUMERIC(10,2) NOT NULL,
  labor_cost NUMERIC(10,2) NOT NULL,
  labor_cost_percentage NUMERIC(5,2),
  revenue NUMERIC(10,2) NOT NULL,
  productivity_per_hour NUMERIC(10,2), -- Revenue per hour worked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eitje_productivity_location_date ON public.eitje_productivity_data(location_id, date);
CREATE INDEX idx_eitje_productivity_import ON public.eitje_productivity_data(import_id);
CREATE UNIQUE INDEX idx_eitje_productivity_unique ON public.eitje_productivity_data(location_id, date, team_name);

-- 3. Eitje Labor Hours Table
-- Individual employee shift records
CREATE TABLE IF NOT EXISTS public.eitje_labor_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.data_imports(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  date DATE NOT NULL,
  employee_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('gewerkte_uren', 'verlof', 'ziek', 'overig')),
  hours NUMERIC(10,2) NOT NULL,
  labor_cost NUMERIC(10,2),
  hourly_rate NUMERIC(10,2),
  contract_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eitje_hours_location_date ON public.eitje_labor_hours(location_id, date);
CREATE INDEX idx_eitje_hours_import ON public.eitje_labor_hours(import_id);
CREATE INDEX idx_eitje_hours_employee ON public.eitje_labor_hours(employee_name, location_id);

-- 4. PowerBI P&L Data Table
-- Monthly P&L line items from accountant
CREATE TABLE IF NOT EXISTS public.powerbi_pnl_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.data_imports(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  category TEXT NOT NULL, -- 'Netto-omzet', 'Kosten', etc.
  subcategory TEXT,
  gl_account TEXT NOT NULL, -- 'Omzet snacks', 'Loonkosten', etc.
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_powerbi_pnl_location_period ON public.powerbi_pnl_data(location_id, year, month);
CREATE INDEX idx_powerbi_pnl_import ON public.powerbi_pnl_data(import_id);
CREATE INDEX idx_powerbi_pnl_category ON public.powerbi_pnl_data(category);
CREATE UNIQUE INDEX idx_powerbi_pnl_unique ON public.powerbi_pnl_data(location_id, year, month, gl_account);

-- 5. P&L Reports Summary Table
-- Pre-calculated monthly P&L summaries for fast dashboard loading
CREATE TABLE IF NOT EXISTS public.pnl_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  -- Revenue breakdown
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  food_revenue NUMERIC(10,2) DEFAULT 0,
  beverage_revenue NUMERIC(10,2) DEFAULT 0,
  
  -- Cost of Goods Sold
  total_cogs NUMERIC(10,2) DEFAULT 0,
  food_cogs NUMERIC(10,2) DEFAULT 0,
  beverage_cogs NUMERIC(10,2) DEFAULT 0,
  
  -- Labor costs
  total_labor_cost NUMERIC(10,2) DEFAULT 0,
  labor_cost_percentage NUMERIC(5,2),
  
  -- Operating expenses
  rent NUMERIC(10,2) DEFAULT 0,
  utilities NUMERIC(10,2) DEFAULT 0,
  marketing NUMERIC(10,2) DEFAULT 0,
  other_opex NUMERIC(10,2) DEFAULT 0,
  
  -- Waste impact
  waste_cost NUMERIC(10,2) DEFAULT 0,
  waste_percentage NUMERIC(5,2),
  
  -- Calculated metrics
  gross_profit NUMERIC(10,2),
  gross_profit_percentage NUMERIC(5,2),
  ebitda NUMERIC(10,2),
  ebitda_percentage NUMERIC(5,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pnl_reports_location_period ON public.pnl_reports(location_id, year, month);
CREATE UNIQUE INDEX idx_pnl_reports_unique ON public.pnl_reports(location_id, year, month);

-- 6. Daily Waste Table (for Phase 2)
CREATE TABLE IF NOT EXISTS public.daily_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  product_id UUID REFERENCES public.products(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spoilage', 'prep_error', 'customer_return', 'overproduction', 'other')),
  reason_notes TEXT,
  cost NUMERIC(10,2),
  recorded_by_user_id UUID REFERENCES auth.users(id),
  storage_location_id UUID REFERENCES public.storage_locations(id),
  photo_urls TEXT[], -- Array of photo URLs for documentation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_waste_location_date ON public.daily_waste(location_id, date);
CREATE INDEX idx_daily_waste_product ON public.daily_waste(product_id);
CREATE INDEX idx_daily_waste_reason ON public.daily_waste(reason);

-- 7. Menu Items Table (for Phase 3)
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'starter', 'main', 'dessert', 'beverage'
  description TEXT,
  recipe TEXT, -- Full recipe instructions
  ingredients JSONB, -- Array of {product_id, quantity, unit}
  cost_price NUMERIC(10,2), -- Calculated from ingredients
  suggested_price NUMERIC(10,2), -- AI suggested based on GP%
  final_price NUMERIC(10,2), -- Actual menu price
  target_gp_percentage NUMERIC(5,2) DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  season TEXT, -- 'spring', 'summer', 'fall', 'winter', 'year_round'
  dietary_tags TEXT[], -- ['vegetarian', 'vegan', 'gluten_free', etc.]
  prep_time_minutes INTEGER,
  cooking_time_minutes INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  notes TEXT,
  created_by_user_id UUID REFERENCES auth.users(id),
  approved_by_user_id UUID REFERENCES auth.users(id),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_location ON public.menu_items(location_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_active ON public.menu_items(is_active);

-- 8. Menu Versions Table (for Phase 3)
CREATE TABLE IF NOT EXISTS public.menu_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  name TEXT NOT NULL, -- 'Spring 2025', 'Summer 2025'
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  menu_items JSONB, -- Array of menu_item IDs
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_versions_location ON public.menu_versions(location_id);
CREATE INDEX idx_menu_versions_active ON public.menu_versions(is_active);

-- 9. Menu Item Waste Linkage (for Phase 2-3 integration)
CREATE TABLE IF NOT EXISTS public.menu_item_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  waste_id UUID NOT NULL REFERENCES public.daily_waste(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_item_waste_menu ON public.menu_item_waste(menu_item_id);
CREATE INDEX idx_menu_item_waste_waste ON public.menu_item_waste(waste_id);

-- =====================================================
-- Row-Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_productivity_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_labor_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerbi_pnl_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnl_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_waste ENABLE ROW LEVEL SECURITY;

-- Data Imports Policies
CREATE POLICY "Anyone can view data_imports" ON public.data_imports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert data_imports" ON public.data_imports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can update data_imports" ON public.data_imports FOR UPDATE USING (true);

-- Eitje Productivity Policies
CREATE POLICY "Anyone can view eitje_productivity_data" ON public.eitje_productivity_data FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert eitje_productivity_data" ON public.eitje_productivity_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Eitje Labor Hours Policies
CREATE POLICY "Anyone can view eitje_labor_hours" ON public.eitje_labor_hours FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert eitje_labor_hours" ON public.eitje_labor_hours FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PowerBI P&L Policies
CREATE POLICY "Anyone can view powerbi_pnl_data" ON public.powerbi_pnl_data FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert powerbi_pnl_data" ON public.powerbi_pnl_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- P&L Reports Policies
CREATE POLICY "Anyone can view pnl_reports" ON public.pnl_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert pnl_reports" ON public.pnl_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can update pnl_reports" ON public.pnl_reports FOR UPDATE USING (true);

-- Daily Waste Policies
CREATE POLICY "Anyone can view daily_waste" ON public.daily_waste FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert daily_waste" ON public.daily_waste FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can update daily_waste" ON public.daily_waste FOR UPDATE USING (true);

-- Menu Items Policies
CREATE POLICY "Anyone can view menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert menu_items" ON public.menu_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can update menu_items" ON public.menu_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete menu_items" ON public.menu_items FOR DELETE USING (true);

-- Menu Versions Policies
CREATE POLICY "Anyone can view menu_versions" ON public.menu_versions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert menu_versions" ON public.menu_versions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can update menu_versions" ON public.menu_versions FOR UPDATE USING (true);

-- Menu Item Waste Policies
CREATE POLICY "Anyone can view menu_item_waste" ON public.menu_item_waste FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert menu_item_waste" ON public.menu_item_waste FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================

CREATE TRIGGER update_pnl_reports_updated_at BEFORE UPDATE ON public.pnl_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_versions_updated_at BEFORE UPDATE ON public.menu_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();