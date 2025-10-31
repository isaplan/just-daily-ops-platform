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
  console.log('🔍 Checking Eitje Credential Structure...\n');
  
  try {
    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .select('id, provider, base_url, is_active, additional_config')
      .eq('provider', 'eitje')
      .eq('is_active', true)
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!credentials || credentials.length === 0) {
      console.log('❌ No active credentials found\n');
      return;
    }
    
    console.log(`Found ${credentials.length} credential(s):\n`);
    
    credentials.forEach((cred, i) => {
      console.log(`${i + 1}. Credential ID: ${cred.id}`);
      console.log(`   Base URL: ${cred.base_url}`);
      
      const config = cred.additional_config || {};
      const required = ['partner_username', 'partner_password', 'api_username', 'api_password'];
      const missing = required.filter(key => !config[key]);
      
      if (missing.length === 0) {
        console.log(`   ✅ All required credentials present`);
        console.log(`   Partner Username: ${config.partner_username ? 'Set' : 'Missing'}`);
        console.log(`   API Username: ${config.api_username ? 'Set' : 'Missing'}`);
      } else {
        console.log(`   ❌ Missing credentials: ${missing.join(', ')}`);
        console.log(`   Available keys: ${Object.keys(config).join(', ') || 'none'}`);
      }
      console.log('');
    });
    
    // Find the first complete credential
    const completeCred = credentials.find(cred => {
      const config = cred.additional_config || {};
      return config.partner_username && config.partner_password && 
             config.api_username && config.api_password;
    });
    
    if (!completeCred) {
      console.log('⚠️  WARNING: No credential has all required fields!');
      console.log('   The edge function will fail until credentials are properly configured.\n');
      console.log('💡 Fix: Go to /finance/eitje-api and update credentials with:');
      console.log('   - partner_username');
      console.log('   - partner_password');
      console.log('   - api_username');
      console.log('   - api_password\n');
    } else {
      console.log('✅ Found at least one complete credential\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCredentials();

