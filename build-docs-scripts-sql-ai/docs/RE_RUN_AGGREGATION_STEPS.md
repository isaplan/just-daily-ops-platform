# Re-Run Aggregation to Populate New Columns

## ✅ Migration Complete
The database now has all 17 new columns in `eitje_revenue_days_aggregated`.

## 🔄 Next Step: Re-Run Aggregation

You need to re-run aggregation to populate the new columns with data from raw tables.

### Option 1: Via API (Recommended)

**For Revenue Days:**
```bash
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "revenue_days",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

**For Labor Hours:**
```bash
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "time_registration_shifts",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

### Option 2: Via Dashboard UI

1. Go to Eitje API Settings page
2. Find the aggregation/processing section
3. Select date ranges with existing raw data
4. Trigger aggregation for both endpoints

### Option 3: Check What Date Ranges Have Raw Data First

Run this SQL to see what dates have raw data:
```sql
-- Check revenue raw data date range
SELECT 
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  COUNT(*) as total_records
FROM eitje_revenue_days_raw;

-- Check labor hours raw data date range
SELECT 
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  COUNT(*) as total_records
FROM eitje_time_registration_shifts_raw;
```

Then use those dates in the aggregation API calls.

## ✅ Verify Data is Populated

After running aggregation, check if new columns are populated:

```sql
SELECT 
  date,
  environment_id,
  total_revenue,
  total_cash_revenue,
  total_card_revenue,
  total_vat_amount,
  cash_percentage,
  currency
FROM eitje_revenue_days_aggregated
WHERE total_revenue > 0
ORDER BY date DESC
LIMIT 10;
```

If you see non-zero values in `total_cash_revenue`, `total_card_revenue`, etc., the aggregation worked!

## 🔍 Check Where Data is Displayed

The aggregated data should be visible in:
- Daily Ops Dashboard (already using aggregated tables)
- Eitje data pages (if they exist)

If pages don't exist or are showing raw data, they need to be updated to query aggregated tables.

