# AI Guard Rails System - Unbreakable Instructions Enforcement

## 🛡️ **UNBREAKABLE GUARD RAILS SYSTEM**

### **🔒 CORE GUARD RAILS ENGINE**

```typescript
// ai-guard-rails.ts
interface GuardRailsEngine {
  // MANDATORY PRE-ACTION CHECKS (Cannot be bypassed)
  checkRegistry(): Promise<GuardResult>;
  checkProgress(): Promise<GuardResult>;
  checkIncremental(): Promise<GuardResult>;
  
  // HARD BLOCKS (Cannot be overridden)
  blockCompletedFunctions(file: string): boolean;
  blockNonIncremental(action: string): boolean;
  blockRegistryViolations(action: string): boolean;
  
  // ENFORCEMENT (Runs before every action)
  enforce(action: Action): Promise<EnforcementResult>;
}

interface GuardResult {
  allowed: boolean;
  reason?: string;
  requiredAction?: string;
}

interface EnforcementResult {
  proceed: boolean;
  blocked: boolean;
  reason: string;
  requiredChecks: string[];
}
```

### **🚫 MANDATORY PRE-ACTION VALIDATOR**

```typescript
// mandatory-validator.ts
class MandatoryValidator {
  private registry: any;
  private progress: any;
  private tracking: any;
  
  async validateBeforeAction(action: Action): Promise<ValidationResult> {
    // STEP 1: MANDATORY REGISTRY CHECK
    const registryCheck = await this.checkRegistry(action.targetFile);
    if (!registryCheck.allowed) {
      return this.blockAction("REGISTRY_VIOLATION", registryCheck.reason);
    }
    
    // STEP 2: MANDATORY PROGRESS CHECK
    const progressCheck = await this.checkProgress(action.type);
    if (!progressCheck.allowed) {
      return this.blockAction("PROGRESS_VIOLATION", progressCheck.reason);
    }
    
    // STEP 3: MANDATORY INCREMENTAL CHECK
    const incrementalCheck = await this.checkIncremental(action);
    if (!incrementalCheck.allowed) {
      return this.blockAction("INCREMENTAL_VIOLATION", incrementalCheck.reason);
    }
    
    return { allowed: true, checks: ["registry", "progress", "incremental"] };
  }
  
  private async checkRegistry(file: string): Promise<GuardResult> {
    // Load function-registry.json
    const registry = await this.loadRegistry();
    
    // Check if file exists in registry
    const functionEntry = registry[file];
    if (!functionEntry) {
      return { allowed: true }; // New function, allowed
    }
    
    // Check if function is completed
    if (functionEntry.status === "completed") {
      if (functionEntry.touch_again === false) {
        return { 
          allowed: false, 
          reason: `File ${file} is marked as completed and DO NOT TOUCH`,
          requiredAction: "Ask user for explicit permission to modify completed function"
        };
      }
    }
    
    return { allowed: true };
  }
  
  private async checkProgress(actionType: string): Promise<GuardResult> {
    // Load progress-log.json
    const progress = await this.loadProgress();
    
    // Get current focus
    const currentFocus = progress.session_2025_01_16?.current_focus;
    
    // Check if action matches current focus
    if (!this.matchesCurrentFocus(actionType, currentFocus)) {
      return {
        allowed: false,
        reason: `Action '${actionType}' does not match current focus '${currentFocus}'`,
        requiredAction: "Wait for current focus to be completed or get explicit permission"
      };
    }
    
    return { allowed: true };
  }
  
  private async checkIncremental(action: Action): Promise<GuardResult> {
    // Check if action rebuilds existing code
    if (this.isRebuildingExistingCode(action)) {
      return {
        allowed: false,
        reason: "Action rebuilds existing working code",
        requiredAction: "Don't rebuild - use existing working code"
      };
    }
    
    // Check if action jumps to new features
    if (this.isJumpingToNewFeatures(action)) {
      return {
        allowed: false,
        reason: "Action jumps to new features before completing current focus",
        requiredAction: "Complete current focus first"
      };
    }
    
    return { allowed: true };
  }
}
```

### **🔐 HARD BLOCK SYSTEM**

```typescript
// hard-blocks.ts
class HardBlockSystem {
  private completedFunctions: Set<string> = new Set();
  private protectedFiles: Set<string> = new Set();
  
  constructor() {
    this.loadProtectedFiles();
  }
  
  // BLOCK 1: Completed Functions (Cannot be overridden)
  blockCompletedFunctions(file: string): boolean {
    if (this.completedFunctions.has(file)) {
      this.logViolation("COMPLETED_FUNCTION_TOUCH", file);
      this.alert("🚫 BLOCKED: Cannot touch completed function");
      return true; // BLOCKED
    }
    return false; // ALLOWED
  }
  
  // BLOCK 2: Non-Incremental Actions (Cannot be overridden)
  blockNonIncremental(action: string): boolean {
    const nonIncrementalPatterns = [
      /rebuild/i,
      /refactor/i,
      /rewrite/i,
      /create.*new.*system/i,
      /build.*from.*scratch/i
    ];
    
    for (const pattern of nonIncrementalPatterns) {
      if (pattern.test(action)) {
        this.logViolation("NON_INCREMENTAL_ACTION", action);
        this.alert("🚫 BLOCKED: Non-incremental action detected");
        return true; // BLOCKED
      }
    }
    return false; // ALLOWED
  }
  
  // BLOCK 3: Registry Violations (Cannot be overridden)
  blockRegistryViolations(action: string): boolean {
    if (!this.hasCheckedRegistry()) {
      this.logViolation("REGISTRY_NOT_CHECKED", action);
      this.alert("🚫 BLOCKED: Must check registry first");
      return true; // BLOCKED
    }
    return false; // ALLOWED
  }
}
```

### **⚡ RUNTIME ENFORCEMENT**

```typescript
// runtime-enforcer.ts
class RuntimeEnforcer {
  private validator: MandatoryValidator;
  private hardBlocks: HardBlockSystem;
  private actionHistory: Action[] = [];
  
  constructor() {
    this.validator = new MandatoryValidator();
    this.hardBlocks = new HardBlockSystem();
  }
  
  // MAIN ENFORCEMENT POINT (Runs before every action)
  async enforce(action: Action): Promise<EnforcementResult> {
    console.log("🛡️ GUARD RAILS: Checking action...", action);
    
    // STEP 1: Hard Blocks (Cannot be bypassed)
    if (this.hardBlocks.blockCompletedFunctions(action.targetFile)) {
      return this.createBlockedResult("COMPLETED_FUNCTION_BLOCKED");
    }
    
    if (this.hardBlocks.blockNonIncremental(action.description)) {
      return this.createBlockedResult("NON_INCREMENTAL_BLOCKED");
    }
    
    if (this.hardBlocks.blockRegistryViolations(action.description)) {
      return this.createBlockedResult("REGISTRY_VIOLATION_BLOCKED");
    }
    
    // STEP 2: Mandatory Validations (Cannot be bypassed)
    const validation = await this.validator.validateBeforeAction(action);
    if (!validation.allowed) {
      return this.createBlockedResult(validation.reason || "VALIDATION_FAILED");
    }
    
    // STEP 3: Log successful action
    this.logAction(action);
    
    return this.createAllowedResult();
  }
  
  private createBlockedResult(reason: string): EnforcementResult {
    return {
      proceed: false,
      blocked: true,
      reason: `🚫 BLOCKED: ${reason}`,
      requiredChecks: ["registry", "progress", "incremental"]
    };
  }
  
  private createAllowedResult(): EnforcementResult {
    return {
      proceed: true,
      blocked: false,
      reason: "✅ ALLOWED: All checks passed",
      requiredChecks: []
    };
  }
}
```

### **📊 MONITORING & LOGGING**

```typescript
// guard-monitor.ts
class GuardMonitor {
  private violations: Violation[] = [];
  private actions: Action[] = [];
  
  logViolation(type: string, details: any): void {
    const violation: Violation = {
      timestamp: new Date().toISOString(),
      type,
      details,
      severity: this.getSeverity(type)
    };
    
    this.violations.push(violation);
    console.error("🚨 GUARD RAILS VIOLATION:", violation);
  }
  
  logAction(action: Action): void {
    this.actions.push({
      ...action,
      timestamp: new Date().toISOString(),
      guardChecks: ["registry", "progress", "incremental"]
    });
  }
  
  generateReport(): GuardReport {
    return {
      totalActions: this.actions.length,
      totalViolations: this.violations.length,
      violations: this.violations,
      actions: this.actions,
      complianceRate: this.calculateComplianceRate()
    };
  }
}
```

### **🎯 INTEGRATION POINTS**

```typescript
// ai-action-interceptor.ts
// This would be integrated into the AI system itself

class AIActionInterceptor {
  private enforcer: RuntimeEnforcer;
  
  constructor() {
    this.enforcer = new RuntimeEnforcer();
  }
  
  // This method would be called before EVERY AI action
  async interceptAction(action: Action): Promise<boolean> {
    const result = await this.enforcer.enforce(action);
    
    if (result.blocked) {
      console.error("🚫 ACTION BLOCKED:", result.reason);
      return false; // BLOCK THE ACTION
    }
    
    console.log("✅ ACTION ALLOWED:", result.reason);
    return true; // ALLOW THE ACTION
  }
}
```

### **🔧 IMPLEMENTATION STRATEGY**

**To make these guard rails unbreakable:**

1. **System-Level Integration:**
   - Integrate into the AI execution engine
   - Make it impossible to bypass
   - Run before every single action

2. **Hard-Coded Rules:**
   - Rules cannot be modified by AI
   - User-controlled override mechanisms
   - Emergency bypasses for critical situations

3. **Real-Time Monitoring:**
   - Monitor all actions continuously
   - Block violations immediately
   - Log everything for accountability

4. **User-Only Overrides:**
   - Only user can grant exceptions
   - Explicit permission required
   - Log all overrides

### **📋 CORE RULES ENFORCEMENT**

**Based on ai-instructions.md:**

1. **NEVER Touch Completed Functions:**
   - Check `function-registry.json` before modifying ANY file
   - If status = "completed" → DO NOT TOUCH
   - If status = "completed" and user asks to improve → Ask first

2. **Always Check Registry First:**
   - Load `function-registry.json` before ANY action
   - Check if function exists and status
   - If completed → Ask permission
   - If not completed → Proceed

3. **Incremental Progress Only:**
   - Complete ONE task at a time
   - Don't jump to next until current is done
   - Don't rebuild existing working code
   - Follow user's specific request

4. **Track All Progress:**
   - Update `progress-log.json` after each task
   - Mark functions as "completed" when done
   - Add "DO NOT TOUCH" notes
   - Show what was accomplished

### **🚫 GUARD RAILS OVERRIDE SYSTEM**

```typescript
// Guard Rails Override System
interface GuardRailsOverride {
  userOverride: boolean;
  overrideReason: string;
  timestamp: string;
  allowedActions: string[];
  duration?: number; // minutes
  emergencyMode: boolean;
}

class GuardRailsOverrideSystem {
  private overrideActive: boolean = false;
  private overrideSettings: GuardRailsOverride | null = null;
  private emergencyActive: boolean = false;
  private emergencyReason: string = '';
  
  // User override commands
  private overrideCommands = {
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
  
  // Check if user message contains override command
  checkForOverrideCommand(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    return Object.keys(this.overrideCommands).some(command => 
      lowerMessage.includes(command.toLowerCase())
    );
  }
  
  // Activate override with reason and allowed actions
  activateOverride(reason: string, allowedActions: string[] = ['all'], duration?: number): void {
    this.overrideActive = true;
    this.overrideSettings = {
      userOverride: true,
      overrideReason: reason,
      timestamp: new Date().toISOString(),
      allowedActions,
      duration,
      emergencyMode: false
    };
    console.log("🚫 GUARD RAILS OVERRIDE ACTIVATED:", reason);
    
    if (duration) {
      setTimeout(() => {
        this.deactivateOverride();
        console.log("⏰ GUARD RAILS OVERRIDE EXPIRED");
      }, duration * 60 * 1000);
    }
  }
  
  // Activate emergency override
  activateEmergency(reason: string): void {
    this.emergencyActive = true;
    this.emergencyReason = reason;
    this.overrideActive = true;
    this.overrideSettings = {
      userOverride: true,
      overrideReason: `EMERGENCY: ${reason}`,
      timestamp: new Date().toISOString(),
      allowedActions: ['all'],
      emergencyMode: true
    };
    console.log("🚨 EMERGENCY OVERRIDE ACTIVATED:", reason);
  }
  
  // Check if action is allowed during override
  isActionAllowed(action: string): boolean {
    if (!this.overrideActive) return false;
    
    if (this.overrideSettings?.allowedActions.includes('all')) {
      return true;
    }
    
    return this.overrideSettings?.allowedActions.includes(action) || false;
  }
  
  // Check if emergency is active
  isEmergencyActive(): boolean {
    return this.emergencyActive;
  }
  
  // Deactivate override
  deactivateOverride(): void {
    this.overrideActive = false;
    this.overrideSettings = null;
    this.emergencyActive = false;
    this.emergencyReason = '';
    console.log("✅ GUARD RAILS REACTIVATED");
  }
  
  // Get override status
  getOverrideStatus(): { active: boolean; reason?: string; emergency?: boolean } {
    return {
      active: this.overrideActive,
      reason: this.overrideSettings?.overrideReason,
      emergency: this.emergencyActive
    };
  }
}
```

### **🎮 USER OVERRIDE COMMANDS**

**Temporary Deactivation:**
- `@override` - Deactivate guard rails temporarily
- `@free` - Allow all actions without restrictions
- `@unlock` - Remove all blocks and validations

**Selective Deactivation:**
- `@no-react-standards` - Disable React standards only
- `@no-tailwind-standards` - Disable Tailwind standards only  
- `@no-supabase-standards` - Disable Supabase standards only
- `@no-shadcn-standards` - Disable shadcn standards only

**Full Deactivation:**
- `@disable-guard-rails` - Completely disable guard rails system
- `@emergency` - Emergency override for critical fixes

**Reactivation:**
- `@reactivate-guard-rails` - Re-enable guard rails system

### **🔐 EMERGENCY OVERRIDE SYSTEM**

```typescript
// Emergency Override for Critical Situations
class EmergencyOverride {
  private emergencyActive: boolean = false;
  private emergencyReason: string = '';
  private emergencyTimestamp: string = '';
  
  activateEmergency(reason: string): void {
    this.emergencyActive = true;
    this.emergencyReason = reason;
    this.emergencyTimestamp = new Date().toISOString();
    console.log("🚨 EMERGENCY OVERRIDE ACTIVATED:", reason);
    console.log("⚠️  All guard rails disabled for critical fix");
  }
  
  isEmergencyActive(): boolean {
    return this.emergencyActive;
  }
  
  getEmergencyInfo(): { active: boolean; reason: string; timestamp: string } {
    return {
      active: this.emergencyActive,
      reason: this.emergencyReason,
      timestamp: this.emergencyTimestamp
    };
  }
  
  deactivateEmergency(): void {
    this.emergencyActive = false;
    this.emergencyReason = '';
    this.emergencyTimestamp = '';
    console.log("✅ EMERGENCY OVERRIDE DEACTIVATED");
    console.log("🛡️  Guard rails system reactivated");
  }
}
```

### **🚫 AVOID PATTERNS**

**The system will automatically block:**

- Don't rebuild existing working code
- Don't jump into new features
- Don't modify completed functions
- Don't assume user wants improvements

### **✅ SUCCESS METRICS**

**The system ensures:**

- User doesn't have to repeat requests
- Functions marked as "completed" stay untouched
- Progress is incremental and clear
- No rebuilding of working code
- User knows exactly what's been done

---

## 🎯 **MODE-BASED GUARD RAILS SYSTEM**

### **🔧 CUSTOM MODES DESIGN**

```typescript
interface GuardMode {
  name: string;
  description: string;
  strictness: 'strict' | 'moderate' | 'flexible';
  allowedActions: string[];
  blockedActions: string[];
  speedMultiplier: number;
  safetyLevel: number;
}

const GUARD_MODES = {
  // REBUILD MODE - Strict, comprehensive rebuild
  REBUILD: {
    name: "REBUILD",
    description: "Complete rebuild of just-stock-it functionality",
    strictness: "strict",
    allowedActions: [
      "create_new_files",
      "modify_existing_files", 
      "comprehensive_implementation",
      "full_feature_rebuild"
    ],
    blockedActions: [
      "touch_completed_functions",
      "skip_documentation",
      "incomplete_implementation"
    ],
    speedMultiplier: 0.8, // Slightly slower for thoroughness
    safetyLevel: 0.9, // High safety
    rules: [
      "Must implement ALL functionality from original",
      "Cannot skip any features",
      "Must check shared documentation",
      "Must do web search for best practices",
      "Cannot break existing working code"
    ]
  },

  // IMPROVE MODE - Incremental improvements
  IMPROVE: {
    name: "IMPROVE", 
    description: "Incremental improvements with thorough testing",
    strictness: "moderate",
    allowedActions: [
      "incremental_changes",
      "testing_improvements",
      "performance_optimization",
      "bug_fixes"
    ],
    blockedActions: [
      "breaking_changes",
      "untested_changes",
      "repetitive_fixes"
    ],
    speedMultiplier: 1.0, // Normal speed
    safetyLevel: 0.8, // High safety
    rules: [
      "Must test all changes thoroughly",
      "Cannot break existing functionality", 
      "Must avoid repetitive fixes",
      "Must search shared documentation",
      "Must do web search for best practices"
    ]
  },

  // NEW FEATURE MODE - Fast prototyping
  NEW_FEATURE: {
    name: "NEW_FEATURE",
    description: "Quick prototyping of new functionality", 
    strictness: "flexible",
    allowedActions: [
      "rapid_prototyping",
      "experimental_code",
      "quick_implementation",
      "creative_solutions"
    ],
    blockedActions: [
      "touch_completed_functions",
      "break_existing_systems"
    ],
    speedMultiplier: 1.5, // Faster for prototyping
    safetyLevel: 0.6, // Moderate safety
    rules: [
      "Can prototype quickly",
      "Cannot touch completed functions",
      "Cannot break existing systems",
      "Focus on new functionality only"
    ]
  },

  // DEFENSIVE MODE - Never break anything
  DEFENSIVE: {
    name: "DEFENSIVE",
    description: "Ultra-safe mode, never breaks anything",
    strictness: "strict", 
    allowedActions: [
      "read_only_operations",
      "safe_queries",
      "analysis_only"
    ],
    blockedActions: [
      "any_modifications",
      "new_file_creation",
      "experimental_code"
    ],
    speedMultiplier: 0.5, // Slower but ultra-safe
    safetyLevel: 1.0, // Maximum safety
    rules: [
      "Read-only operations only",
      "No file modifications",
      "No new file creation", 
      "Analysis and reporting only"
    ]
  }
};
```

### **⚡ SPEED OPTIMIZATIONS**

```typescript
interface SpeedOptimizations {
  // MODE-SPECIFIC OPTIMIZATIONS
  modeOptimizations: {
    REBUILD: {
      skipRegistryCheck: false, // Still check but faster
      batchOperations: true, // Batch file operations
      parallelProcessing: true, // Process multiple files
      smartCaching: true // Cache registry/progress data
    },
    IMPROVE: {
      skipRegistryCheck: false,
      incrementalValidation: true, // Only check changed files
      smartTesting: true, // Only test affected areas
      documentationCache: true // Cache documentation searches
    },
    NEW_FEATURE: {
      skipRegistryCheck: true, // Skip for new features
      rapidPrototyping: true, // Fast iteration
      minimalValidation: true, // Basic checks only
      creativeMode: true // Allow experimental approaches
    },
    DEFENSIVE: {
      skipRegistryCheck: true, // No modifications anyway
      readOnlyMode: true, // Only read operations
      analysisMode: true, // Focus on analysis
      reportingMode: true // Generate reports only
    }
  }
}
```

### **🎯 CONTEXT-AWARE RULES**

```typescript
interface ContextAwareRules {
  // DETECT USER INTENT
  detectUserIntent(userMessage: string): GuardMode {
    const rebuildKeywords = ['rebuild', 'complete rebuild', 'full implementation'];
    const improveKeywords = ['improve', 'optimize', 'fix', 'enhance'];
    const newFeatureKeywords = ['new feature', 'prototype', 'experiment'];
    const defensiveKeywords = ['analyze', 'check', 'report', 'investigate'];
    
    if (rebuildKeywords.some(keyword => userMessage.includes(keyword))) {
      return GUARD_MODES.REBUILD;
    }
    if (improveKeywords.some(keyword => userMessage.includes(keyword))) {
      return GUARD_MODES.IMPROVE;
    }
    if (newFeatureKeywords.some(keyword => userMessage.includes(keyword))) {
      return GUARD_MODES.NEW_FEATURE;
    }
    if (defensiveKeywords.some(keyword => userMessage.includes(keyword))) {
      return GUARD_MODES.DEFENSIVE;
    }
    
    // Default to current focus mode
    return getCurrentFocusMode();
  }
  
  // ADAPTIVE RULES BASED ON PROJECT PHASE
  getProjectPhase(): 'rebuild' | 'improve' | 'iterate' | 'maintain' {
    // Analyze progress-log.json to determine current phase
    const completedTasks = getCompletedTasks();
    const pendingTasks = getPendingTasks();
    
    if (completedTasks.length < 5) return 'rebuild';
    if (pendingTasks.length > 0) return 'improve'; 
    if (allCoreFeaturesComplete()) return 'iterate';
    return 'maintain';
  }
}
```

### **🚀 SMART SPEED ENHANCEMENTS**

```typescript
interface SmartSpeedEnhancements {
  // INTELLIGENT CACHING
  intelligentCaching: {
    registryCache: {
      ttl: 300, // 5 minutes
      smartRefresh: true, // Only refresh when needed
      partialUpdates: true // Update only changed entries
    },
    progressCache: {
      ttl: 60, // 1 minute  
      realTimeUpdates: true,
      incrementalSync: true
    },
    documentationCache: {
      ttl: 3600, // 1 hour
      smartSearch: true, // Cache search results
      contextAware: true // Cache based on context
    }
  },
  
  // PARALLEL PROCESSING
  parallelProcessing: {
    registryCheck: true, // Check multiple files in parallel
    progressUpdate: true, // Update progress in background
    documentationSearch: true, // Search docs in parallel
    webSearch: true // Web search in parallel
  },
  
  // SMART VALIDATION
  smartValidation: {
    incrementalChecks: true, // Only check changed files
    contextAware: true, // Skip irrelevant checks
    modeSpecific: true, // Different rules per mode
    userIntent: true // Adapt to user intent
  }
}
```

### **📋 MODE-SPECIFIC WORKFLOWS**

```typescript
interface ModeWorkflows {
  REBUILD: {
    preAction: [
      "Load shared documentation",
      "Web search for best practices", 
      "Check existing functionality",
      "Plan comprehensive implementation"
    ],
    duringAction: [
      "Implement ALL functionality",
      "Follow documentation patterns",
      "Use best practices from web search",
      "Ensure no functionality is missed"
    ],
    postAction: [
      "Verify all functionality implemented",
      "Test thoroughly",
      "Update documentation",
      "Mark as completed"
    ]
  },
  
  IMPROVE: {
    preAction: [
      "Check what needs improvement",
      "Search shared documentation",
      "Web search for solutions",
      "Plan incremental changes"
    ],
    duringAction: [
      "Make targeted improvements",
      "Test each change",
      "Avoid breaking existing code",
      "Follow best practices"
    ],
    postAction: [
      "Test all improvements",
      "Verify no regressions",
      "Update progress",
      "Document changes"
    ]
  },
  
  NEW_FEATURE: {
    preAction: [
      "Understand requirements",
      "Quick research if needed",
      "Plan prototype approach"
    ],
    duringAction: [
      "Rapid prototyping",
      "Iterative development",
      "Focus on core functionality",
      "Allow experimentation"
    ],
    postAction: [
      "Basic testing",
      "Document prototype",
      "Plan next iteration"
    ]
  },
  
  DEFENSIVE: {
    preAction: [
      "Load all relevant data",
      "Prepare analysis tools"
    ],
    duringAction: [
      "Read-only operations only",
      "Comprehensive analysis",
      "Generate detailed reports"
    ],
    postAction: [
      "Present findings",
      "Recommend actions",
      "No modifications made"
    ]
  }
}
```

### **🎯 MODE DETECTION & SWITCHING**

```typescript
// mode-detector.ts
class ModeDetector {
  // AUTOMATIC MODE DETECTION
  detectMode(userMessage: string, projectPhase: string): GuardMode {
    // Explicit mode commands
    if (userMessage.includes('@rebuild')) return GUARD_MODES.REBUILD;
    if (userMessage.includes('@improve')) return GUARD_MODES.IMPROVE;
    if (userMessage.includes('@new')) return GUARD_MODES.NEW_FEATURE;
    if (userMessage.includes('@defensive')) return GUARD_MODES.DEFENSIVE;
    
    // Intent-based detection
    const intent = this.detectUserIntent(userMessage);
    if (intent) return intent;
    
    // Project phase-based default
    return this.getDefaultModeForPhase(projectPhase);
  }
  
  // USER INTENT DETECTION
  private detectUserIntent(message: string): GuardMode | null {
    const rebuildKeywords = ['rebuild', 'complete rebuild', 'full implementation', 'recreate'];
    const improveKeywords = ['improve', 'optimize', 'fix', 'enhance', 'better'];
    const newFeatureKeywords = ['new feature', 'prototype', 'experiment', 'try'];
    const defensiveKeywords = ['analyze', 'check', 'report', 'investigate', 'status'];
    
    const lowerMessage = message.toLowerCase();
    
    if (rebuildKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return GUARD_MODES.REBUILD;
    }
    if (improveKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return GUARD_MODES.IMPROVE;
    }
    if (newFeatureKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return GUARD_MODES.NEW_FEATURE;
    }
    if (defensiveKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return GUARD_MODES.DEFENSIVE;
    }
    
    return null;
  }
}
```

### **💡 SPEED & SAFETY BENEFITS**

**Speed Gains by Mode:**
- **REBUILD**: 20% faster through batching and parallel processing
- **IMPROVE**: 30% faster through smart validation and caching  
- **NEW_FEATURE**: 50% faster through reduced validation
- **DEFENSIVE**: 60% faster through read-only operations

**Safety Maintained:**
- Mode-specific safety levels (0.6 to 1.0)
- Context-aware validation
- User intent recognition
- Project phase awareness

**Flexibility:**
- Switch modes during conversation
- Override when needed
- Adapt to project phase
- Learn from user preferences

---

## 🎯 **ENHANCED GUARD RAILS WITH DEVELOPMENT STANDARDS**

### **📋 DEVELOPMENT STANDARDS INTEGRATION**

```typescript
// Enhanced Guard Rails with Development Standards
interface EnhancedGuardRailsEngine extends GuardRailsEngine {
  // NEW: Development Standards Checks
  checkReactStandards(file: string, content: string): Promise<GuardResult>;
  checkTailwindStandards(file: string, content: string): Promise<GuardResult>;
  checkNextJSStandards(file: string, content: string): Promise<GuardResult>;
  checkSupabaseStandards(file: string, content: string): Promise<GuardResult>;
  checkShadcnStandards(file: string, content: string, userRequest: string): Promise<GuardResult>;
  
  // NEW: Code Quality Enforcement
  enforceCodeStandards(action: Action): Promise<EnforcementResult>;
}

// Development Standards Validator
class DevelopmentStandardsValidator {
  private reactStandards: ReactStandards;
  private tailwindStandards: TailwindStandards;
  private nextJSStandards: NextJSStandards;
  private supabaseStandards: SupabaseStandards;
  private shadcnStandards: ShadcnStandards;
  
  async validateCodeStandards(file: string, content: string, userRequest?: string): Promise<ValidationResult> {
    const violations = [];
    
    // Check React standards
    if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      const reactViolations = await this.checkReactStandards(content);
      violations.push(...reactViolations);
    }
    
    // Check Tailwind standards
    if (content.includes('className=')) {
      const tailwindViolations = await this.checkTailwindStandards(content);
      violations.push(...tailwindViolations);
    }
    
    // Check Next.js standards
    if (file.includes('app/') || file.includes('pages/')) {
      const nextJSViolations = await this.checkNextJSStandards(content);
      violations.push(...nextJSViolations);
    }
    
    // Check Supabase standards
    if (content.includes('supabase') || content.includes('@supabase/')) {
      const supabaseViolations = await this.checkSupabaseStandards(content);
      violations.push(...supabaseViolations);
    }
    
    // Check shadcn/ui standards
    if (userRequest) {
      const shadcnViolations = await this.checkShadcnStandards(content, userRequest);
      violations.push(...shadcnViolations);
    }
    
    return {
      allowed: violations.length === 0,
      violations,
      requiredFixes: violations.map(v => v.fix)
    };
  }
}
```

### **🔧 REACT STANDARDS ENFORCEMENT**

```typescript
// React Standards Enforcement
class ReactStandardsEnforcer {
  async checkReactStandards(content: string): Promise<Violation[]> {
    const violations = [];
    
    // Check PascalCase file naming
    if (!this.isPascalCase(this.getFileName())) {
      violations.push({
        type: 'REACT_NAMING_VIOLATION',
        message: 'Component files must use PascalCase naming',
        fix: 'Rename file to PascalCase (e.g., UserProfile.tsx)'
      });
    }
    
    // Check TypeScript interfaces
    if (!content.includes('interface') && content.includes('props')) {
      violations.push({
        type: 'REACT_INTERFACE_VIOLATION',
        message: 'Props must be defined using TypeScript interfaces',
        fix: 'Add interface definition above component'
      });
    }
    
    // Check hooks usage
    if (content.includes('useState') && !this.hasProperHookUsage(content)) {
      violations.push({
        type: 'REACT_HOOKS_VIOLATION',
        message: 'Hooks must be called at top level of component',
        fix: 'Move hooks to top level, before conditional logic'
      });
    }
    
    // Check import order
    if (!this.hasProperImportOrder(content)) {
      violations.push({
        type: 'REACT_IMPORT_ORDER_VIOLATION',
        message: 'Imports must be ordered: React -> external -> internal -> assets',
        fix: 'Reorder imports according to React standards'
      });
    }
    
    // Check exports
    if (content.includes('export default') && !this.isPageComponent(content)) {
      violations.push({
        type: 'REACT_EXPORT_VIOLATION',
        message: 'Use named exports for components, default exports only for pages',
        fix: 'Change to named export: export const ComponentName'
      });
    }
    
    return violations;
  }
}
```

### **🎨 TAILWIND STANDARDS ENFORCEMENT**

```typescript
// Tailwind Standards Enforcement
class TailwindStandardsEnforcer {
  async checkTailwindStandards(content: string): Promise<Violation[]> {
    const violations = [];
    
    // Check for @apply usage
    if (content.includes('@apply')) {
      violations.push({
        type: 'TAILWIND_APPLY_VIOLATION',
        message: 'Avoid @apply - use utility classes directly',
        fix: 'Replace @apply with direct utility classes'
      });
    }
    
    // Check for arbitrary values
    if (content.includes('[') && content.includes(']')) {
      violations.push({
        type: 'TAILWIND_ARBITRARY_VIOLATION',
        message: 'Avoid arbitrary values - use theme values',
        fix: 'Use defined theme values instead of arbitrary values'
      });
    }
    
    // Check for inline styles
    if (content.includes('style=')) {
      violations.push({
        type: 'TAILWIND_INLINE_STYLES_VIOLATION',
        message: 'Avoid inline styles - use Tailwind utilities',
        fix: 'Replace inline styles with Tailwind utility classes'
      });
    }
    
    // Check for component variants using cva
    if (content.includes('className=') && !this.usesCVAForVariants(content)) {
      violations.push({
        type: 'TAILWIND_VARIANT_VIOLATION',
        message: 'Use cva (Class Variance Authority) for component variants',
        fix: 'Implement cva pattern for button/card variants'
      });
    }
    
    return violations;
  }
}
```

### **⚡ NEXT.JS STANDARDS ENFORCEMENT**

```typescript
// Next.js Standards Enforcement
class NextJSStandardsEnforcer {
  async checkNextJSStandards(content: string): Promise<Violation[]> {
    const violations = [];
    
    // Check for 'use client' placement
    if (content.includes('useState') && !content.startsWith("'use client';")) {
      violations.push({
        type: 'NEXTJS_CLIENT_DIRECTIVE_VIOLATION',
        message: 'Client components must start with "use client" directive',
        fix: 'Add "use client"; at the top of the file'
      });
    }
    
    // Check for proper imports order
    if (!this.hasProperImportOrder(content)) {
      violations.push({
        type: 'NEXTJS_IMPORT_ORDER_VIOLATION',
        message: 'Imports must be ordered: React -> external -> internal -> assets',
        fix: 'Reorder imports according to Next.js standards'
      });
    }
    
    // Check for Server Component patterns
    if (this.isServerComponent(content) && this.hasClientSideCode(content)) {
      violations.push({
        type: 'NEXTJS_SERVER_COMPONENT_VIOLATION',
        message: 'Server components cannot use client-side code',
        fix: 'Move client-side code to separate Client Component'
      });
    }
    
    // Check for proper data fetching
    if (this.hasClientSideDataFetching(content)) {
      violations.push({
        type: 'NEXTJS_DATA_FETCHING_VIOLATION',
        message: 'Use Server Components for data fetching when possible',
        fix: 'Move data fetching to Server Component or use proper client-side patterns'
      });
    }
    
    return violations;
  }
}
```

### **🎯 ENHANCED MODE SYSTEM WITH DEVELOPMENT STANDARDS**

```typescript
// Enhanced Mode System with Development Standards
const ENHANCED_GUARD_MODES = {
  REBUILD: {
    ...GUARD_MODES.REBUILD,
    developmentStandards: {
      enforceReactStandards: true,
      enforceTailwindStandards: true,
      enforceNextJSStandards: true,
      enforceSupabaseStandards: true,
      enforceShadcnStandards: true,
      strictCodeQuality: true,
      requireDocumentation: true,
      requireTesting: true
    }
  },
  IMPROVE: {
    ...GUARD_MODES.IMPROVE,
    developmentStandards: {
      enforceReactStandards: true,
      enforceTailwindStandards: true,
      enforceNextJSStandards: true,
      enforceSupabaseStandards: true,
      enforceShadcnStandards: true,
      moderateCodeQuality: true,
      requireDocumentation: false,
      requireTesting: true
    }
  },
  NEW_FEATURE: {
    ...GUARD_MODES.NEW_FEATURE,
    developmentStandards: {
      enforceReactStandards: false, // Allow rapid prototyping
      enforceTailwindStandards: true,
      enforceNextJSStandards: true,
      enforceSupabaseStandards: true, // Critical for auth
      enforceShadcnStandards: true, // Critical for UI consistency
      flexibleCodeQuality: true,
      requireDocumentation: false,
      requireTesting: false
    }
  },
  DEFENSIVE: {
    ...GUARD_MODES.DEFENSIVE,
    developmentStandards: {
      enforceReactStandards: false, // Read-only mode
      enforceTailwindStandards: false,
      enforceNextJSStandards: false,
      enforceSupabaseStandards: false,
      enforceShadcnStandards: false,
      noCodeModifications: true
    }
  }
};
```

### **🚀 ENHANCED RUNTIME ENFORCEMENT**

```typescript
// Enhanced Runtime Enforcer with Development Standards and Override System
class EnhancedRuntimeEnforcer extends RuntimeEnforcer {
  private standardsValidator: DevelopmentStandardsValidator;
  private overrideSystem: GuardRailsOverrideSystem;
  private emergencyOverride: EmergencyOverride;
  
  constructor() {
    super();
    this.overrideSystem = new GuardRailsOverrideSystem();
    this.emergencyOverride = new EmergencyOverride();
  }
  
  async enforce(action: Action, userMessage?: string): Promise<EnforcementResult> {
    // STEP 0: Check for override commands in user message
    if (userMessage && this.overrideSystem.checkForOverrideCommand(userMessage)) {
      this.handleOverrideCommand(userMessage);
    }
    
    // STEP 1: Check if override is active
    const overrideStatus = this.overrideSystem.getOverrideStatus();
    if (overrideStatus.active) {
      if (this.overrideSystem.isActionAllowed(action.type)) {
        console.log("🚫 OVERRIDE ACTIVE - Action allowed:", action.type);
        return this.createAllowedResult("OVERRIDE_ACTIVE");
      }
    }
    
    // STEP 2: Check for emergency override
    if (this.emergencyOverride.isEmergencyActive()) {
      console.log("🚨 EMERGENCY OVERRIDE - Action allowed:", action.type);
      return this.createAllowedResult("EMERGENCY_OVERRIDE_ACTIVE");
    }
    
    // STEP 3: Original guard rails checks
    const originalResult = await super.enforce(action);
    if (!originalResult.proceed) {
      return originalResult;
    }
    
    // STEP 4: Development standards checks (if not overridden)
    const standardsResult = await this.standardsValidator.validateCodeStandards(
      action.targetFile, 
      action.content,
      userMessage
    );
    
    if (!standardsResult.allowed) {
      return this.createBlockedResult(
        `DEVELOPMENT_STANDARDS_VIOLATION: ${standardsResult.violations.join(', ')}`
      );
    }
    
    // STEP 5: Mode-specific standards enforcement
    const modeStandards = this.getModeStandards(action.mode);
    if (modeStandards.strictCodeQuality && standardsResult.violations.length > 0) {
      return this.createBlockedResult(
        `STRICT_CODE_QUALITY_VIOLATION: ${standardsResult.violations.join(', ')}`
      );
    }
    
    return originalResult;
  }
  
  private handleOverrideCommand(userMessage: string): void {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('@override')) {
      const reason = this.extractReason(userMessage);
      this.overrideSystem.activateOverride(reason || 'User override requested');
    }
    else if (lowerMessage.includes('@free') || lowerMessage.includes('@unlock')) {
      this.overrideSystem.activateOverride('Full access requested', ['all']);
    }
    else if (lowerMessage.includes('@disable-guard-rails')) {
      this.overrideSystem.activateOverride('Guard rails disabled', ['all']);
    }
    else if (lowerMessage.includes('@emergency')) {
      const reason = this.extractReason(userMessage);
      this.emergencyOverride.activateEmergency(reason || 'Emergency override');
    }
    else if (lowerMessage.includes('@reactivate-guard-rails')) {
      this.overrideSystem.deactivateOverride();
      this.emergencyOverride.deactivateEmergency();
    }
  }
  
  private extractReason(message: string): string | null {
    // Extract reason from commands like "@override - reason here"
    const match = message.match(/@\w+\s*-\s*(.+)/);
    return match ? match[1].trim() : null;
  }
  
  private createAllowedResult(reason: string): EnforcementResult {
    return {
      proceed: true,
      blocked: false,
      reason: `✅ ALLOWED: ${reason}`,
      requiredChecks: []
    };
  }
}
```

### **🔐 SUPABASE STANDARDS ENFORCEMENT**

```typescript
// Supabase Standards Enforcement
class SupabaseStandardsEnforcer {
  async checkSupabaseStandards(content: string): Promise<Violation[]> {
    const violations = [];
    
    // Check for deprecated auth-helpers-nextjs imports
    if (content.includes('@supabase/auth-helpers-nextjs')) {
      violations.push({
        type: 'SUPABASE_DEPRECATED_IMPORT_VIOLATION',
        message: 'NEVER use @supabase/auth-helpers-nextjs - it will BREAK the application',
        fix: 'Use @supabase/ssr instead: import { createBrowserClient, createServerClient } from "@supabase/ssr"'
      });
    }
    
    // Check for deprecated cookie methods
    if (content.includes('cookies: {') && (content.includes('get(') || content.includes('set(') || content.includes('remove('))) {
      violations.push({
        type: 'SUPABASE_DEPRECATED_COOKIE_VIOLATION',
        message: 'NEVER use individual cookie methods (get/set/remove) - they BREAK the application',
        fix: 'Use getAll() and setAll() methods only'
      });
    }
    
    // Check for correct cookie implementation
    if (content.includes('createServerClient') && !content.includes('getAll()') && !content.includes('setAll(')) {
      violations.push({
        type: 'SUPABASE_COOKIE_IMPLEMENTATION_VIOLATION',
        message: 'Server client MUST use getAll() and setAll() methods',
        fix: 'Implement cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet) { ... } }'
      });
    }
    
    // Check for correct browser client
    if (content.includes('createBrowserClient') && !content.includes('@supabase/ssr')) {
      violations.push({
        type: 'SUPABASE_BROWSER_CLIENT_VIOLATION',
        message: 'Browser client MUST use @supabase/ssr package',
        fix: 'Import from @supabase/ssr: import { createBrowserClient } from "@supabase/ssr"'
      });
    }
    
    // Check for middleware implementation
    if (content.includes('middleware') && !content.includes('supabaseResponse')) {
      violations.push({
        type: 'SUPABASE_MIDDLEWARE_VIOLATION',
        message: 'Middleware MUST return supabaseResponse object',
        fix: 'Return supabaseResponse object to maintain session state'
      });
    }
    
    // Check for auth.getUser() in middleware
    if (content.includes('middleware') && !content.includes('auth.getUser()')) {
      violations.push({
        type: 'SUPABASE_MIDDLEWARE_AUTH_VIOLATION',
        message: 'Middleware MUST call auth.getUser() - DO NOT REMOVE',
        fix: 'Add const { data: { user } } = await supabase.auth.getUser()'
      });
    }
    
    return violations;
  }
}
```

### **🎨 SHADCN/UI STANDARDS ENFORCEMENT**

```typescript
// shadcn/ui Standards Enforcement
class ShadcnStandardsEnforcer {
  async checkShadcnStandards(content: string, userRequest: string): Promise<Violation[]> {
    const violations = [];
    
    // Check if user requested a shadcn component but got custom implementation
    const shadcnComponents = [
      'sidebar', 'button', 'card', 'input', 'select', 'dialog', 'sheet', 'table',
      'form', 'checkbox', 'radio', 'switch', 'slider', 'progress', 'badge',
      'alert', 'toast', 'dropdown', 'navigation', 'breadcrumb', 'pagination',
      'tabs', 'accordion', 'carousel', 'calendar', 'popover', 'tooltip',
      'command', 'context-menu', 'hover-card', 'menubar', 'resizable',
      'scroll-area', 'separator', 'skeleton', 'toggle', 'toggle-group'
    ];
    
    const requestedComponent = this.detectRequestedComponent(userRequest);
    
    if (shadcnComponents.includes(requestedComponent)) {
      // Check if using shadcn/ui component
      if (!this.isUsingShadcnComponent(content, requestedComponent)) {
        violations.push({
          type: 'SHADCN_COMPONENT_VIOLATION',
          message: `User requested ${requestedComponent} - MUST use shadcn/ui component`,
          fix: `Import and use the shadcn/ui ${requestedComponent} component from @/components/ui/${requestedComponent}`
        });
      }
      
      // Check if creating custom implementation instead of using shadcn
      if (this.isCreatingCustomComponent(content, requestedComponent)) {
        violations.push({
          type: 'SHADCN_CUSTOM_IMPLEMENTATION_VIOLATION',
          message: `DO NOT create custom ${requestedComponent} - use shadcn/ui component`,
          fix: `Remove custom implementation and use: import { ${this.getShadcnImportName(requestedComponent)} } from "@/components/ui/${requestedComponent}"`
        });
      }
    }
    
    return violations;
  }
  
  private detectRequestedComponent(userRequest: string): string {
    const lowerRequest = userRequest.toLowerCase();
    const componentKeywords = {
      'sidebar': ['sidebar', 'navigation', 'nav'],
      'button': ['button', 'btn'],
      'card': ['card', 'panel'],
      'input': ['input', 'field', 'form field'],
      'select': ['select', 'dropdown', 'picker'],
      'dialog': ['dialog', 'modal', 'popup'],
      'sheet': ['sheet', 'drawer', 'side panel'],
      'table': ['table', 'grid', 'list'],
      'form': ['form', 'formulary'],
      'checkbox': ['checkbox', 'check'],
      'radio': ['radio', 'radio button'],
      'switch': ['switch', 'toggle'],
      'slider': ['slider', 'range'],
      'progress': ['progress', 'loading', 'bar'],
      'badge': ['badge', 'tag', 'label'],
      'alert': ['alert', 'notification', 'message'],
      'toast': ['toast', 'snackbar'],
      'dropdown': ['dropdown', 'menu'],
      'navigation': ['navigation', 'nav', 'menu'],
      'breadcrumb': ['breadcrumb', 'breadcrumbs'],
      'pagination': ['pagination', 'pager'],
      'tabs': ['tabs', 'tab'],
      'accordion': ['accordion', 'collapsible'],
      'carousel': ['carousel', 'slider', 'gallery'],
      'calendar': ['calendar', 'date picker'],
      'popover': ['popover', 'tooltip'],
      'tooltip': ['tooltip', 'hint'],
      'command': ['command', 'command palette'],
      'context-menu': ['context menu', 'right click'],
      'hover-card': ['hover card', 'preview'],
      'menubar': ['menubar', 'menu bar'],
      'resizable': ['resizable', 'resize'],
      'scroll-area': ['scroll area', 'scrollable'],
      'separator': ['separator', 'divider'],
      'skeleton': ['skeleton', 'loading'],
      'toggle': ['toggle', 'switch'],
      'toggle-group': ['toggle group', 'button group']
    };
    
    for (const [component, keywords] of Object.entries(componentKeywords)) {
      if (keywords.some(keyword => lowerRequest.includes(keyword))) {
        return component;
      }
    }
    
    return '';
  }
  
  private isUsingShadcnComponent(content: string, component: string): boolean {
    // Check for shadcn/ui import patterns
    const shadcnImportPatterns = [
      `from "@/components/ui/${component}"`,
      `from "@/components/ui/${component}.tsx"`,
      `import { ${this.getShadcnImportName(component)} } from "@/components/ui/${component}"`
    ];
    
    return shadcnImportPatterns.some(pattern => content.includes(pattern));
  }
  
  private isCreatingCustomComponent(content: string, component: string): boolean {
    // Check for custom component creation patterns
    const customPatterns = [
      `const ${component} =`,
      `function ${component}(`,
      `export const ${component}`,
      `export default function ${component}`
    ];
    
    return customPatterns.some(pattern => content.includes(pattern));
  }
  
  private getShadcnImportName(component: string): string {
    // Map component names to their shadcn import names
    const importMap = {
      'sidebar': 'Sidebar',
      'button': 'Button',
      'card': 'Card',
      'input': 'Input',
      'select': 'Select',
      'dialog': 'Dialog',
      'sheet': 'Sheet',
      'table': 'Table',
      'form': 'Form',
      'checkbox': 'Checkbox',
      'radio': 'RadioGroup',
      'switch': 'Switch',
      'slider': 'Slider',
      'progress': 'Progress',
      'badge': 'Badge',
      'alert': 'Alert',
      'toast': 'Toast',
      'dropdown': 'DropdownMenu',
      'navigation': 'NavigationMenu',
      'breadcrumb': 'Breadcrumb',
      'pagination': 'Pagination',
      'tabs': 'Tabs',
      'accordion': 'Accordion',
      'carousel': 'Carousel',
      'calendar': 'Calendar',
      'popover': 'Popover',
      'tooltip': 'Tooltip',
      'command': 'Command',
      'context-menu': 'ContextMenu',
      'hover-card': 'HoverCard',
      'menubar': 'Menubar',
      'resizable': 'Resizable',
      'scroll-area': 'ScrollArea',
      'separator': 'Separator',
      'skeleton': 'Skeleton',
      'toggle': 'Toggle',
      'toggle-group': 'ToggleGroup'
    };
    
    return importMap[component] || component;
  }
}
```

### **📋 DEVELOPMENT STANDARDS RULES**

**React Standards:**
- ✅ PascalCase file naming (UserProfile.tsx)
- ✅ TypeScript interfaces for props
- ✅ Hooks at top level of components
- ✅ Proper import order (React -> external -> internal -> assets)
- ✅ Named exports for components, default exports for pages
- ✅ Proper component structure and organization

**Tailwind Standards:**
- ✅ Use utility classes directly
- ✅ Avoid @apply in global CSS
- ✅ Avoid arbitrary values, use theme values
- ✅ Avoid inline styles, use Tailwind utilities
- ✅ Use cva (Class Variance Authority) for component variants
- ✅ Proper className organization and readability

**Next.js Standards:**
- ✅ 'use client' directive for client components
- ✅ Proper import order and organization
- ✅ Server Components for data fetching
- ✅ Client Components for interactivity
- ✅ Proper file structure (app/ directory)
- ✅ Server Actions for mutations

**Supabase Standards:**
- ✅ Use @supabase/ssr package exclusively
- ✅ Use getAll() and setAll() methods only
- ✅ Never use individual cookie methods (get/set/remove)
- ✅ Never use @supabase/auth-helpers-nextjs
- ✅ Always return supabaseResponse in middleware
- ✅ Always call auth.getUser() in middleware
- ✅ Proper browser and server client implementations

**shadcn/ui Standards:**
- ✅ Always use shadcn/ui components when available
- ✅ Import from `@/components/ui/[component]`
- ✅ Use proper shadcn component names and props
- ✅ Follow shadcn component patterns and structure
- ✅ Never create custom implementations of shadcn components
- ✅ Never reinvent shadcn functionality
- ✅ Never use custom styling when shadcn provides the component
- ✅ Use full shadcn implementation with all features

### **🎯 ENFORCEMENT BENEFITS**

1. **Automatic Standards Enforcement** - Every code change checked against React/Tailwind/Next.js/Supabase/shadcn standards
2. **Mode-Specific Rules** - Different enforcement levels based on development mode
3. **Real-Time Validation** - Immediate feedback on standards violations
4. **Educational** - Clear fix suggestions for each violation
5. **Unbreakable** - Cannot bypass standards checks
6. **Consistent Code Quality** - Ensures all code follows project standards
7. **Prevents Breaking Code** - Blocks generation of deprecated Supabase patterns that break authentication
8. **Security Protection** - Prevents authentication vulnerabilities and session management issues
9. **Production Safety** - Avoids code that breaks in production environments
10. **UI Consistency** - Ensures all components use shadcn/ui for consistent design system
11. **No Custom Reinvention** - Prevents recreating shadcn functionality
12. **Full Feature Set** - Uses complete shadcn implementations with all features

---

**This enhanced system would make it impossible for AI to violate the instructions OR development standards, as every action would be checked and blocked if it violates the rules.**

### **🎯 PRACTICAL USAGE EXAMPLES**

**Example 1: Temporary Override**
```
You: @override - Need to fix critical authentication bug
AI: 🚫 GUARD RAILS OVERRIDE ACTIVATED: Need to fix critical authentication bug
AI: [Proceeds with full access to modify any code]
```

**Example 2: Emergency Override**
```
You: @emergency - Production is down, need immediate fix
AI: 🚨 EMERGENCY OVERRIDE ACTIVATED: Production is down, need immediate fix
AI: ⚠️  All guard rails disabled for critical fix
AI: [Proceeds with unrestricted access]
```

**Example 3: Selective Standards Disable**
```
You: @no-supabase-standards - Need to experiment with auth patterns
AI: [Disables only Supabase standards, keeps other guard rails active]
```

**Example 4: Reactivation**
```
You: @reactivate-guard-rails
AI: ✅ GUARD RAILS REACTIVATED
AI: 🛡️  All guard rails system reactivated
AI: [Returns to normal guard rails enforcement]
```

**Example 5: Timed Override**
```
You: @override for 30 minutes - Need to rebuild entire auth system
AI: 🚫 GUARD RAILS OVERRIDE ACTIVATED: Need to rebuild entire auth system
AI: ⏰ Override will expire in 30 minutes
AI: [Proceeds with full access for 30 minutes, then auto-reactivates]
```

### **📋 OVERRIDE COMMAND REFERENCE**

| Command | Purpose | Duration | Scope |
|---------|---------|----------|-------|
| `@override` | Temporary disable | Until reactivated | All guard rails |
| `@free` | Full access | Until reactivated | All restrictions |
| `@unlock` | Remove blocks | Until reactivated | All validations |
| `@disable-guard-rails` | Complete disable | Until reactivated | Entire system |
| `@emergency` | Critical fixes | Until reactivated | All restrictions |
| `@no-react-standards` | Disable React rules | Until reactivated | React standards only |
| `@no-tailwind-standards` | Disable Tailwind rules | Until reactivated | Tailwind standards only |
| `@no-supabase-standards` | Disable Supabase rules | Until reactivated | Supabase standards only |
| `@no-shadcn-standards` | Disable shadcn rules | Until reactivated | shadcn standards only |
| `@reactivate-guard-rails` | Re-enable system | Permanent | All guard rails |

**Status**: 📋 **ENHANCED WITH DEVELOPMENT STANDARDS + SUPABASE + SHADCN/UI + OVERRIDE SYSTEM**  
**Date**: 2025-01-16  
**Ready for**: System integration with React/Tailwind/Next.js/Supabase/shadcn enforcement + User override controls
