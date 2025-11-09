-- =====================================================
-- EITJE PROCESSED DATA TABLES
-- =====================================================
-- Create processed tables that unpack ALL JSONB fields from raw_data
-- These tables provide 100% field coverage for easy querying without JSONB parsing
-- Validation: raw_data_hash ensures processed columns match raw_data exactly

-- 1. TIME REGISTRATION SHIFTS PROCESSED
CREATE TABLE IF NOT EXISTS public.eitje_time_registration_shifts_processed (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    date DATE NOT NULL,
    
    -- User fields (from raw_data.user)
    user_id INTEGER,
    user_name VARCHAR(255),
    user_first_name VARCHAR(255),
    user_last_name VARCHAR(255),
    user_email VARCHAR(255),
    user_phone VARCHAR(50),
    user_code VARCHAR(100),
    user_active BOOLEAN,
    user_raw JSONB,
    
    -- Environment fields (from raw_data.environment)
    environment_id INTEGER,
    environment_name VARCHAR(255),
    environment_code VARCHAR(100),
    environment_type VARCHAR(100),
    environment_active BOOLEAN,
    environment_raw JSONB,
    
    -- Team fields (from raw_data.team)
    team_id INTEGER,
    team_name VARCHAR(255),
    team_code VARCHAR(100),
    team_active BOOLEAN,
    team_raw JSONB,
    
    -- Time fields (multiple naming conventions)
    start TIMESTAMP WITH TIME ZONE,
    "end" TIMESTAMP WITH TIME ZONE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    
    -- Break fields
    break_minutes INTEGER DEFAULT 0,
    breaks INTEGER DEFAULT 0,
    break_minutes_actual INTEGER DEFAULT 0,
    break_minutes_planned INTEGER DEFAULT 0,
    
    -- Hours fields
    hours_worked DECIMAL(5,2),
    hours DECIMAL(5,2),
    total_hours DECIMAL(5,2),
    
    -- Cost fields (from raw_data.costs and direct fields)
    wage_cost DECIMAL(10,2),
    wage_cost_cents INTEGER,
    costs_wage DECIMAL(10,2),
    costs_wage_cost DECIMAL(10,2),
    costs_total DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    laborCost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    totalCost DECIMAL(10,2),
    cost DECIMAL(10,2),
    price DECIMAL(10,2),
    hourly_rate DECIMAL(8,2),
    costs JSONB,
    
    -- Status and metadata
    status VARCHAR(50),
    shift_type VARCHAR(100),
    type_name VARCHAR(100),
    type_raw JSONB,
    skill_set VARCHAR(100),
    skillSet VARCHAR(100),
    notes TEXT,
    remarks TEXT,
    
    -- Validation
    raw_data_hash VARCHAR(64),
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint
    UNIQUE(eitje_id, date, user_id)
);

-- 2. PLANNING SHIFTS PROCESSED
CREATE TABLE IF NOT EXISTS public.eitje_planning_shifts_processed (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    date DATE NOT NULL,
    
    -- User fields (from raw_data.user)
    user_id INTEGER,
    user_name VARCHAR(255),
    user_first_name VARCHAR(255),
    user_last_name VARCHAR(255),
    user_email VARCHAR(255),
    user_phone VARCHAR(50),
    user_code VARCHAR(100),
    user_active BOOLEAN,
    user_raw JSONB,
    
    -- Environment fields (from raw_data.environment)
    environment_id INTEGER,
    environment_name VARCHAR(255),
    environment_code VARCHAR(100),
    environment_type VARCHAR(100),
    environment_active BOOLEAN,
    environment_raw JSONB,
    
    -- Team fields (from raw_data.team)
    team_id INTEGER,
    team_name VARCHAR(255),
    team_code VARCHAR(100),
    team_active BOOLEAN,
    team_raw JSONB,
    
    -- Time fields
    start TIMESTAMP WITH TIME ZONE,
    "end" TIMESTAMP WITH TIME ZONE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    
    -- Break fields
    break_minutes INTEGER DEFAULT 0,
    breaks INTEGER DEFAULT 0,
    break_minutes_actual INTEGER DEFAULT 0,
    break_minutes_planned INTEGER DEFAULT 0,
    
    -- Hours fields (planning-specific)
    planned_hours DECIMAL(5,2),
    hours DECIMAL(5,2),
    total_hours DECIMAL(5,2),
    hours_planned DECIMAL(5,2),
    
    -- Cost fields (planning-specific)
    planned_cost DECIMAL(10,2),
    wage_cost DECIMAL(10,2),
    costs_wage DECIMAL(10,2),
    costs_wage_cost DECIMAL(10,2),
    costs_total DECIMAL(10,2),
    hourly_rate DECIMAL(8,2),
    costs JSONB,
    
    -- Status fields (planning-specific)
    status VARCHAR(50) DEFAULT 'planned',
    confirmed BOOLEAN DEFAULT false,
    cancelled BOOLEAN DEFAULT false,
    shift_type VARCHAR(100),
    type_name VARCHAR(100),
    type_raw JSONB,
    skill_set VARCHAR(100),
    skillSet VARCHAR(100),
    notes TEXT,
    remarks TEXT,
    
    -- Validation
    raw_data_hash VARCHAR(64),
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint
    UNIQUE(eitje_id, date, user_id)
);

-- 3. REVENUE DAYS PROCESSED
CREATE TABLE IF NOT EXISTS public.eitje_revenue_days_processed (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    date DATE NOT NULL,
    
    -- Environment fields (from raw_data.environment)
    environment_id INTEGER,
    environment_name VARCHAR(255),
    environment_code VARCHAR(100),
    environment_type VARCHAR(100),
    environment_active BOOLEAN,
    environment_raw JSONB,
    
    -- Revenue fields (all variations)
    total_revenue DECIMAL(12,2),
    revenue DECIMAL(12,2),
    net_revenue DECIMAL(12,2),
    gross_revenue DECIMAL(12,2),
    amt_in_cents INTEGER,
    amount DECIMAL(12,2),
    
    -- Transaction fields
    transaction_count INTEGER,
    transaction_count_total INTEGER,
    transactions_count INTEGER,
    count INTEGER,
    
    -- Payment method fields
    cash_revenue DECIMAL(12,2),
    cashRevenue DECIMAL(12,2),
    card_revenue DECIMAL(12,2),
    cardRevenue DECIMAL(12,2),
    digital_revenue DECIMAL(12,2),
    digitalRevenue DECIMAL(12,2),
    other_revenue DECIMAL(12,2),
    otherRevenue DECIMAL(12,2),
    
    -- VAT fields
    vat_amount DECIMAL(12,2),
    vatAmount DECIMAL(12,2),
    vat_percentage DECIMAL(5,2),
    vatPercentage DECIMAL(5,2),
    vat_rate DECIMAL(5,2),
    vatRate DECIMAL(5,2),
    
    -- Currency and metadata
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50),
    notes TEXT,
    remarks TEXT,
    
    -- Validation
    raw_data_hash VARCHAR(64),
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint
    UNIQUE(eitje_id, date, environment_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Time registration shifts processed indexes
CREATE INDEX IF NOT EXISTS idx_eitje_time_shifts_proc_date ON public.eitje_time_registration_shifts_processed(date);
CREATE INDEX IF NOT EXISTS idx_eitje_time_shifts_proc_user ON public.eitje_time_registration_shifts_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_eitje_time_shifts_proc_env ON public.eitje_time_registration_shifts_processed(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_time_shifts_proc_team ON public.eitje_time_registration_shifts_processed(team_id);
CREATE INDEX IF NOT EXISTS idx_eitje_time_shifts_proc_date_user ON public.eitje_time_registration_shifts_processed(date, user_id);
CREATE INDEX IF NOT EXISTS idx_eitje_time_shifts_proc_eitje_id ON public.eitje_time_registration_shifts_processed(eitje_id);

-- Planning shifts processed indexes
CREATE INDEX IF NOT EXISTS idx_eitje_planning_shifts_proc_date ON public.eitje_planning_shifts_processed(date);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_shifts_proc_user ON public.eitje_planning_shifts_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_shifts_proc_env ON public.eitje_planning_shifts_processed(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_shifts_proc_team ON public.eitje_planning_shifts_processed(team_id);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_shifts_proc_date_user ON public.eitje_planning_shifts_processed(date, user_id);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_shifts_proc_eitje_id ON public.eitje_planning_shifts_processed(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_planning_shifts_proc_status ON public.eitje_planning_shifts_processed(status);

-- Revenue days processed indexes
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_proc_date ON public.eitje_revenue_days_processed(date);
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_proc_env ON public.eitje_revenue_days_processed(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_revenue_days_proc_eitje_id ON public.eitje_revenue_days_processed(eitje_id);

