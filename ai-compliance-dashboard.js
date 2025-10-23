#!/usr/bin/env node

/**
 * AI Compliance Dashboard - Real-time Status Display
 * Shows current compliance status and monitoring information
 */

const fs = require('fs');
const path = require('path');

class AIComplianceDashboard {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.progressPath = path.join(this.projectRoot, 'progress-log.json');
    this.trackingPath = path.join(this.projectRoot, 'ai-tracking-system.json');
    this.instructionsPath = path.join(this.projectRoot, 'ai-instructions.md');
  }

  loadData() {
    const data = {
      registry: null,
      progress: null,
      tracking: null,
      instructions: null
    };

    try {
      if (fs.existsSync(this.registryPath)) {
        data.registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      }
      if (fs.existsSync(this.progressPath)) {
        data.progress = JSON.parse(fs.readFileSync(this.progressPath, 'utf8'));
      }
      if (fs.existsSync(this.trackingPath)) {
        data.tracking = JSON.parse(fs.readFileSync(this.trackingPath, 'utf8'));
      }
      if (fs.existsSync(this.instructionsPath)) {
        data.instructions = fs.readFileSync(this.instructionsPath, 'utf8');
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    }

    return data;
  }

  generateDashboard() {
    console.log('📊 AI COMPLIANCE DASHBOARD');
    console.log('=' .repeat(60));
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log(`Project: ${path.basename(this.projectRoot)}`);
    
    const data = this.loadData();
    
    // System Status
    this.displaySystemStatus(data);
    
    // Registry Status
    this.displayRegistryStatus(data.registry);
    
    // Progress Status
    this.displayProgressStatus(data.progress);
    
    // Compliance Status
    this.displayComplianceStatus(data);
    
    // Recommendations
    this.displayRecommendations(data);
    
    console.log('\n' + '=' .repeat(60));
  }

  displaySystemStatus(data) {
    console.log('\n🔧 SYSTEM STATUS');
    console.log('-'.repeat(30));
    
    const systemActive = data.tracking?._metadata?.activated === true;
    const lastUpdated = data.tracking?._metadata?.lastUpdated;
    
    console.log(`Status: ${systemActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
    console.log(`Last Updated: ${lastUpdated || 'Unknown'}`);
    console.log(`Tracking Files: ${this.countTrackingFiles()}/4`);
    
    if (systemActive) {
      console.log('✅ AI tracking system is operational');
    } else {
      console.log('❌ AI tracking system may not be active');
    }
  }

  displayRegistryStatus(registry) {
    console.log('\n📋 FUNCTION REGISTRY STATUS');
    console.log('-'.repeat(30));
    
    if (!registry) {
      console.log('❌ Registry not found');
      return;
    }
    
    const totalFunctions = Object.keys(registry).length - 1; // Exclude metadata
    const completedFunctions = Object.values(registry).filter(f => f.status === 'completed').length;
    const protectedFunctions = Object.values(registry).filter(f => f.touch_again === false).length;
    
    console.log(`Total Functions: ${totalFunctions}`);
    console.log(`Completed Functions: ${completedFunctions}`);
    console.log(`Protected Functions: ${protectedFunctions}`);
    
    if (completedFunctions > 0) {
      console.log('\n🔒 PROTECTED FUNCTIONS:');
      Object.values(registry).forEach(func => {
        if (func.status === 'completed' && func.touch_again === false) {
          console.log(`  ✅ ${func.file} - ${func.description || 'No description'}`);
        }
      });
    }
  }

  displayProgressStatus(progress) {
    console.log('\n📈 PROGRESS STATUS');
    console.log('-'.repeat(30));
    
    if (!progress) {
      console.log('❌ Progress log not found');
      return;
    }
    
    const session = progress.session_2025_01_16;
    if (!session) {
      console.log('❌ No current session found');
      return;
    }
    
    console.log(`Current Focus: ${session.current_focus || 'Unknown'}`);
    console.log(`Completed Tasks: ${session.completed_tasks?.length || 0}`);
    console.log(`Pending Tasks: ${session.pending_tasks?.length || 0}`);
    
    if (session.completed_tasks?.length > 0) {
      console.log('\n✅ COMPLETED TASKS:');
      session.completed_tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.task} - ${task.result}`);
      });
    }
    
    if (session.pending_tasks?.length > 0) {
      console.log('\n⏳ PENDING TASKS:');
      session.pending_tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.task} - ${task.priority || 'Normal'}`);
      });
    }
  }

  displayComplianceStatus(data) {
    console.log('\n🛡️  COMPLIANCE STATUS');
    console.log('-'.repeat(30));
    
    const complianceScore = this.calculateComplianceScore(data);
    const violations = this.checkForViolations(data);
    
    console.log(`Compliance Score: ${complianceScore.toFixed(1)}%`);
    console.log(`Violations: ${violations.length}`);
    
    if (violations.length === 0) {
      console.log('✅ No violations detected');
    } else {
      console.log('\n🚨 VIOLATIONS:');
      violations.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation}`);
      });
    }
    
    // Check rule adherence
    const rules = [
      'NEVER Touch Completed Functions',
      'Always Check Registry First',
      'Incremental Progress Only',
      'Track All Progress'
    ];
    
    console.log('\n📋 RULE ADHERENCE:');
    rules.forEach(rule => {
      const isDocumented = data.instructions?.includes(rule);
      console.log(`  ${isDocumented ? '✅' : '❌'} ${rule}`);
    });
  }

  calculateComplianceScore(data) {
    let score = 0;
    let checks = 0;
    
    // Check if registry exists
    if (data.registry) {
      score += 25;
      checks++;
    }
    
    // Check if progress tracking exists
    if (data.progress) {
      score += 25;
      checks++;
    }
    
    // Check if tracking system is active
    if (data.tracking?._metadata?.activated === true) {
      score += 25;
      checks++;
    }
    
    // Check if instructions exist
    if (data.instructions) {
      score += 25;
      checks++;
    }
    
    return checks > 0 ? (score / checks) : 0;
  }

  checkForViolations(data) {
    const violations = [];
    
    // Check if completed functions exist
    if (data.registry) {
      Object.values(data.registry).forEach(func => {
        if (func.status === 'completed' && func.touch_again === false) {
          const filePath = path.join(this.projectRoot, func.file);
          if (!fs.existsSync(filePath)) {
            violations.push(`Completed function ${func.file} not found`);
          }
        }
      });
    }
    
    // Check if tracking files are missing
    const requiredFiles = ['function-registry.json', 'progress-log.json', 'ai-tracking-system.json', 'ai-instructions.md'];
    requiredFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        violations.push(`Required file ${file} missing`);
      }
    });
    
    return violations;
  }

  displayRecommendations(data) {
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(30));
    
    const recommendations = [];
    
    // Check for missing files
    if (!data.registry) {
      recommendations.push('Create function-registry.json');
    }
    
    if (!data.progress) {
      recommendations.push('Create progress-log.json');
    }
    
    if (!data.tracking) {
      recommendations.push('Create ai-tracking-system.json');
    }
    
    // Check for inactive system
    if (data.tracking?._metadata?.activated !== true) {
      recommendations.push('Activate AI tracking system');
    }
    
    // Check for outdated progress
    if (data.progress?._metadata?.lastUpdated) {
      const lastUpdated = new Date(data.progress._metadata.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 24) {
        recommendations.push('Update progress log (last updated over 24 hours ago)');
      }
    }
    
    if (recommendations.length === 0) {
      console.log('✅ No recommendations - system is in good shape');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }

  countTrackingFiles() {
    const files = ['function-registry.json', 'progress-log.json', 'ai-tracking-system.json', 'ai-instructions.md'];
    return files.filter(file => fs.existsSync(path.join(this.projectRoot, file))).length;
  }

  generateHTMLReport() {
    const data = this.loadData();
    const complianceScore = this.calculateComplianceScore(data);
    const violations = this.checkForViolations(data);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Compliance Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .status { font-weight: bold; }
        .good { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        .score { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Compliance Dashboard</h1>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
    
    <div class="section">
        <h2>Compliance Score</h2>
        <div class="score ${complianceScore >= 90 ? 'good' : complianceScore >= 70 ? 'warning' : 'error'}">
            ${complianceScore.toFixed(1)}%
        </div>
    </div>
    
    <div class="section">
        <h2>System Status</h2>
        <p>Tracking Files: ${this.countTrackingFiles()}/4</p>
        <p>Violations: ${violations.length}</p>
    </div>
    
    <div class="section">
        <h2>Protected Functions</h2>
        ${data.registry ? Object.values(data.registry).filter(f => f.status === 'completed').map(f => 
            `<p>✅ ${f.file}</p>`
        ).join('') : '<p>No registry data</p>'}
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(this.projectRoot, 'ai-compliance-dashboard.html'), html);
    console.log('\n💾 HTML dashboard saved to ai-compliance-dashboard.html');
  }
}

// Run the dashboard if called directly
if (require.main === module) {
  const dashboard = new AIComplianceDashboard();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--html')) {
    dashboard.generateHTMLReport();
  } else {
    dashboard.generateDashboard();
  }
}

module.exports = AIComplianceDashboard;
