#!/usr/bin/env node

/**
 * PRE-EXECUTION CHECK
 * 
 * This script MUST be run before ANY code modification.
 * It checks:
 * 1. Existing code that can accomplish the task
 * 2. Registry protection (completed functions)
 * 3. Planned changes vs limits (100 lines max)
 * 
 * Output: Structured JSON that AI must parse and act on
 * Exit code: 0 = PASS, 1 = BLOCK
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DELIMITER_START = '===PRE-EXECUTION-CHECK===';
const DELIMITER_END = '===END-PRE-CHECK===';

class PreExecutionChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.progressPath = path.join(this.projectRoot, 'progress-log.json');
    this.completedFunctions = new Set();
    this.violations = [];
    this.existingCodeFound = [];
  }

  async runCheck() {
    try {
      // Load registry and progress
      await this.loadTrackingFiles();
      
      // Get task context from command line args or environment
      const taskDescription = process.argv[2] || process.env.AI_TASK || 'unknown task';
      const targetFiles = process.argv.slice(3) || [];
      
      // Check 1: Existing code detection
      await this.checkExistingCode(taskDescription);
      
      // Check 2: Registry protection
      await this.checkRegistryProtection(targetFiles);
      
      // Check 3: Validate planned changes
      const plannedChanges = this.estimateChanges(taskDescription, targetFiles);
      this.validatePlannedChanges(plannedChanges);
      
      // Generate result
      const result = this.generateResult();
      
      // Output structured JSON
      this.outputResult(result);
      
      // Exit with appropriate code
      process.exit(result.status === 'BLOCK' ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Pre-execution check failed:', error);
      const errorResult = {
        status: 'BLOCK',
        message: `Pre-check error: ${error.message}`,
        requiredAction: 'Fix pre-check script before proceeding'
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

  async checkExistingCode(taskDescription) {
    // Try to find existing code that might accomplish the task
    const keywords = this.extractKeywords(taskDescription);
    
    // Search for relevant files/patterns
    const searchTerms = keywords.filter(k => k.length > 3);
    
    if (searchTerms.length > 0) {
      try {
        // Use grep to search for relevant code (simplified search)
        const searchPattern = searchTerms[0];
        const srcDir = path.join(this.projectRoot, 'src');
        
        if (fs.existsSync(srcDir)) {
          // Look for files that might contain relevant code
          const relevantFiles = this.findRelevantFiles(srcDir, searchPattern);
          
          if (relevantFiles.length > 0) {
            this.existingCodeFound = relevantFiles.slice(0, 5); // Limit to 5 results
          }
        }
      } catch (e) {
        // Search failed, but don't block - just warn
        console.warn('⚠️  Could not search for existing code:', e.message);
      }
    }
  }

  findRelevantFiles(dir, searchTerm) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.findRelevantFiles(fullPath, searchTerm));
        } else if (entry.isFile() && (entry.name.includes(searchTerm.toLowerCase()) || 
                   entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || 
                   entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
          // Simple filename match (could be enhanced with actual content search)
          if (entry.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            files.push(fullPath.replace(this.projectRoot + '/', ''));
          }
        }
      }
    } catch (e) {
      // Directory read failed
    }
    
    return files;
  }

  extractKeywords(description) {
    // Extract meaningful keywords from task description
    const words = description.toLowerCase()
      .split(/[\s,.-]+/)
      .filter(w => w.length > 2)
      .filter(w => !['the', 'and', 'or', 'but', 'for', 'with', 'this', 'that'].includes(w));
    
    return words;
  }

  async checkRegistryProtection(targetFiles) {
    for (const file of targetFiles) {
      const fileName = path.basename(file);
      
      if (this.completedFunctions.has(fileName) || this.completedFunctions.has(file)) {
        this.violations.push({
          type: 'REGISTRY_VIOLATION',
          file: file,
          message: `File ${file} is marked as "completed" and "do not touch" in function-registry.json`,
          severity: 'CRITICAL',
          requiredAction: 'DO NOT MODIFY - This file is protected'
        });
      }
    }
  }

  estimateChanges(taskDescription, targetFiles) {
    // Estimate change size based on task description
    const description = taskDescription.toLowerCase();
    
    let estimatedLines = 10; // Default small change
    
    if (description.includes('refactor') || description.includes('rebuild') || 
        description.includes('replace') || description.includes('rewrite')) {
      estimatedLines = 200; // Likely large change
    } else if (description.includes('add') || description.includes('create') || 
               description.includes('implement')) {
      estimatedLines = 50; // Medium change
    } else if (description.includes('fix') || description.includes('update') || 
               description.includes('modify')) {
      estimatedLines = 20; // Small-medium change
    }
    
    return {
      estimatedLines: estimatedLines,
      targetFiles: targetFiles,
      taskDescription: taskDescription
    };
  }

  validatePlannedChanges(changes) {
    if (changes.estimatedLines > 100) {
      this.violations.push({
        type: 'SIZE_VIOLATION',
        estimatedLines: changes.estimatedLines,
        maxAllowed: 100,
        message: `Planned changes estimated at ${changes.estimatedLines} lines, exceeds 100-line limit`,
        severity: 'HIGH',
        requiredAction: 'Break down into smaller changes (max 100 lines per change)'
      });
    }
  }

  generateResult() {
    const hasViolations = this.violations.length > 0;
    const hasExistingCode = this.existingCodeFound.length > 0;
    
    let status = 'PASS';
    let message = 'Pre-execution check passed';
    let requiredAction = 'Proceed with caution';
    
    if (hasViolations) {
      status = 'BLOCK';
      message = `${this.violations.length} violation(s) detected`;
      requiredAction = 'Review violations and fix before proceeding';
    } else if (hasExistingCode) {
      status = 'WARN';
      message = 'Existing code found that might accomplish this task';
      requiredAction = 'Review existing code before creating new code';
    }
    
    return {
      status: status,
      message: message,
      timestamp: new Date().toISOString(),
      existingCode: hasExistingCode ? this.existingCodeFound : [],
      violations: this.violations,
      requiredAction: requiredAction,
      registry: {
        completedFunctionsCount: this.completedFunctions.size,
        protectedFiles: Array.from(this.completedFunctions)
      }
    };
  }

  outputResult(result) {
    console.log(DELIMITER_START);
    console.log(JSON.stringify(result, null, 2));
    console.log(DELIMITER_END);
    
    // Also output human-readable summary
    console.error('\n📋 PRE-EXECUTION CHECK SUMMARY:');
    console.error(`Status: ${result.status}`);
    console.error(`Message: ${result.message}`);
    
    if (result.existingCode.length > 0) {
      console.error(`\n🔍 Existing code found (${result.existingCode.length} files):`);
      result.existingCode.forEach(file => {
        console.error(`  - ${file}`);
      });
    }
    
    if (result.violations.length > 0) {
      console.error(`\n🚨 Violations (${result.violations.length}):`);
      result.violations.forEach((violation, i) => {
        console.error(`  ${i + 1}. ${violation.type}: ${violation.message}`);
        console.error(`     Action: ${violation.requiredAction}`);
      });
    }
    
    console.error(`\n💡 Required Action: ${result.requiredAction}\n`);
  }
}

// Run check if called directly
if (require.main === module) {
  const checker = new PreExecutionChecker();
  checker.runCheck().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PreExecutionChecker;

