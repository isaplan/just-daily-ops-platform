#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCredentials() {
  console.log('🔍 Checking Eitje API Credentials...\n');
  
  try {
    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'eitje')
      .eq('is_active', true)
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!credentials || credentials.length === 0) {
      console.log('❌ No active Eitje credentials found');
      console.log('\n💡 You need to configure Eitje API credentials in the UI:');
      console.log('   1. Go to /finance/eitje-api');
      console.log('   2. Fill in your API credentials');
      console.log('   3. Click "Save Credentials"');
      console.log('   4. Test the connection\n');
    } else {
      console.log(`✅ Found ${credentials.length} active Eitje credential(s):\n`);
      credentials.forEach((cred, i) => {
        console.log(`  ${i + 1}. Credential ID: ${cred.id}`);
        console.log(`     Location ID: ${cred.location_id || 'Global'}`);
        console.log(`     Base URL: ${cred.base_url || 'Not set'}`);
        console.log(`     Active: ${cred.is_active ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCredentials();

