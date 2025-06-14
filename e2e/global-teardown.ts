import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global teardown for E2E tests
 * - Cleans up test database
 * - Removes temporary files
 * - Generates test reports
 */
async function globalTeardown(config: FullConfig): Promise<unknown> {
  console.log('🧹 Starting E2E test global teardown...');
  
  try {
    // 1. Clean up test database
    await cleanupTestDatabase();
    
    // 2. Generate test summary
    await generateTestSummary();
    
    console.log('✅ E2E test global teardown completed successfully');
  } catch (error) {
    console.error('❌ E2E test global teardown failed:', error);
    // Don't throw error to prevent masking test failures
  }
}

/**
 * Clean up test database
 */
async function cleanupTestDatabase(): Promise<void> {
  const testDbPath = path.join(process.cwd(), 'e2e-test.db');
  
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
      console.log('✅ Test database cleaned up');
    } catch (error) {
      console.warn('⚠️  Could not remove test database:', error);
    }
  }
}

/**
 * Generate test summary
 */
async function generateTestSummary(): Promise<void> {
  const resultsDir = path.join(process.cwd(), 'e2e-test-results');
  const resultsFile = path.join(resultsDir, 'results.json');
  
  if (!fs.existsSync(resultsFile)) {
    return;
  }
  
  try {
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    const summary = {
      timestamp: new Date().toISOString(),
      total: results.stats?.total || 0,
      passed: results.stats?.passed || 0,
      failed: results.stats?.failed || 0,
      skipped: results.stats?.skipped || 0,
      duration: results.stats?.duration || 0,
      success: (results.stats?.failed || 0) === 0
    };
    
    fs.writeFileSync(
      path.join(resultsDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('📊 Test summary generated:', summary);
  } catch (error) {
    console.warn('⚠️  Could not generate test summary:', error);
  }
}

export default globalTeardown;