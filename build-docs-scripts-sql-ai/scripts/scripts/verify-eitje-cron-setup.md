# Verify Eitje Cron Job Setup

## Problem
No syncs found since 11:20 today - the cron job may not be scheduled.

## Check 1: Is the cron job scheduled?

Run this SQL in Supabase SQL Editor:

```sql
-- Check if cron job exists
SELECT 
  jobid,
  schedule,
  jobname,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%eitje-incremental%';
```

**Expected result**: Should show 1 row with `jobname = 'eitje-incremental-sync-hourly'` and `active = true`

**If no rows found**: The cron job is not scheduled. Run the migration:
```sql
-- Run this migration SQL in Supabase SQL Editor
-- (See supabase/migrations/20250131000003_create_eitje_incremental_cron_job.sql)
```

## Check 2: Is the edge function deployed?

In Supabase Dashboard:
1. Go to **Edge Functions** → **eitje-incremental-sync**
2. Check if it exists and is deployed
3. If not, deploy it:
   ```bash
   npx supabase functions deploy eitje-incremental-sync
   ```

## Check 3: Is the config set to incremental mode?

Run this SQL:

```sql
SELECT mode, incremental_interval_minutes, enabled_endpoints
FROM eitje_sync_config
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected result**: `mode` should be `'incremental'`

**If mode is 'manual'**: 
- Go to `/finance/eitje-api` → Cronjob tab
- Switch mode to "Incremental" 
- Save

## Check 4: Are there any errors in edge function logs?

In Supabase Dashboard:
1. Go to **Edge Functions** → **eitje-incremental-sync** → **Logs**
2. Check for errors in the last 24 hours
3. Look for:
   - Missing credentials errors
   - Config not found errors
   - API connection errors

## Check 5: Test the edge function manually

```bash
curl -X POST https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-incremental-sync \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected result**: Should return JSON with `success: true` and sync results

## Quick Fix Summary

If cron job is missing:
1. Run the migration SQL (create `eitje-incremental-sync-hourly` cron job)
2. Verify it's active: `SELECT * FROM cron.job WHERE jobname = 'eitje-incremental-sync-hourly';`
3. Wait for next hour to see if it runs
4. Or manually trigger: `SELECT * FROM public.trigger_eitje_incremental_sync();`

