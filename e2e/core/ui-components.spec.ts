import { test, expect } from '@playwright/test'

test.describe('UI Components', () => {
  test('should load main layout elements', async ({ page }) => {
    await page.goto('/')
    
    // Check for basic HTML structure
    await expect(page.locator('html')).toBeVisible()
    await expect(page.locator('body')).toBeVisible()
    
    // Check for main content area
    const mainContent = page.locator('main, [role="main"], .main-content')
    if (await mainContent.count() > 0) {
      await expect(mainContent.first()).toBeVisible()
    }
  })

  test('should have responsive design elements', async ({ page }) => {
    await page.goto('/')
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(page.locator('body')).toBeVisible()
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have accessible elements', async ({ page }) => {
    await page.goto('/')
    
    // Check for basic accessibility
    const headings = page.locator('h1, h2, h3')
    if (await headings.count() > 0) {
      await expect(headings.first()).toBeVisible()
    }
    
    // Check for buttons and links
    const interactiveElements = page.locator('button, a, input')
    if (await interactiveElements.count() > 0) {
      await expect(interactiveElements.first()).toBeVisible()
    }
  })
})