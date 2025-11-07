-- =====================================================
-- EITJE AGGREGATED DATA TABLES
-- =====================================================
-- Create aggregated tables for Eitje endpoints (Labor + Revenue)
-- Master data (environments, teams, users, shift_types) skip aggregation

-- 1. LABOR HOURS AGGREGATED (Daily labor metrics per environment/team)
CREATE TABLE IF NOT EXISTS public.eitje_labor_hours_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER NOT NULL,
    team_id INTEGER,
    
    -- Hours metrics
    total_hours_worked DECIMAL(8,2) DEFAULT 0,
    total_breaks_minutes INTEGER DEFAULT 0,
    
    -- Cost metrics
    total_wage_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Employee metrics
    employee_count INTEGER DEFAULT 0,
    shift_count INTEGER DEFAULT 0,
    
    -- Average metrics
    avg_hours_per_employee DECIMAL(5,2) DEFAULT 0,
    avg_wage_per_hour DECIMAL(8,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint per date/environment/team
    UNIQUE(date, environment_id, team_id)
);

-- 2. PLANNING HOURS AGGREGATED (Daily planned shifts per environment/team)
CREATE TABLE IF NOT EXISTS public.eitje_planning_hours_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER NOT NULL,
    team_id INTEGER,
    
    -- Hours metrics
    planned_hours_total DECIMAL(8,2) DEFAULT 0,
    total_breaks_minutes INTEGER DEFAULT 0,
    
    -- Cost metrics
    total_planned_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Employee metrics
    employee_count INTEGER DEFAULT 0,
    shift_count INTEGER DEFAULT 0,
    
    -- Status counts
    confirmed_count INTEGER DEFAULT 0,
    cancelled_count INTEGER DEFAULT 0,
    planned_count INTEGER DEFAULT 0,
    
    -- Average metrics
    avg_hours_per_employee DECIMAL(5,2) DEFAULT 0,
    avg_cost_per_hour DECIMAL(8,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint per date/environment/team
    UNIQUE(date, environment_id, team_id)
);

-- 3. REVENUE DAYS AGGREGATED (Daily revenue per environment)
CREATE TABLE IF NOT EXISTS public.eitje_revenue_days_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER NOT NULL,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    avg_revenue_per_transaction DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint per date/environment
    UNIQUE(date, environment_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Labor hours aggregated indexes
CREATE INDEX IF NOT EXISTS idx_eitje_labor_hours_date ON public.eitje_labor_hours_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_eitje_labor_hours_environment ON public.eitje_labor_hours_aggregated(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_labor_hours_date_env ON public.eitje_labor_hours_aggregated(date, environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_labor_hours_team ON public.eitje_labor_hours_aggregated(team_id);

-- Planning hours aggregated indexes
CREATE INDEX IF NOT EXISTS idx_eitje_planning_hours_date ON public.eitje_planning_hours_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_hours_environment ON public.eitje_planning_hours_aggregated(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_hours_date_env ON public.eitje_planning_hours_aggregated(date, environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_hours_team ON public.eitje_planning_hours_aggregated(team_id);

-- Revenue days aggregated indexes
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_date ON public.eitje_revenue_days_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_environment ON public.eitje_revenue_days_aggregated(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_date_env ON public.eitje_revenue_days_aggregated(date, environment_id);

-- =====================================================
-- ROW-LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.eitje_labor_hours_aggregated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_planning_hours_aggregated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_revenue_days_aggregated ENABLE ROW LEVEL SECURITY;

-- Labor hours aggregated policies
CREATE POLICY "Allow authenticated read access to eitje labor hours aggregated" ON public.eitje_labor_hours_aggregated
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje labor hours aggregated" ON public.eitje_labor_hours_aggregated
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje labor hours aggregated" ON public.eitje_labor_hours_aggregated
    FOR SELECT TO anon USING (true);

-- Planning hours aggregated policies
CREATE POLICY "Allow authenticated read access to eitje planning hours aggregated" ON public.eitje_planning_hours_aggregated
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje planning hours aggregated" ON public.eitje_planning_hours_aggregated
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje planning hours aggregated" ON public.eitje_planning_hours_aggregated
    FOR SELECT TO anon USING (true);

-- Revenue days aggregated policies
CREATE POLICY "Allow authenticated read access to eitje revenue days aggregated" ON public.eitje_revenue_days_aggregated
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje revenue days aggregated" ON public.eitje_revenue_days_aggregated
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje revenue days aggregated" ON public.eitje_revenue_days_aggregated
    FOR SELECT TO anon USING (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

CREATE TRIGGER update_eitje_labor_hours_aggregated_updated_at BEFORE UPDATE ON public.eitje_labor_hours_aggregated
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eitje_planning_hours_aggregated_updated_at BEFORE UPDATE ON public.eitje_planning_hours_aggregated
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eitje_revenue_days_aggregated_updated_at BEFORE UPDATE ON public.eitje_revenue_days_aggregated
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


