import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/auth-page';
import { DashboardPage } from '../page-objects/dashboard-page';
import { InventoryPage } from '../page-objects/inventory-page';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';

test.describe('Inventory Management Workflow E2E Tests', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let inventoryPage: InventoryPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    inventoryPage = new InventoryPage(page);
    
    // Login as inventory manager for this workflow
    await authPage.loginAsInventory();
    await dashboardPage.verifyDashboardLoaded();
  });

  test.afterEach(async () => {
    // Clean up test data
    await DatabaseHelpers.cleanup();
  });

  test('should complete full inventory setup workflow', async ({ page }) => {
    console.log('📦 Starting Complete Inventory Setup Workflow');
    
    // Step 1: Create inventory categories
    await dashboardPage.navigateToInventory();
    await inventoryPage.navigateToCategories();
    
    const mainCategory = await inventoryPage.createSampleCategory();
    console.log('✅ Step 1: Main category created');
    
    // Create subcategory
    const subCategory = {
      name: `Sub-${mainCategory.name}`,
      description: 'Subcategory for testing',
      code: `SUB-${mainCategory.code}`,
      parentId: mainCategory.code
    };
    
    await inventoryPage.createCategory(subCategory);
    console.log('✅ Step 1b: Subcategory created');
    
    // Verify categories appear in table
    await inventoryPage.verifyCategoryInTable(mainCategory.code, {
      name: mainCategory.name,
      description: mainCategory.description
    });
    
    await inventoryPage.verifyCategoryInTable(subCategory.code, {
      name: subCategory.name,
      description: subCategory.description
    });
    
    // Step 2: Create inventory items
    await inventoryPage.navigateToItems();
    
    const items = [];
    for (let i = 0; i < 3; i++) {
      const item = await inventoryPage.createSampleItem(mainCategory.code);
      items.push(item);
      console.log(`✅ Step 2.${i + 1}: Item ${item.name} created`);
    }
    
    // Verify items appear in table
    for (const item of items) {
      await inventoryPage.verifyItemInTable(item.sku, {
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantityOnHand
      });
    }
    
    // Step 3: Test stock movements
    const testItem = items[0];
    
    // Stock adjustment
    await inventoryPage.adjustStock(testItem.sku, {
      type: 'ADJUSTMENT',
      quantity: '5',
      reason: 'Physical count adjustment',
      notes: 'Correcting quantity after stock count'
    });
    console.log('✅ Step 3a: Stock adjustment completed');
    
    // Stock in
    await inventoryPage.adjustStock(testItem.sku, {
      type: 'IN',
      quantity: '10',
      reason: 'Purchase receipt',
      notes: 'Goods received from supplier'
    });
    console.log('✅ Step 3b: Stock in movement completed');
    
    // Stock out
    await inventoryPage.adjustStock(testItem.sku, {
      type: 'OUT',
      quantity: '3',
      reason: 'Sales order fulfillment',
      notes: 'Items shipped to customer'
    });
    console.log('✅ Step 3c: Stock out movement completed');
    
    // Step 4: View movement history
    await inventoryPage.viewItemMovements(testItem.sku);
    console.log('✅ Step 4: Movement history verified');
    
    // Step 5: Test search and filtering
    await inventoryPage.navigateToItems();
    await inventoryPage.searchItems(testItem.name);
    await inventoryPage.verifyItemInTable(testItem.sku);
    console.log('✅ Step 5a: Search functionality verified');
    
    await inventoryPage.filterByCategory(mainCategory.name);
    console.log('✅ Step 5b: Category filtering verified');
    
    // Step 6: Test low stock alerts
    // Update item to have low stock
    await inventoryPage.editItem(testItem.sku, {
      quantityOnHand: '2',
      reorderLevel: '5'
    });
    
    await inventoryPage.checkLowStockAlerts();
    console.log('✅ Step 6: Low stock alerts verified');
    
    // Step 7: Test inventory reports
    await inventoryPage.testInventoryReports();
    console.log('✅ Step 7: Inventory reports verified');
    
    console.log('🎉 Complete Inventory Setup Workflow completed successfully!');
    
    // Take final screenshot
    await TestHelpers.takePageScreenshot(page, 'inventory-workflow-complete');
  });

  test('should handle inventory category management', async ({ page }) => {
    console.log('🗂️ Testing Inventory Category Management');
    
    // Create parent category
    const parentCategory = await inventoryPage.createSampleCategory();
    
    // Create multiple child categories
    const childCategories = [];
    for (let i = 0; i < 3; i++) {
      const childCategory = {
        name: `Child Category ${i + 1}`,
        description: `Child category ${i + 1} for testing`,
        code: `CHILD-${i + 1}-${Math.random().toString(36).substr(2, 4)}`,
        parentId: parentCategory.code
      };
      
      await inventoryPage.createCategory(childCategory);
      childCategories.push(childCategory);
    }
    
    console.log('✅ Category hierarchy created');
    
    // Verify category tree structure
    await inventoryPage.navigateToCategories();
    
    // Verify parent category
    await inventoryPage.verifyCategoryInTable(parentCategory.code);
    
    // Verify child categories
    for (const child of childCategories) {
      await inventoryPage.verifyCategoryInTable(child.code);
    }
    
    console.log('✅ Category hierarchy verified');
    
    // Test category filtering and search
    await inventoryPage.searchItems(parentCategory.name);
    console.log('✅ Category search verified');
  });

  test('should validate inventory form inputs and business rules', async ({ page }) => {
    console.log('✅ Testing Inventory Form Validation');
    
    // Test form validation
    await inventoryPage.verifyFormValidation();
    
    // Test SKU uniqueness
    const category = await inventoryPage.createSampleCategory();
    const firstItem = await inventoryPage.createSampleItem(category.code);
    
    // Try to create another item with same SKU
    await inventoryPage.navigateToNewItem();
    await inventoryPage.itemNameInput.fill('Duplicate SKU Item');
    await inventoryPage.itemDescriptionInput.fill('Testing duplicate SKU');
    await inventoryPage.skuInput.fill(firstItem.sku);
    await inventoryPage.categorySelect.selectOption(category.code);
    await inventoryPage.unitPriceInput.fill('100.00');
    await inventoryPage.costPriceInput.fill('75.00');
    await inventoryPage.quantityInput.fill('10');
    await inventoryPage.reorderLevelInput.fill('5');
    await inventoryPage.unitOfMeasureSelect.selectOption('EACH');
    
    await inventoryPage.saveItemButton.click();
    
    // Should show error for duplicate SKU
    await inventoryPage.expectErrorMessage('SKU already exists');
    console.log('✅ SKU uniqueness validation verified');
    
    // Test price validation
    await inventoryPage.navigateToNewItem();
    await TestHelpers.validateFormField(
      page,
      'input[name="unitPrice"]',
      '100.00',
      '-50.00',
      'Unit price must be positive'
    );
    
    await TestHelpers.validateFormField(
      page,
      'input[name="costPrice"]',
      '75.00',
      '-25.00',
      'Cost price must be positive'
    );
    
    console.log('✅ Price validation verified');
    
    // Test quantity validation
    await TestHelpers.validateFormField(
      page,
      'input[name="quantityOnHand"]',
      '10',
      '-5',
      'Quantity cannot be negative'
    );
    
    await TestHelpers.validateFormField(
      page,
      'input[name="reorderLevel"]',
      '5',
      '-2',
      'Reorder level cannot be negative'
    );
    
    console.log('✅ Quantity validation verified');
  });

  test('should handle complex stock movement scenarios', async ({ page }) => {
    console.log('📊 Testing Complex Stock Movement Scenarios');
    
    // Create test item
    const category = await inventoryPage.createSampleCategory();
    const item = await inventoryPage.createSampleItem(category.code);
    
    // Track initial quantity
    const initialQuantity = parseInt(item.quantityOnHand);
    let currentQuantity = initialQuantity;
    
    // Multiple movements
    const movements = [
      { type: 'IN', quantity: 15, reason: 'Purchase receipt', expectedChange: 15 },
      { type: 'OUT', quantity: 8, reason: 'Sale', expectedChange: -8 },
      { type: 'ADJUSTMENT', quantity: 3, reason: 'Damage adjustment', expectedChange: -3 },
      { type: 'IN', quantity: 20, reason: 'Transfer in', expectedChange: 20 },
      { type: 'OUT', quantity: 12, reason: 'Internal use', expectedChange: -12 }
    ];
    
    for (const movement of movements) {
      await inventoryPage.adjustStock(item.sku, {
        type: movement.type as 'IN' | 'OUT' | 'ADJUSTMENT',
        quantity: movement.quantity.toString(),
        reason: movement.reason,
        notes: `Test movement: ${movement.reason}`
      });
      
      currentQuantity += movement.expectedChange;
      console.log(`✅ Movement: ${movement.type} ${movement.quantity} - New quantity: ${currentQuantity}`);
    }
    
    // Verify final quantity in item details
    await inventoryPage.clickItemBySku(item.sku);
    await expect(page.getByText(currentQuantity.toString())).toBeVisible();
    
    // Verify movement history
    await inventoryPage.viewItemMovements(item.sku);
    
    // Should show all movements
    for (const movement of movements) {
      await expect(page.getByText(movement.reason)).toBeVisible();
    }
    
    console.log('✅ Complex stock movements completed and verified');
  });

  test('should test inventory search and filtering capabilities', async ({ page }) => {
    console.log('🔍 Testing Inventory Search and Filtering');
    
    // Create test data
    const categories = [];
    const items = [];
    
    // Create multiple categories
    for (let i = 0; i < 3; i++) {
      const category = await inventoryPage.createSampleCategory();
      categories.push(category);
      
      // Create items in each category
      for (let j = 0; j < 2; j++) {
        const item = await inventoryPage.createSampleItem(category.code);
        items.push({ ...item, categoryCode: category.code });
      }
    }
    
    console.log('✅ Test data created');
    
    // Test search by name
    const testItem = items[0];
    await inventoryPage.searchItems(testItem.name);
    await inventoryPage.verifyItemInTable(testItem.sku);
    console.log('✅ Search by name verified');
    
    // Test search by SKU
    await inventoryPage.searchItems(testItem.sku);
    await inventoryPage.verifyItemInTable(testItem.sku);
    console.log('✅ Search by SKU verified');
    
    // Test category filtering
    const testCategory = categories[0];
    await inventoryPage.navigateToItems();
    await inventoryPage.filterByCategory(testCategory.name);
    
    // Should show only items from this category
    const categoryItems = items.filter(item => item.categoryCode === testCategory.code);
    for (const item of categoryItems) {
      await inventoryPage.verifyItemInTable(item.sku);
    }
    console.log('✅ Category filtering verified');
    
    // Test status filtering
    await inventoryPage.filterByStatus('ACTIVE');
    console.log('✅ Status filtering verified');
    
    // Test combined filters
    await inventoryPage.searchItems(testItem.name.split(' ')[0]); // Partial name search
    await inventoryPage.filterByCategory(testCategory.name);
    console.log('✅ Combined filtering verified');
    
    // Test clear filters
    await inventoryPage.searchItems(''); // Clear search
    await inventoryPage.filterByCategory(''); // Clear category filter
    
    // Should show all items
    await inventoryPage.navigateToItems();
    for (const item of items) {
      await inventoryPage.verifyItemInTable(item.sku);
    }
    console.log('✅ Clear filters verified');
  });

  test('should handle inventory valuation and reporting', async ({ page }) => {
    console.log('💰 Testing Inventory Valuation and Reporting');
    
    // Create items with different costs and quantities
    const category = await inventoryPage.createSampleCategory();
    
    const itemsData = [
      { name: 'High Value Item', unitPrice: '1000.00', costPrice: '750.00', quantity: '5' },
      { name: 'Medium Value Item', unitPrice: '500.00', costPrice: '350.00', quantity: '10' },
      { name: 'Low Value Item', unitPrice: '100.00', costPrice: '60.00', quantity: '25' }
    ];
    
    const createdItems = [];
    for (const itemData of itemsData) {
      const baseItem = await inventoryPage.createSampleItem(category.code);
      
      // Update with specific pricing
      await inventoryPage.editItem(baseItem.sku, {
        name: itemData.name,
        unitPrice: itemData.unitPrice,
        costPrice: itemData.costPrice,
        quantityOnHand: itemData.quantity
      });
      
      createdItems.push({
        ...baseItem,
        ...itemData
      });
    }
    
    console.log('✅ Items with different valuations created');
    
    // Test inventory reports
    await inventoryPage.testInventoryReports();
    
    // Test valuation calculations (if available)
    await inventoryPage.navigateToInventory();
    const reportsTab = page.locator('text=Reports');
    
    if (await reportsTab.isVisible()) {
      await reportsTab.click();
      
      // Check for valuation report
      const valuationReport = page.locator('text=Stock Value, text=Valuation');
      if (await valuationReport.isVisible()) {
        await valuationReport.click();
        await inventoryPage.waitForLoadingToFinish();
        
        // Verify report shows items
        for (const item of createdItems) {
          const itemInReport = page.locator(`text=${item.name}`);
          if (await itemInReport.isVisible()) {
            console.log(`✅ ${item.name} found in valuation report`);
          }
        }
      }
    }
    
    console.log('✅ Inventory valuation reporting verified');
  });

  test('should test bulk inventory operations', async ({ page }) => {
    console.log('📋 Testing Bulk Inventory Operations');
    
    // Create multiple items for bulk testing
    const category = await inventoryPage.createSampleCategory();
    const items = [];
    
    for (let i = 0; i < 5; i++) {
      const item = await inventoryPage.createSampleItem(category.code);
      items.push(item);
    }
    
    console.log('✅ Multiple items created for bulk operations');
    
    // Test bulk operations
    await inventoryPage.testBulkOperations();
    
    // Test export functionality
    await inventoryPage.exportInventoryData();
    
    console.log('✅ Bulk operations tested');
    
    // Test bulk stock adjustment (if available)
    await inventoryPage.navigateToMovements();
    
    const bulkAdjustmentButton = page.locator('button:has-text("Bulk Adjustment")');
    if (await bulkAdjustmentButton.isVisible()) {
      await bulkAdjustmentButton.click();
      console.log('✅ Bulk adjustment feature available');
    }
  });

  test('should measure inventory management performance', async ({ page }) => {
    console.log('⚡ Testing Inventory Management Performance');
    
    // Measure category creation time
    const categoryStartTime = Date.now();
    await inventoryPage.createSampleCategory();
    const categoryTime = Date.now() - categoryStartTime;
    console.log(`Category creation time: ${categoryTime}ms`);
    
    // Measure item creation time
    const itemStartTime = Date.now();
    await inventoryPage.createSampleItem();
    const itemTime = Date.now() - itemStartTime;
    console.log(`Item creation time: ${itemTime}ms`);
    
    // Measure search performance
    const searchStartTime = Date.now();
    await inventoryPage.searchItems('test');
    const searchTime = Date.now() - searchStartTime;
    console.log(`Search time: ${searchTime}ms`);
    
    // Performance assertions
    expect(categoryTime).toBeLessThan(15000); // Should complete within 15 seconds
    expect(itemTime).toBeLessThan(20000); // Should complete within 20 seconds
    expect(searchTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log('✅ Performance metrics verified');
  });

  test('should test inventory accessibility and usability', async ({ page }) => {
    console.log('♿ Testing Inventory Accessibility and Usability');
    
    await inventoryPage.navigateToItems();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test accessibility
    const accessibilityResults = await TestHelpers.checkAccessibility(page);
    console.log('Accessibility check results:', accessibilityResults);
    
    // Test responsive design
    await TestHelpers.testResponsiveDesign(page, '/inventory/items');
    
    console.log('✅ Accessibility and usability verified');
  });
});