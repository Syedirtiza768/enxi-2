import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Global setup for E2E tests
 * - Sets up test database
 * - Seeds test data
 * - Configures test environment
 */
async function globalSetup(config: FullConfig): Promise<unknown> {
  console.log('🚀 Starting E2E test global setup...');
  
  try {
    // 1. Setup test database
    await setupTestDatabase();
    
    // 2. Seed test data
    await seedTestData();
    
    // 3. Create storage state directories
    await createStorageDirectories();
    
    console.log('✅ E2E test global setup completed successfully');
  } catch (error) {
    console.error('❌ E2E test global setup failed:', error);
    throw error;
  }
}

/**
 * Setup test database with fresh schema
 */
async function setupTestDatabase(): Promise<void> {
  console.log('📦 Setting up test database...');
  
  const testDbPath = path.join(process.cwd(), 'e2e-test.db');
  
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Create new test database with schema
  process.env.DATABASE_URL = `file:./e2e-test.db`;
  
  try {
    await execAsync('npx prisma db push --force-reset');
    console.log('✅ Test database schema created');
  } catch (error) {
    console.error('❌ Failed to create test database schema:', error);
    throw error;
  }
}

/**
 * Seed test database with comprehensive test data
 */
async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data...');
  
  try {
    // Run the comprehensive seed script for E2E tests
    await execAsync('DATABASE_URL=file:./e2e-test.db npx tsx e2e/fixtures/seed-e2e-data.ts');
    console.log('✅ Test data seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
}

/**
 * Create storage state directories
 */
async function createStorageDirectories(): Promise<void> {
  const storageDir = path.join(process.cwd(), 'e2e', 'storage-state');
  
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  console.log('✅ Storage directories created');
}

export default globalSetup;