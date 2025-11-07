#!/usr/bin/env node

/**
 * Manually trigger Eitje incremental sync (simulates cron job)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function triggerSync() {
  console.log('🚀 Triggering Eitje Incremental Sync...\n');
  
  try {
    const startTime = Date.now();
    
    console.log('📡 Invoking eitje-incremental-sync edge function...\n');
    
    const { data, error } = await supabase.functions.invoke('eitje-incremental-sync', {
      body: {}
    });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    if (error) {
      console.error('❌ Error:', error);
      if (error.context) {
        console.error('   Status:', error.context.status);
        try {
          const errorBody = await error.context.text();
          console.error('   Response:', errorBody);
        } catch (e) {
          // Ignore
        }
      }
      process.exit(1);
    }
    
    console.log(`✅ Sync completed in ${duration}s\n`);
    console.log('📊 Response:\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    if (data?.success) {
      console.log('✅ Sync was successful!');
      if (data.total_records !== undefined) {
        console.log(`   Total records inserted: ${data.total_records}`);
      }
      if (data.endpoint_results) {
        console.log(`\n📋 Endpoint Results:`);
        data.endpoint_results.forEach((result) => {
          if (result.success) {
            console.log(`   ✅ ${result.endpoint}: ${result.records || 0} records`);
          } else {
            console.log(`   ❌ ${result.endpoint}: ${result.error || 'Failed'}`);
          }
        });
      }
      console.log('\n💡 Check sync history in the UI to see the log entry!');
    } else if (data?.endpoint_results) {
      // Show endpoint errors even if overall success is false
      console.log('⚠️  Some endpoints failed:\n');
      data.endpoint_results.forEach((result) => {
        if (result.success) {
          console.log(`   ✅ ${result.endpoint}: ${result.records || 0} records`);
        } else {
          console.log(`   ❌ ${result.endpoint}: ${result.error || 'Failed'}`);
          console.log(`      This might be normal if there's no data for yesterday`);
        }
      });
      console.log('\n💡 Tip: Check Supabase Edge Function logs for detailed error messages');
    } else {
      console.log('⚠️  Sync completed but may have issues');
      if (data?.message) {
        console.log(`   Message: ${data.message}`);
      }
      if (data?.mode) {
        console.log(`   Mode: ${data.mode}`);
        if (data.mode === 'manual') {
          console.log('   ⚠️  Config mode is "manual" - cron will skip. Set to "incremental" to enable.');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

triggerSync();

