import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login')
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await expect(emailInput).toBeVisible()
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await expect(passwordInput).toBeVisible()
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')
    await expect(submitButton).toBeVisible()
  })

  test('should handle invalid login attempt', async ({ page }) => {
    await page.goto('/login')
    
    // Try to fill login form with invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('invalid@test.com')
      await passwordInput.fill('wrongpassword')
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first()
      await submitButton.click()
      
      // Should stay on login page or show error
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      expect(currentUrl).toContain('login')
    }
  })
})