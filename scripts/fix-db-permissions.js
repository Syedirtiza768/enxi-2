const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Fixing database permissions...');

// Get the actual database path
const dbPath = '/Users/irtizahassan/.enxi/database/enxi.db';
const dbDir = path.dirname(dbPath);

try {
  // Ensure directory has proper permissions
  execSync(`chmod 755 "${dbDir}"`);
  console.log('✓ Set directory permissions');

  // Ensure database file has write permissions
  execSync(`chmod 666 "${dbPath}"`);
  console.log('✓ Set database file permissions');

  // Check if any journal files exist and fix their permissions
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  
  if (fs.existsSync(walPath)) {
    execSync(`chmod 666 "${walPath}"`);
    console.log('✓ Set WAL file permissions');
  }
  
  if (fs.existsSync(shmPath)) {
    execSync(`chmod 666 "${shmPath}"`);
    console.log('✓ Set SHM file permissions');
  }

  // Try to run a simple SQLite command to ensure it's writable
  execSync(`sqlite3 "${dbPath}" "PRAGMA journal_mode=WAL;"`, { stdio: 'inherit' });
  console.log('✓ SQLite write test successful');

  console.log('\n✅ Database permissions fixed successfully');
  console.log('Please restart PM2: pm2 restart enxi-erp');
} catch (error) {
  console.error('❌ Error fixing permissions:', error.message);
  process.exit(1);
}