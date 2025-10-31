#!/usr/bin/env node

/**
 * Check what columns actually exist in eitje_sync_config table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking eitje_sync_config table schema...\n');
  
  // Try to get any row to see what columns are returned
  const { data, error } = await supabase
    .from('eitje_sync_config')
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log('✅ Table exists but has no rows');
      console.log('   This is fine - we can still check the schema\n');
    } else {
      console.error('❌ Error:', error.message);
      console.error('   Code:', error.code);
      return;
    }
  }
  
  // Try to select each known column individually
  const knownColumns = [
    'id',
    'mode',
    'incremental_interval_minutes',
    'worker_interval_minutes',
    'backfill_interval_minutes',
    'quiet_hours_start',
    'quiet_hours_end',
    'gap_check_hour',
    'enabled_endpoints',
    'created_at',
    'updated_at'
  ];
  
  console.log('📋 Testing columns:\n');
  const existingColumns = [];
  
  for (const col of knownColumns) {
    try {
      const { error: testError } = await supabase
        .from('eitje_sync_config')
        .select(col)
        .limit(0);
      
      if (!testError) {
        existingColumns.push(col);
        console.log(`  ✅ ${col}`);
      } else {
        console.log(`  ❌ ${col} - ${testError.message}`);
      }
    } catch (e) {
      console.log(`  ❌ ${col} - ${e.message}`);
    }
  }
  
  console.log(`\n✅ Found ${existingColumns.length} existing columns:`);
  console.log(`   ${existingColumns.join(', ')}\n`);
  
  if (!existingColumns.includes('enabled_endpoints')) {
    console.log('⚠️  WARNING: enabled_endpoints column does not exist!');
    console.log('   The API will skip this field when saving.\n');
    console.log('💡 To add the column, run this SQL in Supabase Dashboard:');
    console.log(`
ALTER TABLE eitje_sync_config 
ADD COLUMN IF NOT EXISTS enabled_endpoints TEXT[] 
DEFAULT ARRAY['time_registration_shifts', 'planning_shifts', 'revenue_days']::TEXT[];
    `);
  }
}

checkSchema().catch(console.error);

