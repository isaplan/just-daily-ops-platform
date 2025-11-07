#!/usr/bin/env node

/**
 * Supabase Export Script
 * Exports all edge functions and database migrations to a backup directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_DIR = path.join(PROJECT_ROOT, 'supabase/functions');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'supabase/migrations');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'supabase/config.toml');
const EXPORT_DIR = path.join(PROJECT_ROOT, 'supabase-export');
const EXPORT_FUNCTIONS_DIR = path.join(EXPORT_DIR, 'functions');
const EXPORT_MIGRATIONS_DIR = path.join(EXPORT_DIR, 'migrations');

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

function copyFile(source, dest) {
  try {
    const destDir = path.dirname(dest);
    ensureDirectory(destDir);
    fs.copyFileSync(source, dest);
    return true;
  } catch (error) {
    console.error(`❌ Error copying ${source}:`, error.message);
    return false;
  }
}

function copyDirectory(source, dest) {
  ensureDirectory(dest);
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      copyFile(sourcePath, destPath);
    }
  }
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function exportFunctions() {
  console.log('\n📦 Exporting Edge Functions...');
  console.log('================================');
  
  const functions = [];
  
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.log('⚠️  Functions directory not found');
    return functions;
  }
  
  const entries = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const functionName = entry.name;
      const functionPath = path.join(FUNCTIONS_DIR, functionName);
      const exportPath = path.join(EXPORT_FUNCTIONS_DIR, functionName);
      
      console.log(`  🔄 Exporting ${functionName}...`);
      
      copyDirectory(functionPath, exportPath);
      
      // Collect all files in the function
      const files = [];
      let totalSize = 0;
      
      function collectFiles(dir, basePath = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const fullPath = path.join(dir, e.name);
          const relativePath = path.join(basePath, e.name);
          
          if (e.isDirectory()) {
            collectFiles(fullPath, relativePath);
          } else {
            files.push(relativePath);
            totalSize += getFileSize(fullPath);
          }
        }
      }
      
      collectFiles(functionPath);
      
      functions.push({
        name: functionName,
        files,
        size: totalSize,
      });
      
      console.log(`  ✅ Exported ${functionName} (${files.length} files, ${formatBytes(totalSize)})`);
    }
  }
  
  return functions;
}

function exportMigrations() {
  console.log('\n🗄️  Exporting Database Migrations...');
  console.log('====================================');
  
  const migrations = [];
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('⚠️  Migrations directory not found');
    return migrations;
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  
  // Sort by filename (which includes timestamp)
  files.sort();
  
  for (const filename of files) {
    const sourcePath = path.join(MIGRATIONS_DIR, filename);
    const destPath = path.join(EXPORT_MIGRATIONS_DIR, filename);
    
    console.log(`  🔄 Exporting ${filename}...`);
    
    if (copyFile(sourcePath, destPath)) {
      const size = getFileSize(sourcePath);
      const timestamp = extractTimestamp(filename);
      
      migrations.push({
        filename,
        size,
        timestamp,
      });
      
      console.log(`  ✅ Exported ${filename} (${formatBytes(size)})`);
    }
  }
  
  return migrations;
}

function extractTimestamp(filename) {
  // Try to extract timestamp from migration filename
  // Format: YYYYMMDDHHMMSS_description.sql or YYYYMMDD_description.sql
  const match = filename.match(/^(\d{8})(\d{6})?/);
  if (match) {
    const dateStr = match[1];
    const timeStr = match[2] || '000000';
    return `${dateStr}_${timeStr}`;
  }
  return '';
}

function exportConfig() {
  console.log('\n⚙️  Exporting Configuration...');
  console.log('==============================');
  
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log('⚠️  Config file not found');
    return null;
  }
  
  const destPath = path.join(EXPORT_DIR, 'config.toml');
  copyFile(CONFIG_FILE, destPath);
  
  const size = getFileSize(CONFIG_FILE);
  console.log(`  ✅ Exported config.toml (${formatBytes(size)})`);
  
  return {
    filename: 'config.toml',
    size,
  };
}

function exportDatabaseSchema() {
  console.log('\n🗃️  Attempting to Export Database Schema...');
  console.log('==========================================');
  
  try {
    // Check if Supabase CLI is available
    execSync('which supabase', { stdio: 'ignore' });
    
    console.log('  ℹ️  Supabase CLI found. Attempting to dump schema...');
    
    const schemaPath = path.join(EXPORT_DIR, 'schema.sql');
    
    try {
      // Try to dump the schema using Supabase CLI
      // Note: This requires the project to be linked
      execSync(`supabase db dump --schema public > "${schemaPath}"`, {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
      
      const size = getFileSize(schemaPath);
      console.log(`  ✅ Exported database schema (${formatBytes(size)})`);
      
      return {
        filename: 'schema.sql',
        size,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.log('  ⚠️  Could not export schema (project may not be linked)');
      console.log('  ℹ️  You can export schema manually using: supabase db dump');
      return undefined;
    }
  } catch {
    console.log('  ⚠️  Supabase CLI not found. Skipping schema export.');
    console.log('  ℹ️  Install with: npm install -g supabase');
    return undefined;
  }
}

function getProjectId() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const match = content.match(/project_id\s*=\s*"([^"]+)"/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Ignore errors
  }
  return 'unknown';
}

function createManifest(manifest) {
  const manifestPath = path.join(EXPORT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Created manifest: ${manifestPath}`);
}

function createReadme(manifest) {
  const readmePath = path.join(EXPORT_DIR, 'README.md');
  
  const totalFunctions = manifest.functions.length;
  const totalMigrations = manifest.migrations.length;
  const totalFunctionsSize = manifest.functions.reduce((sum, f) => sum + f.size, 0);
  const totalMigrationsSize = manifest.migrations.reduce((sum, m) => sum + m.size, 0);
  
  const readme = `# Supabase Export

**Export Date:** ${manifest.exportDate}  
**Project ID:** ${manifest.projectId}

## Summary

- **Edge Functions:** ${totalFunctions} functions (${formatBytes(totalFunctionsSize)})
- **Database Migrations:** ${totalMigrations} migrations (${formatBytes(totalMigrationsSize)})
- **Configuration:** ${manifest.config ? formatBytes(manifest.config.size) : 'N/A'}
${manifest.databaseSchema ? `- **Database Schema:** ${formatBytes(manifest.databaseSchema.size)}` : ''}

## Structure

\`\`\`
supabase-export/
├── functions/          # Edge functions (${totalFunctions} functions)
├── migrations/         # Database migrations (${totalMigrations} files)
├── config.toml         # Supabase configuration
${manifest.databaseSchema ? '├── schema.sql          # Database schema dump\n' : ''}├── manifest.json       # Export manifest
└── README.md           # This file
\`\`\`

## Edge Functions

${manifest.functions.map((f) => `- **${f.name}** (${f.files.length} files, ${formatBytes(f.size)})`).join('\n')}

## Database Migrations

${manifest.migrations.map((m) => `- ${m.filename} (${formatBytes(m.size)})`).join('\n')}

## Restore Instructions

### Restore Edge Functions

\`\`\`bash
# Copy functions back to your project
cp -r functions/* /path/to/project/supabase/functions/
\`\`\`

### Restore Migrations

\`\`\`bash
# Copy migrations back to your project
cp migrations/*.sql /path/to/project/supabase/migrations/
\`\`\`

### Restore Database Schema

If you have a schema.sql file:

\`\`\`bash
# Restore schema (requires Supabase CLI)
supabase db reset
psql -h <host> -U <user> -d <database> < schema.sql
\`\`\`

### Apply Migrations

\`\`\`bash
# Apply all migrations
supabase migration up
\`\`\`

## Notes

- This export was created on ${manifest.exportDate}
- Edge functions may require environment variables/secrets to be configured in Supabase Dashboard
- Database migrations should be applied in order (they are sorted by timestamp)
- Always test in a development environment before applying to production
`;

  fs.writeFileSync(readmePath, readme);
  console.log(`📝 Created README: ${readmePath}`);
}

function main() {
  console.log('🚀 Starting Supabase Export...');
  console.log('==============================\n');
  
  // Create export directory
  ensureDirectory(EXPORT_DIR);
  ensureDirectory(EXPORT_FUNCTIONS_DIR);
  ensureDirectory(EXPORT_MIGRATIONS_DIR);
  
  // Export components
  const functions = exportFunctions();
  const migrations = exportMigrations();
  const config = exportConfig();
  const databaseSchema = exportDatabaseSchema();
  
  // Create manifest
  const manifest = {
    exportDate: new Date().toISOString(),
    projectId: getProjectId(),
    functions,
    migrations,
    config: config || { filename: 'config.toml', size: 0 },
    databaseSchema,
  };
  
  createManifest(manifest);
  createReadme(manifest);
  
  // Summary
  console.log('\n✅ Export Complete!');
  console.log('==================');
  console.log(`📁 Export location: ${EXPORT_DIR}`);
  console.log(`📦 Functions: ${functions.length}`);
  console.log(`🗄️  Migrations: ${migrations.length}`);
  console.log(`⚙️  Config: ${config ? '✅' : '❌'}`);
  console.log(`🗃️  Schema: ${databaseSchema ? '✅' : '⚠️  (not exported)'}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Review the exported files in supabase-export/');
  console.log('   2. Check manifest.json for detailed information');
  console.log('   3. Archive the export directory for backup');
}

if (require.main === module) {
  main();
}

module.exports = { exportSupabase: main };

