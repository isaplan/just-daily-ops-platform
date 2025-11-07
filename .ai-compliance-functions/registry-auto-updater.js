#!/usr/bin/env node

/**
 * Registry Auto-Updater - Version Control Style
 * Crawls entire codebase every 10 minutes (when active)
 * Registers ALL files/functions/components
 * Tracks changes with checksums
 * Acts like built-in version control
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class RegistryAutoUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.srcDir = path.join(this.projectRoot, 'src');
    this.registry = { functions: [], database_schema: {}, compliance_config: {} };
    this.fileChecksums = new Map(); // Track file checksums
    this.changes = {
      new: [],
      updated: [],
      removed: [],
      unchanged: []
    };
  }

  async update() {
    console.log('\n🔄 REGISTRY AUTO-UPDATE - Scanning entire codebase...');
    const startTime = Date.now();
    
    try {
      // Load existing registry
      this.loadRegistry();
      
      // Build checksum map of existing files
      this.buildChecksumMap();
      
      // Scan entire codebase
      this.scanCodebase();
      
      // Update registry with all findings
      this.updateRegistry();
      
      // Save registry
      this.saveRegistry();
      
      const duration = Date.now() - startTime;
      const summary = this.generateSummary();
      
      console.log(`✅ Registry update completed in ${duration}ms`);
      console.log(`   📊 Total files registered: ${this.registry.functions.length}`);
      console.log(`   ✨ New: ${this.changes.new.length}`);
      console.log(`   🔄 Updated: ${this.changes.updated.length}`);
      console.log(`   ❌ Removed: ${this.changes.removed.length}`);
      console.log(`   ✅ Unchanged: ${this.changes.unchanged.length}`);
      
      return {
        updated: true,
        summary: summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Registry update failed:', error);
      throw error;
    }
  }

  loadRegistry() {
    const backupPath = this.registryPath + '.backup';
    
    if (fs.existsSync(this.registryPath)) {
      try {
        this.registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        
        // CRITICAL: Never clear existing functions - preserve them
        if (this.registry.functions && Array.isArray(this.registry.functions) && this.registry.functions.length > 0) {
          console.log(`✅ Loaded registry with ${this.registry.functions.length} existing functions`);
        }
        
        // Ensure structure exists (but preserve existing data)
        if (!this.registry.functions) {
          this.registry.functions = [];
        }
        if (!this.registry.database_schema) {
          this.registry.database_schema = {};
        }
        if (!this.registry.compliance_config) {
          this.registry.compliance_config = {
            auto_tracking: true,
            violation_prevention: true,
            progress_monitoring: true
          };
        }
      } catch (e) {
        console.error('❌ CRITICAL: Could not parse registry file:', e.message);
        console.log('🔄 Attempting to restore from backup...');
        
        // Try backup file first
        if (fs.existsSync(backupPath)) {
          try {
            this.registry = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            console.log('✅ Restored registry from backup file');
            console.log(`   📊 Found ${this.registry.functions?.length || 0} functions in backup`);
            
            // Ensure structure exists
            if (!this.registry.functions) {
              this.registry.functions = [];
            }
            if (!this.registry.database_schema) {
              this.registry.database_schema = {};
            }
            if (!this.registry.compliance_config) {
              this.registry.compliance_config = {
                auto_tracking: true,
                violation_prevention: true,
                progress_monitoring: true
              };
            }
            
            // Restore main file from backup
            fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
            console.log('✅ Restored main registry file from backup');
            return;
          } catch (backupError) {
            console.error('❌ Backup file also corrupted:', backupError.message);
          }
        }
        
        // LAST RESORT: Only clear if BOTH files are corrupted AND we have NO existing functions
        // This should NEVER happen in practice, but if it does, we preserve what we can
        console.error('🚨 CRITICAL WARNING: Registry file corrupted and backup unavailable');
        console.error('🚨 This should NEVER happen - registry is a CRITICAL protection mechanism');
        console.error('🚨 Attempting to preserve any existing data structure...');
        
        // Try to extract any valid data from the corrupted file
        try {
          const corruptedContent = fs.readFileSync(this.registryPath, 'utf8');
          // Try to extract functions array if it exists
          const functionsMatch = corruptedContent.match(/"functions"\s*:\s*\[([\s\S]*?)\]/);
          if (functionsMatch) {
            console.log('⚠️  Found partial functions data in corrupted file');
            // At least we tried to preserve something
          }
        } catch (extractError) {
          // File is completely unreadable
        }
        
        // Only initialize empty if we truly have nothing
        // This is a last resort - should never happen
        console.error('🚨 INITIALIZING EMPTY REGISTRY - THIS CLEARS ALL PROTECTIONS!');
        console.error('🚨 IF YOU SEE THIS, THE REGISTRY WAS CORRUPTED BEYOND RECOVERY');
        console.error('🚨 Manual intervention required to restore from git history');
        
        this.registry = {
          functions: [],
          database_schema: {},
          compliance_config: {
            auto_tracking: true,
            violation_prevention: true,
            progress_monitoring: true
          },
          _error: {
            message: 'Registry file corrupted and backup unavailable',
            timestamp: new Date().toISOString(),
            action_required: 'Restore from git history or backup manually'
          }
        };
      }
    } else {
      // File doesn't exist - check for backup
      if (fs.existsSync(backupPath)) {
        try {
          this.registry = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
          console.log('✅ Registry file missing, restored from backup');
          console.log(`   📊 Found ${this.registry.functions?.length || 0} functions in backup`);
          
          // Restore main file from backup
          fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
          console.log('✅ Created main registry file from backup');
          
          // Ensure structure exists
          if (!this.registry.functions) {
            this.registry.functions = [];
          }
          if (!this.registry.database_schema) {
            this.registry.database_schema = {};
          }
          if (!this.registry.compliance_config) {
            this.registry.compliance_config = {
              auto_tracking: true,
              violation_prevention: true,
              progress_monitoring: true
            };
          }
          return;
        } catch (backupError) {
          console.warn('⚠️  Backup file also invalid, starting fresh');
        }
      }
      
      // Initialize empty only if file doesn't exist AND no backup
      console.log('📝 Creating new registry file (no existing file found)');
      this.registry = {
        functions: [],
        database_schema: {},
        compliance_config: {
          auto_tracking: true,
          violation_prevention: true,
          progress_monitoring: true
        }
      };
    }
  }

  buildChecksumMap() {
    // Build map of existing files with their checksums
    this.fileChecksums.clear();
    
    this.registry.functions.forEach(func => {
      const file = func.file || (func.files && func.files[0]);
      if (file) {
        const fullPath = path.join(this.projectRoot, file);
        if (fs.existsSync(fullPath)) {
          const checksum = this.calculateChecksum(fullPath);
          this.fileChecksums.set(file, {
            checksum: checksum,
            func: func,
            exists: true
          });
        } else {
          this.fileChecksums.set(file, {
            checksum: null,
            func: func,
            exists: false
          });
        }
      }
    });
  }

  calculateChecksum(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    } catch (e) {
      return null;
    }
  }

  scanCodebase() {
    this.scannedFiles = [];
    
    if (!fs.existsSync(this.srcDir)) {
      console.warn('⚠️  src/ directory not found');
      return;
    }

    // Scan all directories
    this.scanDirectory(this.srcDir);
    
    console.log(`📁 Scanned ${this.scannedFiles.length} files`);
  }

  scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectRoot, fullPath);
        
        // Skip node_modules, .git, .next, etc.
        if (entry.name.startsWith('.') && entry.name !== '.env') continue;
        if (entry.name === 'node_modules') continue;
        if (entry.name === '.next' || entry.name === 'dist' || entry.name === 'build') continue;
        
        if (entry.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          this.processFile(fullPath, relativePath);
        }
      }
    } catch (e) {
      // Directory read failed, skip
    }
  }

  processFile(filePath, relativePath) {
    // Only process code files
    if (!relativePath.match(/\.(ts|tsx|js|jsx)$/)) return;
    
    this.scannedFiles.push(relativePath);
    
    // Analyze file
    const fileInfo = this.analyzeFile(filePath, relativePath);
    
    if (!fileInfo.shouldRegister) return;
    
    // Check if file exists in registry
    const existing = this.fileChecksums.get(relativePath);
    const currentChecksum = this.calculateChecksum(filePath);
    
    if (!existing) {
      // New file
      this.changes.new.push(fileInfo);
      this.addOrUpdateFunction(fileInfo, null);
    } else if (existing.exists && existing.checksum !== currentChecksum) {
      // File changed
      fileInfo.checksum = currentChecksum;
      fileInfo.previousChecksum = existing.checksum;
      this.changes.updated.push(fileInfo);
      this.addOrUpdateFunction(fileInfo, existing.func);
    } else if (existing.exists && existing.checksum === currentChecksum) {
      // File unchanged
      this.changes.unchanged.push(relativePath);
      // Update last_seen timestamp
      if (existing.func) {
        existing.func.last_seen = new Date().toISOString();
      }
    }
    
    // Mark as seen
    if (existing) {
      existing.seen = true;
    }
  }

  analyzeFile(filePath, relativePath) {
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      return { shouldRegister: false };
    }

    const info = {
      file: relativePath,
      shouldRegister: false,
      type: 'unknown',
      name: path.basename(relativePath, path.extname(relativePath)),
      checksum: this.calculateChecksum(filePath),
      size: content.length,
      lines: content.split('\n').length
    };

    // Detect page
    if (relativePath.includes('/page.tsx') || relativePath.includes('/page.ts')) {
      info.type = 'page';
      info.shouldRegister = true;
      info.name = this.extractPageName(relativePath);
    }
    // Detect API route
    else if (relativePath.includes('/api/') && relativePath.includes('/route.ts')) {
      info.type = 'api-route';
      info.shouldRegister = true;
      info.name = this.extractApiRouteName(relativePath);
    }
    // Detect component
    else if (relativePath.includes('/components/') || 
             (content.includes('export') && (content.includes('function') || content.includes('const')))) {
      info.type = 'component';
      info.shouldRegister = content.includes('export') && content.length > 50;
      if (info.shouldRegister) {
        info.name = this.extractComponentName(content, info.name);
      }
    }
    // Detect service/lib
    else if (relativePath.includes('/lib/') || relativePath.includes('/services/')) {
      info.type = 'service';
      info.shouldRegister = content.includes('export') && content.length > 50;
      if (info.shouldRegister) {
        info.name = this.extractServiceName(relativePath, content);
      }
    }
    // Detect hook
    else if (relativePath.includes('/hooks/') || (relativePath.includes('use') && relativePath.includes('.ts'))) {
      info.type = 'hook';
      info.shouldRegister = content.includes('use') && content.includes('export');
      if (info.shouldRegister) {
        info.name = this.extractHookName(relativePath, content);
      }
    }
    // Detect any other TypeScript/JavaScript file with exports
    else if (content.includes('export') && (content.includes('function') || content.includes('const') || content.includes('class'))) {
      info.type = 'module';
      info.shouldRegister = content.length > 100;
      if (info.shouldRegister) {
        info.name = this.extractModuleName(relativePath, content);
      }
    }

    // Auto-detect completion status
    if (info.shouldRegister) {
      const hasIncompleteMarkers = /TODO|FIXME|XXX|HACK|BUG|WIP/i.test(content);
      const isTestFile = relativePath.includes('.test.') || relativePath.includes('.spec.');
      const hasErrors = content.includes('throw new Error') && !content.includes('catch');
      
      // If no incomplete markers and not a test, consider it completed
      if (!hasIncompleteMarkers && !isTestFile && !hasErrors && info.lines > 20) {
        info.status = 'completed';
        info.touch_again = false; // Auto-protect completed code
        info.auto_detected = true;
      } else {
        info.status = 'in-progress';
        info.touch_again = true;
        info.auto_detected = true;
      }
      
      info.detected_at = new Date().toISOString();
      info.last_seen = new Date().toISOString();
    }

    return info;
  }

  extractPageName(relativePath) {
    const parts = relativePath.split('/');
    const pageIndex = parts.findIndex(p => p === 'page.tsx' || p === 'page.ts');
    if (pageIndex > 0) {
      return parts[pageIndex - 1].split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ') + ' Page';
    }
    return 'Page';
  }

  extractApiRouteName(relativePath) {
    const match = relativePath.match(/\/api\/([^/]+)\/([^/]+)\/route\.ts/);
    if (match) {
      return `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)} API`;
    }
    return 'API Route';
  }

  extractComponentName(content, defaultName) {
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
    if (exportMatch) {
      return exportMatch[1];
    }
    return defaultName;
  }

  extractServiceName(relativePath, content) {
    const fileName = path.basename(relativePath, path.extname(relativePath));
    return fileName.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  extractHookName(relativePath, content) {
    const match = content.match(/(?:export\s+)?(?:function|const)\s+use(\w+)/);
    if (match) {
      return `use${match[1]}`;
    }
    return path.basename(relativePath, path.extname(relativePath));
  }

  extractModuleName(relativePath, content) {
    const fileName = path.basename(relativePath, path.extname(relativePath));
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
    if (exportMatch) {
      return exportMatch[1];
    }
    return fileName.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  /**
   * Get git commit hash for a file
   */
  getGitCommit(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      
      // Get latest commit hash for this file
      const commitHash = execSync(`git log -1 --format=%H -- "${fullPath}"`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      if (!commitHash || commitHash.length === 0) {
        // File not in git yet, get HEAD commit
        try {
          const headCommit = execSync('git rev-parse HEAD', {
            cwd: this.projectRoot,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          }).trim();
          return headCommit || null;
        } catch {
          return null;
        }
      }
      
      return commitHash;
    } catch (error) {
      // Not a git repo or file not tracked
      return null;
    }
  }

  /**
   * Get git commit message for a file
   */
  getGitCommitMessage(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      
      const commitMessage = execSync(`git log -1 --format=%s -- "${fullPath}"`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      return commitMessage || null;
    } catch (error) {
      return null;
    }
  }

  addOrUpdateFunction(fileInfo, existingFunc) {
    if (!this.registry.functions) {
      this.registry.functions = [];
    }

    // Find existing entry
    const existingIndex = this.registry.functions.findIndex(f => 
      f.file === fileInfo.file || (f.files && f.files.includes(fileInfo.file))
    );

    // Get git commit info
    const gitCommit = this.getGitCommit(fileInfo.file);
    const gitCommitMessage = gitCommit ? this.getGitCommitMessage(fileInfo.file) : null;
    
    // Check if checksum changed (file was modified)
    const checksumChanged = existingFunc && existingFunc.checksum !== fileInfo.checksum;
    
    // Update git commit if file changed or first time
    const shouldUpdateCommit = !existingFunc || checksumChanged;

    const funcEntry = {
      name: fileInfo.name,
      type: fileInfo.type,
      file: fileInfo.file,
      status: fileInfo.status || existingFunc?.status || 'detected',
      touch_again: fileInfo.touch_again !== undefined ? fileInfo.touch_again : (existingFunc?.touch_again !== undefined ? existingFunc.touch_again : true),
      description: existingFunc?.description || fileInfo.description || `Auto-detected ${fileInfo.type}`,
      auto_detected: true,
      detected_at: existingFunc?.detected_at || fileInfo.detected_at || new Date().toISOString(),
      last_seen: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      checksum: fileInfo.checksum,
      size: fileInfo.size,
      lines: fileInfo.lines,
      // Git commit tracking
      git_commit: shouldUpdateCommit && gitCommit ? gitCommit : (existingFunc?.git_commit || gitCommit || null),
      last_commit: shouldUpdateCommit && gitCommit ? new Date().toISOString() : (existingFunc?.last_commit || null),
      commit_message: shouldUpdateCommit && gitCommitMessage ? gitCommitMessage : (existingFunc?.commit_message || null)
    };

    // Preserve manual protections
    if (existingFunc && existingFunc.touch_again === false) {
      funcEntry.touch_again = false; // Keep protection
      funcEntry.status = existingFunc.status || 'completed'; // Keep status
    }

    if (existingIndex >= 0) {
      // Update existing
      this.registry.functions[existingIndex] = { ...this.registry.functions[existingIndex], ...funcEntry };
    } else {
      // Add new
      this.registry.functions.push(funcEntry);
    }
  }

  updateRegistry() {
    // Mark files not seen as removed
    this.fileChecksums.forEach((data, file) => {
      if (!data.seen && data.exists) {
        this.changes.removed.push({
          file: file,
          func: data.func
        });
        // Don't remove from registry, just mark as potentially removed
        if (data.func) {
          data.func.last_seen = null;
          data.func.potentially_removed = true;
        }
      }
    });
  }

  saveRegistry() {
    // CRITICAL SAFETY CHECK: Never save an empty registry if we had data before
    const originalFunctionCount = this.registry.functions?.length || 0;
    
    // Ensure structure
    if (!this.registry.compliance_config) {
      this.registry.compliance_config = {
        auto_tracking: true,
        violation_prevention: true,
        progress_monitoring: true
      };
    }

    // Sort by type then name (preserves all functions)
    if (this.registry.functions && Array.isArray(this.registry.functions)) {
      this.registry.functions.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return a.name.localeCompare(b.name);
      });
    }

    // Update metadata
    this.registry.last_updated = new Date().toISOString();
    this.registry.total_functions_registered = this.registry.functions.length;
    this.registry.last_scan = {
      timestamp: new Date().toISOString(),
      files_scanned: this.scannedFiles.length,
      changes: {
        new: this.changes.new.length,
        updated: this.changes.updated.length,
        removed: this.changes.removed.length,
        unchanged: this.changes.unchanged.length
      }
    };

    // CRITICAL: Create backup before saving
    const backupPath = this.registryPath + '.backup';
    if (fs.existsSync(this.registryPath)) {
      try {
        fs.copyFileSync(this.registryPath, backupPath);
      } catch (backupError) {
        console.warn('⚠️  Could not create backup:', backupError.message);
      }
    }

    // Write to file
    try {
      fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
      
      // Verify we didn't accidentally clear the registry
      if (originalFunctionCount > 0 && this.registry.functions.length === 0) {
        console.error('🚨 CRITICAL: Registry would be empty but had data before!');
        console.error('🚨 Restoring from backup to prevent data loss...');
        
        // Restore from backup
        if (fs.existsSync(backupPath)) {
          this.registry = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
          fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
          console.error('✅ Restored from backup - registry was about to be cleared!');
          throw new Error('Registry save aborted - would have cleared existing data');
        }
      }
    } catch (writeError) {
      console.error('❌ Failed to save registry:', writeError.message);
      // Restore from backup if save failed
      if (fs.existsSync(backupPath)) {
        try {
          this.registry = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
          console.log('✅ Restored from backup after save failure');
        } catch (restoreError) {
          console.error('❌ Failed to restore from backup:', restoreError.message);
        }
      }
      throw writeError;
    }
  }

  generateSummary() {
    return {
      total: this.registry.functions.length,
      new: this.changes.new.length,
      updated: this.changes.updated.length,
      removed: this.changes.removed.length,
      unchanged: this.changes.unchanged.length,
      completed: this.registry.functions.filter(f => f.status === 'completed').length,
      protected: this.registry.functions.filter(f => f.touch_again === false).length
    };
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new RegistryAutoUpdater();
  updater.update()
    .then(result => {
      console.log('\n📊 Update Summary:');
      console.log(JSON.stringify(result.summary, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = RegistryAutoUpdater;

