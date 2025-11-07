# Plan: Eitje Incremental Sync (Hour-by-Hour Instead of Yesterday)

## Current Behavior
- Cron runs hourly at :00
- Always syncs **yesterday's full date** (e.g., if today is Oct 31, syncs all of Oct 30)
- Data is always 24+ hours old
- No tracking of what's already been synced

## Desired Behavior
- Cron runs hourly at :00
- Syncs **data since the last successful sync**
- Data is always ~1 hour old (or less)
- Tracks last sync timestamp per endpoint
- Handles gaps (if cron fails, next run catches up)

## Implementation Plan

### Phase 1: Track Last Sync Timestamps

**New Table: `eitje_sync_state`**
```sql
CREATE TABLE eitje_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL, -- 'time_registration_shifts', 'revenue_days', etc.
  last_successful_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_date DATE, -- Last date fully synced
  records_synced INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);
```

**Purpose:**
- Store when each endpoint was last successfully synced
- Track the last date that was fully synced
- Store error info if sync fails

### Phase 2: Update Edge Function Logic

**Current Logic:**
```typescript
// Always syncs yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().split('T')[0];
```

**New Logic:**
```typescript
// 1. Get last successful sync timestamp from eitje_sync_state
const { data: syncState } = await supabase
  .from('eitje_sync_state')
  .select('*')
  .eq('endpoint', endpoint)
  .single();

// 2. Calculate date range
let startDate, endDate;
if (syncState?.last_synced_date) {
  // Start from day AFTER last synced date
  startDate = new Date(syncState.last_synced_date);
  startDate.setDate(startDate.getDate() + 1);
  startDate = startDate.toISOString().split('T')[0];
} else {
  // First run: sync yesterday to start
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  startDate = yesterday.toISOString().split('T')[0];
}

// End date: yesterday (to avoid partial data from today)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
endDate = yesterday.toISOString().split('T')[0];

// 3. Sync date range (could be 1 day or multiple days if cron failed)
// 4. Update sync_state after successful sync
```

### Phase 3: Sync Date Range Logic

**New Function: `syncEitjeEndpointIncremental`**
- Takes: endpoint, startDate, endDate
- Syncs each day in the range
- Updates sync_state after each successful day
- Handles partial failures (sync day 1, fail on day 2, next cron continues from day 2)

**Date Range Calculation:**
```typescript
function calculateSyncRange(syncState) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (!syncState || !syncState.last_synced_date) {
    // First run: sync yesterday only
    return { startDate: yesterdayStr, endDate: yesterdayStr };
  }
  
  const lastSynced = new Date(syncState.last_synced_date);
  const nextDay = new Date(lastSynced);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  
  // Sync from day after last synced to yesterday
  return { 
    startDate: nextDayStr, 
    endDate: yesterdayStr,
    isIncremental: true 
  };
}
```

### Phase 4: Update Sync State After Success

**After successful sync of each day:**
```typescript
await supabase
  .from('eitje_sync_state')
  .upsert({
    endpoint: endpoint,
    last_successful_sync_at: new Date().toISOString(),
    last_synced_date: syncedDate, // The date we just synced
    records_synced: insertedCount,
    last_error: null,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'endpoint'
  });
```

### Phase 5: Handle Edge Cases

**1. First Run (No sync_state exists):**
- Default to syncing yesterday
- Create initial sync_state entry

**2. Cron Failed Previously:**
- Next run will sync from last_synced_date + 1 to yesterday
- Automatically catches up on missed days

**3. Multiple Days to Sync:**
- If cron was down for 3 days, sync all 3 days in one run
- Process days sequentially
- Update sync_state after each successful day

**4. Partial Failures:**
- If day 1 syncs but day 2 fails, day 1 state is saved
- Next cron continues from day 2

**5. Today's Data:**
- Never sync today (current date)
- Always end at yesterday to avoid partial/incomplete data

### Phase 6: Migration Strategy

**Option A: Clean Slate (Recommended)**
- Create new `eitje_sync_state` table
- First cron run will detect no state and sync yesterday
- Subsequent runs are incremental

**Option B: Initialize from Existing Data**
- Query raw tables to find latest dates per endpoint
- Initialize `eitje_sync_state` with those dates
- Next cron continues from there

### Phase 7: Testing Plan

1. **First Run Test:**
   - Delete sync_state
   - Trigger cron manually
   - Verify it syncs yesterday
   - Verify sync_state created

2. **Incremental Test:**
   - Wait 1 hour
   - Trigger cron manually
   - Verify it syncs only new day (yesterday if first run was 2 days ago)
   - Verify sync_state updated

3. **Catch-up Test:**
   - Manually set last_synced_date to 3 days ago
   - Trigger cron
   - Verify it syncs all 3 missing days
   - Verify sync_state updated to yesterday

4. **Failure Recovery Test:**
   - Trigger partial sync (fail mid-way)
   - Trigger cron again
   - Verify it continues from where it stopped

## Database Schema Changes

```sql
-- New table for tracking sync state
CREATE TABLE IF NOT EXISTS eitje_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  last_successful_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_date DATE NOT NULL, -- Last date fully synced
  records_synced INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_eitje_sync_state_endpoint 
ON eitje_sync_state(endpoint);

-- RLS policies
ALTER TABLE eitje_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sync state"
ON eitje_sync_state FOR ALL
USING (auth.role() = 'service_role');
```

## Edge Function Changes

**File: `supabase/functions/eitje-incremental-sync/index.ts`**

**Key Changes:**
1. Add `getSyncState(endpoint)` function
2. Add `calculateSyncRange(syncState)` function  
3. Add `updateSyncState(endpoint, date, records)` function
4. Replace fixed "yesterday" logic with dynamic range calculation
5. Process date range (loop through days if multiple)
6. Update sync_state after each successful day sync

## Benefits

✅ **Always Fresh Data**: Data is only 1-24 hours old (not 24+ hours)  
✅ **Automatic Catch-up**: Missed cron runs are automatically synced next time  
✅ **Efficient**: Only syncs new data, not repeated full-day syncs  
✅ **Resilient**: Handles failures gracefully, continues where it left off  
✅ **Trackable**: Clear visibility into what's been synced and when

## Risks & Considerations

⚠️ **First Run**: First cron after deployment will sync yesterday only (one-time delay)  
⚠️ **Date Ranges**: Eitje API may have limits on date range queries (need to batch)  
⚠️ **Clock Sync**: Ensure server timezone matches data timezone  
⚠️ **Partial Days**: Never sync today (incomplete data)

## Rollback Plan

If issues occur:
1. Revert edge function to "yesterday" logic
2. Keep sync_state table for future use
3. No data loss, just falls back to old behavior

## Success Criteria

- [ ] Sync state table created
- [ ] Edge function uses incremental logic
- [ ] First run syncs yesterday successfully
- [ ] Second run syncs only new day (incremental)
- [ ] Catch-up works (multiple missed days)
- [ ] Sync state updates correctly after each run
- [ ] No duplicate data in raw tables
- [ ] Data is 1-24 hours old (not 24+ hours)

