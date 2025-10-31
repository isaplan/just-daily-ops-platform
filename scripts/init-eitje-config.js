#!/usr/bin/env node

/**
 * Initialize Eitje Sync Config via API
 * Uses the API endpoint which handles upsert logic properly
 */

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const port = process.env.PORT || 3000;

if (!supabaseUrl) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL must be set in .env.local');
  process.exit(1);
}

async function initConfig() {
  console.log('🔧 Initializing Eitje Sync Configuration via API...\n');
  
  const apiUrl = `http://localhost:${port}/api/eitje/sync-config`;
  
  console.log(`📡 Calling: ${apiUrl}\n`);
  
  const defaultConfig = {
    mode: 'manual', // Start as manual - user must explicitly enable incremental
    incremental_interval_minutes: 60,
    worker_interval_minutes: 5,
    enabled_endpoints: ['time_registration_shifts', 'planning_shifts', 'revenue_days']
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(defaultConfig)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('❌ Error:', result.error || 'Unknown error');
      console.log('\n💡 Make sure your Next.js dev server is running:');
      console.log('   npm run dev\n');
      return;
    }
    
    console.log('✅ Configuration initialized successfully!\n');
    console.log('📋 Configuration:');
    const config = result.data;
    console.log(`   Mode: ${config.mode} (set to "incremental" to enable cron)`);
    if (config.incremental_interval_minutes) {
      console.log(`   Incremental Interval: ${config.incremental_interval_minutes} minutes`);
    }
    if (config.worker_interval_minutes) {
      console.log(`   Worker Interval: ${config.worker_interval_minutes} minutes`);
    }
    if (config.enabled_endpoints) {
      console.log(`   Enabled Endpoints: ${config.enabled_endpoints.join(', ')}`);
    }
    console.log('\n💡 Next steps:');
    console.log('   1. Go to Eitje API page → Cronjob tab');
    console.log('   2. Set mode to "Incremental" and save');
    console.log('   3. Or test manually: node scripts/test-eitje-cronjob.js test\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure your Next.js dev server is running:');
    console.log('   npm run dev\n');
  }
}

initConfig();

