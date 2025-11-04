import * as vscode from 'vscode';
import { ComplianceCheckResult } from './compliance-runner';

export type ComplianceStatus = 'compliant' | 'warnings' | 'violations' | 'disabled' | 'checking';

export class ComplianceUI {
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;
  private currentStatus: ComplianceStatus = 'disabled';

  constructor() {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'compliance.showStatus';
    this.statusBarItem.tooltip = 'Click to show compliance status details';
    this.updateStatusBar('disabled');

    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel('Compliance Checks');
  }

  updateStatusBar(status: ComplianceStatus): void {
    this.currentStatus = status;
    
    switch (status) {
      case 'compliant':
        this.statusBarItem.text = '$(check) Compliant';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;
      case 'warnings':
        this.statusBarItem.text = '$(warning) Warnings';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      case 'violations':
        this.statusBarItem.text = '$(error) Violations';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
      case 'checking':
        this.statusBarItem.text = '$(sync~spin) Checking...';
        this.statusBarItem.backgroundColor = undefined;
        break;
      case 'disabled':
      default:
        this.statusBarItem.text = '$(circle-slash) Compliance Disabled';
        this.statusBarItem.backgroundColor = undefined;
        break;
    }
    
    this.statusBarItem.show();
  }

  showResult(result: ComplianceCheckResult, checkType: 'pre' | 'post'): void {
    const timestamp = new Date().toLocaleString();
    this.outputChannel.appendLine(`\n[${timestamp}] ${checkType === 'pre' ? 'Pre-Execution' : 'Post-Execution'} Check`);
    this.outputChannel.appendLine('='.repeat(60));
    this.outputChannel.appendLine(`Status: ${result.status}`);
    this.outputChannel.appendLine(`Message: ${result.message}`);

    if (result.violations && result.violations.length > 0) {
      this.outputChannel.appendLine(`\nViolations (${result.violations.length}):`);
      
      // Group by severity
      const critical = result.violations.filter(v => v.severity === 'CRITICAL');
      const high = result.violations.filter(v => v.severity === 'HIGH');
      const medium = result.violations.filter(v => v.severity === 'MEDIUM');
      const low = result.violations.filter(v => v.severity === 'LOW');

      if (critical.length > 0) {
        this.outputChannel.appendLine('\n🔴 CRITICAL:');
        critical.forEach((violation, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${violation.type}: ${violation.message}`);
          if (violation.file) {
            this.outputChannel.appendLine(`     File: ${violation.file}`);
          }
          this.outputChannel.appendLine(`     Action: ${violation.requiredAction}`);
        });
      }

      if (high.length > 0) {
        this.outputChannel.appendLine('\n🟠 HIGH:');
        high.forEach((violation, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${violation.type}: ${violation.message}`);
          if (violation.file) {
            this.outputChannel.appendLine(`     File: ${violation.file}`);
          }
        });
      }

      if (medium.length > 0) {
        this.outputChannel.appendLine('\n🟡 MEDIUM:');
        medium.forEach((violation, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${violation.type}: ${violation.message}`);
        });
      }

      if (low.length > 0) {
        this.outputChannel.appendLine('\n🔵 LOW:');
        low.forEach((violation, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${violation.type}: ${violation.message}`);
        });
      }
    }

    if (result.existingCode && result.existingCode.length > 0) {
      this.outputChannel.appendLine(`\n🔍 Existing code found (${result.existingCode.length} files):`);
      result.existingCode.forEach(file => {
        this.outputChannel.appendLine(`  - ${file}`);
      });
    }

    if (result.requiredAction) {
      this.outputChannel.appendLine(`\n💡 Required Action: ${result.requiredAction}`);
    }

    this.outputChannel.appendLine('');
  }

  showNotification(result: ComplianceCheckResult, strictMode: boolean = false): void {
    if (result.status === 'BLOCK' || (strictMode && result.status === 'WARN')) {
      const actions = ['View Details', 'Dismiss'];
      vscode.window.showErrorMessage(
        `Compliance Check Failed: ${result.message}`,
        ...actions
      ).then(selection => {
        if (selection === 'View Details') {
          this.outputChannel.show();
        }
      });
    } else if (result.status === 'WARN') {
      const actions = ['View Details', 'Dismiss'];
      vscode.window.showWarningMessage(
        `Compliance Warning: ${result.message}`,
        ...actions
      ).then(selection => {
        if (selection === 'View Details') {
          this.outputChannel.show();
        }
      });
    } else if (result.status === 'VIOLATIONS') {
      const actions = ['View Details', 'Dismiss'];
      vscode.window.showWarningMessage(
        `Compliance Violations Detected: ${result.message}`,
        ...actions
      ).then(selection => {
        if (selection === 'View Details') {
          this.outputChannel.show();
        }
      });
    }
  }

  showOutputChannel(): void {
    this.outputChannel.show();
  }

  clearOutputChannel(): void {
    this.outputChannel.clear();
  }

  getCurrentStatus(): ComplianceStatus {
    return this.currentStatus;
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
  }
}

