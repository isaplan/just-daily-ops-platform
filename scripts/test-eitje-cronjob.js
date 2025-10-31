#!/usr/bin/env node

/**
 * Test Eitje Cron Job
 * 
 * This script helps test and debug the Eitje incremental sync cron job
 * Usage:
 *   node scripts/test-eitje-cronjob.js status       - Check if cron job is scheduled
 *   node scripts/test-eitje-cronjob.js test          - Manually trigger the edge function
 *   node scripts/test-eitje-cronjob.js check-config - Check sync configuration
 *   node scripts/test-eitje-cronjob.js enable        - Enable the cron job
 *   node scripts/test-eitje-cronjob.js disable      - Disable the cron job
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

async function checkCronJobStatus() {
  console.log('🔍 Checking Eitje Cron Job Status...\n');
  
  console.log('💡 Note: Checking cron job status requires direct database access.');
  console.log('   You can check this in Supabase Dashboard → Database → Cron Jobs\n');
  
  // Check config instead (which we can access)
  await checkConfig();
  
  // Check sync history to see if jobs have been running
  console.log('📜 Checking recent sync history...\n');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/api_sync_logs?provider=eq.eitje&order=started_at.desc&limit=5`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    
    if (response.ok) {
      const logs = await response.json();
      if (logs && logs.length > 0) {
        console.log(`✅ Found ${logs.length} recent Eitje sync log(s):\n`);
        logs.forEach((log, i) => {
          const date = new Date(log.started_at);
          console.log(`  ${i + 1}. ${date.toLocaleString()}`);
          console.log(`     Status: ${log.status}`);
          console.log(`     Records: ${log.records_inserted || 0}`);
          if (log.error_message) {
            console.log(`     Error: ${log.error_message.substring(0, 100)}`);
          }
          console.log('');
        });
      } else {
        console.log('⚠️  No recent sync history found');
        console.log('   This could mean the cron job has not run yet.\n');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not fetch sync history:', error.message);
  }
  
  console.log('💡 To check cron job status in Supabase Dashboard:');
  console.log('   1. Go to Supabase Dashboard');
  console.log('   2. Navigate to Database → Cron Jobs');
  console.log('   3. Look for "eitje-incremental-sync-hourly"\n');
}

async function checkConfig() {
  console.log('🔍 Checking Eitje Sync Configuration...\n');
  
  try {
    const { data: config, error } = await supabase
      .from('eitje_sync_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error fetching config:', error.message);
      return;
    }
    
    if (!config) {
      console.log('❌ No sync configuration found');
      console.log('   The eitje_sync_config table exists but has no rows.');
      console.log('   Run: node scripts/test-eitje-cronjob.js init-config\n');
      return;
    }
    
    console.log('✅ Sync Configuration Found:\n');
    console.log(`  Mode: ${config.mode}`);
    console.log(`  Incremental Interval: ${config.incremental_interval_minutes} minutes`);
    console.log(`  Worker Interval: ${config.worker_interval_minutes} minutes`);
    console.log(`  Quiet Hours: ${config.quiet_hours_start || '02:00:00'} - ${config.quiet_hours_end || '06:00:00'}`);
    console.log(`  Enabled Endpoints: ${Array.isArray(config.enabled_endpoints) ? config.enabled_endpoints.join(', ') : 'none'}`);
    console.log('');
    
    if (config.mode !== 'incremental') {
      console.log('⚠️  WARNING: Mode is not "incremental"');
      console.log(`   Current mode: ${config.mode}`);
      console.log('   The cron job will skip execution if mode is not "incremental"');
      console.log('   Set mode to "incremental" in the UI or via API\n');
    } else {
      console.log('✅ Mode is "incremental" - cron job should run\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function initConfig() {
  console.log('🔧 Initializing Eitje Sync Configuration...\n');
  
  try {
    // Check if config already exists
    const { data: existing } = await supabase
      .from('eitje_sync_config')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (existing) {
      console.log('✅ Config already exists. Use "check-config" to view it.\n');
      await checkConfig();
      return;
    }
    
    // Try to insert with minimal required fields first
    // The table should have defaults for most fields
    const minimalConfig = {
      mode: 'manual' // Start as manual - user must explicitly enable incremental
    };
    
    // Try with minimal config first
    let config, error;
    ({ data: config, error } = await supabase
      .from('eitje_sync_config')
      .insert(minimalConfig)
      .select()
      .single());
    
    // If minimal works but we want full config, try to update
    if (!error && config) {
      const fullConfig = {
        incremental_interval_minutes: 60,
        worker_interval_minutes: 5,
        quiet_hours_start: '02:00:00',
        quiet_hours_end: '06:00:00',
        enabled_endpoints: ['time_registration_shifts', 'planning_shifts', 'revenue_days']
      };
      
      // Try to update with additional fields (may fail if columns don't exist)
      const { data: updated, error: updateError } = await supabase
        .from('eitje_sync_config')
        .update(fullConfig)
        .eq('id', config.id)
        .select()
        .single();
      
      if (!updateError && updated) {
        config = updated;
      } else {
        console.log('⚠️  Note: Some optional config fields may not be available in this schema');
      }
    }
    
    if (error) {
      console.error('❌ Error creating config:', error.message);
      return;
    }
    
    console.log('✅ Default configuration created successfully!\n');
    console.log('📋 Configuration:');
    console.log(`   Mode: ${config.mode} (set to "incremental" to enable cron)`);
    console.log(`   Incremental Interval: ${config.incremental_interval_minutes} minutes`);
    console.log(`   Worker Interval: ${config.worker_interval_minutes} minutes`);
    console.log(`   Quiet Hours: ${config.quiet_hours_start} - ${config.quiet_hours_end}`);
    console.log(`   Enabled Endpoints: ${config.enabled_endpoints.join(', ')}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Go to Eitje API page → Cronjob tab');
    console.log('   2. Set mode to "Incremental" and save');
    console.log('   3. Or test manually: node scripts/test-eitje-cronjob.js test\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testEdgeFunction() {
  console.log('🧪 Testing Eitje Incremental Sync Edge Function...\n');
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    console.log(`📅 Testing sync for date: ${dateStr}\n`);
    console.log('⏳ Invoking edge function...\n');
    
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('eitje-incremental-sync', {
      body: {}
    });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    if (error) {
      console.error('❌ Edge function error:', error);
      console.error('   Message:', error.message);
      if (error.context) {
        console.error('   Status:', error.context.status, error.context.statusText);
        
        // Try to get error body
        try {
          const errorBody = await error.context.text();
          console.error('   Error Response:', errorBody);
        } catch (e) {
          // Ignore if we can't read body
        }
      }
      return;
    }
    
    console.log(`✅ Edge function completed in ${duration}s\n`);
    console.log('📊 Response:\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    if (data?.success) {
      console.log('✅ Sync was successful!');
      if (data.total_records !== undefined) {
        console.log(`   Total records inserted: ${data.total_records}`);
      }
      if (data.endpoint_results) {
        console.log(`   Endpoints synced: ${data.endpoint_results.length}`);
      }
    } else {
      console.log('⚠️  Sync completed but may have issues');
      if (data?.message) {
        console.log(`   Message: ${data.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

async function enableCronJob() {
  console.log('🔄 Enabling Eitje Cron Job...\n');
  
  try {
    const { error } = await supabase.rpc('toggle_eitje_cron_jobs', { enabled: true });
    
    if (error) {
      console.error('❌ Error enabling cron job:', error.message);
      return;
    }
    
    console.log('✅ Cron job enabled successfully');
    console.log('   The job should now run every hour at minute 0\n');
    
    // Verify it's enabled
    await checkCronJobStatus();
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function disableCronJob() {
  console.log('🔄 Disabling Eitje Cron Job...\n');
  
  try {
    const { error } = await supabase.rpc('toggle_eitje_cron_jobs', { enabled: false });
    
    if (error) {
      console.error('❌ Error disabling cron job:', error.message);
      return;
    }
    
    console.log('✅ Cron job disabled successfully\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function main() {
  const [,, command] = process.argv;
  
  switch (command) {
    case 'status':
      await checkCronJobStatus();
      break;
    case 'check-config':
      await checkConfig();
      break;
    case 'test':
      await testEdgeFunction();
      break;
    case 'enable':
      await enableCronJob();
      break;
    case 'disable':
      await disableCronJob();
      break;
    case 'init-config':
      await initConfig();
      break;
    default:
      console.log(`
🧪 Eitje Cron Job Tester

Usage:
  node scripts/test-eitje-cronjob.js status        - Check if cron job is scheduled
  node scripts/test-eitje-cronjob.js check-config  - Check sync configuration
  node scripts/test-eitje-cronjob.js init-config   - Create default sync configuration
  node scripts/test-eitje-cronjob.js test          - Manually trigger the edge function
  node scripts/test-eitje-cronjob.js enable        - Enable the cron job
  node scripts/test-eitje-cronjob.js disable       - Disable the cron job

Examples:
  # Check everything
  node scripts/test-eitje-cronjob.js status
  node scripts/test-eitje-cronjob.js check-config
  
  # Test manually
  node scripts/test-eitje-cronjob.js test
  
  # Enable if needed
  node scripts/test-eitje-cronjob.js enable
      `);
      process.exit(0);
  }
}

main().catch(console.error);

