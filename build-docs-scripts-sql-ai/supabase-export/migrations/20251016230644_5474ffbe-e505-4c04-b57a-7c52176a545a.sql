-- Step 1: Remove duplicate records, keeping only the most recent (by created_at) for each group
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY location_id, date, product_name, category 
           ORDER BY created_at DESC, id DESC
         ) as rn
  FROM public.bork_sales_data
)
DELETE FROM public.bork_sales_data
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Now add the unique constraint to prevent future duplicates
ALTER TABLE public.bork_sales_data
ADD CONSTRAINT bork_sales_data_unique_record 
UNIQUE (location_id, date, product_name, category);