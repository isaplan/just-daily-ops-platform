import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ComplianceCheckResult {
  status: 'PASS' | 'WARN' | 'BLOCK' | 'VIOLATIONS' | 'ERROR';
  message: string;
  violations?: Array<{
    type: string;
    file?: string;
    message: string;
    severity: string;
    requiredAction: string;
  }>;
  existingCode?: string[];
  requiredAction?: string;
  timestamp?: string;
}

export class ComplianceRunner {
  private projectRoot: string | null = null;

  constructor() {
    this.findProjectRoot();
  }

  private findProjectRoot(): void {
    // Try to find workspace folder with .ai-compliance-functions directory
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      for (const folder of vscode.workspace.workspaceFolders) {
        // Check for compliance directory in new location first, then fallback to old
        const complianceDir = path.join(folder.uri.fsPath, 'tools/compliance');
        const oldComplianceDir = path.join(folder.uri.fsPath, '.ai-compliance-functions');
        if (fs.existsSync(complianceDir) || fs.existsSync(oldComplianceDir)) {
          this.projectRoot = folder.uri.fsPath;
          return;
        }
      }
    }

    // Fallback: use first workspace folder
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this.projectRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
  }

  private getScriptPath(scriptName: string): string | null {
    if (!this.projectRoot) {
      return null;
    }
    // Try new location first, then fallback to old location
    const newScriptPath = path.join(this.projectRoot, 'tools/compliance', scriptName);
    if (fs.existsSync(newScriptPath)) {
      return newScriptPath;
    }
    const oldScriptPath = path.join(this.projectRoot, '.ai-compliance-functions', scriptName);
    return fs.existsSync(oldScriptPath) ? oldScriptPath : null;
  }

  private parseJsonOutput(output: string, startDelimiter: string, endDelimiter: string): ComplianceCheckResult | null {
    const startIndex = output.indexOf(startDelimiter);
    const endIndex = output.indexOf(endDelimiter);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    const jsonStr = output.substring(startIndex + startDelimiter.length, endIndex).trim();
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  }

  async runPreExecutionCheck(taskDescription: string, targetFiles: string[] = []): Promise<ComplianceCheckResult> {
    const scriptPath = this.getScriptPath('pre-execution-check.js');
    if (!scriptPath) {
      return {
        status: 'ERROR',
        message: 'Pre-execution check script not found. Ensure .ai-compliance-functions/pre-execution-check.js exists.',
      };
    }

    try {
      const args = [taskDescription, ...targetFiles].map(arg => `"${arg}"`).join(' ');
      const command = `node "${scriptPath}" ${args}`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot || undefined,
        timeout: 10000, // 10 second timeout
      });

      const result = this.parseJsonOutput(
        stdout + stderr,
        '===PRE-EXECUTION-CHECK===',
        '===END-PRE-CHECK==='
      );

      if (result) {
        return result;
      }

      return {
        status: 'ERROR',
        message: 'Failed to parse pre-execution check output',
      };
    } catch (error: any) {
      // Exit code 1 means BLOCK (violations found)
      if (error.code === 1) {
        const result = this.parseJsonOutput(
          error.stdout + error.stderr,
          '===PRE-EXECUTION-CHECK===',
          '===END-PRE-CHECK==='
        );
        if (result) {
          return result;
        }
      }

      return {
        status: 'ERROR',
        message: `Pre-execution check failed: ${error.message}`,
      };
    }
  }

  async runPostExecutionCheck(targetFiles: string[] = []): Promise<ComplianceCheckResult> {
    const scriptPath = this.getScriptPath('post-execution-check.js');
    if (!scriptPath) {
      return {
        status: 'ERROR',
        message: 'Post-execution check script not found. Ensure .ai-compliance-functions/post-execution-check.js exists.',
      };
    }

    try {
      const args = targetFiles.map(file => `"${file}"`).join(' ');
      const command = args ? `node "${scriptPath}" ${args}` : `node "${scriptPath}"`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot || undefined,
        timeout: 10000, // 10 second timeout
      });

      const result = this.parseJsonOutput(
        stdout + stderr,
        '===POST-EXECUTION-CHECK===',
        '===END-POST-CHECK==='
      );

      if (result) {
        return result;
      }

      return {
        status: 'ERROR',
        message: 'Failed to parse post-execution check output',
      };
    } catch (error: any) {
      // Exit code 1 means violations found
      if (error.code === 1) {
        const result = this.parseJsonOutput(
          error.stdout + error.stderr,
          '===POST-EXECUTION-CHECK===',
          '===END-POST-CHECK==='
        );
        if (result) {
          return result;
        }
      }

      return {
        status: 'ERROR',
        message: `Post-execution check failed: ${error.message}`,
      };
    }
  }

  getProjectRoot(): string | null {
    return this.projectRoot;
  }
}

