import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in login form
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Should show user info
    await expect(page.locator('text=admin')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in login form with wrong password
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
    
    // Click logout
    await page.click('button[aria-label="Logout"]')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    
    // Try to access dashboard again
    await page.goto('/dashboard')
    
    // Should redirect back to login
    await expect(page).toHaveURL('/login')
  })

  test('should persist session on page refresh', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
    
    // Refresh page
    await page.reload()
    
    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=admin')).toBeVisible()
  })

  test('should handle form validation', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('text=Username must be at least 3 characters')).toBeVisible()
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible()
    
    // Fill username only
    await page.fill('input[name="username"]', 'ad')
    await page.click('button[type="submit"]')
    
    // Should still show username error
    await expect(page.locator('text=Username must be at least 3 characters')).toBeVisible()
  })
})