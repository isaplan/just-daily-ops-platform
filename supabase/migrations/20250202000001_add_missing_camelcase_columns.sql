-- =====================================================
-- ADD MISSING CAMELCASE COLUMNS TO PROCESSED TABLES
-- =====================================================
-- PostgreSQL lowercases unquoted column names, but Supabase expects exact case
-- This migration ensures the camelCase columns exist with proper quoting

-- Add missing camelCase columns to time_registration_shifts_processed
DO $$ 
BEGIN
    -- Check if laborCost exists (case-insensitive) and rename if needed, or add if missing
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_time_registration_shifts_processed' 
        AND LOWER(column_name) = 'laborcost'
        AND column_name != 'laborCost'
    ) THEN
        ALTER TABLE public.eitje_time_registration_shifts_processed 
        RENAME COLUMN laborcost TO "laborCost";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_time_registration_shifts_processed' 
        AND column_name = 'laborCost'
    ) THEN
        ALTER TABLE public.eitje_time_registration_shifts_processed 
        ADD COLUMN "laborCost" DECIMAL(10,2);
    END IF;
    
    -- Check and handle totalCost
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_time_registration_shifts_processed' 
        AND LOWER(column_name) = 'totalcost'
        AND column_name != 'totalCost'
    ) THEN
        ALTER TABLE public.eitje_time_registration_shifts_processed 
        RENAME COLUMN totalcost TO "totalCost";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_time_registration_shifts_processed' 
        AND column_name = 'totalCost'
    ) THEN
        ALTER TABLE public.eitje_time_registration_shifts_processed 
        ADD COLUMN "totalCost" DECIMAL(10,2);
    END IF;
END $$;

-- Add missing camelCase columns to revenue_days_processed
DO $$ 
BEGIN
    -- Helper function to check and rename or add column
    -- cardRevenue
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND LOWER(column_name) = 'cardrevenue'
        AND column_name != 'cardRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        RENAME COLUMN cardrevenue TO "cardRevenue";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND column_name = 'cardRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        ADD COLUMN "cardRevenue" DECIMAL(12,2);
    END IF;
    
    -- cashRevenue
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND LOWER(column_name) = 'cashrevenue'
        AND column_name != 'cashRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        RENAME COLUMN cashrevenue TO "cashRevenue";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND column_name = 'cashRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        ADD COLUMN "cashRevenue" DECIMAL(12,2);
    END IF;
    
    -- digitalRevenue
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND LOWER(column_name) = 'digitalrevenue'
        AND column_name != 'digitalRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        RENAME COLUMN digitalrevenue TO "digitalRevenue";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND column_name = 'digitalRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        ADD COLUMN "digitalRevenue" DECIMAL(12,2);
    END IF;
    
    -- otherRevenue
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND LOWER(column_name) = 'otherrevenue'
        AND column_name != 'otherRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        RENAME COLUMN otherrevenue TO "otherRevenue";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND column_name = 'otherRevenue'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        ADD COLUMN "otherRevenue" DECIMAL(12,2);
    END IF;
    
    -- vatAmount
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND LOWER(column_name) = 'vatamount'
        AND column_name != 'vatAmount'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        RENAME COLUMN vatamount TO "vatAmount";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND column_name = 'vatAmount'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        ADD COLUMN "vatAmount" DECIMAL(12,2);
    END IF;
    
    -- vatPercentage
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND LOWER(column_name) = 'vatpercentage'
        AND column_name != 'vatPercentage'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        RENAME COLUMN vatpercentage TO "vatPercentage";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND column_name = 'vatPercentage'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        ADD COLUMN "vatPercentage" DECIMAL(5,2);
    END IF;
    
    -- vatRate
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND LOWER(column_name) = 'vatrate'
        AND column_name != 'vatRate'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        RENAME COLUMN vatrate TO "vatRate";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eitje_revenue_days_processed' 
        AND column_name = 'vatRate'
    ) THEN
        ALTER TABLE public.eitje_revenue_days_processed 
        ADD COLUMN "vatRate" DECIMAL(5,2);
    END IF;
END $$;

