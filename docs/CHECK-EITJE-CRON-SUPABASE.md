# Supabase Checklist: Eitje Cron Job Verification

## Why Check This?
The cron job is configured as **active** (`cronStatus.eitje: true`) but shows **no sync history** (`history: []`). This means the configuration exists but the cron job might not actually be running.

## ✅ Checklist

### 1. Verify `pg_cron` Extension is Enabled
**Location**: Supabase Dashboard → Database → Extensions

**Action**: 
- Look for `pg_cron` extension
- Status should be **ENABLED**
- If not enabled, enable it (click the toggle)

**SQL Query** (if needed):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

### 2. Check if Cron Job is Actually Scheduled
**Location**: Supabase Dashboard → Database → Cron Jobs

**What to Look For**:
- A job named `eitje-incremental-sync-hourly` or similar
- Status should be **ACTIVE** or **ENABLED**
- Schedule should show something like `0 * * * *` (every hour)

**Alternative: SQL Query**:
```sql
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE '%eitje%'
ORDER BY jobid DESC;
```

**Expected Result**: Should return at least 1 row with `active = true`

---

### 3. Check Edge Function is Deployed
**Location**: Supabase Dashboard → Edge Functions

**What to Look For**:
- Function name: `eitje-incremental-sync`
- Status: **DEPLOYED**
- Verify it exists and has recent deployment date

**If Not Deployed**: Run:
```bash
npx supabase functions deploy eitje-incremental-sync
```

---

### 4. Check Edge Function Logs for Errors
**Location**: Supabase Dashboard → Edge Functions → `eitje-incremental-sync` → Logs

**What to Look For**:
- Recent invocations (should see hourly logs if cron is running)
- Error messages or stack traces
- HTTP status codes (should be 200 for success)

**Common Errors**:
- `404 Not Found` → Edge function not deployed
- `500 Internal Server Error` → Check function code
- `Permission denied` → RLS or service role key issue
- `relation "eitje_sync_config" does not exist` → Migration not applied

---

### 5. Verify `eitje_sync_state` Table Exists
**Location**: Supabase Dashboard → Database → Tables

**What to Look For**:
- Table name: `eitje_sync_state`
- Should have columns: `endpoint`, `last_synced_date`, `last_successful_sync_at`

**SQL Query**:
```sql
SELECT * FROM eitje_sync_state ORDER BY updated_at DESC LIMIT 10;
```

**Expected Result**: 
- If cron has run, you should see rows with recent `last_successful_sync_at` dates
- If empty, cron hasn't run yet or failed silently

---

### 6. Check `eitje_sync_config` Table
**Location**: Supabase Dashboard → Database → Tables

**SQL Query**:
```sql
SELECT * FROM eitje_sync_config LIMIT 1;
```

**Expected Result**: 
- Should return 1 row
- `mode` should be `'incremental'` (not `'manual'`)
- `enabled_endpoints` should be an array with endpoints

**If Empty**: Create config via UI or SQL:
```sql
INSERT INTO eitje_sync_config (mode, incremental_interval_minutes, worker_interval_minutes, enabled_endpoints)
VALUES ('incremental', 60, 5, ARRAY['time_registration_shifts', 'planning_shifts', 'revenue_days'])
ON CONFLICT DO NOTHING;
```

---

### 7. Check `api_sync_logs` for Recent Syncs
**Location**: Supabase Dashboard → Database → SQL Editor

**SQL Query**:
```sql
SELECT 
  started_at,
  status,
  sync_type,
  error_message
FROM api_sync_logs
WHERE started_at >= NOW() - INTERVAL '24 hours'
  AND (sync_type LIKE '%eitje%' OR sync_type LIKE '%time_registration%' OR sync_type LIKE '%revenue%')
ORDER BY started_at DESC
LIMIT 10;
```

**Expected Result**: 
- Should show recent sync attempts in last 24 hours
- `status` should be `'completed'` for successful syncs
- If empty → cron isn't running or failing silently

---

## 🔧 Quick Fixes

### If Cron Job Not Scheduled:
Run this SQL in Supabase SQL Editor:
```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not, enable it
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_eitje_incremental_sync()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/eitje-incremental-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule the cron job (runs every hour at minute 0)
SELECT cron.schedule(
  'eitje-incremental-sync-hourly',
  '0 * * * *', -- Every hour
  $$SELECT trigger_eitje_incremental_sync()$$
);
```

### If Edge Function Not Deployed:
```bash
cd /path/to/your/project
npx supabase functions deploy eitje-incremental-sync
```

---

## 📊 Summary

After checking all items, you should know:
1. ✅ Is `pg_cron` enabled?
2. ✅ Is the cron job scheduled and active?
3. ✅ Is the edge function deployed?
4. ✅ Are there errors in the edge function logs?
5. ✅ Has the cron job actually been invoked? (check logs and sync_state table)
6. ✅ Is the config table properly set up?

If all are ✅ but still no data, the issue is likely in the edge function logic itself.

