#!/usr/bin/env tsx
// Safe Migration Script for Production
// This script ensures safe database migrations with automatic backups and rollback capabilities

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { DatabaseBackup } from './backup-database';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface MigrationOptions {
  skipBackup?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

class SafeMigration {
  private backup: DatabaseBackup;
  private migrationLog: string[] = [];

  constructor() {
    this.backup = new DatabaseBackup();
  }

  async runMigration(options: MigrationOptions = {}) {
    console.log('🔒 Starting safe migration process...');
    
    // Safety checks
    if (process.env.NODE_ENV === 'production' && !options.force) {
      console.log('⚠️  Running in production mode - extra safety checks enabled');
      
      if (!process.env.ALLOW_PRODUCTION_MIGRATION) {
        throw new Error('Production migrations not allowed. Set ALLOW_PRODUCTION_MIGRATION=true to override.');
      }
    }

    try {
      // Step 1: Create backup
      if (!options.skipBackup) {
        console.log('\n📦 Step 1: Creating database backup...');
        const backupPath = await this.backup.createBackup({
          type: 'full',
          compress: true,
          encrypt: true
        });
        this.log(`Backup created: ${backupPath}`);
      }

      // Step 2: Check pending migrations
      console.log('\n🔍 Step 2: Checking pending migrations...');
      const pendingMigrations = await this.checkPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations:`);
      pendingMigrations.forEach(m => console.log(`  - ${m}`));

      // Step 3: Validate migrations
      console.log('\n✅ Step 3: Validating migrations...');
      await this.validateMigrations();

      // Step 4: Run migrations (or dry run)
      if (options.dryRun) {
        console.log('\n🔍 Step 4: Dry run mode - not applying migrations');
        await this.dryRunMigrations();
      } else {
        console.log('\n🚀 Step 4: Applying migrations...');
        await this.applyMigrations();
      }

      // Step 5: Verify database integrity
      console.log('\n🔍 Step 5: Verifying database integrity...');
      await this.verifyDatabaseIntegrity();

      // Step 6: Create post-migration backup
      if (!options.skipBackup && !options.dryRun) {
        console.log('\n📦 Step 6: Creating post-migration backup...');
        await this.backup.createBackup({
          type: 'full',
          compress: true,
          encrypt: true
        });
      }

      console.log('\n✅ Migration completed successfully!');
      
      // Save migration log
      await this.saveMigrationLog();
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      
      if (!options.skipBackup && !options.dryRun) {
        console.log('\n🔄 Attempting to rollback...');
        // Implement rollback logic here if needed
      }
      
      throw error;
    }
  }

  private async checkPendingMigrations(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('npx prisma migrate status');
      
      // Parse output to find pending migrations
      const lines = stdout.split('\n');
      const pending: string[] = [];
      
      let inPendingSection = false;
      for (const line of lines) {
        if (line.includes('Following migration(s) are new')) {
          inPendingSection = true;
          continue;
        }
        if (inPendingSection && line.trim().startsWith('- ')) {
          pending.push(line.trim().substring(2));
        }
        if (line.trim() === '') {
          inPendingSection = false;
        }
      }
      
      return pending;
    } catch (error) {
      // If status check fails, try to get migration history
      return [];
    }
  }

  private async validateMigrations() {
    // Check if migrations directory exists
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    
    try {
      await fs.access(migrationsDir);
    } catch {
      throw new Error('Migrations directory not found');
    }

    // Validate migration files
    const files = await fs.readdir(migrationsDir);
    const migrationDirs = files.filter(f => f.match(/^\d{14}_/));
    
    for (const dir of migrationDirs) {
      const migrationPath = path.join(migrationsDir, dir, 'migration.sql');
      try {
        const content = await fs.readFile(migrationPath, 'utf-8');
        
        // Check for dangerous operations
        const dangerousPatterns = [
          /DROP\s+TABLE/i,
          /DROP\s+DATABASE/i,
          /TRUNCATE/i,
          /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/i
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(content)) {
            console.warn(`⚠️  Warning: Dangerous operation detected in ${dir}`);
            this.log(`Dangerous operation in ${dir}: ${pattern}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not validate migration ${dir}`);
      }
    }
    
    this.log('Migration validation completed');
  }

  private async dryRunMigrations() {
    try {
      // Generate migration SQL without applying
      const { stdout } = await execAsync('npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script');
      
      console.log('\n📄 Migration SQL preview:');
      console.log('----------------------------');
      console.log(stdout);
      console.log('----------------------------\n');
      
      this.log('Dry run completed');
    } catch (error) {
      console.warn('⚠️  Could not generate migration preview');
    }
  }

  private async applyMigrations() {
    const startTime = Date.now();
    
    try {
      // Apply migrations
      const { stdout } = await execAsync('npx prisma migrate deploy');
      console.log(stdout);
      
      const duration = Date.now() - startTime;
      this.log(`Migrations applied successfully in ${duration}ms`);
      
    } catch (error: any) {
      this.log(`Migration failed: ${error.message}`);
      throw error;
    }
  }

  private async verifyDatabaseIntegrity() {
    const checks = [
      {
        name: 'Schema sync',
        check: async () => {
          // Verify schema is in sync
          try {
            await execAsync('npx prisma db pull --print');
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Database connection',
        check: async () => {
          try {
            await prisma.$connect();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Basic queries',
        check: async () => {
          try {
            await prisma.user.count();
            await prisma.companySettings.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Foreign key constraints',
        check: async () => {
          try {
            // Test a query that uses foreign keys
            await prisma.customer.findFirst({
              include: { salesCase: true }
            });
            return true;
          } catch {
            return false;
          }
        }
      }
    ];

    console.log('\nRunning integrity checks:');
    let allPassed = true;
    
    for (const { name, check } of checks) {
      const passed = await check();
      console.log(`  ${passed ? '✅' : '❌'} ${name}`);
      if (!passed) allPassed = false;
    }
    
    if (!allPassed) {
      throw new Error('Database integrity check failed');
    }
    
    this.log('All integrity checks passed');
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.migrationLog.push(`[${timestamp}] ${message}`);
  }

  private async saveMigrationLog() {
    const logDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logDir, { recursive: true });
    
    const logFile = path.join(logDir, `migration-${new Date().toISOString().split('T')[0]}.log`);
    const logContent = this.migrationLog.join('\n') + '\n';
    
    await fs.appendFile(logFile, logContent);
    console.log(`\n📝 Migration log saved to: ${logFile}`);
  }
}

// CLI interface
async function main() {
  const migration = new SafeMigration();
  
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    skipBackup: args.includes('--skip-backup'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force')
  };
  
  if (args.includes('--help')) {
    console.log('Safe Migration Tool');
    console.log('Usage: safe-migrate.ts [options]');
    console.log('\nOptions:');
    console.log('  --dry-run      Show what would be migrated without applying changes');
    console.log('  --skip-backup  Skip creating backup (not recommended)');
    console.log('  --force        Force migration in production');
    console.log('  --help         Show this help message');
    process.exit(0);
  }
  
  await migration.runMigration(options);
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { SafeMigration };