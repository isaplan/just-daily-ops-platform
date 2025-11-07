# Action Interceptor - Automated Compliance Enforcement

## Overview

The Action Interceptor automatically monitors code changes and enforces compliance checks **before and after** any code modifications. This ensures that AI follows the compliance rules every time you make a request.

## How It Works

### 1. **File Watcher** (Real-time Monitoring)
- Monitors `src/` directory for file changes
- Detects when files are modified, added, or deleted
- Automatically runs post-execution checks after changes
- **Warnings only** - Never blocks your workflow

### 2. **Manual Checks** (On-Demand)
- Run pre-checks before starting work
- Run post-checks after completing work
- Check status anytime

## Setup

### 1. Install Dependencies

```bash
npm install
```

This installs `chokidar` for file watching.

### 2. Start the Interceptor

```bash
npm run compliance:intercept
```

This starts monitoring in the background. The interceptor will:
- Watch for file changes in `src/`
- Automatically run post-execution checks
- Display violations in real-time (warnings only, non-blocking)

### 3. Stop the Interceptor

```bash
npm run compliance:intercept:stop
```

Or press `Ctrl+C` in the terminal where it's running.

## Usage

### Automatic Enforcement

Once started, the interceptor automatically:

1. **Detects file changes** when you or AI modify code
2. **Runs post-execution checks** immediately after changes
3. **Displays violations** in the terminal (warnings only)
4. **Warns about issues** but never blocks your workflow

### Manual Pre-Check

Before starting work, run a pre-check:

```bash
npm run compliance:pre "task description" [file1] [file2]
```

Example:
```bash
npm run compliance:pre "Add user authentication" src/app/auth/page.tsx
```

### Manual Post-Check

After completing work, run a post-check:

```bash
npm run compliance:post [file1] [file2]
```

Example:
```bash
npm run compliance:post src/app/auth/page.tsx src/components/auth-form.tsx
```

### Check Status

```bash
npm run compliance:intercept:status
```

## Workflow

### Recommended Workflow

1. **Start interceptor** at beginning of session:
   ```bash
   npm run compliance:intercept
   ```

2. **Make your request** to AI

3. **AI should run pre-check** (but interceptor will catch if skipped)

4. **AI makes code changes**

5. **Interceptor automatically runs post-check** and displays results

6. **Review violations** if any

7. **Fix or approve** as needed

### For AI

When AI makes code changes:

1. **Before modification**: AI should run pre-check
   ```bash
   npm run compliance:pre "task description"
   ```

2. **After modification**: Interceptor automatically runs post-check
   - Results displayed in terminal
   - Violations shown immediately

## What Gets Checked

### Pre-Execution Checks
- ✅ Existing code that can accomplish the task
- ✅ Registry protection (completed functions)
- ✅ Planned changes vs limits (50/150 lines)

### Post-Execution Checks
- ✅ Actual lines changed (warns if >50 per file)
- ✅ Registry violations (completed functions modified)
- ✅ Code preservation (no deletions)
- ✅ Full file replacements detected

## Troubleshooting

### Interceptor Not Running

Check if it's actually running:
```bash
npm run compliance:intercept:status
```

If not running, start it:
```bash
npm run compliance:intercept
```

### Checks Not Running

Make sure:
1. Interceptor is running (`npm run compliance:intercept:status`)
2. Files are in `src/` directory
3. Files have `.ts`, `.tsx`, `.js`, or `.jsx` extensions

### Too Many Notifications

The interceptor has a 2-second debounce to prevent duplicate checks. If you're seeing too many notifications, files might be changing rapidly (e.g., during build).

## Integration with Cursor

The interceptor works alongside Cursor's AI:

1. **You make a request** in Cursor
2. **AI starts working** (should run pre-check)
3. **AI modifies files** → Interceptor detects changes
4. **Interceptor runs post-check** → Shows results
5. **You see violations** immediately

## Benefits

✅ **Automatic**: No need to remember to run checks  
✅ **Real-time**: Violations shown immediately  
✅ **Non-blocking**: Warnings only, never stops your workflow  
✅ **Comprehensive**: Checks all modified files  
✅ **Warnings Only**: Informs you but lets you decide  

## Next Steps

1. Start the interceptor: `npm run compliance:intercept`
2. Make a code change to test it
3. See compliance checks run automatically
4. Review violations if any

---

**Note**: The interceptor is a monitoring tool. It doesn't block actions, but it does warn you about violations so you can fix them before they become problems.

