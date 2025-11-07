#!/usr/bin/env node

/**
 * Project Organization Script
 * Moves non-app and non-AI compliance files to build-docs-scripts-sql/
 */

const fs = require('fs');
const path = require('path');

class ProjectOrganizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.baseFolder = path.join(this.projectRoot, 'build-docs-scripts-sql-ai');
    this.docsFolder = path.join(this.baseFolder, 'docs');
    this.logsFolder = path.join(this.baseFolder, 'logs');
    this.scriptsFolder = path.join(this.baseFolder, 'scripts');
    this.sqlFolder = path.join(this.baseFolder, 'sql');
    
    // Core AI compliance files/folders - DO NOT MOVE
    this.aiComplianceKeep = new Set([
      'function-registry.json',
      'ai-tracking-system.json',
      '.ai-compliance-functions',
      '.ai-rules-docs',
      '.ai-compliance-backups'
    ]);
    
    // Core app files/folders - DO NOT MOVE
    this.appKeep = new Set([
      'src',
      'public',
      'supabase',
      'supabase-export',
      'package.json',
      'package-lock.json',
      'next.config.ts',
      'tsconfig.json',
      'components.json',
      'README.md',
      'AI-COMPLIANCE-RULES.md', // PROTECTED: Must stay in root
      '.git',
      '.gitignore',
      '.next',
      'node_modules',
      '.vercel',
      '.env.local',
      '.env',
      'postcss.config.js',
      'postcss.config.mjs',
      'eslint.config.mjs',
      'tailwind.config.ts',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
      'build-docs-scripts-sql',
      'old-ai-docs'
    ]);
    
    this.stats = {
      moved: { docs: 0, logs: 0, scripts: 0, sql: 0, folders: 0 },
      skipped: 0,
      errors: []
    };
  }

  createFolders() {
    [this.baseFolder, this.docsFolder, this.logsFolder, this.scriptsFolder, this.sqlFolder].forEach(folder => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ Created: ${path.relative(this.projectRoot, folder)}/`);
      }
    });
  }

  shouldKeep(fileName) {
    return this.appKeep.has(fileName) || this.aiComplianceKeep.has(fileName);
  }

  moveFile(fileName, targetFolder, fileType) {
    try {
      const sourcePath = path.join(this.projectRoot, fileName);
      const targetPath = path.join(targetFolder, fileName);
      
      if (fs.existsSync(targetPath)) {
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

  moveFolder(folderName, targetFolder) {
    try {
      const sourcePath = path.join(this.projectRoot, folderName);
      const targetPath = path.join(targetFolder, folderName);
      
      if (fs.existsSync(targetPath)) {
        const newName = `${folderName}-${Date.now()}`;
        const newTargetPath = path.join(targetFolder, newName);
        fs.renameSync(sourcePath, newTargetPath);
        console.log(`  ⚠️  Renamed (duplicate): ${folderName}/ → ${newName}/`);
        this.stats.moved.folders++;
      } else {
        fs.renameSync(sourcePath, targetPath);
        console.log(`  ✅ Moved folder: ${folderName}/`);
        this.stats.moved.folders++;
      }
    } catch (error) {
      this.stats.errors.push({ file: folderName, error: error.message });
      console.error(`  ❌ Error moving folder ${folderName}:`, error.message);
    }
  }

  organize() {
    console.log('🧹 Organizing project files...\n');
    
    this.createFolders();
    console.log('');
    
    const files = fs.readdirSync(this.projectRoot, { withFileTypes: true });
    
    console.log('📋 Processing files and folders...\n');
    
    files.forEach(file => {
      const fileName = file.name;
      
      // Skip if should keep
      if (this.shouldKeep(fileName)) {
        console.log(`  ⏭️  Skipped (keep): ${fileName}${file.isDirectory() ? '/' : ''}`);
        this.stats.skipped++;
        return;
      }
      
      // Process folders
      if (file.isDirectory()) {
        // Move documentation folders
        if (fileName === 'dev-docs' || fileName.startsWith('.docs') || fileName === '.roadmap-context') {
          this.moveFolder(fileName, this.docsFolder);
          return;
        }
        
        // Skip hidden system folders (unless explicitly handled)
        if (fileName.startsWith('.')) {
          console.log(`  ⏭️  Skipped hidden folder: ${fileName}/`);
          return;
        }
        
        return;
      }
      
      // Process files
      const ext = path.extname(fileName).toLowerCase();
      
      // Log files (.log, .txt status files)
      if (ext === '.log' || (ext === '.txt' && fileName.includes('compliance'))) {
        this.moveFile(fileName, this.logsFolder, 'logs');
        return;
      }
      
      // JSON report/log files
      if (ext === '.json' && (
        fileName.includes('report') || 
        fileName.includes('log') || 
        fileName.includes('backup') ||
        fileName.includes('restored') ||
        fileName.includes('compliance') ||
        fileName.includes('status') ||
        fileName.includes('messages')
      )) {
        this.moveFile(fileName, this.logsFolder, 'logs');
        return;
      }
      
      // Backup/restored files
      if (fileName.includes('.backup') || fileName.includes('.restored')) {
        this.moveFile(fileName, this.logsFolder, 'logs');
        return;
      }
      
      // Setup scripts (not core AI compliance)
      if (ext === '.js' && fileName.includes('setup-ai-compliance')) {
        this.moveFile(fileName, this.scriptsFolder, 'scripts');
        return;
      }
      
      // Status files
      if (ext === '.txt' && fileName.includes('status')) {
        this.moveFile(fileName, this.logsFolder, 'logs');
        return;
      }
    });
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ORGANIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Moved to docs/: ${this.stats.moved.docs} files/folders`);
    console.log(`✅ Moved to logs/: ${this.stats.moved.logs} files`);
    console.log(`✅ Moved to scripts/: ${this.stats.moved.scripts} files`);
    console.log(`✅ Moved to sql/: ${this.stats.moved.sql} files`);
    console.log(`✅ Moved folders: ${this.stats.moved.folders}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.forEach(err => {
        console.log(`  - ${err.file}: ${err.error}`);
      });
    }
    
    console.log('\n✅ Organization complete!');
  }
}

if (require.main === module) {
  const organizer = new ProjectOrganizer();
  organizer.organize();
}

module.exports = ProjectOrganizer;

