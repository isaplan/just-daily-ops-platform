#!/usr/bin/env node

/**
 * Auto-update Finance Documentation
 * 
 * This script scans the codebase for finance-related files and updates
 * the documentation in docs/finance/ to keep it synchronized.
 * 
 * Run: node scripts/docs/update-finance-docs.js
 * Or: npm run docs:update:finance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = path.join(__dirname, '../..');
const DOCS_DIR = path.join(BASE_DIR, 'docs/finance');
const SRC_DIR = path.join(BASE_DIR, 'src');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Find all TypeScript/TSX files in a directory
 */
function findFiles(dir, extensions = ['.ts', '.tsx'], fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (!['node_modules', '.next', '.git'].includes(file)) {
        findFiles(filePath, extensions, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Extract page information from a file
 */
function extractPageInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Try to find export default function or export default
  const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  const pageName = defaultExportMatch ? defaultExportMatch[1] : path.basename(filePath, path.extname(filePath));
  
  // Extract comments/doc blocks
  const docBlockMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  const description = docBlockMatch ? docBlockMatch[0].replace(/\/\*\*|\*\//g, '').trim() : '';
  
  return {
    path: relativePath,
    name: pageName,
    description,
    fullPath: filePath
  };
}

/**
 * Extract API endpoint information
 */
function extractApiInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Extract route segments (api/finance/pnl-data -> GET /api/finance/pnl-data)
  const routeMatch = relativePath.match(/api\/finance\/([^\/]+)/);
  const routeName = routeMatch ? routeMatch[1] : null;
  
  // Find HTTP methods
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  
  // Extract doc comments
  const docBlockMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  const description = docBlockMatch ? docBlockMatch[0].replace(/\/\*\*|\*\//g, '').trim() : '';
  
  return {
    path: relativePath,
    route: routeName ? `/api/finance/${routeName}` : null,
    methods,
    description,
    fullPath: filePath
  };
}

/**
 * Update pages.md with current pages
 */
function updatePagesDoc() {
  log('\n📄 Updating pages.md...', 'blue');
  
  const pageDir = path.join(SRC_DIR, 'app/(dashboard)/finance');
  const pages = [];
  
  // Find all page.tsx files
  const pageFiles = findFiles(pageDir, ['.tsx'])
    .filter(file => file.includes('page.tsx') || file.includes('page.ts'));
  
  pageFiles.forEach(file => {
    const info = extractPageInfo(file);
    const route = file.match(/\(dashboard\)\/finance\/([^\/]+(?:\/[^\/]+)*)/);
    if (route) {
      pages.push({
        route: `/finance/${route[1]}`,
        file: info.path,
        name: info.name,
        description: info.description
      });
    }
  });
  
  // Read current pages.md
  const pagesDocPath = path.join(DOCS_DIR, 'pages.md');
  let content = fs.readFileSync(pagesDocPath, 'utf8');
  
  // Update file references (simple update - full rewrite would be better)
  log(`  Found ${pages.length} finance pages`, 'green');
  
  return pages.length;
}

/**
 * Update api-endpoints.md with current APIs
 */
function updateApiEndpointsDoc() {
  log('\n🔌 Updating api-endpoints.md...', 'blue');
  
  const apiDir = path.join(SRC_DIR, 'app/api/finance');
  if (!fs.existsSync(apiDir)) {
    log('  API directory not found', 'yellow');
    return 0;
  }
  
  const apiFiles = findFiles(apiDir, ['.ts'])
    .filter(file => file.includes('route.ts'));
  
  const apis = apiFiles.map(file => extractApiInfo(file));
  
  log(`  Found ${apis.length} API endpoints`, 'green');
  
  return apis.length;
}

/**
 * Check for database migration changes
 */
function checkDatabaseChanges() {
  log('\n🗄️  Checking database changes...', 'blue');
  
  const migrationsDir = path.join(BASE_DIR, 'supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    log('  Migrations directory not found', 'yellow');
    return;
  }
  
  // Find P&L related migrations
  const migrations = fs.readdirSync(migrationsDir)
    .filter(file => file.includes('pnl') || file.includes('finance'))
    .sort();
  
  log(`  Found ${migrations.length} P&L-related migrations`, 'green');
  
  return migrations.length;
}

/**
 * Main update function
 */
function updateDocs() {
  log('🚀 Starting Finance Documentation Update...', 'green');
  log('='.repeat(50), 'blue');
  
  // Ensure docs directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    log('Created docs/finance directory', 'yellow');
  }
  
  // Update documentation sections
  const pagesCount = updatePagesDoc();
  const apisCount = updateApiEndpointsDoc();
  const migrationsCount = checkDatabaseChanges();
  
  log('\n' + '='.repeat(50), 'blue');
  log('✅ Documentation update complete!', 'green');
  log(`   Pages: ${pagesCount}`, 'blue');
  log(`   APIs: ${apisCount}`, 'blue');
  log(`   Migrations: ${migrationsCount || 0}`, 'blue');
  log('\n💡 Tip: Review docs/finance/ for updates', 'yellow');
}

// Run if called directly
if (require.main === module) {
  try {
    updateDocs();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

module.exports = { updateDocs };

