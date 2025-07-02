#!/usr/bin/env tsx
// Production Database Backup Script
// This script creates timestamped backups of your production database

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface BackupOptions {
  type: 'full' | 'incremental' | 'schema-only';
  compress?: boolean;
  encrypt?: boolean;
  maxBackups?: number;
}

class DatabaseBackup {
  private backupDir: string;
  private databaseUrl: string;

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    this.databaseUrl = process.env.DATABASE_URL || '';
    
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  async init() {
    // Create backup directory if it doesn't exist
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async createBackup(options: BackupOptions = { type: 'full' }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${options.type}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    console.log(`🔄 Starting ${options.type} backup...`);
    console.log(`📁 Backup location: ${backupPath}`);

    try {
      // Parse database URL
      const dbUrl = new URL(this.databaseUrl);
      const dbType = dbUrl.protocol.slice(0, -1); // Remove trailing :

      if (dbType === 'postgresql') {
        await this.backupPostgres(dbUrl, backupPath, options);
      } else if (dbType === 'mysql') {
        await this.backupMySQL(dbUrl, backupPath, options);
      } else {
        throw new Error(`Unsupported database type: ${dbType}`);
      }

      // Compress backup if requested
      if (options.compress) {
        await this.compressBackup(backupPath);
      }

      // Encrypt backup if requested
      if (options.encrypt) {
        await this.encryptBackup(backupPath);
      }

      // Clean up old backups
      if (options.maxBackups) {
        await this.cleanupOldBackups(options.maxBackups);
      }

      console.log(`✅ Backup completed successfully: ${backupName}`);
      
      // Log backup metadata
      await this.logBackupMetadata(backupName, options);
      
      return backupPath;
    } catch (error) {
      console.error(`❌ Backup failed: ${error}`);
      throw error;
    }
  }

  private async backupPostgres(dbUrl: URL, backupPath: string, options: BackupOptions) {
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;

    let command = `PGPASSWORD="${password}" pg_dump`;
    command += ` -h ${host} -p ${port} -U ${username} -d ${database}`;
    
    if (options.type === 'schema-only') {
      command += ' --schema-only';
    }
    
    command += ` -f "${backupPath}.sql"`;

    await execAsync(command);
  }

  private async backupMySQL(dbUrl: URL, backupPath: string, options: BackupOptions) {
    const host = dbUrl.hostname;
    const port = dbUrl.port || '3306';
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;

    let command = `mysqldump`;
    command += ` -h ${host} -P ${port} -u ${username} -p${password}`;
    
    if (options.type === 'schema-only') {
      command += ' --no-data';
    }
    
    command += ` ${database} > "${backupPath}.sql"`;

    await execAsync(command);
  }

  private async compressBackup(backupPath: string) {
    console.log('📦 Compressing backup...');
    await execAsync(`gzip "${backupPath}.sql"`);
    console.log('✅ Compression completed');
  }

  private async encryptBackup(backupPath: string) {
    console.log('🔐 Encrypting backup...');
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      console.warn('⚠️  BACKUP_ENCRYPTION_KEY not set, skipping encryption');
      return;
    }

    const filePath = `${backupPath}.sql.gz`;
    await execAsync(`openssl enc -aes-256-cbc -salt -in "${filePath}" -out "${filePath}.enc" -k "${encryptionKey}"`);
    await fs.unlink(filePath); // Remove unencrypted file
    console.log('✅ Encryption completed');
  }

  private async cleanupOldBackups(maxBackups: number) {
    console.log(`🧹 Cleaning up old backups (keeping ${maxBackups} most recent)...`);
    
    const files = await fs.readdir(this.backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('backup-'))
      .map(f => ({
        name: f,
        path: path.join(this.backupDir, f)
      }));

    // Sort by modification time
    const sortedFiles = await Promise.all(
      backupFiles.map(async (file) => ({
        ...file,
        mtime: (await fs.stat(file.path)).mtime
      }))
    );
    
    sortedFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Remove old backups
    const filesToDelete = sortedFiles.slice(maxBackups);
    for (const file of filesToDelete) {
      await fs.unlink(file.path);
      console.log(`  - Deleted: ${file.name}`);
    }
    
    console.log(`✅ Cleanup completed`);
  }

  private async logBackupMetadata(backupName: string, options: BackupOptions) {
    const metadata = {
      name: backupName,
      timestamp: new Date().toISOString(),
      type: options.type,
      compressed: options.compress || false,
      encrypted: options.encrypt || false,
      databaseStats: await this.getDatabaseStats()
    };

    const metadataPath = path.join(this.backupDir, 'backup-metadata.json');
    
    let existingMetadata = [];
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      existingMetadata = JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet
    }

    existingMetadata.push(metadata);
    await fs.writeFile(metadataPath, JSON.stringify(existingMetadata, null, 2));
  }

  private async getDatabaseStats() {
    try {
      const stats = {
        users: await prisma.user.count(),
        customers: await prisma.customer.count(),
        suppliers: await prisma.supplier.count(),
        items: await prisma.item.count(),
        salesOrders: await prisma.salesOrder.count(),
        invoices: await prisma.invoice.count(),
        quotations: await prisma.quotation.count()
      };
      return stats;
    } catch (error) {
      console.warn('⚠️  Could not fetch database stats:', error);
      return null;
    }
  }

  async restoreBackup(backupFile: string) {
    console.log(`🔄 Restoring backup: ${backupFile}`);
    console.log('⚠️  WARNING: This will overwrite your current database!');
    
    // Add safety check
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_RESTORE) {
      throw new Error('Production restore not allowed. Set ALLOW_PRODUCTION_RESTORE=true to override.');
    }

    const backupPath = path.join(this.backupDir, backupFile);
    
    // Check if backup exists
    try {
      await fs.access(backupPath);
    } catch {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Decrypt if needed
    let sqlFile = backupPath;
    if (backupPath.endsWith('.enc')) {
      sqlFile = await this.decryptBackup(backupPath);
    }

    // Decompress if needed
    if (sqlFile.endsWith('.gz')) {
      await execAsync(`gunzip "${sqlFile}"`);
      sqlFile = sqlFile.replace('.gz', '');
    }

    // Restore based on database type
    const dbUrl = new URL(this.databaseUrl);
    const dbType = dbUrl.protocol.slice(0, -1);

    if (dbType === 'postgresql') {
      await this.restorePostgres(dbUrl, sqlFile);
    } else if (dbType === 'mysql') {
      await this.restoreMySQL(dbUrl, sqlFile);
    }

    console.log('✅ Restore completed successfully');
  }

  private async decryptBackup(encryptedPath: string): Promise<string> {
    console.log('🔓 Decrypting backup...');
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error('BACKUP_ENCRYPTION_KEY is required to decrypt backup');
    }

    const decryptedPath = encryptedPath.replace('.enc', '');
    await execAsync(`openssl enc -aes-256-cbc -d -in "${encryptedPath}" -out "${decryptedPath}" -k "${encryptionKey}"`);
    
    return decryptedPath;
  }

  private async restorePostgres(dbUrl: URL, sqlFile: string) {
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;

    const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${sqlFile}"`;
    await execAsync(command);
  }

  private async restoreMySQL(dbUrl: URL, sqlFile: string) {
    const host = dbUrl.hostname;
    const port = dbUrl.port || '3306';
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;

    const command = `mysql -h ${host} -P ${port} -u ${username} -p${password} ${database} < "${sqlFile}"`;
    await execAsync(command);
  }
}

// CLI interface
async function main() {
  const backup = new DatabaseBackup();
  await backup.init();

  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      await backup.createBackup({
        type: 'full',
        compress: true,
        encrypt: true,
        maxBackups: 7
      });
      break;
      
    case 'backup-schema':
      await backup.createBackup({
        type: 'schema-only',
        compress: true,
        maxBackups: 30
      });
      break;
      
    case 'restore':
      const backupFile = process.argv[3];
      if (!backupFile) {
        console.error('Please specify backup file to restore');
        process.exit(1);
      }
      await backup.restoreBackup(backupFile);
      break;
      
    default:
      console.log('Usage:');
      console.log('  backup-database.ts backup         - Create full backup');
      console.log('  backup-database.ts backup-schema  - Create schema-only backup');
      console.log('  backup-database.ts restore <file> - Restore from backup');
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { DatabaseBackup };