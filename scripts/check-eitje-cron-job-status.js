#!/usr/bin/env node

/**
 * Check if Eitje cron job is actually scheduled and running
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCronJobStatus() {
  console.log('🔍 Checking Eitje cron job status...\n');
  
  // 1. Check sync config
  console.log('=== SYNC CONFIGURATION ===');
  const { data: config, error: configError } = await supabase
    .from('eitje_sync_config')
    .select('*')
    .maybeSingle();
  
  if (configError) {
    console.log('❌ Error fetching config:', configError.message);
  } else if (!config) {
    console.log('⚠️  No sync config found - cronjob won\'t run');
  } else {
    console.log('✅ Config found:');
    console.log(`   Mode: ${config.mode}`);
    console.log(`   Enabled endpoints: ${config.enabled_endpoints?.join(', ') || 'N/A'}`);
    console.log(`   Interval: ${config.incremental_interval_minutes} minutes`);
    if (config.mode !== 'incremental') {
      console.log('⚠️  WARNING: Mode is not "incremental" - cronjob will skip syncs');
    }
  }
  
  console.log('\n=== PG_CRON JOB STATUS ===');
  console.log('Checking pg_cron.cron_job table...');
  
  // Query pg_cron jobs (requires service role key)
  const { data: cronJobs, error: cronError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT 
          jobid,
          schedule,
          command,
          nodename,
          nodeport,
          database,
          username,
          active,
          jobname
        FROM cron.job
        WHERE jobname LIKE '%eitje%' OR command LIKE '%eitje-incremental-sync%'
        ORDER BY jobid;
      `
    });
  
  if (cronError) {
    console.log('⚠️  Cannot query pg_cron directly (may require RPC function)');
    console.log('   Error:', cronError.message);
    console.log('\n   To check manually, run in Supabase SQL Editor:');
    console.log('   SELECT * FROM cron.job WHERE command LIKE \'%eitje-incremental-sync%\';');
  } else if (cronJobs && cronJobs.length > 0) {
    console.log(`✅ Found ${cronJobs.length} Eitje cron job(s):`);
    cronJobs.forEach(job => {
      console.log(`   Job ID: ${job.jobid}`);
      console.log(`   Schedule: ${job.schedule}`);
      console.log(`   Active: ${job.active}`);
      console.log(`   Command: ${job.command?.substring(0, 100)}...`);
      console.log('');
    });
  } else {
    console.log('❌ No Eitje cron job found in pg_cron');
    console.log('   The cron job may not be set up properly');
  }
  
  console.log('\n=== RECENT EDGE FUNCTION INVOCATIONS ===');
  console.log('Checking Supabase Edge Function logs...');
  console.log('   (Note: Check Supabase Dashboard > Edge Functions > eitje-incremental-sync > Logs)');
  
  console.log('\n=== MANUAL TEST ===');
  console.log('To test if the edge function works manually:');
  console.log('   curl -X POST https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-incremental-sync \\');
  console.log('     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \\');
  console.log('     -H "Content-Type: application/json"');
}

checkCronJobStatus().catch(console.error);

