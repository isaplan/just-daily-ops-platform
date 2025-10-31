#!/usr/bin/env node

/**
 * Check Eitje sync activity since a specific time
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

async function checkEitjeSyncs() {
  console.log('🔍 Checking Eitje sync activity since 11:20 today...\n');
  
  // Get today's date and 11:20 time
  const today = new Date();
  const checkTime = new Date(today);
  checkTime.setHours(11, 20, 0, 0);
  const checkTimeISO = checkTime.toISOString();
  
  console.log('⏰ Check time threshold:', checkTimeISO);
  console.log('⏰ Current time:', new Date().toISOString());
  console.log('');
  
  // Check api_sync_logs table for Eitje syncs
  console.log('=== SYNC LOGS (api_sync_logs) ===');
  const { data: apiLogs, error: apiError } = await supabase
    .from('api_sync_logs')
    .select('*')
    .gte('started_at', checkTimeISO)
    .order('started_at', { ascending: false })
    .limit(20);
  
  if (apiError) {
    console.log('❌ Error checking api_sync_logs:', apiError.message);
  } else {
    const eitjeLogs = apiLogs?.filter(log => {
      const provider = log.provider || log.metadata?.provider || '';
      const syncType = log.sync_type || '';
      return provider === 'eitje' || syncType.includes('eitje') || syncType.includes('time_registration') || syncType.includes('revenue');
    }) || [];
    
    console.log('Found', eitjeLogs.length, 'Eitje syncs since 11:20');
    if (eitjeLogs.length > 0) {
      eitjeLogs.forEach(log => {
        const provider = log.provider || log.metadata?.provider || 'N/A';
        const records = log.records_inserted || log.metadata?.records_inserted || log.metadata?.recordsAdded || 'N/A';
        const status = log.status || 'N/A';
        console.log(`  ✅ ${log.started_at}`);
        console.log(`     Status: ${status} | Provider: ${provider} | Records: ${records}`);
        if (log.error_message) {
          console.log(`     ⚠️  Error: ${log.error_message}`);
        }
        console.log('');
      });
    } else {
      console.log('  ℹ️  No Eitje sync logs found since 11:20\n');
    }
  }
  
  // Check eitje raw data tables for recent inserts
  console.log('=== RAW DATA TABLES ===');
  
  const rawTables = [
    { name: 'eitje_time_registration_shifts_raw', label: 'Time Registration Shifts' },
    { name: 'eitje_revenue_days_raw', label: 'Revenue Days' }
  ];
  
  let totalNewRecords = 0;
  
  for (const table of rawTables) {
    try {
      // Count records since check time
      const { count, error: countError } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', checkTimeISO);
      
      if (countError) {
        console.log(`❌ Error checking ${table.label}:`, countError.message);
        continue;
      }
      
      // Get latest record
      const { data: latestData, error: latestError } = await supabase
        .from(table.name)
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const newCount = count || 0;
      totalNewRecords += newCount;
      
      console.log(`${table.label}:`);
      console.log(`  📊 New records since 11:20: ${newCount}`);
      if (latestData && !latestError) {
        console.log(`  🕐 Latest record: ${latestData.created_at}`);
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ Error checking ${table.label}:`, error.message);
      console.log('');
    }
  }
  
  console.log('=== SUMMARY ===');
  console.log(`Total new records since 11:20: ${totalNewRecords}`);
  console.log('');
  
  // Check if cronjob is actually running by checking eitje_sync_config
  console.log('=== CRONJOB CONFIGURATION ===');
  const { data: config, error: configError } = await supabase
    .from('eitje_sync_config')
    .select('*')
    .maybeSingle();
  
  if (configError) {
    console.log('❌ Error checking config:', configError.message);
  } else if (!config) {
    console.log('⚠️  No sync config found');
  } else {
    console.log('Mode:', config.mode);
    console.log('Enabled endpoints:', config.enabled_endpoints?.join(', ') || 'N/A');
    console.log('Interval:', config.incremental_interval_minutes, 'minutes');
    if (config.mode !== 'incremental') {
      console.log('⚠️  WARNING: Cronjob is NOT in incremental mode - it will skip syncs');
    }
  }
}

checkEitjeSyncs().catch(console.error);

