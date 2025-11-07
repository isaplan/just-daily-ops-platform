# Fix: Can't See All Data in Aggregated Tables

## Problem Identified

The aggregated tables `eitje_revenue_days_aggregated` and `eitje_labor_hours_aggregated` currently only have **3 basic columns**:
- `total_revenue`, `transaction_count`, `avg_revenue_per_transaction`

But the raw tables have **17+ columns** that should be extracted:
- VAT fields (excl/incl/amount/rate)
- Payment methods (cash/card/digital/other)
- Percentages
- Min/max transaction values
- Currency, net/gross revenue

## Root Cause

1. **Migration not run**: The new columns haven't been added to the database yet
2. **Aggregation code outdated**: Was only extracting 3 fields, now updated to extract all 17
3. **Data not re-aggregated**: Even after migration, need to re-run aggregation to populate new columns

## Solution Applied

### ✅ Step 1: Migration Created
**File**: `supabase/migrations/20251102150000_expand_eitje_revenue_aggregated.sql`

Adds 17 new columns:
- `total_revenue_excl_vat`, `total_revenue_incl_vat`, `total_vat_amount`, `avg_vat_rate`
- `total_cash_revenue`, `total_card_revenue`, `total_digital_revenue`, `total_other_revenue`
- `cash_percentage`, `card_percentage`, `digital_percentage`, `other_percentage`
- `max_transaction_value`, `min_transaction_value`
- `currency`, `net_revenue`, `gross_revenue`

### ✅ Step 2: Aggregation Service Updated
**File**: `src/lib/eitje/aggregation-service.ts`

- Updated `RevenueDaysRecord` interface with all 17 new fields
- Completely rewrote `aggregateRevenueDays()` to extract ALL columns from normalized raw table
- Prioritizes normalized columns over JSONB (compliance)
- Calculates percentages and metrics correctly

### ✅ Step 3: Labor Hours Aggregation Updated
- Updated `aggregateLaborHours()` to prioritize normalized columns

## Next Steps to Fix Visibility

### 1. Run Migration
```bash
# In Supabase CLI or SQL Editor
supabase migration up
# OR run the SQL directly in Supabase SQL Editor
```

### 2. Re-run Aggregation
After migration, you MUST re-run aggregation to populate the new columns:

**Option A: Via API**
```bash
POST /api/eitje/aggregate
Body: { "startDate": "2024-01-01", "endDate": "2024-12-31" }
```

**Option B: Via Dashboard**
- Go to Eitje API settings page
- Trigger aggregation for date ranges with existing data

### 3. Verify Data
Check that columns are populated:
```sql
SELECT 
  date, 
  environment_id,
  total_revenue,
  total_cash_revenue,
  total_card_revenue,
  total_vat_amount,
  cash_percentage
FROM eitje_revenue_days_aggregated
WHERE date >= '2024-11-01'
LIMIT 10;
```

## Compliance Status

✅ **No JSONB blobs**: Migration enforces no JSONB columns
✅ **RLS policies**: Already in place from original migration
✅ **Normalized columns**: All data extracted to proper column types

## Files Modified

1. ✅ `supabase/migrations/20251102150000_expand_eitje_revenue_aggregated.sql` - Migration
2. ✅ `src/lib/eitje/aggregation-service.ts` - Aggregation logic

## Why You Still Can't See Data

If you run the migration and re-aggregate but still can't see data, check:

1. **Is aggregation running?** Check logs at `/api/eitje/aggregate`
2. **Are there raw records?** Check `eitje_revenue_days_raw` has data
3. **Are dates matching?** Ensure date ranges in aggregation match your data
4. **Are columns populated?** Query the aggregated table directly to verify

## Quick Test Query

```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'eitje_revenue_days_aggregated'
ORDER BY ordinal_position;

-- Check if data is populated
SELECT 
  date,
  total_revenue,
  total_cash_revenue,
  total_card_revenue,
  total_vat_amount
FROM eitje_revenue_days_aggregated
WHERE total_revenue > 0
ORDER BY date DESC
LIMIT 5;
```

