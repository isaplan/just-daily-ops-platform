# Organization Scripts

This folder contains utility scripts for organizing project files.

## Scripts

### `cleanup-root.js`
**Purpose:** Organizes .md, .js, and .sql files from root into `build-docs-scripts-sql-ai/`

**Usage:**
```bash
npm run cleanup:root
```

**What it does:**
- Moves `.md` files → `docs/`
- Moves `.js` files → `scripts/` (excluding config files)
- Moves `.sql` files → `sql/`
- Preserves config files in root (package.json, tsconfig.json, etc.)

### `organize-project.js`
**Purpose:** Advanced organization of non-app and non-AI compliance files

**Usage:**
```bash
npm run organize:project
```

**What it does:**
- Moves log files → `logs/`
- Moves report files → `logs/`
- Moves backup files → `logs/`
- Moves documentation folders → `docs/`
- Preserves core app and AI compliance files

## Automation

### Git Pre-commit Hook
The cleanup script runs automatically before each commit via `.git/hooks/pre-commit`.

**What happens:**
1. Checks for unorganized files in root
2. If found, runs cleanup automatically
3. Stages the organized files
4. Allows commit to proceed (non-blocking)

**To skip:** `git commit --no-verify`

## Files Preserved in Root

These files/folders are **never moved**:
- `src/`, `public/`, `supabase/` - Core app
- `package.json`, config files - Essential configs
- `function-registry.json` - AI compliance
- `.ai-compliance-functions/` - AI compliance system
- `README.md` - Project readme


