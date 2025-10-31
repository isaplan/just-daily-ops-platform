require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCronStatus() {
  console.log('🔍 Checking Cron Job Status...\n');

  // Check Bork config
  try {
    const { data: borkConfigs, error: borkError } = await supabase
      .from('bork_sync_config')
      .select('mode, sync_interval_minutes, enabled_locations')
      .limit(1);
    
    const borkConfig = borkConfigs && borkConfigs.length > 0 ? borkConfigs[0] : null;

    if (borkError && borkError.code !== 'PGRST116') {
      console.error('❌ Error fetching Bork config:', borkError.message);
    } else if (borkConfig) {
      const isActive = borkConfig.mode === 'active';
      console.log('📦 Bork Cron Job:');
      console.log(`   Status: ${isActive ? '✅ ACTIVE' : '⏸️  PAUSED'}`);
      console.log(`   Mode: ${borkConfig.mode}`);
      console.log(`   Interval: ${borkConfig.sync_interval_minutes} minutes`);
      console.log(`   Enabled Locations: ${borkConfig.enabled_locations?.length || 0}`);
      if (borkConfig.enabled_locations && borkConfig.enabled_locations.length > 0) {
        console.log(`   Locations: ${borkConfig.enabled_locations.join(', ').substring(0, 50)}...`);
      }
    } else {
      console.log('📦 Bork Cron Job:');
      console.log('   ⚠️  No configuration found');
      console.log('   Status: ⏸️  PAUSED (default - no config)');
    }
  } catch (error) {
    console.error('❌ Error checking Bork:', error.message);
  }

  console.log('');

  // Check Eitje config
  try {
    const { data: eitjeConfigs, error: eitjeError } = await supabase
      .from('eitje_sync_config')
      .select('mode, incremental_interval_minutes, enabled_endpoints, quiet_hours_start, quiet_hours_end')
      .limit(1);
    
    const eitjeConfig = eitjeConfigs && eitjeConfigs.length > 0 ? eitjeConfigs[0] : null;

    if (eitjeError && eitjeError.code !== 'PGRST116') {
      console.error('❌ Error fetching Eitje config:', eitjeError.message);
    } else if (eitjeConfig) {
      const isActive = eitjeConfig.mode === 'incremental';
      console.log('📦 Eitje Cron Job:');
      console.log(`   Status: ${isActive ? '✅ ACTIVE' : '⏸️  PAUSED'}`);
      console.log(`   Mode: ${eitjeConfig.mode}`);
      console.log(`   Interval: ${eitjeConfig.incremental_interval_minutes} minutes`);
      console.log(`   Enabled Endpoints: ${eitjeConfig.enabled_endpoints?.join(', ') || 'none'}`);
      if (eitjeConfig.quiet_hours_start !== undefined && eitjeConfig.quiet_hours_end !== undefined) {
        console.log(`   Quiet Hours: ${eitjeConfig.quiet_hours_start}:00 - ${eitjeConfig.quiet_hours_end}:00`);
      }
    } else {
      console.log('📦 Eitje Cron Job:');
      console.log('   ⚠️  No configuration found');
      console.log('   Status: ⏸️  PAUSED (default - manual mode)');
    }
  } catch (error) {
    console.error('❌ Error checking Eitje:', error.message);
  }

  console.log('\n💡 Note:');
  console.log('   - Config status shows if cron jobs SHOULD be running');
  console.log('   - Actual pg_cron jobs may need to be verified in Supabase Dashboard');
  console.log('   - Check: Database → Cron Jobs or Edge Functions → Logs');
  console.log('\n🚀 To activate:');
  console.log('   - Use the Cronjob tab in Bork/Eitje API pages');
  console.log('   - Or: node scripts/manage-cron-jobs.js enable <bork|eitje>');
}

checkCronStatus().catch(console.error);

