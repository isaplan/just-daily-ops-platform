#!/usr/bin/env node

/**
 * Verify Eitje Cron Job Setup
 * Checks if config exists and provides next steps
 */

require('dotenv').config({ path: '.env.local' });

const port = process.env.PORT || 3000;
const apiUrl = `http://localhost:${port}/api/eitje/sync-config`;

async function verifySetup() {
  console.log('🔍 Verifying Eitje Cron Job Setup...\n');
  
  try {
    const response = await fetch(apiUrl);
    const result = await response.json();
    
    if (!result.success) {
      console.error('❌ API Error:', result.error);
      console.log('\n💡 Make sure your Next.js dev server is running');
      return;
    }
    
    if (!result.data) {
      console.log('❌ No configuration found');
      console.log('\n📋 To create config:');
      console.log('   1. Go to http://localhost:' + port + '/finance/eitje-api');
      console.log('   2. Click on "Cronjob" tab');
      console.log('   3. Click "Save Configuration" button');
      console.log('   4. Set mode to "Incremental"');
      console.log('   5. Click "Save Configuration" again\n');
      return;
    }
    
    const config = result.data;
    console.log('✅ Configuration Found:\n');
    console.log(`   Mode: ${config.mode}`);
    if (config.incremental_interval_minutes) {
      console.log(`   Incremental Interval: ${config.incremental_interval_minutes} minutes`);
    }
    if (config.worker_interval_minutes) {
      console.log(`   Worker Interval: ${config.worker_interval_minutes} minutes`);
    }
    if (config.enabled_endpoints) {
      console.log(`   Enabled Endpoints: ${config.enabled_endpoints.join(', ')}`);
    }
    console.log('');
    
    if (config.mode !== 'incremental') {
      console.log('⚠️  Mode is not "incremental"');
      console.log('   The cron job will not run until mode is set to "incremental"\n');
      console.log('📋 To enable:');
      console.log('   1. Go to http://localhost:' + port + '/finance/eitje-api → Cronjob tab');
      console.log('   2. Set mode to "Incremental"');
      console.log('   3. Click "Save Configuration"\n');
    } else {
      console.log('✅ Mode is "incremental" - cron job should be active!\n');
      console.log('📊 Next steps:');
      console.log('   1. Verify cron job is scheduled in Supabase Dashboard');
      console.log('      → Database → Cron Jobs → Look for "eitje-incremental-sync-hourly"');
      console.log('   2. Wait for next hour (runs at minute 0)');
      console.log('   3. Check sync history in UI or via: /api/cron/sync-history\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure your Next.js dev server is running:');
    console.log('   npm run dev\n');
  }
}

verifySetup();

