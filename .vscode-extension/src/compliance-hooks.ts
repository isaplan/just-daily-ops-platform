import * as vscode from 'vscode';
import { ComplianceRunner, ComplianceCheckResult } from './compliance-runner';
import { ComplianceUI } from './compliance-ui';

export class ComplianceHooks {
  private runner: ComplianceRunner;
  private ui: ComplianceUI;
  private changeDebounceTimer: NodeJS.Timeout | undefined;
  private readonly debounceDelay = 500; // 500ms debounce
  private enabled: boolean = true;
  private checkOnSave: boolean = true;
  private checkOnChange: boolean = true;
  private strictMode: boolean = false;

  constructor(runner: ComplianceRunner, ui: ComplianceUI) {
    this.runner = runner;
    this.ui = ui;
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('compliance');
    this.enabled = config.get<boolean>('enabled', true);
    this.checkOnSave = config.get<boolean>('checkOnSave', true);
    this.checkOnChange = config.get<boolean>('checkOnChange', true);
    this.strictMode = config.get<boolean>('strictMode', false);

    // Update UI based on enabled state
    if (!this.enabled) {
      this.ui.updateStatusBar('disabled');
    }

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('compliance')) {
        this.loadConfiguration();
      }
    });
  }

  private shouldCheckFile(document: vscode.TextDocument): boolean {
    if (!this.enabled) {
      return false;
    }

    // Only check code files
    const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    const fileName = document.fileName;
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    
    return fileExtensions.includes(ext);
  }

  registerPreSaveHook(): vscode.Disposable {
    return vscode.workspace.onWillSaveTextDocument(async (event) => {
      if (!this.checkOnSave || !this.shouldCheckFile(event.document)) {
        return;
      }

      const document = event.document;
      const filePath = document.uri.fsPath;
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      
      if (!workspaceFolder) {
        return;
      }

      // Get relative path from workspace root
      const relativePath = vscode.workspace.asRelativePath(document.uri);

      // Generate task description from document changes
      const taskDescription = `Save file: ${relativePath}`;

      this.ui.updateStatusBar('checking');
      
      try {
        const result = await this.runner.runPreExecutionCheck(taskDescription, [relativePath]);
        
        this.ui.showResult(result, 'pre');

        // Update status bar based on result
        if (result.status === 'BLOCK' || (this.strictMode && result.status === 'WARN')) {
          this.ui.updateStatusBar('violations');
          this.ui.showNotification(result, this.strictMode);
          
          // Block save by rejecting the promise
          event.waitUntil(Promise.reject(new Error(`Compliance check failed: ${result.message}`)));
          return;
        } else if (result.status === 'WARN') {
          this.ui.updateStatusBar('warnings');
          this.ui.showNotification(result, false);
          // Allow save but show warning
        } else if (result.status === 'PASS') {
          this.ui.updateStatusBar('compliant');
        } else {
          this.ui.updateStatusBar('violations');
        }
      } catch (error) {
        // Handle script execution errors
        this.ui.updateStatusBar('violations');
        const errorResult: ComplianceCheckResult = {
          status: 'ERROR',
          message: `Failed to run compliance check: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        this.ui.showResult(errorResult, 'pre');
        this.ui.showNotification(errorResult, false);
        
        // Don't block save on script errors (allow user to proceed)
        console.error('Compliance check error:', error);
      }
    });
  }

  registerPostChangeHook(): vscode.Disposable {
    return vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (!this.checkOnChange || !this.shouldCheckFile(event.document)) {
        return;
      }

      // Clear existing debounce timer
      if (this.changeDebounceTimer) {
        clearTimeout(this.changeDebounceTimer);
      }

      // Set new debounce timer
      this.changeDebounceTimer = setTimeout(async () => {
        const document = event.document;
        const relativePath = vscode.workspace.asRelativePath(document.uri);

        this.ui.updateStatusBar('checking');

        try {
          const result = await this.runner.runPostExecutionCheck([relativePath]);
          
          this.ui.showResult(result, 'post');

          // Update status bar based on result
          if (result.status === 'VIOLATIONS') {
            this.ui.updateStatusBar('violations');
            this.ui.showNotification(result, false);
          } else if (result.status === 'WARN') {
            this.ui.updateStatusBar('warnings');
            this.ui.showNotification(result, false);
          } else if (result.status === 'PASS') {
            this.ui.updateStatusBar('compliant');
          } else {
            this.ui.updateStatusBar('compliant');
          }
        } catch (error) {
          // Handle script execution errors
          console.error('Post-execution check error:', error);
          this.ui.updateStatusBar('compliant');
        }
      }, this.debounceDelay);
    });
  }

  dispose(): void {
    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer);
    }
  }
}

