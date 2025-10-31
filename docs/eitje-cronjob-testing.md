# Eitje Cron Job Testing - Feature Branch

## Current Status

Created feature branch: `feature/test-eitje-cronjob`

## Issues Found

1. **Missing Sync Configuration**: The `eitje_sync_config` table exists but has no rows. This causes the cron job to fail because the edge function requires a config.

2. **Edge Function Not Deployed**: The `eitje-incremental-sync` edge function returns 404, suggesting it may not be deployed.

3. **Cron Job Status**: Cannot verify if the cron job is actually scheduled in the database (requires direct DB access).

## Fixes Implemented

### 1. Enhanced Edge Function Error Handling
- Updated `supabase/functions/eitje-incremental-sync/index.ts` to:
  - Better handle missing config
  - Attempt to create default config if missing
  - Provide clearer error messages

### 2. Testing Scripts
- Created `scripts/test-eitje-cronjob.js` with commands:
  - `status` - Check cron job status and config
  - `check-config` - View sync configuration
  - `init-config` - Create default config (has schema cache issues)
  - `test` - Manually trigger edge function
  - `enable` / `disable` - Toggle cron job

- Created `scripts/init-eitje-config.js` - Initialize config via API

### 3. Fixed Sync History API
- Updated `src/app/api/cron/sync-history/route.ts` to query both:
  - `api_sync_logs` (unified table for Eitje)
  - `bork_api_sync_logs` (legacy table for Bork)

## Next Steps

### 1. Initialize Config
The easiest way is via the UI:
1. Go to `/finance/eitje-api` → Cronjob tab
2. The UI should initialize a default config if missing
3. Set mode to "Incremental" and save

OR via SQL (requires Supabase Dashboard access):
```sql
INSERT INTO eitje_sync_config (mode, incremental_interval_minutes, worker_interval_minutes, enabled_endpoints)
VALUES ('manual', 60, 5, ARRAY['time_registration_shifts', 'planning_shifts', 'revenue_days'])
ON CONFLICT DO NOTHING;
```

### 2. Deploy Edge Function
```bash
npx supabase functions deploy eitje-incremental-sync
```

### 3. Verify Cron Job is Scheduled
In Supabase Dashboard:
1. Go to Database → Cron Jobs
2. Look for `eitje-incremental-sync-hourly`
3. Verify it's active and scheduled for `0 * * * *` (every hour)

### 4. Test the Cron Job
```bash
# Test edge function manually
node scripts/test-eitje-cronjob.js test

# Check config
node scripts/test-eitje-cronjob.js check-config

# Enable cron job
node scripts/test-eitje-cronjob.js enable
```

## Configuration Schema

The `eitje_sync_config` table should have:
- `mode`: `'manual'` | `'backfill'` | `'incremental'` (must be `'incremental'` for cron to run)
- `incremental_interval_minutes`: 5, 10, 15, 30, or 60
- `worker_interval_minutes`: 1, 5, 10, 15, 30, or 60
- `quiet_hours_start`: TIME (default '02:00:00')
- `quiet_hours_end`: TIME (default '06:00:00')
- `enabled_endpoints`: TEXT[] (default: ['time_registration_shifts', 'planning_shifts', 'revenue_days'])

## Cron Job Behavior

The cron job (`eitje-incremental-sync-hourly`) will:
1. Check if `mode === 'incremental'` - skip if not
2. Check quiet hours - skip if within quiet hours
3. Calculate yesterday's date
4. Sync each enabled endpoint for yesterday's date
5. Automatically trigger aggregation after successful sync

## Troubleshooting

### Cron Job Not Running
1. Check config exists: `node scripts/test-eitje-cronjob.js check-config`
2. Verify mode is 'incremental'
3. Check cron job is scheduled in Supabase Dashboard
4. Check edge function is deployed
5. Review edge function logs in Supabase Dashboard → Edge Functions → Logs

### No Sync History
- The history API now queries both `api_sync_logs` and legacy tables
- Check both tables if history seems incomplete

### Config Not Found
- Use UI to initialize: `/finance/eitje-api` → Cronjob tab
- Or use SQL directly in Supabase Dashboard

