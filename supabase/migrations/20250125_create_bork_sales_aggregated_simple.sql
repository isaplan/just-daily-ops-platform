-- Create bork_sales_aggregated table for pre-calculated daily sales metrics
-- This table will be populated by the aggregation service after raw data processing

CREATE TABLE IF NOT EXISTS public.bork_sales_aggregated (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES public.locations(id),
    date DATE NOT NULL,
    
    -- Overall metrics
    total_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_revenue_excl_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_revenue_incl_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    avg_price DECIMAL(10,2) DEFAULT 0,
    
    -- VAT breakdown (Netherlands: 9% food, 21% drinks)
    vat_9_base DECIMAL(12,2) DEFAULT 0,     -- Revenue base at 9%
    vat_9_amount DECIMAL(10,2) DEFAULT 0,   -- VAT amount from 9%
    vat_21_base DECIMAL(12,2) DEFAULT 0,    -- Revenue base at 21%
    vat_21_amount DECIMAL(10,2) DEFAULT 0,  -- VAT amount from 21%
    
    -- Product metrics
    product_count INTEGER DEFAULT 0,
    unique_products INTEGER DEFAULT 0,
    top_category TEXT,
    category_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(location_id, date)
);

-- Performance indexes (only create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_location_id ON public.bork_sales_aggregated(location_id);
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_date ON public.bork_sales_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_location_date ON public.bork_sales_aggregated(location_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_created_at ON public.bork_sales_aggregated(created_at);

-- Enable RLS
ALTER TABLE public.bork_sales_aggregated ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only create if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bork_sales_aggregated' 
        AND policyname = 'Allow authenticated read access'
    ) THEN
        CREATE POLICY "Allow authenticated read access" ON public.bork_sales_aggregated
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bork_sales_aggregated' 
        AND policyname = 'Allow authenticated write access'
    ) THEN
        CREATE POLICY "Allow authenticated write access" ON public.bork_sales_aggregated
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
