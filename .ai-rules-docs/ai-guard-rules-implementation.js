/**
 * AI Guard Rules Implementation System
 * 
 * This system enforces the AI guard rules and development standards
 * as defined in the guard-rails-ai-instructions.md
 */

class AIGuardRulesSystem {
  constructor() {
    this.overrideActive = false;
    this.overrideSettings = null;
    this.emergencyActive = false;
    this.currentMode = 'IMPROVE'; // Default mode
    this.registry = null;
    this.progress = null;
    this.tracking = null;
    
    // Override commands
    this.overrideCommands = {
      '@override': 'Temporarily disable all guard rails',
      '@free': 'Allow all actions without restrictions',
      '@unlock': 'Remove all blocks and validations',
      '@disable-guard-rails': 'Completely disable guard rails system',
      '@emergency': 'Emergency override for critical fixes',
      '@reactivate-guard-rails': 'Re-enable guard rails system',
      '@no-react-standards': 'Disable React standards only',
      '@no-tailwind-standards': 'Disable Tailwind standards only',
      '@no-supabase-standards': 'Disable Supabase standards only',
      '@no-shadcn-standards': 'Disable shadcn standards only'
    };
    
    // Mode commands
    this.modeCommands = {
      '@rebuild': 'REBUILD',
      '@improve': 'IMPROVE', 
      '@new': 'NEW_FEATURE',
      '@defensive': 'DEFENSIVE'
    };
    
    // Development standards
    this.standards = {
      react: true,
      tailwind: true,
      nextjs: true,
      supabase: true,
      shadcn: true
    };
  }
  
  /**
   * Main entry point - check if action is allowed
   */
  async checkAction(action, userMessage = '') {
    console.log('🛡️ AI GUARD RULES: Checking action...', action);
    
    // STEP 1: Check for override commands
    if (this.checkForOverrideCommand(userMessage)) {
      this.handleOverrideCommand(userMessage);
    }
    
    // STEP 2: Check for mode commands
    if (this.checkForModeCommand(userMessage)) {
      this.handleModeCommand(userMessage);
    }
    
    // STEP 3: Check if override is active
    if (this.overrideActive) {
      if (this.isActionAllowed(action.type)) {
        console.log('🚫 OVERRIDE ACTIVE - Action allowed:', action.type);
        return { allowed: true, reason: 'OVERRIDE_ACTIVE' };
      }
    }
    
    // STEP 4: Check for emergency override
    if (this.emergencyActive) {
      console.log('🚨 EMERGENCY OVERRIDE - Action allowed:', action.type);
      return { allowed: true, reason: 'EMERGENCY_OVERRIDE_ACTIVE' };
    }
    
    // STEP 5: Load registry and progress data
    await this.loadData();
    
    // STEP 6: Check registry compliance
    const registryCheck = await this.checkRegistry(action.targetFile);
    if (!registryCheck.allowed) {
      return this.blockAction('REGISTRY_VIOLATION', registryCheck.reason);
    }
    
    // STEP 7: Check progress compliance
    const progressCheck = await this.checkProgress(action.type);
    if (!progressCheck.allowed) {
      return this.blockAction('PROGRESS_VIOLATION', progressCheck.reason);
    }
    
    // STEP 8: Check incremental compliance
    const incrementalCheck = await this.checkIncremental(action);
    if (!incrementalCheck.allowed) {
      return this.blockAction('INCREMENTAL_VIOLATION', incrementalCheck.reason);
    }
    
    // STEP 9: Check development standards
    const standardsCheck = await this.checkDevelopmentStandards(action);
    if (!standardsCheck.allowed) {
      return this.blockAction('STANDARDS_VIOLATION', standardsCheck.reason);
    }
    
    // STEP 10: Mode-specific checks
    const modeCheck = await this.checkModeSpecific(action);
    if (!modeCheck.allowed) {
      return this.blockAction('MODE_VIOLATION', modeCheck.reason);
    }
    
    console.log('✅ AI GUARD RULES: Action allowed');
    return { allowed: true, reason: 'ALL_CHECKS_PASSED' };
  }
  
  /**
   * Check for override commands in user message
   */
  checkForOverrideCommand(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    return Object.keys(this.overrideCommands).some(command => 
      lowerMessage.includes(command.toLowerCase())
    );
  }
  
  /**
   * Check for mode commands in user message
   */
  checkForModeCommand(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    return Object.keys(this.modeCommands).some(command => 
      lowerMessage.includes(command.toLowerCase())
    );
  }
  
  /**
   * Handle override commands
   */
  handleOverrideCommand(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('@override')) {
      const reason = this.extractReason(userMessage);
      this.activateOverride(reason || 'User override requested');
    }
    else if (lowerMessage.includes('@free') || lowerMessage.includes('@unlock')) {
      this.activateOverride('Full access requested', ['all']);
    }
    else if (lowerMessage.includes('@disable-guard-rails')) {
      this.activateOverride('Guard rails disabled', ['all']);
    }
    else if (lowerMessage.includes('@emergency')) {
      const reason = this.extractReason(userMessage);
      this.activateEmergency(reason || 'Emergency override');
    }
    else if (lowerMessage.includes('@reactivate-guard-rails')) {
      this.deactivateOverride();
    }
    else if (lowerMessage.includes('@no-react-standards')) {
      this.standards.react = false;
      console.log('🚫 React standards disabled');
    }
    else if (lowerMessage.includes('@no-tailwind-standards')) {
      this.standards.tailwind = false;
      console.log('🚫 Tailwind standards disabled');
    }
    else if (lowerMessage.includes('@no-supabase-standards')) {
      this.standards.supabase = false;
      console.log('🚫 Supabase standards disabled');
    }
    else if (lowerMessage.includes('@no-shadcn-standards')) {
      this.standards.shadcn = false;
      console.log('🚫 shadcn standards disabled');
    }
  }
  
  /**
   * Handle mode commands
   */
  handleModeCommand(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    for (const [command, mode] of Object.entries(this.modeCommands)) {
      if (lowerMessage.includes(command)) {
        this.currentMode = mode;
        console.log(`🎯 MODE CHANGED: ${mode}`);
        break;
      }
    }
  }
  
  /**
   * Activate override
   */
  activateOverride(reason, allowedActions = ['all'], duration) {
    this.overrideActive = true;
    this.overrideSettings = {
      userOverride: true,
      overrideReason: reason,
      timestamp: new Date().toISOString(),
      allowedActions,
      duration,
      emergencyMode: false
    };
    console.log('🚫 GUARD RAILS OVERRIDE ACTIVATED:', reason);
    
    if (duration) {
      setTimeout(() => {
        this.deactivateOverride();
        console.log('⏰ GUARD RAILS OVERRIDE EXPIRED');
      }, duration * 60 * 1000);
    }
  }
  
  /**
   * Activate emergency override
   */
  activateEmergency(reason) {
    this.emergencyActive = true;
    this.overrideActive = true;
    this.overrideSettings = {
      userOverride: true,
      overrideReason: `EMERGENCY: ${reason}`,
      timestamp: new Date().toISOString(),
      allowedActions: ['all'],
      emergencyMode: true
    };
    console.log('🚨 EMERGENCY OVERRIDE ACTIVATED:', reason);
  }
  
  /**
   * Deactivate override
   */
  deactivateOverride() {
    this.overrideActive = false;
    this.overrideSettings = null;
    this.emergencyActive = false;
    console.log('✅ GUARD RAILS REACTIVATED');
  }
  
  /**
   * Check if action is allowed during override
   */
  isActionAllowed(actionType) {
    if (!this.overrideActive) return false;
    
    if (this.overrideSettings?.allowedActions.includes('all')) {
      return true;
    }
    
    return this.overrideSettings?.allowedActions.includes(actionType) || false;
  }
  
  /**
   * Extract reason from user message
   */
  extractReason(message) {
    const match = message.match(/@\w+\s*-\s*(.+)/);
    return match ? match[1].trim() : null;
  }
  
  /**
   * Load registry and progress data
   */
  async loadData() {
    try {
      // Load function registry
      const registryResponse = await fetch('/function-registry.json');
      if (registryResponse.ok) {
        this.registry = await registryResponse.json();
      }
      
      // Load progress log
      const progressResponse = await fetch('/progress-log.json');
      if (progressResponse.ok) {
        this.progress = await progressResponse.json();
      }
      
      // Load tracking system
      const trackingResponse = await fetch('/ai-tracking-system.json');
      if (trackingResponse.ok) {
        this.tracking = await trackingResponse.json();
      }
    } catch (error) {
      console.warn('⚠️ Could not load guard rails data:', error);
    }
  }
  
  /**
   * Check registry compliance
   */
  async checkRegistry(file) {
    if (!this.registry) return { allowed: true };
    
    const functionEntry = this.registry[file];
    if (!functionEntry) {
      return { allowed: true }; // New function, allowed
    }
    
    if (functionEntry.status === 'completed') {
      if (functionEntry.touch_again === false) {
        return {
          allowed: false,
          reason: `File ${file} is marked as completed and DO NOT TOUCH`
        };
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Check progress compliance
   */
  async checkProgress(actionType) {
    if (!this.progress) return { allowed: true };
    
    const currentFocus = this.progress.session_2025_01_16?.current_focus;
    if (!currentFocus) return { allowed: true };
    
    if (!this.matchesCurrentFocus(actionType, currentFocus)) {
      return {
        allowed: false,
        reason: `Action '${actionType}' does not match current focus '${currentFocus}'`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check incremental compliance
   */
  async checkIncremental(action) {
    // Check if action rebuilds existing code
    if (this.isRebuildingExistingCode(action)) {
      return {
        allowed: false,
        reason: 'Action rebuilds existing working code'
      };
    }
    
    // Check if action jumps to new features
    if (this.isJumpingToNewFeatures(action)) {
      return {
        allowed: false,
        reason: 'Action jumps to new features before completing current focus'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check development standards
   */
  async checkDevelopmentStandards(action) {
    const violations = [];
    
    // Check React standards
    if (this.standards.react && action.file?.endsWith('.tsx')) {
      const reactViolations = this.checkReactStandards(action.content);
      violations.push(...reactViolations);
    }
    
    // Check Tailwind standards
    if (this.standards.tailwind && action.content?.includes('className=')) {
      const tailwindViolations = this.checkTailwindStandards(action.content);
      violations.push(...tailwindViolations);
    }
    
    // Check Next.js standards
    if (this.standards.nextjs && action.file?.includes('app/')) {
      const nextjsViolations = this.checkNextJSStandards(action.content);
      violations.push(...nextjsViolations);
    }
    
    // Check Supabase standards
    if (this.standards.supabase && action.content?.includes('supabase')) {
      const supabaseViolations = this.checkSupabaseStandards(action.content);
      violations.push(...supabaseViolations);
    }
    
    // Check shadcn/ui standards
    if (this.standards.shadcn && action.userRequest) {
      const shadcnViolations = this.checkShadcnStandards(action.content, action.userRequest);
      violations.push(...shadcnViolations);
    }
    
    if (violations.length > 0) {
      return {
        allowed: false,
        reason: `Development standards violations: ${violations.map(v => v.message).join(', ')}`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check mode-specific rules
   */
  async checkModeSpecific(action) {
    switch (this.currentMode) {
      case 'REBUILD':
        return this.checkRebuildMode(action);
      case 'IMPROVE':
        return this.checkImproveMode(action);
      case 'NEW_FEATURE':
        return this.checkNewFeatureMode(action);
      case 'DEFENSIVE':
        return this.checkDefensiveMode(action);
      default:
        return { allowed: true };
    }
  }
  
  /**
   * Check rebuild mode rules
   */
  checkRebuildMode(action) {
    // REBUILD mode: Must implement ALL functionality, cannot skip features
    if (action.type === 'skip_implementation') {
      return {
        allowed: false,
        reason: 'REBUILD mode: Cannot skip implementation of any features'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check improve mode rules
   */
  checkImproveMode(action) {
    // IMPROVE mode: Must test changes, cannot break existing functionality
    if (action.type === 'untested_change') {
      return {
        allowed: false,
        reason: 'IMPROVE mode: All changes must be tested'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check new feature mode rules
   */
  checkNewFeatureMode(action) {
    // NEW_FEATURE mode: Cannot touch completed functions
    if (action.targetFile && this.registry?.[action.targetFile]?.status === 'completed') {
      return {
        allowed: false,
        reason: 'NEW_FEATURE mode: Cannot touch completed functions'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check defensive mode rules
   */
  checkDefensiveMode(action) {
    // DEFENSIVE mode: Read-only operations only
    if (action.type !== 'read_only') {
      return {
        allowed: false,
        reason: 'DEFENSIVE mode: Only read-only operations allowed'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check React standards
   */
  checkReactStandards(content) {
    const violations = [];
    
    // Check PascalCase file naming
    if (!this.isPascalCase(this.getFileName())) {
      violations.push({
        type: 'REACT_NAMING_VIOLATION',
        message: 'Component files must use PascalCase naming'
      });
    }
    
    // Check TypeScript interfaces
    if (!content.includes('interface') && content.includes('props')) {
      violations.push({
        type: 'REACT_INTERFACE_VIOLATION',
        message: 'Props must be defined using TypeScript interfaces'
      });
    }
    
    return violations;
  }
  
  /**
   * Check Tailwind standards
   */
  checkTailwindStandards(content) {
    const violations = [];
    
    // Check for @apply usage
    if (content.includes('@apply')) {
      violations.push({
        type: 'TAILWIND_APPLY_VIOLATION',
        message: 'Avoid @apply - use utility classes directly'
      });
    }
    
    // Check for inline styles
    if (content.includes('style=')) {
      violations.push({
        type: 'TAILWIND_INLINE_STYLES_VIOLATION',
        message: 'Avoid inline styles - use Tailwind utilities'
      });
    }
    
    return violations;
  }
  
  /**
   * Check Next.js standards
   */
  checkNextJSStandards(content) {
    const violations = [];
    
    // Check for 'use client' placement
    if (content.includes('useState') && !content.startsWith("'use client';")) {
      violations.push({
        type: 'NEXTJS_CLIENT_DIRECTIVE_VIOLATION',
        message: 'Client components must start with "use client" directive'
      });
    }
    
    return violations;
  }
  
  /**
   * Check Supabase standards
   */
  checkSupabaseStandards(content) {
    const violations = [];
    
    // Check for deprecated auth-helpers-nextjs imports
    if (content.includes('@supabase/auth-helpers-nextjs')) {
      violations.push({
        type: 'SUPABASE_DEPRECATED_IMPORT_VIOLATION',
        message: 'NEVER use @supabase/auth-helpers-nextjs - it will BREAK the application'
      });
    }
    
    // Check for deprecated cookie methods
    if (content.includes('cookies: {') && (content.includes('get(') || content.includes('set(') || content.includes('remove('))) {
      violations.push({
        type: 'SUPABASE_DEPRECATED_COOKIE_VIOLATION',
        message: 'NEVER use individual cookie methods (get/set/remove) - they BREAK the application'
      });
    }
    
    return violations;
  }
  
  /**
   * Check shadcn/ui standards
   */
  checkShadcnStandards(content, userRequest) {
    const violations = [];
    
    const shadcnComponents = [
      'sidebar', 'button', 'card', 'input', 'select', 'dialog', 'sheet', 'table',
      'form', 'checkbox', 'radio', 'switch', 'slider', 'progress', 'badge',
      'alert', 'toast', 'dropdown', 'navigation', 'breadcrumb', 'pagination',
      'tabs', 'accordion', 'carousel', 'calendar', 'popover', 'tooltip'
    ];
    
    const requestedComponent = this.detectRequestedComponent(userRequest);
    
    if (shadcnComponents.includes(requestedComponent)) {
      // Check if using shadcn/ui component
      if (!this.isUsingShadcnComponent(content, requestedComponent)) {
        violations.push({
          type: 'SHADCN_COMPONENT_VIOLATION',
          message: `User requested ${requestedComponent} - MUST use shadcn/ui component`
        });
      }
      
      // Check if creating custom implementation
      if (this.isCreatingCustomComponent(content, requestedComponent)) {
        violations.push({
          type: 'SHADCN_CUSTOM_IMPLEMENTATION_VIOLATION',
          message: `DO NOT create custom ${requestedComponent} - use shadcn/ui component`
        });
      }
    }
    
    return violations;
  }
  
  /**
   * Helper methods
   */
  isPascalCase(str) {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }
  
  getFileName() {
    // Extract filename from file path
    return 'ComponentName'; // Placeholder
  }
  
  isRebuildingExistingCode(action) {
    const rebuildPatterns = [/rebuild/i, /refactor/i, /rewrite/i, /create.*new.*system/i];
    return rebuildPatterns.some(pattern => pattern.test(action.description));
  }
  
  isJumpingToNewFeatures(action) {
    const newFeaturePatterns = [/new.*feature/i, /prototype/i, /experiment/i];
    return newFeaturePatterns.some(pattern => pattern.test(action.description));
  }
  
  matchesCurrentFocus(actionType, currentFocus) {
    // Simple matching logic - can be enhanced
    return actionType.toLowerCase().includes(currentFocus.toLowerCase()) ||
           currentFocus.toLowerCase().includes(actionType.toLowerCase());
  }
  
  detectRequestedComponent(userRequest) {
    const lowerRequest = userRequest.toLowerCase();
    const componentKeywords = {
      'sidebar': ['sidebar', 'navigation', 'nav'],
      'button': ['button', 'btn'],
      'card': ['card', 'panel'],
      'input': ['input', 'field', 'form field'],
      'select': ['select', 'dropdown', 'picker'],
      'dialog': ['dialog', 'modal', 'popup'],
      'sheet': ['sheet', 'drawer', 'side panel'],
      'table': ['table', 'grid', 'list']
    };
    
    for (const [component, keywords] of Object.entries(componentKeywords)) {
      if (keywords.some(keyword => lowerRequest.includes(keyword))) {
        return component;
      }
    }
    
    return '';
  }
  
  isUsingShadcnComponent(content, component) {
    const shadcnImportPatterns = [
      `from "@/components/ui/${component}"`,
      `from "@/components/ui/${component}.tsx"`,
      `import { ${this.getShadcnImportName(component)} } from "@/components/ui/${component}"`
    ];
    
    return shadcnImportPatterns.some(pattern => content.includes(pattern));
  }
  
  isCreatingCustomComponent(content, component) {
    const customPatterns = [
      `const ${component} =`,
      `function ${component}(`,
      `export const ${component}`,
      `export default function ${component}`
    ];
    
    return customPatterns.some(pattern => content.includes(pattern));
  }
  
  getShadcnImportName(component) {
    const importMap = {
      'sidebar': 'Sidebar',
      'button': 'Button',
      'card': 'Card',
      'input': 'Input',
      'select': 'Select',
      'dialog': 'Dialog',
      'sheet': 'Sheet',
      'table': 'Table'
    };
    
    return importMap[component] || component;
  }
  
  /**
   * Block action with reason
   */
  blockAction(type, reason) {
    console.log(`🚫 AI GUARD RULES BLOCKED: ${type} - ${reason}`);
    return {
      allowed: false,
      reason: `${type}: ${reason}`
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIGuardRulesSystem;
}

// Global access
if (typeof window !== 'undefined') {
  window.AIGuardRulesSystem = AIGuardRulesSystem;
}




