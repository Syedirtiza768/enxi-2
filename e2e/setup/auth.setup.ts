import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication setup for E2E tests
 * Creates authenticated sessions for different user roles
 */

const adminStateFile = path.join(__dirname, '../storage-state/admin-state.json');
const managerStateFile = path.join(__dirname, '../storage-state/manager-state.json');
const salesStateFile = path.join(__dirname, '../storage-state/sales-state.json');

setup('authenticate as admin', async ({ page }) => {
  console.log('🔐 Setting up admin authentication...');
  
  await page.goto('/login');
  
  // Fill login form with admin credentials
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for successful login and redirect
  await page.waitForURL('/dashboard');
  
  // Verify login was successful
  await expect(page.getByText('admin')).toBeVisible();
  
  // Save authenticated state
  await page.context().storageState({ path: adminStateFile });
  
  console.log('✅ Admin authentication setup complete');
});

setup('authenticate as manager', async ({ page }) => {
  console.log('🔐 Setting up manager authentication...');
  
  await page.goto('/login');
  
  // Fill login form with manager credentials
  await page.fill('input[name="username"]', 'manager');
  await page.fill('input[name="password"]', 'manager123');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for successful login and redirect
  await page.waitForURL('/dashboard');
  
  // Verify login was successful
  await expect(page.getByText('manager')).toBeVisible();
  
  // Save authenticated state
  await page.context().storageState({ path: managerStateFile });
  
  console.log('✅ Manager authentication setup complete');
});

setup('authenticate as sales user', async ({ page }) => {
  console.log('🔐 Setting up sales user authentication...');
  
  await page.goto('/login');
  
  // Fill login form with sales user credentials
  await page.fill('input[name="username"]', 'sales');
  await page.fill('input[name="password"]', 'sales123');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for successful login and redirect
  await page.waitForURL('/dashboard');
  
  // Verify login was successful
  await expect(page.getByText('sales')).toBeVisible();
  
  // Save authenticated state
  await page.context().storageState({ path: salesStateFile });
  
  console.log('✅ Sales user authentication setup complete');
});