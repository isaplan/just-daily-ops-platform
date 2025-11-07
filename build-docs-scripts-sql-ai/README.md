# Build Docs Scripts SQL

This folder contains organized files from the project root that were moved here for better organization.

## 📁 Structure

- **`docs/`** - Documentation files (.md) and documentation folders (dev-docs, .docs, .roadmap-context)
- **`scripts/`** - JavaScript utility scripts (.js) and setup scripts
- **`sql/`** - SQL database scripts (.sql)
- **`logs/`** - Log files, reports, backups (.log, .json reports, .backup, .restored files)

## 🧹 Organization Scripts

### Initial Cleanup (Basic Organization)
To organize .md, .js, and .sql files from root:

```bash
npm run cleanup:root
```

### Full Project Organization (Advanced)
To organize all non-app and non-AI compliance files:

```bash
npm run organize:project
```

This moves:
- Log files → `logs/`
- Report files → `logs/`
- Backup files → `logs/`
- Documentation folders → `docs/`
- Setup scripts → `scripts/`

## 📋 What Gets Moved

### Moved to `docs/`:
- All `.md` files from root (except `README.md`)
- Work logs, implementation notes, status reports

### Moved to `scripts/`:
- All `.js` files from root (except config files)
- Test scripts, check scripts, utility scripts

### Moved to `sql/`:
- All `.sql` files from root
- Database setup, migrations, fixes

## ⏭️ Files That Stay in Root

These files are **excluded** from cleanup (stay in root):
- `README.md` - Project readme
- `package.json`, `package-lock.json` - NPM config
- `next.config.ts`, `tsconfig.json` - Next.js/TypeScript config
- `postcss.config.js`, `eslint.config.mjs`, `tailwind.config.ts` - Build config
- `components.json`, `next-env.d.ts` - Framework files

## 📊 Statistics

Last organization:
- ✅ Moved to docs/: 3 folders (dev-docs, .docs, .roadmap-context)
- ✅ Moved to logs/: 10 files (reports, logs, backups, status files)
- ✅ Moved to scripts/: 1 file (setup-ai-compliance.js)
- ✅ Moved to sql/: 42 files (from previous cleanup)
- ⏭️ Skipped: 29 files/folders (core app and AI compliance files)

## 🔄 Re-running Cleanup

The cleanup script is safe to run multiple times:
- If a file already exists in the target folder, it will be renamed with a timestamp
- No files are deleted, only moved
- Config files are always skipped

## 📝 Notes

- Files are moved (not copied) to keep root clean
- Original folder structure is preserved
- Scripts can still be run from their new locations
- SQL files can be referenced from their new locations

