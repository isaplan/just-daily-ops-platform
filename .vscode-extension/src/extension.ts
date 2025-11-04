import * as vscode from 'vscode';
import { ComplianceRunner } from './compliance-runner';
import { ComplianceUI } from './compliance-ui';
import { ComplianceHooks } from './compliance-hooks';

let runner: ComplianceRunner;
let ui: ComplianceUI;
let hooks: ComplianceHooks;

export function activate(context: vscode.ExtensionContext) {
  console.log('Compliance Checker extension is now active');

  // Initialize components
  runner = new ComplianceRunner();
  ui = new ComplianceUI();
  hooks = new ComplianceHooks(runner, ui);

  // Register file save hook (pre-execution check)
  const preSaveDisposable = hooks.registerPreSaveHook();
  context.subscriptions.push(preSaveDisposable);

  // Register file change hook (post-execution check)
  const postChangeDisposable = hooks.registerPostChangeHook();
  context.subscriptions.push(postChangeDisposable);

  // Register commands
  const checkCommand = vscode.commands.registerCommand('compliance.check', async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showInformationMessage('No active file to check');
      return;
    }

    const document = activeEditor.document;
    const relativePath = vscode.workspace.asRelativePath(document.uri);
    const taskDescription = `Manual compliance check for: ${relativePath}`;

    ui.updateStatusBar('checking');
    ui.clearOutputChannel();

    try {
      const result = await runner.runPreExecutionCheck(taskDescription, [relativePath]);
      ui.showResult(result, 'pre');
      ui.showNotification(result, false);

      if (result.status === 'PASS') {
        ui.updateStatusBar('compliant');
      } else if (result.status === 'WARN') {
        ui.updateStatusBar('warnings');
      } else {
        ui.updateStatusBar('violations');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Compliance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      ui.updateStatusBar('violations');
    }
  });

  const enableCommand = vscode.commands.registerCommand('compliance.enable', () => {
    const config = vscode.workspace.getConfiguration('compliance');
    config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage('Compliance checks enabled');
    ui.updateStatusBar('compliant');
  });

  const disableCommand = vscode.commands.registerCommand('compliance.disable', () => {
    const config = vscode.workspace.getConfiguration('compliance');
    config.update('enabled', false, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage('Compliance checks disabled');
    ui.updateStatusBar('disabled');
  });

  const showStatusCommand = vscode.commands.registerCommand('compliance.showStatus', () => {
    ui.showOutputChannel();
  });

  context.subscriptions.push(
    checkCommand,
    enableCommand,
    disableCommand,
    showStatusCommand
  );

  // Check if extension is enabled
  const config = vscode.workspace.getConfiguration('compliance');
  const enabled = config.get<boolean>('enabled', true);
  
  if (!enabled) {
    ui.updateStatusBar('disabled');
  } else {
    ui.updateStatusBar('compliant');
  }

  // Show initial status
  vscode.window.showInformationMessage('Compliance Checker extension activated');
}

export function deactivate() {
  if (hooks) {
    hooks.dispose();
  }
  if (ui) {
    ui.dispose();
  }
}

