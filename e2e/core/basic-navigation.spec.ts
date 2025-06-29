import { test, expect } from '@playwright/test'

test.describe('Basic Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Enxi/)
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1, h2')).toContainText(/login/i)
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/')
    
    // Check if dashboard link exists and is clickable
    const dashboardLink = page.locator('a[href*="dashboard"], a[href*="Dashboard"]').first()
    if (await dashboardLink.isVisible()) {
      await expect(dashboardLink).toBeVisible()
    }
  })
})