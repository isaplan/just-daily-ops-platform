#!/bin/bash

# Deploy Eitje Incremental Sync Edge Function
# This script deploys the updated edge function with incremental sync logic

echo "🚀 Deploying Eitje Incremental Sync Edge Function..."
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feature/eitje-cron-hourly" ]; then
  echo "⚠️  Warning: Not on feature/eitje-cron-hourly branch (current: $CURRENT_BRANCH)"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check if edge function file exists
if [ ! -f "supabase/functions/eitje-incremental-sync/index.ts" ]; then
  echo "❌ Error: Edge function file not found!"
  exit 1
fi

echo "✅ Edge function file found"
echo ""

# Deploy the function
echo "📦 Deploying to Supabase..."
npx supabase functions deploy eitje-incremental-sync

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "📋 Next steps:"
  echo "  1. Verify deployment in Supabase Dashboard → Edge Functions"
  echo "  2. Check logs after next cron run (or trigger manually)"
  echo "  3. Verify sync state table gets populated:"
  echo "     SELECT * FROM eitje_sync_state;"
else
  echo ""
  echo "❌ Deployment failed. Check the error messages above."
  exit 1
fi

