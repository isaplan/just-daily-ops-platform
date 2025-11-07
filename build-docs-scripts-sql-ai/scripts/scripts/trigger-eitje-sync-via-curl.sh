#!/bin/bash

# Manually trigger Eitje Incremental Sync Edge Function
# This tests the sync without waiting for cron

echo "🚀 Manually triggering Eitje Incremental Sync..."
echo ""

# Get Supabase URL and key from .env.local
if [ -f .env.local ]; then
  SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
  SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)
else
  echo "❌ .env.local file not found"
  echo "   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY manually"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Missing Supabase credentials"
  echo "   SUPABASE_URL: ${SUPABASE_URL:-NOT SET}"
  echo "   SERVICE_KEY: ${SERVICE_KEY:-NOT SET}"
  exit 1
fi

EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/eitje-incremental-sync"

echo "📡 Calling edge function: $EDGE_FUNCTION_URL"
echo ""

# Trigger the edge function
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

# Extract HTTP status and body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d ':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📊 Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✅ Sync triggered successfully!"
  echo ""
  echo "📋 Next steps:"
  echo "  1. Wait a few seconds"
  echo "  2. Check sync state: SELECT * FROM eitje_sync_state;"
  echo "  3. Check edge function logs in Supabase Dashboard"
else
  echo ""
  echo "❌ Sync failed. Check the error above."
fi

