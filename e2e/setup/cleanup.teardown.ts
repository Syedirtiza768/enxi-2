import { test as teardown } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Cleanup teardown for E2E tests
 * Removes temporary files and storage states
 */

teardown('cleanup storage states', async ({}) => {
  console.log('🧹 Cleaning up storage states...');
  
  const storageDir = path.join(__dirname, '../storage-state');
  
  if (fs.existsSync(storageDir)) {
    const files = fs.readdirSync(storageDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(storageDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Removed ${file}`);
        } catch (error) {
          console.warn(`⚠️  Could not remove ${file}:`, error);
        }
      }
    }
  }
  
  console.log('✅ Storage state cleanup complete');
});