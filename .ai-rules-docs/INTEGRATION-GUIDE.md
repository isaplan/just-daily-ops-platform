# AI Guard Rules Integration Guide

## 🚀 **QUICK START**

### **1. Basic Integration**

Add this to your project to activate guard rules:

```javascript
// Import the guard rules system
const { guardRules } = require('./.ai-rules-docs/activate-guard-rules.js');

// Check actions before executing
async function checkAction(action, userMessage = '') {
  const result = await guardRules.checkAction(action, userMessage);
  
  if (!result.allowed) {
    console.log(`🚫 BLOCKED: ${result.reason}`);
    return false;
  }
  
  console.log(`✅ ALLOWED: ${result.reason}`);
  return true;
}
```

### **2. HTML Integration**

```html
<!-- Add to your HTML -->
<script src=".ai-rules-docs/activate-guard-rules.js"></script>
<script>
  // Check AI actions
  async function checkAIAction(action, userMessage) {
    const result = await checkAIAction(action, userMessage);
    return result;
  }
</script>
```

### **3. Node.js Integration**

```javascript
// In your Node.js application
const { guardRules, checkAIAction } = require('./.ai-rules-docs/activate-guard-rules.js');

// Use in your AI system
async function processUserRequest(userMessage, action) {
  const guardResult = await checkAIAction(action, userMessage);
  
  if (!guardResult.allowed) {
    return { error: guardResult.reason };
  }
  
  // Proceed with action
  return await executeAction(action);
}
```

## 🎯 **USAGE EXAMPLES**

### **Example 1: Basic Action Check**

```javascript
const action = {
  type: 'create_component',
  targetFile: 'src/components/UserProfile.tsx',
  content: 'export const UserProfile = () => { ... }',
  userRequest: 'create a user profile component'
};

const result = await guardRules.checkAction(action, 'create user profile component');
// Result: { allowed: true/false, reason: '...' }
```

### **Example 2: Override Commands**

```javascript
// User says: "@override - need to fix critical bug"
const result = await guardRules.checkAction(action, '@override - need to fix critical bug');
// Result: { allowed: true, reason: 'OVERRIDE_ACTIVE' }
```

### **Example 3: Mode Commands**

```javascript
// User says: "@rebuild - rebuild the entire auth system"
const result = await guardRules.checkAction(action, '@rebuild - rebuild the entire auth system');
// Result: Mode changed to REBUILD, different rules applied
```

## 🛡️ **GUARD RULES CONFIGURATION**

### **Customize Standards**

```javascript
// Disable specific standards
guardRules.standards.react = false;        // Disable React standards
guardRules.standards.tailwind = false;     // Disable Tailwind standards
guardRules.standards.supabase = false;     // Disable Supabase standards
guardRules.standards.shadcn = false;       // Disable shadcn standards
```

### **Set Development Mode**

```javascript
// Set mode programmatically
guardRules.currentMode = 'REBUILD';        // Complete rebuild mode
guardRules.currentMode = 'IMPROVE';        // Incremental improvements
guardRules.currentMode = 'NEW_FEATURE';    // New feature development
guardRules.currentMode = 'DEFENSIVE';      // Analysis only
```

### **Override System**

```javascript
// Activate override
guardRules.activateOverride('User requested override', ['all']);

// Activate emergency override
guardRules.activateEmergency('Critical production issue');

// Deactivate override
guardRules.deactivateOverride();
```

## 📋 **AVAILABLE COMMANDS**

### **🎯 Development Modes**
- `@rebuild` - Complete rebuild mode
- `@improve` - Incremental improvements
- `@new` - New feature development
- `@defensive` - Analysis only

### **🚫 Override Commands**
- `@override` - Temporary disable all guard rails
- `@free` - Allow all actions without restrictions
- `@unlock` - Remove all blocks and validations
- `@disable-guard-rails` - Completely disable guard rails system
- `@emergency` - Emergency override for critical fixes
- `@reactivate-guard-rails` - Re-enable guard rails system

### **🎮 Standards Control**
- `@no-react-standards` - Disable React standards only
- `@no-tailwind-standards` - Disable Tailwind standards only
- `@no-supabase-standards` - Disable Supabase standards only
- `@no-shadcn-standards` - Disable shadcn standards only

## 🧪 **TESTING**

### **Test the System**

1. Open `guard-rules-test.html` in your browser
2. Try different commands and actions
3. See how the guard rules respond
4. Test override scenarios

### **Test Commands**

```javascript
// Test basic action
await guardRules.checkAction({
  type: 'create_component',
  targetFile: 'src/components/Button.tsx',
  content: 'export const Button = () => { ... }',
  userRequest: 'create a button component'
}, 'create button component');

// Test override
await guardRules.checkAction(action, '@override - need to create custom component');

// Test emergency
await guardRules.checkAction(action, '@emergency - production is down');
```

## 🔧 **CUSTOMIZATION**

### **Add Custom Rules**

```javascript
// Extend the guard rules system
class CustomGuardRules extends AIGuardRulesSystem {
  async checkCustomRules(action) {
    // Add your custom rules here
    if (action.type === 'custom_action') {
      return { allowed: false, reason: 'Custom rule violation' };
    }
    return { allowed: true };
  }
}
```

### **Custom Standards**

```javascript
// Add custom standards
guardRules.standards.custom = true;

// Check custom standards
if (guardRules.standards.custom) {
  const customViolations = this.checkCustomStandards(action.content);
  violations.push(...customViolations);
}
```

## 📊 **MONITORING**

### **Get Status**

```javascript
const status = guardRules.getOverrideStatus();
console.log('Override active:', status.active);
console.log('Reason:', status.reason);
console.log('Emergency:', status.emergency);
```

### **Log Actions**

```javascript
// Log all guard rules decisions
const originalCheckAction = guardRules.checkAction;
guardRules.checkAction = async function(action, userMessage) {
  const result = await originalCheckAction.call(this, action, userMessage);
  console.log(`Guard Rules: ${result.allowed ? 'ALLOWED' : 'BLOCKED'} - ${result.reason}`);
  return result;
};
```

## 🚀 **DEPLOYMENT**

### **Production Setup**

1. Copy the guard rules files to your project
2. Import and initialize the system
3. Integrate with your AI system
4. Test thoroughly
5. Monitor and adjust as needed

### **Environment Variables**

```javascript
// Set environment-specific rules
if (process.env.NODE_ENV === 'production') {
  guardRules.standards.strict = true;
  guardRules.overrideActive = false;
}
```

## 📚 **REFERENCE**

- **Complete Reference**: `AI-Guard-Rules-Reference.md`
- **Implementation**: `ai-guard-rules-implementation.js`
- **Activation**: `activate-guard-rules.js`
- **Test Page**: `guard-rules-test.html`

## 🆘 **TROUBLESHOOTING**

### **Common Issues**

1. **Guard rules not working**: Check if the system is properly imported
2. **Override not working**: Ensure override commands are properly parsed
3. **Standards violations**: Check if standards are enabled
4. **Mode not changing**: Verify mode commands are recognized

### **Debug Mode**

```javascript
// Enable debug logging
guardRules.debug = true;

// Check system status
console.log('Guard Rules Status:', guardRules.getOverrideStatus());
console.log('Current Mode:', guardRules.currentMode);
console.log('Standards:', guardRules.standards);
```

---

**Status**: 📋 **INTEGRATION GUIDE COMPLETE**  
**Date**: 2025-01-16  
**Ready for**: Production deployment




