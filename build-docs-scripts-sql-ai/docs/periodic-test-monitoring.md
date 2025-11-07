# Periodic Test Monitoring

**Purpose:** Automatically test pre/post-execution checks every 2 hours for 48 hours to validate system effectiveness.

## Usage

### Start Monitoring
```bash
npm run compliance:test
```

Or directly:
```bash
node .ai-compliance-functions/periodic-test-monitor.js
```

## What It Does

1. **Runs Pre-Check:** Tests pre-execution validation every 2 hours
2. **Runs Post-Check:** Tests post-execution validation every 2 hours
3. **Records Results:** Saves all test results to `.ai-compliance-functions/test-results.json`
4. **Generates Report:** Final summary after 48 hours (24 tests)

## Test Schedule

- **Interval:** Every 2 hours
- **Duration:** 48 hours total
- **Total Tests:** 24 cycles
- **First Test:** Runs immediately on start
- **Subsequent Tests:** Every 2 hours thereafter

## Results File

**Location:** `.ai-compliance-functions/test-results.json`

**Format:**
```json
{
  "startTime": "2025-10-31T...",
  "testInterval": "2 hours",
  "totalDuration": "48 hours",
  "maxTests": 24,
  "tests": [
    {
      "testNumber": 1,
      "timestamp": "...",
      "preCheck": { "status": "PASS", "duration": 123 },
      "postCheck": { "status": "PASS", "duration": 456 },
      "overallStatus": "PASS"
    }
  ],
  "summary": {
    "totalTests": 24,
    "preCheckPassed": 20,
    "preCheckBlocked": 0,
    "postCheckViolations": 4
  }
}
```

## Stopping Early

Press `Ctrl+C` to stop monitoring early. A final report will be generated.

## Background Execution

To run in background:
```bash
# Using nohup
nohup npm run compliance:test > compliance-test.log 2>&1 &

# Or using screen
screen -S compliance-test
npm run compliance:test
# Press Ctrl+A then D to detach
```

## Monitoring Status

Check if monitoring is running:
```bash
ps aux | grep periodic-test-monitor
```

View latest results:
```bash
cat .ai-compliance-functions/test-results.json | jq '.summary'
```

## Next Test Time

The script shows when each test runs. Check the console output or the results file's `lastUpdate` field.

