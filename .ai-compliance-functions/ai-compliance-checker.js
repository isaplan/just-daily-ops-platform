#!/usr/bin/env node

/**
 * AI Instructions Compliance Checker
 * Systematically checks every function and code section for rule violations
 * 
 * Rules to enforce:
 * 1. NEVER Touch Completed Functions
 * 2. Always Check Registry First
 * 3. Incremental Progress Only
 * 4. Track All Progress
 */

const fs = require('fs');
const path = require('path');

class AIComplianceChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.progressPath = path.join(this.projectRoot, 'progress-log.json');
    this.trackingPath = path.join(this.projectRoot, 'ai-tracking-system.json');
    this.instructionsPath = path.join(this.projectRoot, 'ai-instructions.md');
    
    this.violations = [];
    this.checks = [];
    this.completedFunctions = new Set();
    this.currentFocus = null;
  }

  async runFullComplianceCheck() {
    console.log('🔍 AI COMPLIANCE CHECKER - Starting Full System Check');
    console.log('=' .repeat(60));
    
    try {
      // Load tracking files
      await this.loadTrackingFiles();
      
      // Check 1: Registry Protection
      await this.checkRegistryProtection();
      
      // Check 2: Function Modification Detection
      await this.checkFunctionModifications();
      
      // Check 3: Incremental Progress
      await this.checkIncrementalProgress();
      
      // Check 4: Progress Tracking
      await this.checkProgressTracking();
      
      // Check 5: Rule Adherence
      await this.checkRuleAdherence();
      
      // Generate report
      this.generateComplianceReport();
      
    } catch (error) {
      console.error('❌ Compliance check failed:', error);
    }
  }

  async loadTrackingFiles() {
    console.log('📋 Loading tracking files...');
    
    try {
      // Load function registry
      if (fs.existsSync(this.registryPath)) {
        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        Object.values(registry).forEach(func => {
          if (func.status === 'completed' && func.touch_again === false) {
            this.completedFunctions.add(func.file);
          }
        });
        console.log(`✅ Loaded ${this.completedFunctions.size} completed functions`);
      }
      
      // Load progress log
      if (fs.existsSync(this.progressPath)) {
        const progress = JSON.parse(fs.readFileSync(this.progressPath, 'utf8'));
        this.currentFocus = progress.session_2025_01_16?.current_focus || 'Unknown';
        console.log(`✅ Current focus: ${this.currentFocus}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to load tracking files:', error);
      throw error;
    }
  }

  async checkRegistryProtection() {
    console.log('\n🔒 CHECK 1: Registry Protection');
    console.log('-'.repeat(40));
    
    const check = {
      name: 'Registry Protection',
      status: 'PASS',
      details: []
    };
    
    // Check if registry exists and is valid
    if (!fs.existsSync(this.registryPath)) {
      check.status = 'FAIL';
      check.details.push('❌ function-registry.json not found');
      this.violations.push('Missing function registry');
    } else {
      check.details.push('✅ function-registry.json exists');
      
      // Check if completed functions are properly marked
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      const completedCount = Object.values(registry).filter(f => f.status === 'completed').length;
      check.details.push(`✅ ${completedCount} functions marked as completed`);
      
      // Check touch_again flags
      const protectedCount = Object.values(registry).filter(f => f.touch_again === false).length;
      check.details.push(`✅ ${protectedCount} functions marked as DO NOT TOUCH`);
    }
    
    this.checks.push(check);
  }

  async checkFunctionModifications() {
    console.log('\n🔍 CHECK 2: Function Modification Detection');
    console.log('-'.repeat(40));
    
    const check = {
      name: 'Function Modification Detection',
      status: 'PASS',
      details: []
    };
    
    // Check each completed function for recent modifications
    for (const funcFile of this.completedFunctions) {
      const filePath = path.join(this.projectRoot, funcFile);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const lastModified = new Date(stats.mtime);
        const now = new Date();
        const hoursSinceModified = (now - lastModified) / (1000 * 60 * 60);
        
        if (hoursSinceModified < 24) {
          check.status = 'WARNING';
          check.details.push(`⚠️  ${funcFile} modified ${hoursSinceModified.toFixed(1)} hours ago`);
        } else {
          check.details.push(`✅ ${funcFile} not modified recently`);
        }
      } else {
        check.details.push(`❌ ${funcFile} not found (may have been deleted)`);
        check.status = 'FAIL';
        this.violations.push(`Completed function ${funcFile} not found`);
      }
    }
    
    this.checks.push(check);
  }

  async checkIncrementalProgress() {
    console.log('\n📈 CHECK 3: Incremental Progress');
    console.log('-'.repeat(40));
    
    const check = {
      name: 'Incremental Progress',
      status: 'PASS',
      details: []
    };
    
    // Check if current focus is clear and single
    if (this.currentFocus && this.currentFocus !== 'Unknown') {
      check.details.push(`✅ Current focus: ${this.currentFocus}`);
      
      // Check if focus is appropriate for current stage
      const validFoci = ['Deploy to Vercel', 'Test deployed application', 'Database Migration', 'Edge Functions Migration'];
      if (validFoci.includes(this.currentFocus)) {
        check.details.push('✅ Focus is appropriate for current stage');
      } else {
        check.status = 'WARNING';
        check.details.push(`⚠️  Focus "${this.currentFocus}" may not be appropriate`);
      }
    } else {
      check.status = 'FAIL';
      check.details.push('❌ No clear current focus identified');
      this.violations.push('No clear current focus');
    }
    
    this.checks.push(check);
  }

  async checkProgressTracking() {
    console.log('\n📊 CHECK 4: Progress Tracking');
    console.log('-'.repeat(40));
    
    const check = {
      name: 'Progress Tracking',
      status: 'PASS',
      details: []
    };
    
    // Check if all tracking files exist
    const trackingFiles = [
      'function-registry.json',
      'progress-log.json', 
      'ai-tracking-system.json',
      'ai-instructions.md'
    ];
    
    for (const file of trackingFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        check.details.push(`✅ ${file} exists`);
      } else {
        check.status = 'FAIL';
        check.details.push(`❌ ${file} missing`);
        this.violations.push(`Missing tracking file: ${file}`);
      }
    }
    
    // Check if progress log is up to date
    if (fs.existsSync(this.progressPath)) {
      const progress = JSON.parse(fs.readFileSync(this.progressPath, 'utf8'));
      const lastUpdated = new Date(progress._metadata.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        check.details.push(`✅ Progress log updated ${hoursSinceUpdate.toFixed(1)} hours ago`);
      } else {
        check.status = 'WARNING';
        check.details.push(`⚠️  Progress log not updated recently (${hoursSinceUpdate.toFixed(1)} hours ago)`);
      }
    }
    
    this.checks.push(check);
  }

  async checkRuleAdherence() {
    console.log('\n📋 CHECK 5: Rule Adherence');
    console.log('-'.repeat(40));
    
    const check = {
      name: 'Rule Adherence',
      status: 'PASS',
      details: []
    };
    
    // Check if AI instructions are being followed
    if (fs.existsSync(this.instructionsPath)) {
      const instructions = fs.readFileSync(this.instructionsPath, 'utf8');
      
      // Check for key rule indicators
      const ruleIndicators = [
        'NEVER Touch Completed Functions',
        'Always Check Registry First',
        'Incremental Progress Only',
        'Track All Progress'
      ];
      
      for (const rule of ruleIndicators) {
        if (instructions.includes(rule)) {
          check.details.push(`✅ Rule "${rule}" documented`);
        } else {
          check.status = 'WARNING';
          check.details.push(`⚠️  Rule "${rule}" not found in instructions`);
        }
      }
    }
    
    // Check if system is marked as active
    if (fs.existsSync(this.trackingPath)) {
      const tracking = JSON.parse(fs.readFileSync(this.trackingPath, 'utf8'));
      if (tracking._metadata?.activated === true) {
        check.details.push('✅ AI tracking system is active');
      } else {
        check.status = 'WARNING';
        check.details.push('⚠️  AI tracking system may not be active');
      }
    }
    
    this.checks.push(check);
  }

  generateComplianceReport() {
    console.log('\n📊 COMPLIANCE REPORT');
    console.log('=' .repeat(60));
    
    const totalChecks = this.checks.length;
    const passedChecks = this.checks.filter(c => c.status === 'PASS').length;
    const warningChecks = this.checks.filter(c => c.status === 'WARNING').length;
    const failedChecks = this.checks.filter(c => c.status === 'FAIL').length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);
    console.log(`⚠️  Warnings: ${warningChecks}/${totalChecks}`);
    console.log(`❌ Failed: ${failedChecks}/${totalChecks}`);
    
    if (this.violations.length > 0) {
      console.log(`\n🚨 VIOLATIONS DETECTED:`);
      this.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation}`);
      });
    }
    
    console.log(`\n📋 DETAILED RESULTS:`);
    this.checks.forEach((check, index) => {
      console.log(`\n${index + 1}. ${check.name} - ${check.status}`);
      check.details.forEach(detail => {
        console.log(`   ${detail}`);
      });
    });
    
    // Overall compliance status
    const complianceScore = (passedChecks / totalChecks) * 100;
    console.log(`\n🎯 COMPLIANCE SCORE: ${complianceScore.toFixed(1)}%`);
    
    if (complianceScore >= 90) {
      console.log('🟢 EXCELLENT COMPLIANCE');
    } else if (complianceScore >= 70) {
      console.log('🟡 GOOD COMPLIANCE - Minor issues detected');
    } else {
      console.log('🔴 POOR COMPLIANCE - Major issues detected');
    }
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      complianceScore,
      totalChecks,
      passedChecks,
      warningChecks,
      failedChecks,
      violations: this.violations,
      checks: this.checks
    };
    
    fs.writeFileSync(
      path.join(this.projectRoot, 'ai-compliance-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Compliance report saved to ai-compliance-report.json');
  }
}

// Run the compliance checker
if (require.main === module) {
  const checker = new AIComplianceChecker();
  checker.runFullComplianceCheck().catch(console.error);
}

module.exports = AIComplianceChecker;
