# AI Compliance Checker Extension

VS Code/Cursor extension that automatically enforces compliance rules before saving files.

## Features

- **Automatic Pre-Save Checks**: Runs compliance checks before saving files
- **Post-Change Detection**: Detects violations after file changes
- **Status Bar Indicator**: Shows real-time compliance status
- **Output Channel**: Detailed violation reports and suggestions
- **Configurable**: Enable/disable checks via VS Code settings

## Installation

### Development Mode

1. Install dependencies:
   ```bash
   cd .vscode-extension
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

3. Press `F5` in VS Code/Cursor to launch extension development host

### Production Mode

1. Package extension:
   ```bash
   npm install -g vsce
   cd .vscode-extension
   vsce package
   ```

2. Install extension:
   - Open VS Code/Cursor
   - Go to Extensions
   - Click "..." menu → "Install from VSIX"
   - Select the generated `.vsix` file

## Configuration

Extension settings (in VS Code settings.json or UI):

```json
{
  "compliance.enabled": true,
  "compliance.strictMode": false,
  "compliance.checkOnSave": true,
  "compliance.checkOnChange": true
}
```

### Settings

- **`compliance.enabled`** (boolean, default: `true`): Enable/disable compliance checks
- **`compliance.strictMode`** (boolean, default: `false`): Block saves on warnings (not just violations)
- **`compliance.checkOnSave`** (boolean, default: `true`): Run pre-execution checks before saving
- **`compliance.checkOnChange`** (boolean, default: `true`): Run post-execution checks after changes

## Commands

- **`compliance.check`**: Manually run compliance check on active file
- **`compliance.enable`**: Enable compliance checks
- **`compliance.disable`**: Disable compliance checks
- **`compliance.showStatus`**: Show compliance status in output channel

## How It Works

1. **Pre-Save Hook**: When you save a file, the extension runs `pre-execution-check.js` before the save completes
   - If violations detected: Save is blocked, error notification shown
   - If warnings: Save allowed, warning notification shown
   - If pass: Save proceeds normally

2. **Post-Change Hook**: After file changes (debounced 500ms), runs `post-execution-check.js`
   - Violations shown in output channel
   - Status bar updated

3. **Status Bar**: Shows current compliance status:
   - ✅ Compliant
   - ⚠️ Warnings
   - ❌ Violations
   - ⏸️ Disabled

## Requirements

- VS Code or Cursor editor
- Node.js installed (for running compliance scripts)
- `.ai-compliance-functions/` directory in workspace root
- `pre-execution-check.js` and `post-execution-check.js` scripts

## Troubleshooting

### Extension Not Activating

- Ensure `.ai-compliance-functions/` directory exists in workspace root
- Check that `pre-execution-check.js` and `post-execution-check.js` are present
- View extension output: View → Output → Select "Compliance Checks"

### Scripts Not Found

- Verify workspace root contains `.ai-compliance-functions/` directory
- Check file paths are correct
- Ensure scripts are executable

### Checks Not Running

- Verify `compliance.enabled` is `true` in settings
- Check `compliance.checkOnSave` or `compliance.checkOnChange` are enabled
- View extension output for error messages

## Development

### Project Structure

```
.vscode-extension/
├── src/
│   ├── extension.ts          # Main entry point
│   ├── compliance-runner.ts  # Execute Node.js scripts
│   ├── compliance-hooks.ts   # File save/change hooks
│   └── compliance-ui.ts     # Status bar, output channel
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript config
└── README.md                # This file
```

### Building

```bash
npm run compile      # Compile once
npm run watch        # Watch mode for development
```

### Testing

1. Press `F5` to launch extension development host
2. Open a workspace with `.ai-compliance-functions/` directory
3. Make changes to a file and attempt to save
4. Verify compliance checks run and violations are detected

## License

Part of the just-daily-ops-platform project.

