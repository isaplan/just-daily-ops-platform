#!/usr/bin/env node

/**
 * ACTION INTERCEPTOR - Automated Compliance Enforcement
 * 
 * This script intercepts code modifications and enforces compliance checks.
 * It monitors file changes and runs pre/post-execution checks automatically.
 * 
 * Usage:
 *   node .ai-compliance-functions/action-interceptor.js start    # Start monitoring
 *   node .ai-compliance-functions/action-interceptor.js stop     # Stop monitoring
 *   node .ai-compliance-functions/action-interceptor.js status   # Check status
 *   node .ai-compliance-functions/action-interceptor.js check  # Run manual check
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const chokidar = require('chokidar');

class ActionInterceptor {
  constructor() {
    this.projectRoot = process.cwd();
    this.pidFile = path.join(this.projectRoot, '.ai-compliance-interceptor.pid');
    this.statusFile = path.join(this.projectRoot, '.ai-compliance-interceptor-status.json');
    this.preCheckScript = path.join(this.projectRoot, '.ai-compliance-functions/pre-execution-check.js');
    this.postCheckScript = path.join(this.projectRoot, '.ai-compliance-functions/post-execution-check.js');
    this.watcher = null;
    this.isRunning = false;
    this.pendingChecks = new Map(); // Track files pending post-check
    this.lastCheckTime = new Map(); // Track last check time per file
  }

  /**
   * Start monitoring for code changes
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Action interceptor is already running');
      return;
    }

    console.log('🚀 Starting Action Interceptor...');
    console.log('📋 Monitoring: src/, .ai-compliance-functions/, function-registry.json');
    console.log('🔍 Pre-checks: Before file modifications');
    console.log('🔍 Post-checks: After file modifications');
    console.log('');

    // Watch for file changes in source directories
    const watchPaths = [
      path.join(this.projectRoot, 'src/**/*.{ts,tsx,js,jsx}'),
      path.join(this.projectRoot, '.ai-compliance-functions/**/*.js'),
      path.join(this.projectRoot, 'function-registry.json'),
      path.join(this.projectRoot, 'progress-log.json')
    ];

    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500, // Wait 500ms after file stops changing
        pollInterval: 100
      }
    });

    // Track file changes
    this.watcher.on('change', (filePath) => {
      this.handleFileChange(filePath);
    });

    this.watcher.on('add', (filePath) => {
      this.handleFileChange(filePath);
    });

    this.watcher.on('unlink', (filePath) => {
      this.handleFileDeletion(filePath);
    });

    this.isRunning = true;
    this.saveStatus({ running: true, startedAt: new Date().toISOString() });
    this.savePid();

    console.log('✅ Action Interceptor is now monitoring file changes');
    console.log('💡 Tip: Make a code change to see compliance checks in action');
    console.log('');

    // Keep process alive
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Handle file change - run post-execution check
   */
  handleFileChange(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    // Skip if this is a compliance script itself
    if (relativePath.includes('.ai-compliance-functions/')) {
      return;
    }

    // Skip if we just checked this file (avoid duplicate checks)
    const now = Date.now();
    const lastCheck = this.lastCheckTime.get(relativePath) || 0;
    if (now - lastCheck < 2000) { // 2 second debounce
      return;
    }

    this.lastCheckTime.set(relativePath, now);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 POST-EXECUTION CHECK: ${relativePath}`);
    console.log('='.repeat(60));

    // Run post-execution check
    try {
      const result = this.runPostCheck([relativePath]);
      
      if (result && result.status === 'VIOLATIONS') {
        console.log('\n⚠️  VIOLATIONS DETECTED!');
        console.log('📋 Review the violations above');
        console.log('💡 Fix violations or continue with user approval\n');
      } else {
        console.log('✅ Post-check passed\n');
      }
    } catch (error) {
      console.error('❌ Post-check error:', error.message);
    }
  }

  /**
   * Handle file deletion
   */
  handleFileDeletion(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    console.log(`\n⚠️  File deleted: ${relativePath}`);
    console.log('🔍 Running compliance check...\n');
    
    // Run post-check to detect deletion violations
    this.runPostCheck([relativePath]);
  }

  /**
   * Run pre-execution check
   */
  runPreCheck(taskDescription, targetFiles = []) {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 PRE-EXECUTION CHECK');
    console.log('='.repeat(60));
    console.log(`📋 Task: ${taskDescription}`);
    if (targetFiles.length > 0) {
      console.log(`📁 Target files: ${targetFiles.join(', ')}`);
    }
    console.log('');

    try {
      const args = [this.preCheckScript, taskDescription, ...targetFiles];
      const output = execSync(`node ${args.map(a => `"${a}"`).join(' ')}`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Parse output
      const startIdx = output.indexOf('===PRE-EXECUTION-CHECK===');
      const endIdx = output.indexOf('===END-PRE-CHECK===');
      
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = output.substring(startIdx + '===PRE-EXECUTION-CHECK==='.length, endIdx).trim();
        const result = JSON.parse(jsonStr);
        
        console.log(`Status: ${result.status}`);
        if (result.existingCode && result.existingCode.length > 0) {
          console.log(`\n📦 Existing code found:`);
          result.existingCode.forEach(file => {
            console.log(`  - ${file}`);
          });
        }
        if (result.violations && result.violations.length > 0) {
          console.log(`\n⚠️  Violations:`);
          result.violations.forEach(v => {
            console.log(`  - ${v.severity}: ${v.message}`);
          });
        }
        console.log('');

        return result;
      }
    } catch (error) {
      console.error('❌ Pre-check failed:', error.message);
      return { status: 'ERROR', message: error.message };
    }
  }

  /**
   * Run post-execution check
   */
  runPostCheck(targetFiles) {
    try {
      const args = [this.postCheckScript, ...targetFiles];
      const output = execSync(`node ${args.map(a => `"${a}"`).join(' ')}`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Parse output
      const startIdx = output.indexOf('===POST-EXECUTION-CHECK===');
      const endIdx = output.indexOf('===END-POST-CHECK===');
      
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = output.substring(startIdx + '===POST-EXECUTION-CHECK==='.length, endIdx).trim();
        const result = JSON.parse(jsonStr);
        
        console.log(`Status: ${result.status}`);
        if (result.summary) {
          console.log(`Files modified: ${result.summary.filesModified || 0}`);
          console.log(`Lines changed: ${result.summary.linesChanged || 0}`);
        }
        if (result.violations && result.violations.length > 0) {
          console.log(`\n⚠️  Violations detected: ${result.violations.length}`);
          result.violations.forEach(v => {
            console.log(`  - ${v.severity}: ${v.message}`);
            if (v.file) console.log(`    File: ${v.file}`);
          });
        }
        console.log('');

        return result;
      }
    } catch (error) {
      console.error('❌ Post-check failed:', error.message);
      return { status: 'ERROR', message: error.message };
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Action interceptor is not running');
      return;
    }

    console.log('\n🛑 Stopping Action Interceptor...');
    
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.isRunning = false;
    this.saveStatus({ running: false, stoppedAt: new Date().toISOString() });
    this.removePid();

    console.log('✅ Action Interceptor stopped');
  }

  /**
   * Check status
   */
  status() {
    if (fs.existsSync(this.statusFile)) {
      const status = JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
      console.log('📊 Action Interceptor Status:');
      console.log(`  Running: ${status.running ? '✅ Yes' : '❌ No'}`);
      if (status.startedAt) {
        console.log(`  Started: ${status.startedAt}`);
      }
      if (status.stoppedAt) {
        console.log(`  Stopped: ${status.stoppedAt}`);
      }
    } else {
      console.log('📊 Action Interceptor Status: Not running');
    }
  }

  /**
   * Save PID
   */
  savePid() {
    fs.writeFileSync(this.pidFile, process.pid.toString());
  }

  /**
   * Remove PID
   */
  removePid() {
    if (fs.existsSync(this.pidFile)) {
      fs.unlinkSync(this.pidFile);
    }
  }

  /**
   * Save status
   */
  saveStatus(status) {
    fs.writeFileSync(this.statusFile, JSON.stringify(status, null, 2));
  }
}

// CLI
if (require.main === module) {
  const interceptor = new ActionInterceptor();
  const command = process.argv[2] || 'start';

  switch (command) {
    case 'start':
      interceptor.start();
      // Keep process alive
      process.stdin.resume();
      break;
    case 'stop':
      interceptor.stop();
      process.exit(0);
      break;
    case 'status':
      interceptor.status();
      break;
    case 'check':
      const task = process.argv[3] || 'manual check';
      const files = process.argv.slice(4);
      interceptor.runPreCheck(task, files);
      break;
    default:
      console.log('Usage:');
      console.log('  node .ai-compliance-functions/action-interceptor.js start   # Start monitoring');
      console.log('  node .ai-compliance-functions/action-interceptor.js stop    # Stop monitoring');
      console.log('  node .ai-compliance-functions/action-interceptor.js status   # Check status');
      console.log('  node .ai-compliance-functions/action-interceptor.js check [task] [files...]  # Manual check');
  }
}

module.exports = ActionInterceptor;


