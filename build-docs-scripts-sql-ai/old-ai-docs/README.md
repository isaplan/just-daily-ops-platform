# Old AI Documentation & Rules Archive

This folder contains old, replaced, or unused AI compliance system files and documentation.

## 📋 What's Here

### Replaced Files:
- **`ai-operating-constraints.md`** - Old constraints document (replaced by rules embedded in `ai-compliance-unified.js`)
- **`auto-compliance.js`** - Old compliance system (replaced by `ai-compliance-unified.js`)
- **`ai-compliance-installer.js`** - Old installer script (no longer needed)

### Archive Files:
- **`ai-tracking-system.json`** - Old tracking system file (replaced by unified system)
- **`.ai-rules-docs-nested/`** - Duplicate nested folder with old documentation

## ✅ Current Active System

The current active system is:
- **`.ai-compliance-functions/ai-compliance-unified.js`** - Single unified file with rules + implementation
- All rules are now embedded in the unified file (lines 1-200)
- Use `npm run compliance:auto` to start the system

## 📝 Why Moved?

These files were moved here because:
1. They reference old commands that no longer exist (`compliance:check`, old file paths)
2. They contain outdated "HARD BLOCK" rules replaced by "WARN + ask permission"
3. They reference deleted scripts (`ai-compliance-checker.js`, `ai-compliance-monitor.js`, etc.)
4. The unified system consolidates everything into one file

## 🔄 Migration Notes

If you need to reference old rules:
- Old constraints: `old-ai-docs/ai-operating-constraints.md`
- Old system: `old-ai-docs/auto-compliance.js`
- Current system: `.ai-compliance-functions/ai-compliance-unified.js`

**DO NOT** use files from this folder in production - they are archived for reference only.

