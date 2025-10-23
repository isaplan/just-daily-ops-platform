#!/usr/bin/env node

/**
 * COMPARE DATABASES - COMPLETE OVERVIEW
 * Show detailed comparison of all tables between old and new databases
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

// ALL 65 TABLES
const ALL_65_TABLES = [
    'api_credentials',
    'api_sync_logs',
    'bork_api_credentials',
    'bork_api_sync_logs',
    'bork_backfill_progress',
    'bork_backfill_queue',
    'bork_sales_data',
    'bork_sync_config',
    'combined_products',
    'comments',
    'daily_waste',
    'data_imports',
    'eitje_backfill_progress',
    'eitje_backfill_queue',
    'eitje_environments',
    'eitje_planning_shifts',
    'eitje_revenue_days',
    'eitje_shift_types',
    'eitje_shifts',
    'eitje_sync_config',
    'eitje_teams',
    'eitje_time_registration_shifts',
    'eitje_users',
    'execution_logs',
    'financial_chat_messages',
    'financial_chat_sessions',
    'financial_insights',
    'financial_reports',
    'import_validation_logs',
    'locations',
    'member_invitations',
    'menu_item_waste',
    'menu_items',
    'menu_product_price_history',
    'menu_section_products',
    'menu_sections',
    'menu_versions',
    'monthly_stock_count_items',
    'monthly_stock_counts',
    'order_groups',
    'order_history',
    'orders',
    'package_migrations',
    'package_usage_logs',
    'pnl_line_items',
    'pnl_monthly_summary',
    'pnl_reports',
    'powerbi_pnl_data',
    'product_locations',
    'product_recipe_ingredients',
    'product_recipes',
    'products',
    'profiles',
    'report_insights',
    'return_items',
    'returns',
    'roadmap_items',
    'sales_import_items',
    'sales_imports',
    'stock_levels',
    'stock_transactions',
    'storage_locations',
    'supplier_orders',
    'suppliers',
    'user_roles'
];

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

async function getTableCount(db, tableName, dbName) {
    try {
        const response = await makeRequest(`${db.url}/rest/v1/${tableName}?select=count`, {
            apikey: db.key
        });
        
        if (response.status === 200) {
            // Try to get count from Content-Range header
            const contentRange = response.headers['content-range'];
            if (contentRange) {
                const match = contentRange.match(/\/(\d+)$/);
                if (match) {
                    return parseInt(match[1]);
                }
            }
            
            // Fallback to response data length
            if (Array.isArray(response.data)) {
                return response.data.length;
            }
            
            return 0;
        } else if (response.status === 404) {
            return 'TABLE_NOT_FOUND';
        } else {
            return 'ERROR';
        }
    } catch (error) {
        return 'ERROR';
    }
}

async function compareDatabasesOverview() {
    console.log('📊 DATABASE COMPARISON OVERVIEW');
    console.log('='.repeat(120));
    console.log('OLD DATABASE: https://cajxmwyiwrhzryvawjkm.supabase.co');
    console.log('NEW DATABASE: https://vrucbxdudchboznunndz.supabase.co');
    console.log('='.repeat(120));
    
    const results = [];
    let totalOldRecords = 0;
    let totalNewRecords = 0;
    let tablesWithData = 0;
    let tablesMigrated = 0;
    let tablesNotFound = 0;
    let tablesWithErrors = 0;
    
    console.log('\n📊 CHECKING ALL 65 TABLES...');
    console.log('='.repeat(120));
    console.log('Table Name'.padEnd(35) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status'.padStart(15) + 'Notes'.padStart(20));
    console.log('-'.repeat(120));
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        process.stdout.write(`\r📊 Processing ${i + 1}/${ALL_65_TABLES.length}: ${tableName.padEnd(30)}`);
        
        const oldCount = await getTableCount(OLD_DB, tableName, 'OLD');
        const newCount = await getTableCount(NEW_DB, tableName, 'NEW');
        
        let status = '';
        let notes = '';
        let diff = 0;
        
        if (oldCount === 'TABLE_NOT_FOUND') {
            status = '❌ Not Found';
            notes = 'Table missing';
            tablesNotFound++;
        } else if (oldCount === 'ERROR') {
            status = '⚠️  Error';
            notes = 'Connection error';
            tablesWithErrors++;
        } else if (newCount === 'TABLE_NOT_FOUND') {
            status = '❌ Not Created';
            notes = 'Table not created';
            tablesNotFound++;
        } else if (newCount === 'ERROR') {
            status = '⚠️  Error';
            notes = 'Connection error';
            tablesWithErrors++;
        } else {
            diff = newCount - oldCount;
            
            if (oldCount > 0) {
                tablesWithData++;
            }
            
            if (oldCount === newCount) {
                status = '✅ Perfect';
                notes = 'Complete match';
                tablesMigrated++;
            } else if (newCount > oldCount) {
                status = '✅ Extra';
                notes = `+${diff} records`;
                tablesMigrated++;
            } else if (newCount > 0) {
                status = '⚠️  Partial';
                notes = `${newCount}/${oldCount} records`;
                tablesMigrated++;
            } else {
                status = '❌ Missing';
                notes = 'No data migrated';
            }
            
            totalOldRecords += typeof oldCount === 'number' ? oldCount : 0;
            totalNewRecords += typeof newCount === 'number' ? newCount : 0;
        }
        
        results.push({
            tableName,
            oldCount,
            newCount,
            diff,
            status,
            notes
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n');
    console.log('='.repeat(120));
    
    // Display results
    for (const result of results) {
        const oldDisplay = result.oldCount === 'TABLE_NOT_FOUND' ? 'N/A' : 
                          result.oldCount === 'ERROR' ? 'ERR' : 
                          result.oldCount.toString();
        
        const newDisplay = result.newCount === 'TABLE_NOT_FOUND' ? 'N/A' : 
                          result.newCount === 'ERROR' ? 'ERR' : 
                          result.newCount.toString();
        
        const diffDisplay = typeof result.diff === 'number' ? result.diff.toString() : 'N/A';
        
        console.log(
            result.tableName.padEnd(35) + 
            oldDisplay.padStart(10) + 
            newDisplay.padStart(10) + 
            diffDisplay.padStart(10) + 
            result.status.padStart(15) +
            result.notes.padStart(20)
        );
    }
    
    console.log('='.repeat(120));
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`📊 Total Tables: ${ALL_65_TABLES.length}`);
    console.log(`📊 Tables with Data: ${tablesWithData}`);
    console.log(`📊 Tables Migrated: ${tablesMigrated}`);
    console.log(`📊 Tables Not Found: ${tablesNotFound}`);
    console.log(`📊 Tables with Errors: ${tablesWithErrors}`);
    console.log(`📊 Total Old Records: ${totalOldRecords.toLocaleString()}`);
    console.log(`📊 Total New Records: ${totalNewRecords.toLocaleString()}`);
    console.log(`📊 Migration Rate: ${tablesWithData > 0 ? ((tablesMigrated / tablesWithData) * 100).toFixed(2) : 0}%`);
    console.log(`📊 Data Migration Rate: ${totalOldRecords > 0 ? ((totalNewRecords / totalOldRecords) * 100).toFixed(2) : 0}%`);
    
    // Key insights
    console.log('\n🔍 KEY INSIGHTS:');
    console.log('='.repeat(60));
    
    const perfectMatches = results.filter(r => r.status === '✅ Perfect');
    const partialMatches = results.filter(r => r.status === '⚠️  Partial');
    const missingData = results.filter(r => r.status === '❌ Missing');
    const notFound = results.filter(r => r.status === '❌ Not Found' || r.status === '❌ Not Created');
    
    if (perfectMatches.length > 0) {
        console.log(`✅ Perfect Matches: ${perfectMatches.length} tables`);
        perfectMatches.forEach(r => console.log(`   - ${r.tableName}: ${r.oldCount} records`));
    }
    
    if (partialMatches.length > 0) {
        console.log(`\n⚠️  Partial Matches: ${partialMatches.length} tables`);
        partialMatches.forEach(r => console.log(`   - ${r.tableName}: ${r.newCount}/${r.oldCount} records`));
    }
    
    if (missingData.length > 0) {
        console.log(`\n❌ Missing Data: ${missingData.length} tables`);
        missingData.forEach(r => console.log(`   - ${r.tableName}: ${r.oldCount} records not migrated`));
    }
    
    if (notFound.length > 0) {
        console.log(`\n❌ Tables Not Found: ${notFound.length} tables`);
        notFound.forEach(r => console.log(`   - ${r.tableName}: ${r.notes}`));
    }
    
    return {
        results,
        summary: {
            totalTables: ALL_65_TABLES.length,
            tablesWithData,
            tablesMigrated,
            tablesNotFound,
            tablesWithErrors,
            totalOldRecords,
            totalNewRecords,
            migrationRate: tablesWithData > 0 ? (tablesMigrated / tablesWithData) * 100 : 0,
            dataMigrationRate: totalOldRecords > 0 ? (totalNewRecords / totalOldRecords) * 100 : 0
        }
    };
}

// Main execution
if (require.main === module) {
    compareDatabasesOverview().catch(console.error);
}

module.exports = { compareDatabasesOverview };
