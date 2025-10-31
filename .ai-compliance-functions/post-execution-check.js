#!/usr/bin/env node

/**
 * POST-EXECUTION CHECK
 * 
 * This script MUST be run after ANY code modification.
 * It checks:
 * 1. Actual lines changed (must be ≤ 100)
 * 2. Registry violations (completed functions modified)
 * 3. Code preservation (no deletions of existing functionality)
 * 4. Incremental changes only (no full file replacements)
 * 
 * Output: Structured JSON that AI must parse and report
 * Exit code: 0 = PASS, 1 = VIOLATIONS FOUND
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DELIMITER_START = '===POST-EXECUTION-CHECK===';
const DELIMITER_END = '===END-POST-CHECK===';

class PostExecutionChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.violations = [];
    this.modifiedFiles = [];
    this.totalLinesChanged = 0;
    this.completedFunctions = new Set();
    this.backupDir = path.join(this.projectRoot, '.ai-compliance-backups');
  }

  async runCheck() {
    try {
      // Load registry
      await this.loadTrackingFiles();
      
      // Get modified files from git diff or command line args
      const targetFiles = process.argv.slice(2) || this.getModifiedFiles();
      
      if (targetFiles.length === 0) {
        // No files specified - check all recent changes
        this.modifiedFiles = this.getModifiedFiles();
      } else {
        this.modifiedFiles = targetFiles;
      }
      
      // Check each modified file
      for (const file of this.modifiedFiles) {
        await this.checkFile(file);
      }
      
      // Generate result
      const result = this.generateResult();
      
      // Output structured JSON
      this.outputResult(result);
      
      // Exit with appropriate code
      process.exit(result.status === 'VIOLATIONS' ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Post-execution check failed:', error);
      const errorResult = {
        status: 'ERROR',
        message: `Post-check error: ${error.message}`,
        requiredAction: 'Review changes manually'
      };
      this.outputResult(errorResult);
      process.exit(1);
    }
  }

  async loadTrackingFiles() {
    // Load function registry
    if (fs.existsSync(this.registryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        if (registry.functions) {
          Object.values(registry.functions).forEach(func => {
            if (func.status === 'completed' && func.touch_again === false) {
              this.completedFunctions.add(func.file || func.name);
            }
          });
        }
      } catch (e) {
        console.warn('⚠️  Could not parse function registry:', e.message);
      }
    }
  }

  getModifiedFiles() {
    // Get files modified in git (staged or unstaged)
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      const files = gitStatus
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Format: " M file.ts" or "M  file.ts" etc.
          return line.substring(3).trim();
        })
        .filter(file => {
          // Only check code files
          return file.match(/\.(ts|tsx|js|jsx|json)$/) && 
                 !file.includes('node_modules') &&
                 !file.includes('.git');
        });
      
      return files;
    } catch (e) {
      // Git command failed - might not be in a git repo or git not available
      console.warn('⚠️  Could not get git status:', e.message);
      return [];
    }
  }

  async checkFile(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      // File was deleted
      this.violations.push({
        type: 'FILE_DELETED',
        file: filePath,
        message: `File ${filePath} was deleted`,
        severity: 'HIGH',
        requiredAction: 'Restore file if it contained working functionality'
      });
      return;
    }
    
    // Check 1: Registry protection
    const fileName = path.basename(filePath);
    if (this.completedFunctions.has(fileName) || this.completedFunctions.has(filePath)) {
      this.violations.push({
        type: 'REGISTRY_VIOLATION',
        file: filePath,
        message: `File ${filePath} is marked as "completed" and "do not touch"`,
        severity: 'CRITICAL',
        requiredAction: 'REVERT CHANGES - This file is protected'
      });
    }
    
    // Check 2: Count lines changed
    const linesChanged = this.countLinesChanged(filePath);
    this.totalLinesChanged += linesChanged;
    
    if (linesChanged > 100) {
      this.violations.push({
        type: 'SIZE_VIOLATION',
        file: filePath,
        linesChanged: linesChanged,
        maxAllowed: 100,
        message: `File ${filePath} had ${linesChanged} lines changed, exceeds 100-line limit`,
        severity: 'HIGH',
        requiredAction: 'Break down into smaller changes (max 100 lines per file)'
      });
    }
    
    // Check 3: Full file replacement detection
    if (this.isFullFileReplacement(filePath)) {
      this.violations.push({
        type: 'FULL_FILE_REPLACEMENT',
        file: filePath,
        message: `File ${filePath} appears to be fully replaced instead of incremental changes`,
        severity: 'HIGH',
        requiredAction: 'Use incremental changes instead of replacing entire files'
      });
    }
    
    // Check 4: Significant deletions
    const deletions = this.countDeletions(filePath);
    if (deletions > 20) {
      this.violations.push({
        type: 'EXCESSIVE_DELETION',
        file: filePath,
        linesDeleted: deletions,
        message: `File ${filePath} had ${deletions} lines deleted, may have removed working functionality`,
        severity: 'MEDIUM',
        requiredAction: 'Verify that deleted code was not needed'
      });
    }
  }

  countLinesChanged(filePath) {
    try {
      // Use git diff to count lines changed
      const diff = execSync(`git diff HEAD -- "${filePath}"`, { encoding: 'utf8' });
      
      if (!diff) {
        // Check if file is new (untracked)
        const gitLs = execSync(`git ls-files "${filePath}"`, { encoding: 'utf8' });
        if (!gitLs.trim()) {
          // New file - count all lines
          const content = fs.readFileSync(path.join(this.projectRoot, filePath), 'utf8');
          return content.split('\n').length;
        }
        return 0;
      }
      
      // Count added and modified lines
      const added = (diff.match(/^\+(?!\+)/gm) || []).length;
      const modified = (diff.match(/^@@/gm) || []).length;
      
      return added + modified;
    } catch (e) {
      // Git command failed - estimate from file size
      try {
        const content = fs.readFileSync(path.join(this.projectRoot, filePath), 'utf8');
        return content.split('\n').length;
      } catch (e2) {
        return 0;
      }
    }
  }

  countDeletions(filePath) {
    try {
      const diff = execSync(`git diff HEAD -- "${filePath}"`, { encoding: 'utf8' });
      if (!diff) return 0;
      
      // Count lines starting with -
      return (diff.match(/^-(?!-)/gm) || []).length;
    } catch (e) {
      return 0;
    }
  }

  isFullFileReplacement(filePath) {
    try {
      const diff = execSync(`git diff HEAD -- "${filePath}"`, { encoding: 'utf8' });
      if (!diff) return false;
      
      // If diff shows removal of most/all original content and addition of new content
      // This is a heuristic - if >80% of file is replaced, consider it full replacement
      const lines = diff.split('\n');
      const contextLines = lines.filter(l => l.startsWith('@@')).length;
      const totalChanges = (lines.filter(l => l.startsWith('+') || l.startsWith('-')).length);
      
      // If very few context lines but many changes, likely full replacement
      if (totalChanges > 50 && contextLines < 5) {
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  generateResult() {
    const hasViolations = this.violations.length > 0;
    
    let status = 'PASS';
    let message = 'Post-execution check passed - no violations detected';
    let requiredAction = 'Continue';
    
    if (hasViolations) {
      status = 'VIOLATIONS';
      message = `${this.violations.length} violation(s) detected`;
      requiredAction = 'Review violations and decide: Fix now or Continue as-is';
    } else if (this.totalLinesChanged > 100) {
      status = 'WARN';
      message = `Total changes across files: ${this.totalLinesChanged} lines (approaching limit)`;
      requiredAction = 'Monitor - total changes are high';
    }
    
    // Group violations by severity
    const critical = this.violations.filter(v => v.severity === 'CRITICAL');
    const high = this.violations.filter(v => v.severity === 'HIGH');
    const medium = this.violations.filter(v => v.severity === 'MEDIUM');
    
    return {
      status: status,
      message: message,
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesModified: this.modifiedFiles.length,
        totalLinesChanged: this.totalLinesChanged,
        violationsCount: this.violations.length,
        criticalViolations: critical.length,
        highViolations: high.length,
        mediumViolations: medium.length
      },
      violations: this.violations,
      modifiedFiles: this.modifiedFiles,
      requiredAction: requiredAction,
      fixes: this.generateFixSuggestions()
    };
  }

  generateFixSuggestions() {
    const fixes = [];
    
    this.violations.forEach(violation => {
      switch (violation.type) {
        case 'REGISTRY_VIOLATION':
          fixes.push({
            violation: violation.type,
            action: 'REVERT',
            command: `git checkout HEAD -- "${violation.file}"`,
            description: 'Restore the protected file from git'
          });
          break;
          
        case 'SIZE_VIOLATION':
          fixes.push({
            violation: violation.type,
            action: 'SPLIT',
            description: `Break changes to ${violation.file} into smaller commits (max 100 lines each)`,
            suggestion: 'Use git add -p to stage changes incrementally'
          });
          break;
          
        case 'FULL_FILE_REPLACEMENT':
          fixes.push({
            violation: violation.type,
            action: 'INCREMENTAL',
            description: `Instead of replacing ${violation.file}, make incremental changes`,
            suggestion: 'Use search_replace to modify specific sections'
          });
          break;
      }
    });
    
    return fixes;
  }

  outputResult(result) {
    console.log(DELIMITER_START);
    console.log(JSON.stringify(result, null, 2));
    console.log(DELIMITER_END);
    
    // Also output human-readable summary
    console.error('\n📋 POST-EXECUTION CHECK SUMMARY:');
    console.error(`Status: ${result.status}`);
    console.error(`Message: ${result.message}`);
    console.error(`Files Modified: ${result.summary.totalFilesModified}`);
    console.error(`Total Lines Changed: ${result.summary.totalLinesChanged}`);
    
    if (result.violations.length > 0) {
      console.error(`\n🚨 Violations (${result.violations.length}):`);
      
      // Group by severity
      const critical = result.violations.filter(v => v.severity === 'CRITICAL');
      const high = result.violations.filter(v => v.severity === 'HIGH');
      const medium = result.violations.filter(v => v.severity === 'MEDIUM');
      
      if (critical.length > 0) {
        console.error('\n🔴 CRITICAL:');
        critical.forEach((violation, i) => {
          console.error(`  ${i + 1}. ${violation.type}: ${violation.message}`);
          console.error(`     File: ${violation.file}`);
          console.error(`     Action: ${violation.requiredAction}`);
        });
      }
      
      if (high.length > 0) {
        console.error('\n🟠 HIGH:');
        high.forEach((violation, i) => {
          console.error(`  ${i + 1}. ${violation.type}: ${violation.message}`);
          console.error(`     File: ${violation.file}`);
        });
      }
      
      if (medium.length > 0) {
        console.error('\n🟡 MEDIUM:');
        medium.forEach((violation, i) => {
          console.error(`  ${i + 1}. ${violation.type}: ${violation.message}`);
        });
      }
      
      if (result.fixes.length > 0) {
        console.error('\n💡 Suggested Fixes:');
        result.fixes.forEach((fix, i) => {
          console.error(`  ${i + 1}. ${fix.action}: ${fix.description}`);
          if (fix.command) {
            console.error(`     Command: ${fix.command}`);
          }
        });
      }
    }
    
    console.error(`\n💡 Required Action: ${result.requiredAction}\n`);
  }
}

// Run check if called directly
if (require.main === module) {
  const checker = new PostExecutionChecker();
  checker.runCheck().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PostExecutionChecker;

