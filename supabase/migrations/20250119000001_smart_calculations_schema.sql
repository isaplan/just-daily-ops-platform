-- Smart Calculations Schema for Performance Optimization
-- This schema supports pre-calculated results and pagination

-- Calculation Status Table
CREATE TABLE IF NOT EXISTS public.calculation_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'error')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    trigger_type TEXT,
    location_id UUID REFERENCES public.locations(id),
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Calculation Results Table (stores pre-calculated data)
CREATE TABLE IF NOT EXISTS public.calculation_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    calculation_id UUID REFERENCES public.calculation_status(id),
    location_id UUID REFERENCES public.locations(id),
    result_data JSONB NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pagination Support for bork_sales_data
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_pagination 
ON public.bork_sales_data(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bork_sales_data_category_pagination 
ON public.bork_sales_data(category, created_at DESC);

-- Performance indexes for calculations
CREATE INDEX IF NOT EXISTS idx_calculation_status_location 
ON public.calculation_status(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calculation_results_location 
ON public.calculation_results(location_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.calculation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calculation tables
CREATE POLICY "Anyone can view calculation_status" 
ON public.calculation_status FOR SELECT USING (true);

CREATE POLICY "Service role can manage calculation_status" 
ON public.calculation_status FOR ALL USING (true);

CREATE POLICY "Anyone can view calculation_results" 
ON public.calculation_results FOR SELECT USING (true);

CREATE POLICY "Service role can manage calculation_results" 
ON public.calculation_results FOR ALL USING (true);

-- Function to trigger calculations on data changes
CREATE OR REPLACE FUNCTION trigger_smart_calculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert calculation trigger
    INSERT INTO public.calculation_status (
        name,
        status,
        progress,
        trigger_type,
        location_id
    ) VALUES (
        'Data Change Trigger - ' || TG_TABLE_NAME,
        'pending',
        0,
        TG_OP,
        NEW.location_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bork_sales_data changes
DROP TRIGGER IF EXISTS bork_sales_data_calculation_trigger ON public.bork_sales_data;
CREATE TRIGGER bork_sales_data_calculation_trigger
    AFTER INSERT OR UPDATE ON public.bork_sales_data
    FOR EACH ROW
    EXECUTE FUNCTION trigger_smart_calculation();
