# AI OPERATING CONSTRAINTS - UNBREAKABLE RULES

## 🚀 **AUTOMATED COMPLIANCE SETUP**

### **📋 Quick Setup (Copy & Paste)**
```bash
# 1. Copy ONLY this file to your project root:
# - .ai-rules-docs/ai-operating-constraints.md

# 2. Run the self-installer (generates everything else):
node .ai-rules-docs/ai-compliance-installer.js

# 3. Start automated compliance monitoring:
npm run compliance:auto
```

### **🚀 Self-Installer Features**
The `ai-compliance-installer.js` automatically creates:
- ✅ `.ai-compliance-functions/` folder with all compliance tools
- ✅ `function-registry.json` - Tracks completed functions
- ✅ `progress-log.json` - Tracks development progress
- ✅ `ai-tracking-system.json` - Tracks compliance status
- ✅ NPM scripts for easy compliance management
- ✅ Tests the system to ensure everything works

### **🔧 Manual Setup (Alternative)**
```bash
# 1. Copy these files to your project root:
# - .ai-rules-docs/ai-operating-constraints.md
# - .ai-compliance-functions/ (entire folder)
# - function-registry.json
# - progress-log.json
# - ai-tracking-system.json

# 2. Add to package.json scripts:
npm pkg set scripts.compliance:check="node .ai-compliance-functions/ai-compliance-checker.js"
npm pkg set scripts.compliance:auto="node .ai-compliance-functions/auto-compliance.js"
npm pkg set scripts.compliance:dashboard="node .ai-compliance-functions/ai-compliance-dashboard.js"

# 3. Start automated compliance monitoring:
npm run compliance:auto
```

### **🔧 Automated Compliance Features**
- **File Watchers** - Automatically checks compliance when files change
- **Periodic Checks** - Runs every 5 minutes automatically
- **Auto-Updates** - Updates tracking system every minute
- **Violation Prevention** - Blocks rule violations before they happen
- **Progress Tracking** - Automatically tracks all development progress

### **📊 Compliance Commands**
- `npm run compliance:check` - Manual compliance check
- `npm run compliance:auto` - Start automated monitoring (recommended)
- `npm run compliance:dashboard` - View compliance dashboard

### **⚠️ CRITICAL: Always Start Auto Compliance**
**Before starting any development work, ALWAYS run:**
```bash
npm run compliance:auto
```
This prevents AI from violating rules and destroying working code.

---

## 🛡️ **UNBREAKABLE GUARD RAILS SYSTEM**

### **🔒 CORE DIRECTIVES**
- **DEFENSIVE MODE ONLY** - No other modes allowed
- **NO OVERRIDES** - No @override, @free, @emergency commands
- **NO LOOPHOLES** - All rules are unbreakable
- **ASK FIRST** - Always ask before making ANY changes

### **🚫 MANDATORY PRE-ACTION VALIDATOR**
Before ANY action:
1. **Check function-registry.json** - Is this function completed?
2. **Ask user for clarification** - What exactly do you want?
3. **Show proposed changes** - Get approval before applying
4. **Make minimal changes** - Only what was specifically requested

### **🔐 HARD BLOCK SYSTEM**
- **NEVER replace entire files** - Only modify specific lines
- **NEVER delete existing functionality** - Only add or modify
- **NEVER rebuild working code** - Only incremental changes
- **MAXIMUM 10 lines** of code changes per request
- **ALWAYS preserve existing work** - Never destroy what exists

### **⚡ RUNTIME ENFORCEMENT**
- **STOP IMMEDIATELY** if rules are violated
- **ASK FOR EXPLICIT PERMISSION** to continue
- **EXPLAIN WHAT WENT WRONG** and how to fix it
- **NO EXCEPTIONS** - Rules cannot be bypassed

## 📋 **CORE RULES ENFORCEMENT**

### **📋 MANDATORY CHECKS**
1. **Registry Check** - Check `function-registry.json` before modifying ANY file
2. **Progress Check** - Ensure action matches current focus
3. **Incremental Check** - Don't rebuild existing working code
4. **Standards Check** - Follow all development standards

### **🔒 HARD BLOCKS**
- ❌ **Completed Functions** - Cannot touch functions marked as "completed"
- ❌ **Non-Incremental Actions** - Cannot rebuild existing working code
- ❌ **Registry Violations** - Must check registry before any action
- ❌ **Standards Violations** - Must follow all development standards

### **✅ ALLOWED PATTERNS**
- ✅ Incremental improvements
- ✅ New feature development
- ✅ Bug fixes and optimizations
- ✅ Following established patterns
- ✅ Using shadcn/ui components
- ✅ Following development standards

### **🚫 AVOID PATTERNS**
- ❌ Rebuilding existing working code
- ❌ Replacing entire files
- ❌ Deleting existing functionality
- ❌ Making assumptions about what user wants
- ❌ Working on multiple files simultaneously
- ❌ Bypassing registry checks
- ❌ **LOOP PREVENTION RULE** - **HARDCODED**: If same issue not fixed after 2 tries, on 3rd attempt:
  - **STOP** and reconsider the solution
  - **ANALYZE** what did work in previous attempts
  - **IDENTIFY** the root cause of failure
  - **PROPOSE** a completely different approach
  - **ASK** user for permission to try new approach
  - **MOVE ON** if no clear solution after 3 attempts
  - **LOG** the failure and what was attempted

## 🎯 **ENHANCED GUARD RAILS WITH DEVELOPMENT STANDARDS**

### **📋 DEVELOPMENT STANDARDS RULES**
All code must follow these standards without exception:

### **🔧 REACT STANDARDS ENFORCEMENT**
- ✅ PascalCase file naming (UserProfile.tsx)
- ✅ TypeScript interfaces for props
- ✅ Hooks at top level of components
- ✅ Proper import order (React -> external -> internal -> assets)
- ✅ Named exports for components, default exports for pages
- ✅ Proper component structure and organization

### **🎨 TAILWIND STANDARDS ENFORCEMENT**
- ✅ Use utility classes directly
- ✅ Avoid @apply in global CSS
- ✅ Avoid arbitrary values, use theme values
- ✅ Avoid inline styles, use Tailwind utilities
- ✅ Use cva (Class Variance Authority) for component variants
- ✅ Proper className organization and readability

### **⚡ NEXT.JS STANDARDS ENFORCEMENT**
- ✅ 'use client' directive for client components
- ✅ Proper import order and organization
- ✅ Server Components for data fetching
- ✅ Client Components for interactivity
- ✅ Proper file structure (app/ directory)
- ✅ Server Actions for mutations

### **🔐 SUPABASE STANDARDS ENFORCEMENT**
- ✅ Use @supabase/ssr package exclusively
- ✅ Use getAll() and setAll() methods only
- ✅ Never use individual cookie methods (get/set/remove)
- ✅ Never use @supabase/auth-helpers-nextjs
- ✅ Always return supabaseResponse in middleware
- ✅ Always call auth.getUser() in middleware
- ✅ Proper browser and server client implementations

### **🎨 SHADCN/UI STANDARDS ENFORCEMENT**
- ✅ Always use shadcn/ui components when available
- ✅ Import from `@/components/ui/[component]`
- ✅ Use proper shadcn component names and props
- ✅ Follow shadcn component patterns and structure
- ✅ Never create custom implementations of shadcn components
- ✅ Never reinvent shadcn functionality
- ✅ Never use custom styling when shadcn provides the component
- ✅ Use full shadcn implementation with all features

## 🔧 **REFACTORING RULES**

### **MODULAR BUILD PATTERN**
For every 100 lines examined, follow this hierarchy:
- **Page = Parent** (e.g., bork-api page)
- **Tab = Child** (e.g., connection-test tab)
- **Component = Child of Child** (e.g., SimpleApiTest component)
- **Sibling Tabs** = Independent children
- **Test each level** before moving to next

### **TESTING STRATEGY**
1. **Test Parent** - Ensure page structure works
2. **Test Children** - Ensure tabs function correctly
3. **Test Grandchildren** - Ensure components work within tabs
4. **Test Siblings** - Ensure independent tabs don't interfere
5. **Test Integration** - Ensure all levels work together

## 📊 **MONITORING & LOGGING**

### **🎯 INTEGRATION POINTS**
- **Function Registry** - Track completed functions
- **Progress Log** - Track current focus
- **AI Tracking** - Track all actions and violations
- **User Feedback** - Track user satisfaction

### **📊 SUCCESS METRICS**
- User doesn't have to repeat requests
- Functions marked as "completed" stay untouched
- Changes are minimal and targeted
- No existing functionality is destroyed
- User knows exactly what will be changed before it happens
- Code follows all development standards
- Modular testing pattern is followed

### **🔧 IMPLEMENTATION STRATEGY**
1. **Load all tracking files** before any action
2. **Validate against all rules** before proceeding
3. **Ask for clarification** if anything is unclear
4. **Show proposed changes** before applying
5. **Log all actions** for audit trail
6. **Monitor for violations** and stop immediately

### **🤖 AUTOMATED COMPLIANCE INTEGRATION**
The compliance system automatically:
- **Monitors file changes** and runs compliance checks
- **Prevents rule violations** before they happen
- **Updates tracking files** automatically
- **Logs all actions** for audit trail
- **Blocks destructive changes** to completed functions
- **Enforces defensive mode** at all times

**Integration Points:**
- File watchers monitor `src/`, `function-registry.json`, `progress-log.json`
- Periodic checks every 5 minutes ensure ongoing compliance
- Auto-updates tracking system every minute
- Violation detection stops AI from making harmful changes
- Progress tracking automatically logs all development work

## 🎯 **ENFORCEMENT BENEFITS**

### **🎯 Development Benefits**
- **Consistent Code Quality** - All code follows project standards
- **No Breaking Changes** - Prevents modification of working code
- **UI Consistency** - Always uses shadcn/ui components
- **Security Protection** - Prevents authentication vulnerabilities
- **Production Safety** - Avoids code that breaks in production

### **⚡ Speed Benefits**
- **Targeted Changes** - Only modify what's needed
- **Smart Validation** - Only check what's necessary
- **Parallel Processing** - Multiple checks simultaneously
- **Intelligent Caching** - Cache results for faster subsequent checks

### **🛡️ Safety Benefits**
- **Unbreakable Rules** - Cannot bypass guard rails
- **Real-Time Monitoring** - Immediate feedback on violations
- **User Control** - Ask before making changes
- **Audit Trail** - Log all actions and violations

---

**Status**: 🛡️ **UNBREAKABLE RULES ACTIVE**  
**Mode**: DEFENSIVE ONLY  
**Overrides**: NONE ALLOWED  
**Loop Prevention**: HARDCODED - 3 attempts max per issue  
**Ready for**: Safe, incremental development
