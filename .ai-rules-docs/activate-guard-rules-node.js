/**
 * Activate AI Guard Rules System - Node.js Version
 * 
 * This script activates the AI guard rules system for development
 */

// Import the guard rules system
const AIGuardRulesSystem = require('./ai-guard-rules-implementation.js');

// Create global instance
const guardRules = new AIGuardRulesSystem();

// Override console.log to include guard rules status
const originalConsoleLog = console.log;
console.log = function(...args) {
  // Add guard rules status to console output
  const status = guardRules.overrideActive ? '🚫 OVERRIDE' : 
                 guardRules.emergencyActive ? '🚨 EMERGENCY' : 
                 `🛡️ GUARD [${guardRules.currentMode}]`;
  
  originalConsoleLog(`[${status}]`, ...args);
};

// Global function to check actions
global.checkAIAction = async function(action, userMessage = '') {
  return await guardRules.checkAction(action, userMessage);
};

// Global function to get status
global.getGuardRulesStatus = function() {
  return {
    overrideActive: guardRules.overrideActive,
    emergencyActive: guardRules.emergencyActive,
    currentMode: guardRules.currentMode,
    standards: guardRules.standards
  };
};

// Global function to activate override
global.activateGuardOverride = function(reason, allowedActions = ['all']) {
  guardRules.activateOverride(reason, allowedActions);
};

// Global function to deactivate override
global.deactivateGuardOverride = function() {
  guardRules.deactivateOverride();
};

// Auto-activate guard rules
console.log('🛡️ AI GUARD RULES SYSTEM ACTIVATED');
console.log('📋 Available commands: @override, @free, @unlock, @emergency, @reactivate-guard-rails');
console.log('🎯 Available modes: @rebuild, @improve, @new, @defensive');
console.log('🎮 Available standards: @no-react-standards, @no-tailwind-standards, @no-supabase-standards, @no-shadcn-standards');

// Export for Node.js
module.exports = {
  guardRules,
  checkAIAction: global.checkAIAction,
  getGuardRulesStatus: global.getGuardRulesStatus,
  activateGuardOverride: global.activateGuardOverride,
  deactivateGuardOverride: global.deactivateGuardOverride
};

