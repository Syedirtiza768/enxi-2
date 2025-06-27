#!/usr/bin/env tsx

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_PATH = path.join(process.cwd(), 'prisma/prisma/prod.db');

interface MigrationOptions {
  skipBackup?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

class ProductionMigrator {
  private timestamp: string;

  constructor() {
    this.timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m'
    };
    console.log(`${colors[type]}[${type.toUpperCase()}]\x1b[0m ${message}`);
  }

  private exec(command: string, silent = false): string {
    try {
      const output = execSync(command, { encoding: 'utf-8' });
      if (!silent) this.log(`Executed: ${command}`, 'success');
      return output;
    } catch (error: any) {
      this.log(`Failed to execute: ${command}`, 'error');
      this.log(error.message, 'error');
      throw error;
    }
  }

  async backupDatabase(): Promise<string> {
    this.log('Creating database backup...', 'info');
    
    const backupPath = path.join(BACKUP_DIR, `prod-${this.timestamp}.db`);
    
    try {
      fs.copyFileSync(DB_PATH, backupPath);
      this.log(`Backup created: ${backupPath}`, 'success');
      
      // Verify backup
      const originalSize = fs.statSync(DB_PATH).size;
      const backupSize = fs.statSync(backupPath).size;
      
      if (originalSize !== backupSize) {
        throw new Error('Backup file size mismatch');
      }
      
      return backupPath;
    } catch (error: any) {
      this.log(`Backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async checkPendingMigrations(): Promise<boolean> {
    this.log('Checking for pending migrations...', 'info');
    
    try {
      const status = this.exec('npx prisma migrate status', true);
      const hasPending = status.includes('Database schema is not up to date');
      
      if (hasPending) {
        this.log('Pending migrations found', 'warning');
        console.log(status);
      } else {
        this.log('No pending migrations', 'success');
      }
      
      return hasPending;
    } catch (error) {
      this.log('Failed to check migration status', 'error');
      throw error;
    }
  }

  async generateMigrationPreview(): Promise<string> {
    this.log('Generating migration preview...', 'info');
    
    const previewPath = path.join(BACKUP_DIR, `migration-preview-${this.timestamp}.sql`);
    
    try {
      const sql = this.exec(
        'npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script',
        true
      );
      
      fs.writeFileSync(previewPath, sql);
      this.log(`Migration preview saved: ${previewPath}`, 'success');
      
      return sql;
    } catch (error) {
      this.log('Failed to generate migration preview', 'error');
      throw error;
    }
  }

  async runMigrations(options: MigrationOptions = {}): Promise<void> {
    this.log('Starting production migration process...', 'info');
    
    try {
      // Step 1: Check for pending migrations
      const hasPending = await this.checkPendingMigrations();
      
      if (!hasPending) {
        this.log('No migrations to apply', 'success');
        return;
      }
      
      // Step 2: Create backup (unless skipped)
      let backupPath: string | null = null;
      if (!options.skipBackup) {
        backupPath = await this.backupDatabase();
      }
      
      // Step 3: Generate migration preview
      const migrationSql = await this.generateMigrationPreview();
      
      if (options.dryRun) {
        this.log('Dry run completed. Migration SQL:', 'info');
        console.log(migrationSql);
        return;
      }
      
      // Step 4: Confirm migration
      if (!options.force) {
        console.log('\n' + '='.repeat(50));
        console.log('Migration SQL to be applied:');
        console.log('='.repeat(50));
        console.log(migrationSql);
        console.log('='.repeat(50) + '\n');
        
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const confirm = await new Promise<boolean>((resolve) => {
          readline.question('Do you want to proceed with the migration? (yes/no): ', (answer) => {
            readline.close();
            resolve(answer.toLowerCase() === 'yes');
          });
        });
        
        if (!confirm) {
          this.log('Migration cancelled by user', 'warning');
          return;
        }
      }
      
      // Step 5: Apply migrations
      this.log('Applying migrations...', 'info');
      this.exec('npx prisma migrate deploy');
      
      // Step 6: Generate Prisma Client
      this.log('Generating Prisma Client...', 'info');
      this.exec('npx prisma generate');
      
      // Step 7: Validate
      this.log('Validating schema...', 'info');
      this.exec('npx prisma validate');
      
      // Step 8: Final status check
      await this.checkPendingMigrations();
      
      this.log('Migration completed successfully!', 'success');
      if (backupPath) {
        this.log(`Backup available at: ${backupPath}`, 'info');
      }
      
    } catch (error: any) {
      this.log('Migration failed!', 'error');
      this.log(error.message, 'error');
      
      if (backupPath) {
        this.log(`Restore from backup if needed: ${backupPath}`, 'warning');
        this.log(`Restore command: cp ${backupPath} ${DB_PATH}`, 'info');
      }
      
      process.exit(1);
    }
  }

  async rollback(backupPath: string): Promise<void> {
    this.log(`Rolling back to backup: ${backupPath}`, 'warning');
    
    try {
      // Verify backup exists
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }
      
      // Create rollback backup of current state
      const rollbackBackup = path.join(BACKUP_DIR, `pre-rollback-${this.timestamp}.db`);
      fs.copyFileSync(DB_PATH, rollbackBackup);
      
      // Restore from backup
      fs.copyFileSync(backupPath, DB_PATH);
      
      this.log('Database rolled back successfully', 'success');
      this.log(`Pre-rollback state saved to: ${rollbackBackup}`, 'info');
      
    } catch (error: any) {
      this.log('Rollback failed!', 'error');
      this.log(error.message, 'error');
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const migrator = new ProductionMigrator();
  
  const options: MigrationOptions = {
    skipBackup: args.includes('--skip-backup'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force')
  };
  
  if (args.includes('--help')) {
    console.log(`
Production Migration Tool

Usage: tsx scripts/migrate-production.ts [options]

Options:
  --dry-run       Preview migrations without applying
  --skip-backup   Skip database backup (not recommended)
  --force         Skip confirmation prompt
  --rollback <backup-path>  Rollback to specific backup
  --help          Show this help message

Examples:
  tsx scripts/migrate-production.ts                    # Normal migration with backup
  tsx scripts/migrate-production.ts --dry-run          # Preview migrations only
  tsx scripts/migrate-production.ts --force            # Auto-confirm migration
  tsx scripts/migrate-production.ts --rollback backups/prod-20250627-120000.db
    `);
    process.exit(0);
  }
  
  if (args.includes('--rollback')) {
    const backupIndex = args.indexOf('--rollback');
    const backupPath = args[backupIndex + 1];
    
    if (!backupPath) {
      console.error('Please provide a backup path for rollback');
      process.exit(1);
    }
    
    await migrator.rollback(backupPath);
  } else {
    await migrator.runMigrations(options);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}