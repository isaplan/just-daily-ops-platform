# Trigger Aggregation to See All Data

## ✅ Migration Complete
The database now has all 17 new columns, but they're empty until aggregation runs.

## 🔄 Next Step: Re-Run Aggregation

### Option 1: Via API (Quick Test)
```bash
# For Revenue Days (all new columns)
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "revenue_days",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'

# For Labor Hours
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "time_registration_shifts",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

### Option 2: Via Eitje Settings Page
1. Go to `/finance/eitje-api`
2. Find the aggregation section
3. Click "Aggregate" for `revenue_days` and `time_registration_shifts`
4. Select date range (e.g., last 3 months)

### Option 3: Restart Server (if aggregation runs automatically)
If you have auto-aggregation on sync, just restart the server and it might trigger.

## ✅ Verify Data After Aggregation

After running aggregation, check the API response:

```bash
# Check if new columns have data
curl "http://localhost:3000/api/raw-data?table=eitje_revenue_days_aggregated&limit=1" | jq '.data[0]'
```

You should see:
- `total_cash_revenue`
- `total_card_revenue`  
- `total_digital_revenue`
- `total_vat_amount`
- `cash_percentage`
- etc.

## 📊 Where to View the Data

The data is available via:
- `/api/raw-data?table=eitje_revenue_days_aggregated` - Returns all columns
- `/api/raw-data?table=eitje_labor_hours_aggregated` - Returns all columns

The Daily Ops dashboard (`/finance/daily-ops`) currently only displays basic fields, but the full data is available in the API response.

