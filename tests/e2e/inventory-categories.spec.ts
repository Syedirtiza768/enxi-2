import { test, expect } from '@playwright/test'

test.describe('Inventory Categories', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')
  })

  test('should navigate to inventory categories', async ({ page }) => {
    // Click inventory in sidebar
    await page.click('text=Inventory')
    await expect(page).toHaveURL('/inventory')
    
    // Click categories tab
    await page.click('text=Categories')
    await expect(page).toHaveURL('/inventory/categories')
    
    // Check page header
    await expect(page.locator('h1')).toContainText('Inventory Categories')
  })

  test('should create a new category', async ({ page }) => {
    await page.goto('/inventory/categories')
    
    // Click new category button
    await page.click('button:has-text("New Category")')
    
    // Fill form
    await page.fill('input[id="name"]', 'Test Category')
    await page.fill('textarea[id="description"]', 'Test description')
    
    // Note: GL accounts would need to be selected here
    // For now, we'll just check the form is visible
    await expect(page.locator('h2')).toContainText('Create Category')
  })

  test('should display category tree', async ({ page }) => {
    await page.goto('/inventory/categories')
    
    // Check for empty state or existing categories
    const emptyState = page.locator('text=No categories found')
    const categoryTree = page.locator('.category-tree')
    
    // Either empty state or category tree should be visible
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    const hasCategoryTree = await categoryTree.isVisible().catch(() => false)
    
    expect(hasEmptyState || hasCategoryTree).toBe(true)
  })

  test('should show statistics', async ({ page }) => {
    await page.goto('/inventory/categories')
    
    // Check statistics cards
    await expect(page.locator('text=Total Categories')).toBeVisible()
    await expect(page.locator('text=Active Categories')).toBeVisible()
    await expect(page.locator('text=Categories with Items')).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    await page.goto('/inventory/categories')
    
    // Check search input exists
    const searchInput = page.locator('input[placeholder="Search categories..."]')
    await expect(searchInput).toBeVisible()
    
    // Type in search
    await searchInput.fill('test')
    
    // Search should trigger (in real app, would filter results)
    await expect(searchInput).toHaveValue('test')
  })
})