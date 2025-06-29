import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Fixed authentication setup for E2E tests
 * Handles client-side navigation properly
 */

const adminStateFile = path.join(__dirname, '../storage-state/admin-state.json');
const managerStateFile = path.join(__dirname, '../storage-state/manager-state.json');
const salesStateFile = path.join(__dirname, '../storage-state/sales-state.json');

setup('authenticate as admin', async ({ page }) => {
  console.log('🔐 Setting up admin authentication...');
  
  await page.goto('/login');
  
  // Wait for the login form to be visible
  await page.waitForSelector('input[placeholder="Enter your username or email"]', { timeout: 10000 });
  
  // Fill login form with admin credentials
  await page.fill('input[placeholder="Enter your username or email"]', 'admin');
  await page.fill('input[placeholder="Enter your password"]', 'admin123');
  
  // Wait a moment for form to be ready
  await page.waitForTimeout(500);
  
  // Click submit button
  await page.click('button[type="submit"]');
  
  // Wait for either:
  // 1. Navigation to dashboard (client-side)
  // 2. Error message
  const result = await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 10000 })
      .then(() => ({ success: true }))
      .catch(() => ({ success: false })),
    page.waitForSelector('text=/error|failed|invalid/i', { timeout: 5000 })
      .then(async (element) => ({ 
        success: false, 
        error: await element.textContent() 
      }))
      .catch(() => ({ success: false }))
  ]);
  
  if (!result.success) {
    // Try alternative: Check if localStorage has auth token
    const hasToken = await page.evaluate(() => {
      return !!localStorage.getItem('auth-token');
    });
    
    if (hasToken) {
      console.log('✅ Auth token found in localStorage, navigating to dashboard...');
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    } else {
      throw new Error('Authentication failed - no auth token found');
    }
  }
  
  // Verify we're on dashboard
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Wait for username to be visible
  await expect(page.getByText('admin')).toBeVisible({ timeout: 10000 });
  
  // Save authenticated state
  await page.context().storageState({ path: adminStateFile });
  
  console.log('✅ Admin authentication setup complete');
});

setup('authenticate as manager', async ({ page }) => {
  console.log('🔐 Setting up manager authentication...');
  
  await page.goto('/login');
  
  // Wait for the login form to be visible
  await page.waitForSelector('input[placeholder="Enter your username or email"]');
  
  // Fill login form with manager credentials
  await page.fill('input[placeholder="Enter your username or email"]', 'manager');
  await page.fill('input[placeholder="Enter your password"]', 'manager123');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for navigation or check localStorage
  const navigationPromise = page.waitForURL('**/dashboard', { timeout: 10000 })
    .catch(async () => {
      // Fallback: check localStorage and navigate manually
      const hasToken = await page.evaluate(() => !!localStorage.getItem('auth-token'));
      if (hasToken) {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
      } else {
        throw new Error('Manager authentication failed');
      }
    });
    
  await navigationPromise;
  
  // Verify login was successful
  await expect(page.getByText('manager')).toBeVisible({ timeout: 10000 });
  
  // Save authenticated state
  await page.context().storageState({ path: managerStateFile });
  
  console.log('✅ Manager authentication setup complete');
});

setup('authenticate as sales user', async ({ page }) => {
  console.log('🔐 Setting up sales user authentication...');
  
  await page.goto('/login');
  
  // Wait for the login form to be visible
  await page.waitForSelector('input[placeholder="Enter your username or email"]');
  
  // Fill login form with sales user credentials
  await page.fill('input[placeholder="Enter your username or email"]', 'sales');
  await page.fill('input[placeholder="Enter your password"]', 'sales123');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for navigation or check localStorage
  const navigationPromise = page.waitForURL('**/dashboard', { timeout: 10000 })
    .catch(async () => {
      // Fallback: check localStorage and navigate manually
      const hasToken = await page.evaluate(() => !!localStorage.getItem('auth-token'));
      if (hasToken) {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
      } else {
        throw new Error('Sales user authentication failed');
      }
    });
    
  await navigationPromise;
  
  // Verify login was successful
  await expect(page.getByText('sales')).toBeVisible({ timeout: 10000 });
  
  // Save authenticated state
  await page.context().storageState({ path: salesStateFile });
  
  console.log('✅ Sales user authentication setup complete');
});