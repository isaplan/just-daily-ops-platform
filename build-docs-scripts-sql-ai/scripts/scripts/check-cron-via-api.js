// Simple script to check cron status via the API
const http = require('http');

const port = process.env.PORT || 3000;
const url = `http://localhost:${port}/api/cron/sync-history`;

console.log('🔍 Checking Cron Job Status via API...\n');
console.log(`   Connecting to: ${url}\n`);

const req = http.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success && result.data) {
        const { cronStatus, history } = result.data;
        
        console.log('📊 Cron Job Status:\n');
        console.log(`🔵 Bork: ${cronStatus.bork ? '✅ ACTIVE' : '⏸️  PAUSED'}`);
        console.log(`🟢 Eitje: ${cronStatus.eitje ? '✅ ACTIVE' : '⏸️  PAUSED'}`);
        
        console.log(`\n📜 Recent Sync History (${history.length} entries):`);
        if (history.length > 0) {
          history.slice(0, 5).forEach((log, i) => {
            console.log(`\n  ${i + 1}. ${log.provider.toUpperCase()} - ${log.location}`);
            console.log(`     Status: ${log.success ? '✅ Success' : '❌ Failed'}`);
            console.log(`     Records: ${log.recordsInserted}`);
            console.log(`     Time: ${log.startedAt}`);
          });
        } else {
          console.log('   No recent sync history found');
        }
        
        console.log('\n💡 To activate cron jobs:');
        console.log('   - Go to Bork/Eitje API pages → Cronjob tab');
        console.log('   - Toggle to "Active" mode and save');
      } else {
        console.error('❌ API Error:', result.error);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
  console.log('\n💡 Make sure your Next.js dev server is running:');
  console.log('   npm run dev');
  console.log('\nOr check cron status directly in Supabase Dashboard:');
  console.log('   Database → Cron Jobs');
});

req.setTimeout(5000, () => {
  req.destroy();
  console.error('❌ Request timeout');
  process.exit(1);
});

