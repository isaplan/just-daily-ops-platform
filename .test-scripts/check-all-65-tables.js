#!/usr/bin/env node

/**
 * CHECK ALL 65 TABLES - COMPLETE DATABASE AUDIT
 * Find ALL tables, check EVERY record, migrate EVERYTHING
 */

const https = require('https');

// Database configurations
const OLD_DB = {
    url: 'https://cajxmwyiwrhzryvawjkm.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ'
};

const NEW_DB = {
    url: 'https://vrucbxdudchboznunndz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o'
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'apikey': options.apikey,
                'Authorization': `Bearer ${options.apikey}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

async function discoverAllTables(db, dbName) {
    console.log(`\n🔍 DISCOVERING ALL TABLES in ${dbName}:`);
    console.log('='.repeat(60));
    
    try {
        // Try to get all tables from information_schema
        const response = await makeRequest(`${db.url}/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public`, {
            apikey: db.key
        });
        
        if (response.status === 200) {
            const tables = response.data.map(row => row.table_name);
            console.log(`📊 Found ${tables.length} tables in ${dbName}:`);
            tables.forEach((table, index) => {
                console.log(`  ${index + 1}. ${table}`);
            });
            return tables;
        } else {
            console.log(`❌ Could not discover tables: ${response.status}`);
            return [];
        }
    } catch (error) {
        console.log(`❌ Error discovering tables: ${error.message}`);
        return [];
    }
}

async function getAllRecordsFromTable(db, tableName, dbName) {
    console.log(`\n🔍 Getting ALL records from ${tableName} in ${dbName}:`);
    console.log('='.repeat(60));
    
    let allRecords = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    let batchNumber = 1;
    
    while (hasMore) {
        try {
            console.log(`📦 Batch ${batchNumber}: Records ${offset + 1}-${offset + limit}...`);
            
            const response = await makeRequest(`${db.url}/rest/v1/${tableName}?limit=${limit}&offset=${offset}`, {
                apikey: db.key
            });
            
            if (response.status === 200) {
                const records = response.data;
                allRecords = allRecords.concat(records);
                
                console.log(`✅ Got ${records.length} records (Total: ${allRecords.length})`);
                
                if (records.length < limit) {
                    hasMore = false;
                    console.log(`🏁 End reached (${records.length} < ${limit})`);
                } else {
                    offset += limit;
                    batchNumber++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else {
                console.log(`❌ Batch ${batchNumber} failed: ${response.status}`);
                hasMore = false;
            }
        } catch (error) {
            console.log(`❌ Batch ${batchNumber} error: ${error.message}`);
            hasMore = false;
        }
    }
    
    console.log(`📊 FINAL COUNT for ${tableName}: ${allRecords.length.toLocaleString()} records`);
    return allRecords;
}

async function migrateTableData(tableName, oldRecords, newRecords) {
    console.log(`\n📊 MIGRATING ${tableName}:`);
    console.log('='.repeat(50));
    console.log(`📊 Old database: ${oldRecords.length.toLocaleString()} records`);
    console.log(`📊 New database: ${newRecords.length.toLocaleString()} records`);
    
    if (oldRecords.length <= newRecords.length) {
        console.log(`✅ ${tableName} already has all data or more`);
        return { migrated: 0, skipped: oldRecords.length, status: 'Complete' };
    }
    
    const missingCount = oldRecords.length - newRecords.length;
    console.log(`📊 Missing records: ${missingCount.toLocaleString()}`);
    
    if (missingCount === 0) {
        console.log(`✅ No migration needed for ${tableName}`);
        return { migrated: 0, skipped: oldRecords.length, status: 'Complete' };
    }
    
    // Try to migrate missing records
    console.log(`🚀 Attempting to migrate ${missingCount} records...`);
    
    try {
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
            method: 'POST',
            apikey: NEW_DB.key,
            body: oldRecords
        });
        
        if (response.status === 201) {
            console.log(`✅ Successfully migrated ${oldRecords.length} records`);
            return { migrated: oldRecords.length, skipped: 0, status: 'Migrated' };
        } else {
            console.log(`⚠️  Migration response: ${response.status}`);
            console.log(`Response:`, response.data);
            
            // Try batch migration
            const batchSize = 100;
            const totalBatches = Math.ceil(oldRecords.length / batchSize);
            let totalMigrated = 0;
            
            console.log(`📦 Trying batch migration (${totalBatches} batches)...`);
            
            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, oldRecords.length);
                const batch = oldRecords.slice(start, end);
                
                try {
                    const batchResponse = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
                        method: 'POST',
                        apikey: NEW_DB.key,
                        body: batch
                    });
                    
                    if (batchResponse.status === 201) {
                        totalMigrated += batch.length;
                        console.log(`✅ Batch ${i + 1}/${totalBatches}: ${batch.length} records`);
                    } else {
                        console.log(`⚠️  Batch ${i + 1} failed: ${batchResponse.status}`);
                    }
                } catch (error) {
                    console.log(`❌ Batch ${i + 1} error: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`📊 Total migrated: ${totalMigrated.toLocaleString()} records`);
            return { 
                migrated: totalMigrated, 
                skipped: oldRecords.length - totalMigrated, 
                status: totalMigrated > 0 ? 'Partial' : 'Failed' 
            };
        }
    } catch (error) {
        console.log(`❌ Migration failed: ${error.message}`);
        return { migrated: 0, skipped: oldRecords.length, status: 'Failed' };
    }
}

async function checkAll65Tables() {
    console.log('🚀 CHECKING ALL 65 TABLES - COMPLETE DATABASE AUDIT');
    console.log('='.repeat(80));
    
    // Step 1: Discover ALL tables in OLD database
    console.log('\n📊 STEP 1: DISCOVERING ALL TABLES IN OLD DATABASE');
    console.log('='.repeat(60));
    
    const oldTables = await discoverAllTables(OLD_DB, 'OLD DATABASE');
    
    if (oldTables.length === 0) {
        console.log('❌ Could not discover tables in old database');
        return;
    }
    
    console.log(`\n📊 Found ${oldTables.length} tables in OLD database`);
    
    // Step 2: Get ALL records from OLD database
    console.log('\n📊 STEP 2: GETTING ALL RECORDS FROM OLD DATABASE');
    console.log('='.repeat(60));
    
    const oldData = {};
    let totalOldRecords = 0;
    
    for (const tableName of oldTables) {
        const records = await getAllRecordsFromTable(OLD_DB, tableName, 'OLD DATABASE');
        oldData[tableName] = records;
        totalOldRecords += records.length;
    }
    
    console.log(`\n📊 OLD DATABASE TOTAL: ${totalOldRecords.toLocaleString()} records across ${oldTables.length} tables`);
    
    // Step 3: Get ALL records from NEW database
    console.log('\n📊 STEP 3: GETTING ALL RECORDS FROM NEW DATABASE');
    console.log('='.repeat(60));
    
    const newData = {};
    let totalNewRecords = 0;
    
    for (const tableName of oldTables) {
        const records = await getAllRecordsFromTable(NEW_DB, tableName, 'NEW DATABASE');
        newData[tableName] = records;
        totalNewRecords += records.length;
    }
    
    console.log(`\n📊 NEW DATABASE TOTAL: ${totalNewRecords.toLocaleString()} records across ${oldTables.length} tables`);
    
    // Step 4: Migrate ALL missing data
    console.log('\n📊 STEP 4: MIGRATING ALL MISSING DATA');
    console.log('='.repeat(60));
    
    const migrationResults = {};
    let totalMigrated = 0;
    
    for (const tableName of oldTables) {
        const result = await migrateTableData(tableName, oldData[tableName], newData[tableName]);
        migrationResults[tableName] = result;
        totalMigrated += result.migrated;
    }
    
    // Step 5: Final verification
    console.log('\n📊 STEP 5: FINAL VERIFICATION');
    console.log('='.repeat(60));
    
    const finalNewData = {};
    let finalTotalNewRecords = 0;
    
    for (const tableName of oldTables) {
        const records = await getAllRecordsFromTable(NEW_DB, tableName, 'FINAL CHECK');
        finalNewData[tableName] = records;
        finalTotalNewRecords += records.length;
    }
    
    // Step 6: COMPLETE OVERVIEW OF ALL 65 TABLES
    console.log('\n📊 COMPLETE OVERVIEW OF ALL TABLES:');
    console.log('='.repeat(100));
    console.log('Table Name'.padEnd(30) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status'.padStart(15) + 'Migration');
    console.log('-'.repeat(100));
    
    let totalMissing = 0;
    let allPerfect = true;
    let migratedCount = 0;
    let failedCount = 0;
    let partialCount = 0;
    
    for (const tableName of oldTables) {
        const oldCount = oldData[tableName].length;
        const newCount = finalNewData[tableName].length;
        const diff = oldCount - newCount;
        totalMissing += diff;
        
        let status = '';
        if (oldCount === newCount) {
            status = '✅ Perfect';
        } else if (newCount > oldCount) {
            status = '✅ Extra';
        } else if (newCount > 0) {
            status = '⚠️  Partial';
            allPerfect = false;
        } else {
            status = '❌ Missing';
            allPerfect = false;
        }
        
        const migrationStatus = migrationResults[tableName].status;
        if (migrationStatus === 'Migrated') migratedCount++;
        else if (migrationStatus === 'Failed') failedCount++;
        else if (migrationStatus === 'Partial') partialCount++;
        
        console.log(
            tableName.padEnd(30) + 
            oldCount.toLocaleString().padStart(10) + 
            newCount.toLocaleString().padStart(10) + 
            diff.toLocaleString().padStart(10) + 
            status.padStart(15) +
            migrationStatus
        );
    }
    
    console.log('-'.repeat(100));
    console.log(`TOTAL OLD:  ${totalOldRecords.toLocaleString()}`);
    console.log(`TOTAL NEW:  ${finalTotalNewRecords.toLocaleString()}`);
    console.log(`MISSING:    ${totalMissing.toLocaleString()}`);
    console.log(`MIGRATED:   ${totalMigrated.toLocaleString()}`);
    console.log(`TABLES:     ${oldTables.length} total tables checked`);
    console.log(`SUCCESS:    ${migratedCount} tables successfully migrated`);
    console.log(`PARTIAL:    ${partialCount} tables partially migrated`);
    console.log(`FAILED:     ${failedCount} tables failed to migrate`);
    
    if (allPerfect) {
        console.log('\n🎉 PERFECT MIGRATION! ALL DATA MIGRATED!');
    } else if (totalMissing <= 0) {
        console.log('\n✅ COMPLETE MIGRATION! All data successfully migrated!');
    } else {
        console.log(`\n⚠️  MIGRATION STATUS: ${totalMissing.toLocaleString()} records still missing`);
    }
    
    return {
        oldData,
        newData: finalNewData,
        migrationResults,
        totalOldRecords,
        totalNewRecords: finalTotalNewRecords,
        totalMigrated,
        totalMissing,
        allPerfect,
        tableCount: oldTables.length,
        migratedCount,
        partialCount,
        failedCount
    };
}

// Main execution
if (require.main === module) {
    checkAll65Tables().catch(console.error);
}

module.exports = { checkAll65Tables };
