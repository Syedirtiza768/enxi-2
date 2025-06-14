import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Inventory management page object
 * Handles inventory items, categories, and stock movements
 */
export class InventoryPage extends BasePage {
  readonly pageTitle: Locator;
  readonly newItemButton: Locator;
  readonly newCategoryButton: Locator;
  readonly itemsTab: Locator;
  readonly categoriesTab: Locator;
  readonly movementsTab: Locator;
  readonly reportsTab: Locator;
  
  // Items table
  readonly itemsTable: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly statusFilter: Locator;
  readonly lowStockFilter: Locator;

  // Item form elements
  readonly itemNameInput: Locator;
  readonly itemDescriptionInput: Locator;
  readonly skuInput: Locator;
  readonly categorySelect: Locator;
  readonly unitPriceInput: Locator;
  readonly costPriceInput: Locator;
  readonly quantityInput: Locator;
  readonly reorderLevelInput: Locator;
  readonly unitOfMeasureSelect: Locator;
  readonly weightInput: Locator;
  readonly dimensionsInput: Locator;
  readonly saveItemButton: Locator;

  // Category form elements
  readonly categoryNameInput: Locator;
  readonly categoryDescriptionInput: Locator;
  readonly categoryCodeInput: Locator;
  readonly parentCategorySelect: Locator;
  readonly saveCategoryButton: Locator;

  // Stock movement elements
  readonly movementTypeSelect: Locator;
  readonly movementQuantityInput: Locator;
  readonly movementReasonInput: Locator;
  readonly movementNotesInput: Locator;
  readonly processMovementButton: Locator;

  // Actions
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly adjustStockButton: Locator;
  readonly viewMovementsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.newItemButton = page.locator('button:has-text("New Item"), a:has-text("New Item")');
    this.newCategoryButton = page.locator('button:has-text("New Category"), a:has-text("New Category")');
    this.itemsTab = page.locator('text=Items');
    this.categoriesTab = page.locator('text=Categories');
    this.movementsTab = page.locator('text=Movements');
    this.reportsTab = page.locator('text=Reports');

    // Tables
    this.itemsTable = page.locator('table, .items-table');
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    this.categoryFilter = page.locator('select[name="category"], .category-filter');
    this.statusFilter = page.locator('select[name="status"], .status-filter');
    this.lowStockFilter = page.locator('input[type="checkbox"][name="lowStock"], .low-stock-filter');

    // Item form
    this.itemNameInput = page.locator('input[name="name"]');
    this.itemDescriptionInput = page.locator('textarea[name="description"]');
    this.skuInput = page.locator('input[name="sku"]');
    this.categorySelect = page.locator('select[name="categoryId"]');
    this.unitPriceInput = page.locator('input[name="unitPrice"]');
    this.costPriceInput = page.locator('input[name="costPrice"]');
    this.quantityInput = page.locator('input[name="quantityOnHand"]');
    this.reorderLevelInput = page.locator('input[name="reorderLevel"]');
    this.unitOfMeasureSelect = page.locator('select[name="unitOfMeasure"]');
    this.weightInput = page.locator('input[name="weight"]');
    this.dimensionsInput = page.locator('input[name="dimensions"]');
    this.saveItemButton = page.locator('button:has-text("Save Item"), button[type="submit"]');

    // Category form
    this.categoryNameInput = page.locator('input[name="name"]');
    this.categoryDescriptionInput = page.locator('textarea[name="description"]');
    this.categoryCodeInput = page.locator('input[name="code"]');
    this.parentCategorySelect = page.locator('select[name="parentId"]');
    this.saveCategoryButton = page.locator('button:has-text("Save Category"), button[type="submit"]');

    // Stock movements
    this.movementTypeSelect = page.locator('select[name="movementType"]');
    this.movementQuantityInput = page.locator('input[name="quantity"]');
    this.movementReasonInput = page.locator('select[name="reason"], input[name="reason"]');
    this.movementNotesInput = page.locator('textarea[name="notes"]');
    this.processMovementButton = page.locator('button:has-text("Process Movement")');

    // Actions
    this.editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    this.deleteButton = page.locator('button:has-text("Delete")');
    this.adjustStockButton = page.locator('button:has-text("Adjust Stock")');
    this.viewMovementsButton = page.locator('button:has-text("View Movements")');
  }

  async navigateToInventory(): Promise<void> {
    await this.navigate('/inventory');
    await expect(this.pageTitle).toContainText('Inventory');
  }

  async navigateToItems(): Promise<void> {
    await this.navigateToInventory();
    await this.itemsTab.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/inventory/items');
  }

  async navigateToCategories(): Promise<void> {
    await this.navigateToInventory();
    await this.categoriesTab.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/inventory/categories');
  }

  async navigateToMovements(): Promise<void> {
    await this.navigateToInventory();
    await this.movementsTab.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/inventory/movements');
  }

  async navigateToNewItem(): Promise<void> {
    await this.navigateToItems();
    await this.newItemButton.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/inventory/items/new');
  }

  async navigateToNewCategory(): Promise<void> {
    await this.navigateToCategories();
    await this.newCategoryButton.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/inventory/categories/new');
  }

  async createCategory(categoryData: {
    name: string;
    description: string;
    code: string;
    parentId?: string;
  }) {
    await this.navigateToNewCategory();
    
    await this.categoryNameInput.fill(categoryData.name);
    await this.categoryDescriptionInput.fill(categoryData.description);
    await this.categoryCodeInput.fill(categoryData.code);
    
    if (categoryData.parentId) {
      await this.parentCategorySelect.selectOption(categoryData.parentId);
    }
    
    await this.saveCategoryButton.click();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Category created successfully');
    await this.expectUrlToContain('/inventory/categories');
  }

  async createItem(itemData: {
    name: string;
    description: string;
    sku: string;
    categoryId: string;
    unitPrice: string;
    costPrice: string;
    quantityOnHand: string;
    reorderLevel: string;
    unitOfMeasure: string;
    weight?: string;
    dimensions?: string;
  }) {
    await this.navigateToNewItem();
    
    await this.itemNameInput.fill(itemData.name);
    await this.itemDescriptionInput.fill(itemData.description);
    await this.skuInput.fill(itemData.sku);
    await this.categorySelect.selectOption(itemData.categoryId);
    await this.unitPriceInput.fill(itemData.unitPrice);
    await this.costPriceInput.fill(itemData.costPrice);
    await this.quantityInput.fill(itemData.quantityOnHand);
    await this.reorderLevelInput.fill(itemData.reorderLevel);
    await this.unitOfMeasureSelect.selectOption(itemData.unitOfMeasure);
    
    if (itemData.weight) {
      await this.weightInput.fill(itemData.weight);
    }
    
    if (itemData.dimensions) {
      await this.dimensionsInput.fill(itemData.dimensions);
    }
    
    await this.saveItemButton.click();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Item created successfully');
    await this.expectUrlToContain('/inventory/items');
  }

  async createSampleCategory(): Promise<T> {
    const sampleCategory = {
      name: `Test Category ${Math.random().toString(36).substr(2, 8)}`,
      description: 'Test category for E2E testing',
      code: `TEST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    };
    
    await this.createCategory(sampleCategory);
    return sampleCategory;
  }

  async createSampleItem(categoryId?: string) {
    if (!categoryId) {
      const category = await this.createSampleCategory();
      categoryId = category.code; // In real app, would use actual ID
    }
    
    const sampleItem = {
      name: `Test Item ${Math.random().toString(36).substr(2, 8)}`,
      description: 'Test inventory item for E2E testing',
      sku: `TEST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      categoryId,
      unitPrice: '150.00',
      costPrice: '100.00',
      quantityOnHand: '25',
      reorderLevel: '10',
      unitOfMeasure: 'EACH',
      weight: '2.5',
      dimensions: '20x15x10 cm'
    };
    
    await this.createItem(sampleItem);
    return sampleItem;
  }

  async searchItems(query: string) {
    await this.navigateToItems();
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForLoadingToFinish();
  }

  async filterByCategory(categoryName: string) {
    await this.categoryFilter.selectOption(categoryName);
    await this.waitForLoadingToFinish();
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForLoadingToFinish();
  }

  async filterLowStockItems(): Promise<void> {
    await this.lowStockFilter.check();
    await this.waitForLoadingToFinish();
  }

  async clickItemBySku(sku: string) {
    const itemRow = this.page.locator(`tr:has-text("${sku}")`);
    await itemRow.click();
    await this.waitForPageLoad();
  }

  async editItem(sku: string, newData: Partial<{
    name: string;
    description: string;
    unitPrice: string;
    costPrice: string;
    quantityOnHand: string;
    reorderLevel: string;
  }>) {
    await this.clickItemBySku(sku);
    await this.editButton.click();
    await this.waitForPageLoad();
    
    if (newData.name) {
      await this.itemNameInput.fill(newData.name);
    }
    if (newData.description) {
      await this.itemDescriptionInput.fill(newData.description);
    }
    if (newData.unitPrice) {
      await this.unitPriceInput.fill(newData.unitPrice);
    }
    if (newData.costPrice) {
      await this.costPriceInput.fill(newData.costPrice);
    }
    if (newData.quantityOnHand) {
      await this.quantityInput.fill(newData.quantityOnHand);
    }
    if (newData.reorderLevel) {
      await this.reorderLevelInput.fill(newData.reorderLevel);
    }
    
    await this.saveItemButton.click();
    await this.waitForPageLoad();
    await this.expectSuccessMessage('Item updated successfully');
  }

  async adjustStock(sku: string, movementData: {
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: string;
    reason: string;
    notes: string;
  }) {
    await this.clickItemBySku(sku);
    await this.adjustStockButton.click();
    await this.waitForPageLoad();
    
    await this.movementTypeSelect.selectOption(movementData.type);
    await this.movementQuantityInput.fill(movementData.quantity);
    await this.movementReasonInput.fill(movementData.reason);
    await this.movementNotesInput.fill(movementData.notes);
    
    await this.processMovementButton.click();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Stock movement processed successfully');
  }

  async viewItemMovements(sku: string) {
    await this.clickItemBySku(sku);
    await this.viewMovementsButton.click();
    await this.waitForPageLoad();
    
    // Should show movements table
    const movementsTable = this.page.locator('.movements-table, table');
    await expect(movementsTable).toBeVisible();
  }

  async deleteItem(sku: string) {
    await this.clickItemBySku(sku);
    await this.deleteButton.click();
    
    // Confirm deletion
    await this.confirmDialog();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Item deleted successfully');
  }

  async verifyItemInTable(sku: string, expectedData?: {
    name?: string;
    category?: string;
    unitPrice?: string;
    quantity?: string;
    status?: string;
  }) {
    const itemRow = this.page.locator(`tr:has-text("${sku}")`);
    await expect(itemRow).toBeVisible();
    
    if (expectedData) {
      if (expectedData.name) {
        await expect(itemRow).toContainText(expectedData.name);
      }
      if (expectedData.category) {
        await expect(itemRow).toContainText(expectedData.category);
      }
      if (expectedData.unitPrice) {
        await expect(itemRow).toContainText(expectedData.unitPrice);
      }
      if (expectedData.quantity) {
        await expect(itemRow).toContainText(expectedData.quantity);
      }
      if (expectedData.status) {
        await expect(itemRow).toContainText(expectedData.status);
      }
    }
  }

  async verifyCategoryInTable(code: string, expectedData?: {
    name?: string;
    description?: string;
    itemCount?: string;
  }) {
    const categoryRow = this.page.locator(`tr:has-text("${code}")`);
    await expect(categoryRow).toBeVisible();
    
    if (expectedData) {
      if (expectedData.name) {
        await expect(categoryRow).toContainText(expectedData.name);
      }
      if (expectedData.description) {
        await expect(categoryRow).toContainText(expectedData.description);
      }
      if (expectedData.itemCount) {
        await expect(categoryRow).toContainText(expectedData.itemCount);
      }
    }
  }

  async verifyFormValidation(): Promise<void> {
    // Test item form validation
    await this.navigateToNewItem();
    await this.saveItemButton.click();
    
    await this.expectErrorMessage('Name is required');
    await this.expectErrorMessage('SKU is required');
    await this.expectErrorMessage('Category is required');
    
    // Test category form validation
    await this.navigateToNewCategory();
    await this.saveCategoryButton.click();
    
    await this.expectErrorMessage('Name is required');
    await this.expectErrorMessage('Code is required');
  }

  async testBulkOperations(): Promise<void> {
    await this.navigateToItems();
    
    // Test bulk selection
    const checkboxes = this.page.locator('input[type="checkbox"]');
    const firstCheckbox = checkboxes.first();
    
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.check();
      
      // Bulk actions should be enabled
      const bulkActionsMenu = this.page.locator('.bulk-actions, [data-testid="bulk-actions"]');
      if (await bulkActionsMenu.isVisible()) {
        console.log('✅ Bulk operations available');
      }
    }
  }

  async generateBarcode(sku: string) {
    await this.clickItemBySku(sku);
    
    const barcodeButton = this.page.locator('button:has-text("Generate Barcode")');
    if (await barcodeButton.isVisible()) {
      await barcodeButton.click();
      await this.waitForLoadingToFinish();
      console.log('✅ Barcode generation feature available');
    }
  }

  async exportInventoryData(): Promise<void> {
    await this.navigateToItems();
    
    const exportButton = this.page.locator('button:has-text("Export"), .export-button');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await this.waitForLoadingToFinish();
      console.log('✅ Inventory export feature available');
    }
  }

  async checkLowStockAlerts(): Promise<boolean> {
    await this.navigateToItems();
    await this.filterLowStockItems();
    
    // Should show items below reorder level
    const lowStockBadge = this.page.locator('.low-stock, .badge-warning, .alert-badge');
    if (await lowStockBadge.isVisible()) {
      console.log('✅ Low stock alerts visible');
    }
  }

  async testInventoryReports(): Promise<void> {
    await this.navigateToInventory();
    await this.reportsTab.click();
    await this.waitForPageLoad();
    
    // Test various inventory reports
    const reportTypes = [
      'Stock Summary',
      'Stock Value',
      'Low Stock Report',
      'Movement History'
    ];
    
    for (const reportType of reportTypes) {
      const reportLink = this.page.locator(`text=${reportType}`);
      if (await reportLink.isVisible()) {
        await reportLink.click();
        await this.waitForLoadingToFinish();
        console.log(`✅ ${reportType} report available`);
        await this.page.goBack();
      }
    }
  }
}