require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkCronStatus() {
  console.log('🔍 Checking Cron Job Status...\n');

  // Check Bork config
  try {
    const { data: borkConfig, error: borkError } = await supabase
      .from('bork_sync_config')
      .select('mode, sync_interval_minutes, enabled_locations')
      .single();

    if (borkError && borkError.code !== 'PGRST116') {
      console.error('❌ Error fetching Bork config:', borkError.message);
    } else if (borkConfig) {
      const isActive = borkConfig.mode === 'active';
      console.log('📦 Bork Cron Job:');
      console.log(`   Status: ${isActive ? '✅ ACTIVE' : '⏸️  PAUSED'}`);
      console.log(`   Mode: ${borkConfig.mode}`);
      console.log(`   Interval: ${borkConfig.sync_interval_minutes} minutes`);
      console.log(`   Enabled Locations: ${borkConfig.enabled_locations?.length || 0}`);
    } else {
      console.log('📦 Bork Cron Job:');
      console.log('   ⚠️  No configuration found (default: paused)');
    }
  } catch (error) {
    console.error('❌ Error checking Bork:', error.message);
  }

  console.log('');

  // Check Eitje config
  try {
    const { data: eitjeConfig, error: eitjeError } = await supabase
      .from('eitje_sync_config')
      .select('mode, incremental_interval_minutes, enabled_endpoints')
      .single();

    if (eitjeError && eitjeError.code !== 'PGRST116') {
      console.error('❌ Error fetching Eitje config:', eitjeError.message);
    } else if (eitjeConfig) {
      const isActive = eitjeConfig.mode === 'incremental';
      console.log('📦 Eitje Cron Job:');
      console.log(`   Status: ${isActive ? '✅ ACTIVE' : '⏸️  PAUSED'}`);
      console.log(`   Mode: ${eitjeConfig.mode}`);
      console.log(`   Interval: ${eitjeConfig.incremental_interval_minutes} minutes`);
      console.log(`   Enabled Endpoints: ${eitjeConfig.enabled_endpoints?.join(', ') || 'none'}`);
    } else {
      console.log('📦 Eitje Cron Job:');
      console.log('   ⚠️  No configuration found (default: manual)');
    }
  } catch (error) {
    console.error('❌ Error checking Eitje:', error.message);
  }

  console.log('\n💡 Note: Cron jobs are scheduled via pg_cron in the database.');
  console.log('   The actual cron jobs may be active even if config mode is paused.');
  console.log('   Check Supabase Dashboard → Database → Cron Jobs for actual status.');
}

checkCronStatus().catch(console.error);

