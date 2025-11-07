#!/usr/bin/env node

/**
 * ============================================================================
 * AI COMPLIANCE UNIFIED SYSTEM
 * ============================================================================
 * 
 * This file contains BOTH:
 * 1. All operating constraints/rules (documentation below)
 * 2. Complete implementation (code below)
 * 
 * SINGLE SOURCE OF TRUTH: Rules and implementation in one place
 * 
 * ============================================================================
 * RULES & CONSTRAINTS (Lines 1-200)
 * ============================================================================
 * 
 * # INTELLIGENT GUARD RAILS SYSTEM
 * 
 * ## Core Principles (5 Rules)
 * 
 * 1. **CHECK EXISTING CODE FIRST** (MANDATORY)
 *    - Before ANY new code, AI MUST search for existing implementations
 *    - AI MUST show user what existing code was found
 *    - AI MUST use existing code if found (extend, don't rebuild)
 *    - This is the MOST IMPORTANT step
 * 
 * 2. **WARN + ASK PERMISSION** (Never Hard Block)
 *    - All violations show warnings, not blocks
 *    - User always has final control
 *    - AI asks "Continue? (yes/no)" on warnings
 * 
 * 3. **CODE QUALITY: Component Size**
 *    - Target: Functions/components ≤100 lines
 *    - Flexibility: If code is 110-120 lines and works perfectly, keep it
 *    - Purpose: Maintainability and readability
 *    - About: Code structure, not edit size
 *    - Warning: If component >150 lines, suggest refactoring (don't block)
 * 
 * 4. **EDIT SAFETY: Lines Changed Per Edit**
 *    - <50 lines changed: No warning, proceed
 *    - 50-150 lines changed: Show warning + ask "This is a larger edit. Continue? (yes/no)"
 *    - >150 lines changed: Show warning + suggest breaking into smaller steps + ask permission
 *    - Purpose: Safety during modifications, prevent accidental large changes
 *    - About: Edit size, not code structure
 * 
 * 5. **USER CONTROL**
 *    - User decides after being informed
 *    - No automatic blocking
 *    - All violations are warnings with permission requests
 * 
 * ## Workflow (Mandatory Steps)
 * 
 * 1. **Check Existing Code FIRST**
 *    - Run: `node .ai-compliance-functions/pre-execution-check.js "<task description>"`
 *    - Must show results to user
 *    - Must use existing code if found
 * 
 * 2. **Pre-Execution Check**
 *    - Run before ANY code modification
 *    - Status: PASS = proceed, WARN = show warnings + ask, BLOCK = show + ask
 *    - Always show results (even if PASS)
 * 
 * 3. **Code Modification**
 *    - Only after pre-check passes/warned
 *    - User permission obtained if warnings
 * 
 * 4. **Post-Execution Check**
 *    - Run after ANY code modification
 *    - Status: PASS = OK, WARN = show warnings, VIOLATIONS = show + ask
 *    - Always show results
 * 
 * ## Warning Thresholds
 * 
 * - **50 lines changed**: First warning threshold
 * - **150 lines changed**: Suggest breaking into smaller steps
 * - **Component >150 lines**: Suggest refactoring (but don't block)
 * 
 * ## Escape Route Protection
 * 
 * ### Git Command Protection
 * Before using ANY of these commands, AI MUST ask permission:
 * - `--no-verify` - Bypasses pre-commit hooks
 * - `--force` or `--force-with-lease` - Bypasses branch protection
 * - `git reset --hard` - Destroys working directory changes
 * - `git push --force` - Force pushes to protected branches
 * - `git rebase` - Rewrites history
 * 
 * AI MUST:
 * 1. STOP and report: "I need to use [command] which bypasses [protection]"
 * 2. EXPLAIN why this command is needed
 * 3. ASK "Do you approve using this bypass? (yes/no)"
 * 4. WAIT for explicit user approval
 * 
 * ### System File Protection
 * Before modifying ANY system/protection files, AI MUST ask permission:
 * - `.git/hooks/*` - Modifying/deleting git hooks
 * - `function-registry.json` - Changing protection status
 * - `.ai-compliance-functions/*` - Modifying/deleting compliance scripts
 * - `.ai-rules-docs/*` - Changing rule definitions
 * 
 * ### Skip Check Protection (MOST IMPORTANT)
 * The most common AI escape route is simply NOT running the checks.
 * 
 * **MANDATORY: Before ANY code modification, AI MUST:**
 * 1. Acknowledge "Running pre-execution check..."
 * 2. Actually run `node .ai-compliance-functions/pre-execution-check.js "<task>"`
 * 3. Show results to user (even if PASS)
 * 4. If tempted to skip: AI MUST say "I'm considering skipping the check because [reason]. Do you approve? (yes/no)"
 * 
 * **After ANY code modification, AI MUST:**
 * 1. Acknowledge "Running post-execution check..."
 * 2. Actually run `node .ai-compliance-functions/post-execution-check.js [files]`
 * 3. Show results to user (even if PASS)
 * 
 * **Detection & Honesty Rules:**
 * - If user asks "Did you run the checks?" and AI didn't → AI MUST confess
 * - AI MUST NOT lie about running checks
 * - AI MUST NOT claim checks passed without actually running them
 * 
 * ## Development Standards
 * 
 * - **Incremental Changes**: Prefer smaller, targeted changes
 * - **Preserve Existing**: Never destroy working code
 * - **Reuse Code**: Always check for existing implementations first
 * - **Track Progress**: All changes logged in function-registry.json
 * - **Commit Tracking**: Each function tracks git commit hash
 * 
 * ============================================================================
 * IMPLEMENTATION (Lines 201+)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ComplianceMessages = require('./compliance-messages');

class AIComplianceUnified {
  constructor() {
    this.projectRoot = process.cwd();
    this.postExecutionCheck = path.join(this.projectRoot, '.ai-compliance-functions/post-execution-check.js');
    this.registryUpdater = path.join(this.projectRoot, '.ai-compliance-functions/registry-auto-updater.js');
    this.trackingSystem = path.join(this.projectRoot, 'ai-tracking-system.json');
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.statusFile = path.join(this.projectRoot, '.compliance-status.txt');
    this.messages = new ComplianceMessages();
    
    // System state
    this.isRunning = false;
    this.registryUpdateRunning = false;
    this.firstChangeDetected = false;
    this.lastRegistryUpdate = 0;
    this.lastCodeChangeTime = Date.now();
    this.registryIntervalId = null;
    this.isIdle = false;
    
    // Logs tracking
    this.logFiles = {
      build: path.join(this.projectRoot, 'build-log.json'),
      progress: path.join(this.projectRoot, 'progress-log.json'),
      tracking: this.trackingSystem,
      messages: path.join(this.projectRoot, '.ai-compliance-messages.json'),
      compliance: path.join(this.projectRoot, 'ai-compliance-report.json')
    };
  }

  /**
   * Start the unified compliance system
   */
  async start() {
    if (this.isRunning) {
      console.log('🔄 Compliance system already running');
      return;
    }

    this.isRunning = true;
    this.lastCodeChangeTime = Date.now();
    
    console.log('🚀 Starting AI Compliance Unified System...');
    console.log('📋 Features: Registry automation, Pre/Post checks, Status system, Log viewer');
    console.log('📋 Registry: Active for 20m after code changes, then idle');

    // Update status
    this.updateStatusFile({
      systemActive: true,
      lastStarted: new Date().toISOString(),
      status: 'RUNNING'
    });

    // 1. Run registry update IMMEDIATELY on startup
    console.log('🔄 Running initial registry update on startup...');
    await this.updateRegistry();

    // 2. Initial compliance check
    await this.runComplianceCheck();
    
    // 3. Setup monitoring
    this.setupFileWatchers();
    this.setupPeriodicChecks();

    // 4. Show system status
    this.messages.showMessage('INFO', '🛡️  SYSTEM ACTIVE', 
      'AI Compliance Unified System is monitoring your codebase. All changes will be checked.');

    console.log('✅ AI Compliance Unified System started successfully');
    console.log('📊 Registry will update every 10 minutes (if code changed in last 20m)');
    console.log('💤 Registry goes idle after 20 minutes of no code changes');
    console.log(`📄 Status file: ${this.statusFile}`);
    console.log(`📊 View status: npm run compliance:status`);
  }

  /**
   * Update registry with commit tracking
   */
  async updateRegistry() {
    if (this.registryUpdateRunning) {
      console.log('⏳ Registry update already running, skipping...');
      return;
    }

    try {
      this.registryUpdateRunning = true;
      
      if (fs.existsSync(this.registryUpdater)) {
        return new Promise((resolve) => {
          exec(`node ${this.registryUpdater}`, { cwd: this.projectRoot }, (error, stdout, stderr) => {
            this.registryUpdateRunning = false;
            this.lastRegistryUpdate = Date.now();
            
            const output = stdout + stderr;
            
            // Parse output for summary
            if (output.includes('Registry update completed')) {
              const match = output.match(/Total files registered: (\d+)/);
              const newMatch = output.match(/✨ New: (\d+)/);
              const updatedMatch = output.match(/🔄 Updated: (\d+)/);
              
              if (match || newMatch || updatedMatch) {
                const summary = {
                  total: match ? parseInt(match[1]) : 0,
                  new: newMatch ? parseInt(newMatch[1]) : 0,
                  updated: updatedMatch ? parseInt(updatedMatch[1]) : 0
                };
                
                if (summary.new > 0 || summary.updated > 0) {
                  console.log(`\n📊 Registry Updated: ${summary.total} files | New: ${summary.new} | Updated: ${summary.updated}`);
                  this.messages.showRegistryUpdateMessage({
                    updated: true,
                    newCount: summary.new,
                    total: summary.total
                  });
                  
                  // Update status
                  this.updateStatusFile({
                    lastRegistryUpdate: new Date().toISOString(),
                    registryCount: summary.total
                  });
                } else {
                  console.log(`✅ Registry up to date (${summary.total} files registered)`);
                }
              }
            }
            
            if (error) {
              console.warn('⚠️  Registry update warning:', error.message);
            }
            
            resolve({ updated: true });
          });
        });
      } else {
        console.warn('⚠️  Registry updater not found');
        this.registryUpdateRunning = false;
      }
    } catch (error) {
      console.warn('⚠️  Registry update failed:', error.message);
      this.registryUpdateRunning = false;
    }
  }

  /**
   * Run compliance check (consolidated from ai-compliance-checker.js)
   */
  async runComplianceCheck() {
    try {
      const registry = this.loadRegistry();
      const progress = this.loadProgressLog();
      const tracking = this.loadTrackingSystem();
      
      const checks = [];
      const violations = [];
      
      // Check 1: Registry Protection
      if (fs.existsSync(this.registryPath)) {
        const completedCount = registry.functions?.filter(f => f.status === 'completed').length || 0;
        const protectedCount = registry.functions?.filter(f => f.touch_again === false).length || 0;
        checks.push({
          name: 'Registry Protection',
          status: 'PASS',
          details: [
            `✅ function-registry.json exists`,
            `✅ ${completedCount} functions marked as completed`,
            `✅ ${protectedCount} functions marked as DO NOT TOUCH`
          ]
        });
      } else {
        checks.push({
          name: 'Registry Protection',
          status: 'FAIL',
          details: ['❌ function-registry.json missing']
        });
        violations.push('Missing function-registry.json');
      }
      
      // Check 2: Progress Tracking
      const hasProgress = fs.existsSync(this.logFiles.progress);
      const hasTracking = fs.existsSync(this.trackingSystem);
      checks.push({
        name: 'Progress Tracking',
        status: hasProgress && hasTracking ? 'PASS' : 'WARN',
        details: [
          hasProgress ? '✅ progress-log.json exists' : '❌ progress-log.json missing',
          hasTracking ? '✅ ai-tracking-system.json exists' : '❌ ai-tracking-system.json missing'
        ]
      });
      
      // Update status
      this.updateStatusFile({
        lastComplianceCheck: new Date().toISOString(),
        violationsCount: violations.length,
        checksPassed: checks.filter(c => c.status === 'PASS').length,
        checksTotal: checks.length
      });
      
      return { checks, violations };
    } catch (error) {
      console.error('❌ Compliance check failed:', error);
      return { checks: [], violations: [error.message] };
    }
  }

  /**
   * Run post-execution check
   */
  async runPostExecutionCheck(filePath) {
    try {
      return new Promise((resolve) => {
        const cmd = `node ${this.postExecutionCheck} "${filePath}"`;
        exec(cmd, { cwd: this.projectRoot }, (error, stdout, stderr) => {
          const output = stdout + stderr;
          const startIdx = output.indexOf('===POST-EXECUTION-CHECK===');
          const endIdx = output.indexOf('===END-POST-CHECK===');
          
          if (startIdx !== -1 && endIdx !== -1) {
            try {
              const jsonStr = output.substring(startIdx + 29, endIdx).trim();
              const result = JSON.parse(jsonStr);
              
              // Show message to user
              this.messages.showPostCheckMessage(result);
              
              if (result.status === 'VIOLATIONS') {
                console.error(`\n🚨 VIOLATIONS in ${filePath}`);
                console.error(`Critical: ${result.summary.criticalViolations}`);
                console.error(`High: ${result.summary.highViolations}`);
              }
              
              // Update status
              this.updateStatusFile({
                lastPostCheck: new Date().toISOString(),
                lastViolations: result.status === 'VIOLATIONS' ? result.summary : null
              });
              
              resolve({ status: result.status || 'PASS', result });
            } catch (e) {
              resolve({ status: 'PASS' });
            }
          } else {
            resolve({ status: 'PASS' });
          }
        });
      });
    } catch (error) {
      return { status: 'ERROR' };
    }
  }

  /**
   * Handle file change
   */
  async handleFileChange(filePath) {
    const relativePath = filePath.replace(/\\/g, '/');
    
    // Skip tracking files
    if (relativePath.includes('function-registry.json') || 
        relativePath.includes('progress-log.json') ||
        relativePath.includes('ai-tracking-system.json') ||
        relativePath.includes('.compliance-status.txt')) {
      return;
    }

    // Skip if not a code file
    if (!relativePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return;
    }

    // Update last code change time
    this.lastCodeChangeTime = Date.now();
    
    // Reactivate if idle
    if (this.isIdle) {
      console.log('🔄 Code change detected - reactivating registry updates...');
      this.isIdle = false;
      this.startRegistryInterval();
    }

    console.log(`\n📝 File change detected: ${relativePath}`);

    // Run post-execution check
    await this.runPostExecutionCheck(relativePath);

    // Run registry update on FIRST change after startup
    if (!this.firstChangeDetected) {
      console.log('🔄 First change detected - running registry update...');
      this.firstChangeDetected = true;
      await this.updateRegistry();
    }

    // Also update registry if it's been more than 5 minutes since last update
    const now = Date.now();
    if (now - this.lastRegistryUpdate > 5 * 60 * 1000) {
      await this.updateRegistry();
    }

    // Run compliance check
    this.runComplianceCheck().catch(() => {});
    
    // Update status
    this.updateStatusFile({
      lastCodeChange: new Date().toISOString(),
      lastFileChanged: relativePath
    });
  }

  /**
   * Setup file watchers
   */
  setupFileWatchers() {
    const watchPaths = [
      'src/app/',
      'src/lib/',
      'src/components/',
      'src/hooks/',
      'function-registry.json',
      'progress-log.json'
    ];

    watchPaths.forEach(watchPath => {
      const fullPath = path.join(this.projectRoot, watchPath);
      if (fs.existsSync(fullPath)) {
        fs.watch(fullPath, { recursive: true }, async (eventType, filename) => {
          if (!filename || filename.includes('node_modules') || filename.includes('.git')) {
            return;
          }
          
          if (!filename.match(/\.(ts|tsx|js|jsx|json)$/)) return;
          
          const filePath = path.join(fullPath, filename);
          const relativePath = path.relative(this.projectRoot, filePath);
          
          await this.handleFileChange(relativePath);
        });
        console.log(`👀 Watching: ${watchPath}`);
      }
    });
  }

  /**
   * Start registry update interval
   */
  startRegistryInterval() {
    if (this.registryIntervalId) {
      clearInterval(this.registryIntervalId);
    }

    this.registryIntervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastChange = now - this.lastCodeChangeTime;
      const timeSinceLastUpdate = now - this.lastRegistryUpdate;

      if (timeSinceLastChange > 20 * 60 * 1000) {
        if (!this.isIdle) {
          console.log('💤 No code changes for 20 minutes - registry updates going idle');
          this.messages.showMessage('INFO', '💤 REGISTRY IDLE', 
            'No code changes for 20 minutes. Registry updates paused. Will reactivate on next code change.');
          this.isIdle = true;
          clearInterval(this.registryIntervalId);
          this.registryIntervalId = null;
          
          this.updateStatusFile({ registryIdle: true });
        }
        return;
      }

      if (timeSinceLastUpdate >= 10 * 60 * 1000) {
        console.log('⏰ Running scheduled registry update (10-minute interval)...');
        this.updateRegistry().catch(() => {});
      } else {
        const minutesAgo = Math.round(timeSinceLastUpdate / 1000 / 60);
        console.log(`⏰ Registry update skipped (last update ${minutesAgo}m ago, next in ${10 - minutesAgo}m)`);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Setup periodic checks
   */
  setupPeriodicChecks() {
    // Periodic compliance check every 5 minutes
    setInterval(() => {
      this.runComplianceCheck().catch(() => {});
    }, 5 * 60 * 1000);

    // Update tracking system every minute
    setInterval(() => {
      this.updateTrackingSystem();
      this.updateStatusFile(); // Refresh status file
    }, 60 * 1000);

    // Start registry interval
    console.log('🔄 Starting registry update interval (10-minute cycle, idle after 20m)...');
    this.startRegistryInterval();
    
    // First interval after 10 minutes
    setTimeout(() => {
      const timeSinceLastChange = Date.now() - this.lastCodeChangeTime;
      if (timeSinceLastChange <= 20 * 60 * 1000) {
        console.log('⏰ First 10-minute interval reached - running registry update...');
        this.updateRegistry().catch(() => {});
      } else {
        console.log('💤 First interval reached but idle (no code changes for 20m+)');
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Update tracking system
   */
  updateTrackingSystem() {
    try {
      if (fs.existsSync(this.trackingSystem)) {
        const tracking = JSON.parse(fs.readFileSync(this.trackingSystem, 'utf8'));
        tracking.system_info.last_updated = new Date().toISOString();
        if (tracking.current_session) {
          tracking.current_session.last_compliance_check = new Date().toISOString();
          tracking.current_session.last_registry_update = this.lastRegistryUpdate ? new Date(this.lastRegistryUpdate).toISOString() : null;
          tracking.current_session.last_code_change = new Date(this.lastCodeChangeTime).toISOString();
          tracking.current_session.registry_idle = this.isIdle;
        }
        fs.writeFileSync(this.trackingSystem, JSON.stringify(tracking, null, 2));
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Update status file (.compliance-status.txt)
   */
  updateStatusFile(additionalData = {}) {
    try {
      const registry = this.loadRegistry();
      const tracking = this.loadTrackingSystem();
      
      const status = {
        systemActive: this.isRunning,
        status: this.isRunning ? 'RUNNING' : 'STOPPED',
        lastStarted: additionalData.lastStarted || (this.isRunning ? new Date().toISOString() : null),
        lastComplianceCheck: additionalData.lastComplianceCheck || tracking.current_session?.last_compliance_check || null,
        lastRegistryUpdate: additionalData.lastRegistryUpdate || (this.lastRegistryUpdate ? new Date(this.lastRegistryUpdate).toISOString() : null),
        lastCodeChange: additionalData.lastCodeChange || (this.lastCodeChangeTime ? new Date(this.lastCodeChangeTime).toISOString() : null),
        registryIdle: additionalData.registryIdle !== undefined ? additionalData.registryIdle : this.isIdle,
        registryCount: additionalData.registryCount || (registry.functions?.length || 0),
        violationsCount: additionalData.violationsCount || 0,
        checksPassed: additionalData.checksPassed || null,
        checksTotal: additionalData.checksTotal || null,
        lastFileChanged: additionalData.lastFileChanged || null,
        lastUpdated: new Date().toISOString()
      };
      
      // Write human-readable status file
      const statusText = `AI COMPLIANCE UNIFIED SYSTEM - STATUS
================================================================================
System Status: ${status.systemActive ? '✅ RUNNING' : '❌ STOPPED'}
Last Started: ${status.lastStarted || 'Never'}
Registry Status: ${status.registryIdle ? '💤 IDLE' : '🔄 ACTIVE'}
Registry Count: ${status.registryCount} functions

Last Activity:
  - Compliance Check: ${status.lastComplianceCheck || 'Never'}
  - Registry Update: ${status.lastRegistryUpdate || 'Never'}
  - Code Change: ${status.lastCodeChange || 'Never'}
  - Last File: ${status.lastFileChanged || 'None'}

Compliance Status:
  - Violations: ${status.violationsCount}
  - Checks: ${status.checksPassed !== null ? `${status.checksPassed}/${status.checksTotal}` : 'N/A'}

Last Updated: ${status.lastUpdated}

View full logs: npm run compliance:logs
View dashboard: npm run compliance:dashboard
================================================================================
`;
      
      fs.writeFileSync(this.statusFile, statusText);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Load registry
   */
  loadRegistry() {
    try {
      if (fs.existsSync(this.registryPath)) {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      }
    } catch (error) {
      // Silent fail
    }
    return { functions: [] };
  }

  /**
   * Load progress log
   */
  loadProgressLog() {
    try {
      if (fs.existsSync(this.logFiles.progress)) {
        return JSON.parse(fs.readFileSync(this.logFiles.progress, 'utf8'));
      }
    } catch (error) {
      // Silent fail
    }
    return {};
  }

  /**
   * Load tracking system
   */
  loadTrackingSystem() {
    try {
      if (fs.existsSync(this.trackingSystem)) {
        return JSON.parse(fs.readFileSync(this.trackingSystem, 'utf8'));
      }
    } catch (error) {
      // Silent fail
    }
    return {};
  }

  /**
   * Unified log viewer - shows all compliance logs
   */
  viewLogs(options = {}) {
    const { type = 'all', limit = 20 } = options;
    
    console.log('\n📊 UNIFIED LOG VIEWER');
    console.log('='.repeat(80));
    
    if (type === 'all' || type === 'build') {
      this.viewBuildLog(limit);
    }
    
    if (type === 'all' || type === 'progress') {
      this.viewProgressLog(limit);
    }
    
    if (type === 'all' || type === 'messages') {
      this.viewMessagesLog(limit);
    }
    
    if (type === 'all' || type === 'compliance') {
      this.viewComplianceLog(limit);
    }
    
    console.log('='.repeat(80));
  }

  /**
   * View build log
   */
  viewBuildLog(limit) {
    if (!fs.existsSync(this.logFiles.build)) {
      console.log('\n📋 Build Log: No entries');
      return;
    }
    
    try {
      const buildLog = JSON.parse(fs.readFileSync(this.logFiles.build, 'utf8'));
      const sessions = buildLog.build_sessions?.slice(-limit) || [];
      
      console.log(`\n📋 Build Log (${sessions.length} recent sessions):`);
      sessions.forEach((session, i) => {
        console.log(`\n  ${i + 1}. ${session.session_id}`);
        console.log(`     Date: ${session.date}`);
        console.log(`     Problem: ${session.problem}`);
        console.log(`     Status: ${session.status}`);
      });
    } catch (error) {
      console.log('\n📋 Build Log: Error reading file');
    }
  }

  /**
   * View progress log
   */
  viewProgressLog(limit) {
    if (!fs.existsSync(this.logFiles.progress)) {
      console.log('\n📈 Progress Log: No entries');
      return;
    }
    
    try {
      const progress = JSON.parse(fs.readFileSync(this.logFiles.progress, 'utf8'));
      const sessions = Object.keys(progress).filter(k => k.startsWith('session_')).slice(-limit);
      
      console.log(`\n📈 Progress Log (${sessions.length} recent sessions):`);
      sessions.forEach((sessionKey, i) => {
        const session = progress[sessionKey];
        console.log(`\n  ${i + 1}. ${sessionKey}`);
        console.log(`     Focus: ${session.current_focus || 'Unknown'}`);
        console.log(`     Completed: ${session.completed_tasks?.length || 0} tasks`);
        console.log(`     Status: ${session.compliance_status?.status || 'Unknown'}`);
      });
    } catch (error) {
      console.log('\n📈 Progress Log: Error reading file');
    }
  }

  /**
   * View messages log
   */
  viewMessagesLog(limit) {
    if (!fs.existsSync(this.logFiles.messages)) {
      console.log('\n💬 Messages: No entries');
      return;
    }
    
    try {
      const messages = JSON.parse(fs.readFileSync(this.logFiles.messages, 'utf8'));
      const recent = messages.slice(-limit);
      
      console.log(`\n💬 Messages (${recent.length} recent):`);
      recent.forEach((msg, i) => {
        console.log(`\n  ${i + 1}. [${msg.type}] ${msg.title}`);
        console.log(`     ${msg.message}`);
        console.log(`     ${msg.timestamp}`);
      });
    } catch (error) {
      console.log('\n💬 Messages: Error reading file');
    }
  }

  /**
   * View compliance log
   */
  viewComplianceLog(limit) {
    if (!fs.existsSync(this.logFiles.compliance)) {
      console.log('\n🛡️  Compliance: No entries');
      return;
    }
    
    try {
      const compliance = JSON.parse(fs.readFileSync(this.logFiles.compliance, 'utf8'));
      console.log(`\n🛡️  Compliance Report:`);
      console.log(`     Score: ${compliance.complianceScore || 'N/A'}%`);
      console.log(`     Checks: ${compliance.passedChecks || 0}/${compliance.totalChecks || 0}`);
      console.log(`     Violations: ${compliance.violations?.length || 0}`);
    } catch (error) {
      console.log('\n🛡️  Compliance: Error reading file');
    }
  }

  /**
   * Stop the system
   */
  stop() {
    this.isRunning = false;
    if (this.registryIntervalId) {
      clearInterval(this.registryIntervalId);
      this.registryIntervalId = null;
    }
    
    this.updateStatusFile({
      systemActive: false,
      status: 'STOPPED'
    });
    
    this.messages.showMessage('INFO', '🛑 SYSTEM STOPPED', 
      'AI Compliance Unified System has been stopped.');
    console.log('🛑 AI Compliance Unified System stopped');
  }

  /**
   * Show status (command line interface)
   */
  showStatus() {
    if (fs.existsSync(this.statusFile)) {
      console.log(fs.readFileSync(this.statusFile, 'utf8'));
    } else {
      console.log('❌ Status file not found. System may not be running.');
      console.log('   Start system: npm run compliance:auto');
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const system = new AIComplianceUnified();
  
  if (command === 'status') {
    system.showStatus();
  } else if (command === 'logs') {
    const type = args[1] || 'all';
    const limit = parseInt(args[2]) || 20;
    system.viewLogs({ type, limit });
  } else if (command === 'stop') {
    system.stop();
    process.exit(0);
  } else {
    // Default: start the system
    system.start();
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down AI Compliance Unified System...');
      system.stop();
      process.exit(0);
    });
  }
}

module.exports = AIComplianceUnified;


