# Quick Start: Action Interceptor

## 🚀 Start Automated Compliance Enforcement

### Step 1: Start the Interceptor

```bash
npm run compliance:intercept
```

This starts monitoring your `src/` directory for code changes.

### Step 2: Make a Code Change

When you or AI modifies any file in `src/`, the interceptor will:
- ✅ Detect the change
- ✅ Run post-execution check automatically
- ✅ Display violations in the terminal (warnings only, non-blocking)

### Step 3: Review Results

Violations are shown immediately in the terminal. Fix them or approve as needed.

## 📋 What It Does

1. **Monitors** `src/` directory for file changes
2. **Runs checks** automatically after modifications
3. **Shows violations** in real-time (warnings only)
4. **Never blocks** - warnings only, you decide

## 🛑 Stop the Interceptor

```bash
npm run compliance:intercept:stop
```

Or press `Ctrl+C` in the terminal.

## ✅ Check Status

```bash
npm run compliance:intercept:status
```

## 💡 Tips

- **Start it once** at the beginning of your session
- **Keep it running** in a separate terminal
- **Review violations** as they appear
- **Git push** will also run checks automatically

---

**That's it!** The interceptor now automatically enforces compliance checks on every code change.

