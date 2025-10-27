# AI Guard Rules - Complete Reference Guide

## 🛡️ **AI GUARD RULES SYSTEM**

### **📋 QUICK START**

**Activate Guard Rails:**
- Default: Guard rails are active by default
- Override: Use `@override` commands when needed
- Emergency: Use `@emergency` for critical fixes

**Deactivate Guard Rails:**
- `@override` - Temporary disable
- `@free` - Full access without restrictions
- `@disable-guard-rails` - Complete disable
- `@emergency` - Emergency override

**Reactivate Guard Rails:**
- `@reactivate-guard-rails` - Re-enable all guard rails

---

## 🎯 **DEVELOPMENT MODES**

### **1. 🔨 REBUILD MODE**
**When to use:** Complete rebuild of functionality
**Activation:** `@rebuild` or keywords: "rebuild", "complete rebuild", "full implementation"

**Rules:**
- ✅ Must implement ALL functionality from original
- ✅ Cannot skip any features
- ✅ Must check shared documentation
- ✅ Must do web search for best practices
- ✅ Cannot break existing working code
- ✅ Must use shadcn/ui components
- ✅ Must follow all development standards

**Speed:** 80% (slightly slower for thoroughness)
**Safety:** 90% (high safety)

### **2. 🔧 IMPROVE MODE**
**When to use:** Incremental improvements and optimizations
**Activation:** `@improve` or keywords: "improve", "optimize", "fix", "enhance"

**Rules:**
- ✅ Must test all changes thoroughly
- ✅ Cannot break existing functionality
- ✅ Must avoid repetitive fixes
- ✅ Must search shared documentation
- ✅ Must do web search for best practices
- ✅ Must use shadcn/ui components
- ✅ Must follow all development standards

**Speed:** 100% (normal speed)
**Safety:** 80% (high safety)

### **3. 🚀 NEW FEATURE MODE**
**When to use:** Quick prototyping of new functionality
**Activation:** `@new` or keywords: "new feature", "prototype", "experiment"

**Rules:**
- ✅ Can prototype quickly
- ✅ Cannot touch completed functions
- ✅ Cannot break existing systems
- ✅ Focus on new functionality only
- ✅ Must use shadcn/ui components
- ✅ Must follow Supabase standards (critical for auth)

**Speed:** 150% (faster for prototyping)
**Safety:** 60% (moderate safety)

### **4. 🛡️ DEFENSIVE MODE**
**When to use:** Analysis, reporting, and read-only operations
**Activation:** `@defensive` or keywords: "analyze", "check", "report", "investigate"

**Rules:**
- ✅ Read-only operations only
- ✅ No file modifications
- ✅ No new file creation
- ✅ Analysis and reporting only
- ✅ No guard rails enforcement (read-only)

**Speed:** 50% (slower but ultra-safe)
**Safety:** 100% (maximum safety)

---

## 🎮 **OVERRIDE COMMANDS**

### **🚫 TEMPORARY DEACTIVATION**

| Command | Purpose | Duration | Scope |
|---------|---------|----------|-------|
| `@override` | Temporary disable all guard rails | Until reactivated | All guard rails |
| `@free` | Allow all actions without restrictions | Until reactivated | All restrictions |
| `@unlock` | Remove all blocks and validations | Until reactivated | All validations |

### **🎯 SELECTIVE DEACTIVATION**

| Command | Purpose | Duration | Scope |
|---------|---------|----------|-------|
| `@no-react-standards` | Disable React standards only | Until reactivated | React standards only |
| `@no-tailwind-standards` | Disable Tailwind standards only | Until reactivated | Tailwind standards only |
| `@no-supabase-standards` | Disable Supabase standards only | Until reactivated | Supabase standards only |
| `@no-shadcn-standards` | Disable shadcn standards only | Until reactivated | shadcn standards only |

### **🚨 EMERGENCY OVERRIDE**

| Command | Purpose | Duration | Scope |
|---------|---------|----------|-------|
| `@emergency` | Critical fixes without restrictions | Until reactivated | All restrictions |
| `@disable-guard-rails` | Complete disable guard rails system | Until reactivated | Entire system |

### **✅ REACTIVATION**

| Command | Purpose | Duration | Scope |
|---------|---------|----------|-------|
| `@reactivate-guard-rails` | Re-enable guard rails system | Permanent | All guard rails |

---

## 📋 **DEVELOPMENT STANDARDS**

### **⚛️ REACT STANDARDS**
- ✅ PascalCase file naming (UserProfile.tsx)
- ✅ TypeScript interfaces for props
- ✅ Hooks at top level of components
- ✅ Proper import order (React -> external -> internal -> assets)
- ✅ Named exports for components, default exports for pages
- ✅ Proper component structure and organization

### **🎨 TAILWIND STANDARDS**
- ✅ Use utility classes directly
- ✅ Avoid @apply in global CSS
- ✅ Avoid arbitrary values, use theme values
- ✅ Avoid inline styles, use Tailwind utilities
- ✅ Use cva (Class Variance Authority) for component variants
- ✅ Proper className organization and readability

### **⚡ NEXT.JS STANDARDS**
- ✅ 'use client' directive for client components
- ✅ Proper import order and organization
- ✅ Server Components for data fetching
- ✅ Client Components for interactivity
- ✅ Proper file structure (app/ directory)
- ✅ Server Actions for mutations

### **🗄️ SUPABASE STANDARDS**
- ✅ Use @supabase/ssr package exclusively
- ✅ Use getAll() and setAll() methods only
- ✅ Never use individual cookie methods (get/set/remove)
- ✅ Never use @supabase/auth-helpers-nextjs
- ✅ Always return supabaseResponse in middleware
- ✅ Always call auth.getUser() in middleware
- ✅ Proper browser and server client implementations

### **🎨 SHADCN/UI STANDARDS**
- ✅ Always use shadcn/ui components when available
- ✅ Import from `@/components/ui/[component]`
- ✅ Use proper shadcn component names and props
- ✅ Follow shadcn component patterns and structure
- ✅ Never create custom implementations of shadcn components
- ✅ Never reinvent shadcn functionality
- ✅ Never use custom styling when shadcn provides the component
- ✅ Use full shadcn implementation with all features

---

## 🚫 **CORE RULES ENFORCEMENT**

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

---

## 🎯 **PRACTICAL USAGE EXAMPLES**

### **Example 1: Rebuild Mode**
```
You: @rebuild - Need to rebuild the authentication system
AI: 🔨 REBUILD MODE ACTIVATED
AI: [Implements complete auth system with all features]
```

### **Example 2: Improve Mode**
```
You: @improve - Optimize the dashboard performance
AI: 🔧 IMPROVE MODE ACTIVATED
AI: [Makes targeted performance improvements]
```

### **Example 3: New Feature Mode**
```
You: @new - Add a new sidebar component
AI: 🚀 NEW FEATURE MODE ACTIVATED
AI: [Creates new sidebar using shadcn/ui components]
```

### **Example 4: Emergency Override**
```
You: @emergency - Production is down, need immediate fix
AI: 🚨 EMERGENCY OVERRIDE ACTIVATED
AI: [Proceeds with unrestricted access]
```

### **Example 5: Selective Standards Disable**
```
You: @no-supabase-standards - Need to experiment with auth patterns
AI: [Disables only Supabase standards, keeps other guard rails active]
```

---

## 📊 **MODE COMPARISON**

| Mode | Speed | Safety | Use Case | Standards |
|------|-------|--------|----------|-----------|
| **REBUILD** | 80% | 90% | Complete rebuild | All enforced |
| **IMPROVE** | 100% | 80% | Incremental changes | All enforced |
| **NEW_FEATURE** | 150% | 60% | Rapid prototyping | shadcn + Supabase critical |
| **DEFENSIVE** | 50% | 100% | Analysis only | None (read-only) |

---

## 🚀 **BENEFITS**

### **🎯 Development Benefits**
- **Consistent Code Quality** - All code follows project standards
- **No Breaking Changes** - Prevents modification of working code
- **UI Consistency** - Always uses shadcn/ui components
- **Security Protection** - Prevents authentication vulnerabilities
- **Production Safety** - Avoids code that breaks in production

### **⚡ Speed Benefits**
- **Mode-Specific Optimization** - Different speeds for different needs
- **Smart Validation** - Only check what's necessary
- **Parallel Processing** - Multiple checks simultaneously
- **Intelligent Caching** - Cache results for faster subsequent checks

### **🛡️ Safety Benefits**
- **Unbreakable Rules** - Cannot bypass guard rails
- **Real-Time Monitoring** - Immediate feedback on violations
- **User Control** - Override when needed
- **Audit Trail** - Log all actions and overrides

---

## 📝 **QUICK REFERENCE**

### **🎮 Most Common Commands**
- `@rebuild` - Complete rebuild mode
- `@improve` - Incremental improvements
- `@new` - New feature development
- `@override` - Temporary disable guard rails
- `@reactivate-guard-rails` - Re-enable guard rails

### **🚨 Emergency Commands**
- `@emergency` - Critical fixes
- `@free` - Full access
- `@unlock` - Remove all blocks

### **🎯 Selective Commands**
- `@no-react-standards` - Disable React rules
- `@no-tailwind-standards` - Disable Tailwind rules
- `@no-supabase-standards` - Disable Supabase rules
- `@no-shadcn-standards` - Disable shadcn rules

---

**Status**: 📋 **COMPLETE REFERENCE GUIDE**  
**Date**: 2025-01-16  
**Ready for**: Development with full guard rails system




