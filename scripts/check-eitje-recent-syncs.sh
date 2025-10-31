#!/bin/bash

# Check Eitje sync activity since 11:20 today
# Uses the sync-history API endpoint

echo "🔍 Checking Eitje sync activity since 11:20 today..."
echo ""

# Get today's date and time
CHECK_TIME="$(date -u -v11H -v20M -v0S '+%Y-%m-%dT%H:%M:%S')" 2>/dev/null || \
CHECK_TIME="$(date -u -d 'today 11:20:00' '+%Y-%m-%dT%H:%M:%S')" 2>/dev/null || \
CHECK_TIME="$(date -u '+%Y-%m-%d')T11:20:00"

echo "⏰ Check time threshold: ${CHECK_TIME}Z"
echo "⏰ Current time: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo ""

echo "=== Checking via API endpoint ==="
echo "Visit: http://localhost:3000/api/cron/sync-history?provider=eitje&limit=20"
echo ""
echo "Or run this in your browser console:"
echo ""
cat << 'EOF'
fetch('/api/cron/sync-history?provider=eitje&limit=20')
  .then(r => r.json())
  .then(data => {
    const today = new Date();
    today.setHours(11, 20, 0, 0);
    const checkTime = today.toISOString();
    
    const recent = data.syncs?.filter(s => 
      s.started_at >= checkTime
    ) || [];
    
    console.log(`Found ${recent.length} syncs since 11:20 today:`);
    recent.forEach(s => {
      console.log(`  ${s.started_at} | ${s.status} | Records: ${s.records_inserted || 'N/A'}`);
    });
    
    return { recent, total: data.syncs?.length || 0 };
  })
  .then(console.log);
EOF

echo ""
echo "=== Or check raw data tables directly ==="
echo "Run this SQL in Supabase SQL Editor:"
echo ""
cat << 'EOF'
-- Check sync logs since 11:20 today
SELECT 
  started_at,
  status,
  provider,
  records_inserted,
  error_message
FROM api_sync_logs
WHERE started_at >= (CURRENT_DATE + INTERVAL '11 hours 20 minutes')
  AND (provider = 'eitje' OR sync_type LIKE '%eitje%' OR sync_type LIKE '%time_registration%' OR sync_type LIKE '%revenue%')
ORDER BY started_at DESC
LIMIT 20;

-- Check raw data inserts since 11:20 today
SELECT 
  'time_registration_shifts' as table_name,
  COUNT(*) as new_records,
  MAX(created_at) as latest_record
FROM eitje_time_registration_shifts_raw
WHERE created_at >= (CURRENT_DATE + INTERVAL '11 hours 20 minutes')

UNION ALL

SELECT 
  'revenue_days' as table_name,
  COUNT(*) as new_records,
  MAX(created_at) as latest_record
FROM eitje_revenue_days_raw
WHERE created_at >= (CURRENT_DATE + INTERVAL '11 hours 20 minutes');
EOF

echo ""
echo ""

