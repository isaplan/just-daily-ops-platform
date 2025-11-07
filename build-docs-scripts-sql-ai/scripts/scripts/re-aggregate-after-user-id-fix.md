# Re-Aggregate After User ID Fix

Now that user_id is populated in the raw table, re-run aggregation to create per-worker per-day rows.

## Step 1: Re-Aggregate via API

```bash
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "time_registration_shifts",
    "startDate": "2025-10-01",
    "endDate": "2025-10-31"
  }'
```

## Step 2: Verify Aggregated Data

```sql
SELECT 
  date,
  user_id,
  environment_id,
  total_hours_worked,
  total_wage_cost,
  shift_count
FROM eitje_labor_hours_aggregated
WHERE date >= '2025-10-01'
  AND user_id IS NOT NULL
ORDER BY date DESC, user_id
LIMIT 20;
```

You should now see:
- ✅ user_id populated (not null)
- ✅ One row per worker per day
- ✅ Aggregated hours and costs per worker

## Step 3: View in Frontend

Go to `/view-data/eitje-data/hours` and you should see individual worker rows with their daily totals!

