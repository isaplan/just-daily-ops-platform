#!/usr/bin/env node

/**
 * Root Directory Cleanup Script
 * Organizes .md, .js, and .sql files from root into build-docs-scripts-sql/
 */

const fs = require('fs');
const path = require('path');

class RootCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.baseFolder = path.join(this.projectRoot, 'build-docs-scripts-sql-ai');
    this.docsFolder = path.join(this.baseFolder, 'docs');
    this.scriptsFolder = path.join(this.baseFolder, 'scripts');
    this.sqlFolder = path.join(this.baseFolder, 'sql');
    
    // Files that should STAY in root (don't move these)
    this.excludeFiles = new Set([
      'README.md',
      'AI-COMPLIANCE-RULES.md', // PROTECTED: Must stay in root
      'package.json',
      'package-lock.json',
      'next.config.ts',
      'next.config.js',
      'tsconfig.json',
      'tsconfig.tsbuildinfo',
      'postcss.config.js',
      'postcss.config.mjs',
      'eslint.config.mjs',
      'tailwind.config.ts',
      'components.json',
      'next-env.d.ts'
    ]);
    
    // Folders to ignore
    this.excludeFolders = new Set([
      'node_modules',
      '.next',
      '.git',
      'dist',
      'build',
      'src',
      'public',
      'supabase',
      'scripts',
      'docs',
      'dev-docs',
      'old-ai-docs',
      '.ai-compliance-functions',
      '.ai-rules-docs',
      'build-docs-scripts-sql',
      'supabase-export'
    ]);
    
    this.stats = {
      moved: { docs: 0, scripts: 0, sql: 0 },
      skipped: 0,
      errors: []
    };
  }

  /**
   * Create folder structure
   */
  createFolders() {
    [this.baseFolder, this.docsFolder, this.scriptsFolder, this.sqlFolder].forEach(folder => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ Created: ${path.relative(this.projectRoot, folder)}/`);
      }
    });
  }

  /**
   * Check if file should be excluded
   */
  shouldExclude(fileName) {
    return this.excludeFiles.has(fileName);
  }

  /**
   * Move file to appropriate folder
   */
  moveFile(fileName, targetFolder, fileType) {
    try {
      const sourcePath = path.join(this.projectRoot, fileName);
      const targetPath = path.join(targetFolder, fileName);
      
      // Check if target already exists
      if (fs.existsSync(targetPath)) {
        // Add timestamp to avoid conflicts
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const newName = `${base}-${timestamp}${ext}`;
        const newTargetPath = path.join(targetFolder, newName);
        fs.renameSync(sourcePath, newTargetPath);
        console.log(`  ⚠️  Renamed (duplicate): ${fileName} → ${newName}`);
        this.stats.moved[fileType]++;
      } else {
        fs.renameSync(sourcePath, targetPath);
        console.log(`  ✅ Moved: ${fileName}`);
        this.stats.moved[fileType]++;
      }
    } catch (error) {
      this.stats.errors.push({ file: fileName, error: error.message });
      console.error(`  ❌ Error moving ${fileName}:`, error.message);
    }
  }

  /**
   * Process root directory files
   */
  cleanup() {
    console.log('🧹 Starting root directory cleanup...\n');
    
    // Create folders
    this.createFolders();
    console.log('');
    
    // Read root directory
    const files = fs.readdirSync(this.projectRoot, { withFileTypes: true });
    
    console.log('📋 Processing files...\n');
    
    files.forEach(file => {
      // Skip directories
      if (file.isDirectory()) {
        if (this.excludeFolders.has(file.name)) {
          console.log(`  ⏭️  Skipped folder: ${file.name}/`);
          return;
        }
        return;
      }
      
      const fileName = file.name;
      const ext = path.extname(fileName).toLowerCase();
      
      // Skip excluded files
      if (this.shouldExclude(fileName)) {
        console.log(`  ⏭️  Skipped (excluded): ${fileName}`);
        this.stats.skipped++;
        return;
      }
      
      // Process .md files
      if (ext === '.md') {
        this.moveFile(fileName, this.docsFolder, 'docs');
        return;
      }
      
      // Process .js files
      if (ext === '.js') {
        // Skip config files
        if (fileName.includes('config') || fileName.includes('setup-ai-compliance')) {
          console.log(`  ⏭️  Skipped (config): ${fileName}`);
          this.stats.skipped++;
          return;
        }
        this.moveFile(fileName, this.scriptsFolder, 'scripts');
        return;
      }
      
      // Process .sql files
      if (ext === '.sql') {
        this.moveFile(fileName, this.sqlFolder, 'sql');
        return;
      }
    });
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Moved docs (.md): ${this.stats.moved.docs}`);
    console.log(`✅ Moved scripts (.js): ${this.stats.moved.scripts}`);
    console.log(`✅ Moved SQL (.sql): ${this.stats.moved.sql}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.forEach(err => {
        console.log(`  - ${err.file}: ${err.error}`);
      });
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log(`📁 Files organized in: build-docs-scripts-sql/`);
  }
}

// Run if executed directly
if (require.main === module) {
  const cleanup = new RootCleanup();
  cleanup.cleanup();
}

module.exports = RootCleanup;

