# 🚀 Edge Functions Deployment Guide

## ✅ Successfully Migrated Functions

All edge functions have been copied from the old Supabase project to your new project. Here's what you need to deploy:

### **Core Functions (Required for Next.js App):**
1. **`bork-sync-daily`** - Daily Bork API sync
2. **`bork-sync-range`** - Date range Bork API sync  
3. **`bork-api-test`** - Bork API connection testing
4. **`bork-api-sync`** - Bork API synchronization
5. **`bork-sync-master-data`** - Master data sync
6. **`finance-import-orchestrator`** - PowerBI PnL data import
7. **`analyze-financials`** - Financial analysis

### **Supporting Functions:**
8. **`finance-validation-middleware`** - Data validation
9. **`process-bork-raw-data`** - Raw data processing
10. **`smart-calculations`** - Financial calculations
11. **`_shared`** - Shared utilities (cors.ts)

## 🎯 Deployment Steps

### **Option 1: Deploy All Functions (Recommended)**
```bash
# Navigate to your project directory
cd /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform

# Deploy all functions at once
supabase functions deploy
```

### **Option 2: Deploy Individual Functions**
```bash
# Deploy core functions one by one
supabase functions deploy bork-sync-daily
supabase functions deploy bork-sync-range
supabase functions deploy bork-api-test
supabase functions deploy bork-api-sync
supabase functions deploy bork-sync-master-data
supabase functions deploy finance-import-orchestrator
supabase functions deploy analyze-financials
```

### **Option 3: Deploy via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. For each function:
   - Click **Create Function**
   - Name: `function-name`
   - Copy the code from `supabase/functions/function-name/index.ts`
   - Click **Deploy**

## 🔧 Prerequisites

Make sure you have:
1. **Supabase CLI installed**: `npm install -g supabase`
2. **Logged in to Supabase**: `supabase login`
3. **Linked to your project**: `supabase link --project-ref vrucbxdudchboznunndz`

## 📋 Function Details

### **bork-sync-daily**
- **Purpose**: Sync daily sales data from Bork API
- **Usage**: Called by your Next.js app for daily data sync
- **Dependencies**: `_shared/cors.ts`

### **bork-sync-range** 
- **Purpose**: Sync date range of sales data from Bork API
- **Usage**: Called for historical data sync
- **Dependencies**: `bork-sync-daily`

### **bork-api-test**
- **Purpose**: Test Bork API connectivity
- **Usage**: API connection testing in your app
- **Dependencies**: None

### **bork-api-sync**
- **Purpose**: Full Bork API synchronization
- **Usage**: Complete data sync from Bork
- **Dependencies**: `_shared/cors.ts`

### **bork-sync-master-data**
- **Purpose**: Sync master data (products, locations, etc.)
- **Usage**: Master data synchronization
- **Dependencies**: `_shared/cors.ts`

### **finance-import-orchestrator**
- **Purpose**: PowerBI PnL data import orchestration
- **Usage**: Financial data import from PowerBI
- **Dependencies**: None

### **analyze-financials**
- **Purpose**: Financial analysis and calculations
- **Usage**: AI-powered financial analysis
- **Dependencies**: `LOVABLE_API_KEY` environment variable

## 🚨 Important Notes

1. **Environment Variables**: Some functions may need environment variables set in your Supabase project
2. **Dependencies**: Deploy `_shared` first, then other functions
3. **Testing**: Test each function after deployment
4. **Monitoring**: Check function logs in Supabase dashboard

## ✅ Verification

After deployment, verify functions are working:
1. Check Supabase dashboard → Edge Functions
2. Test functions via your Next.js app
3. Check function logs for any errors

## 🎉 Next Steps

Once all functions are deployed:
1. **Test your Next.js app** - the 404 errors should be resolved
2. **Deploy to Vercel** - your app should work in production
3. **Monitor function performance** - check logs and metrics

---

**All edge functions have been successfully migrated! 🚀**
