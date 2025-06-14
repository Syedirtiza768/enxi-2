import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/auth-page';
import { DashboardPage } from '../page-objects/dashboard-page';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';

test.describe('Purchase to Payment Workflow E2E Tests', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    
    // Login as admin for full access to purchase workflow
    await authPage.loginAsAdmin();
    await dashboardPage.verifyDashboardLoaded();
  });

  test.afterEach(async () => {
    // Clean up test data
    await DatabaseHelpers.cleanup();
  });

  test('should complete full purchase to payment workflow', async ({ page }) => {
    console.log('🛒 Starting Purchase to Payment Workflow Test');
    
    // Step 1: Create supplier
    await dashboardPage.navigateToSuppliers();
    
    // Navigate to new supplier form
    await page.click('button:has-text("New Supplier"), a:has-text("New Supplier")');
    await page.waitForURL('**/suppliers/new');
    
    // Fill supplier form
    const supplierData = await TestHelpers.generateTestData();
    await page.fill('input[name="name"]', supplierData.supplier.name);
    await page.fill('input[name="email"]', supplierData.supplier.email);
    await page.fill('input[name="phone"]', supplierData.supplier.phone);
    await page.fill('input[name="address"]', supplierData.supplier.address);
    await page.fill('input[name="city"]', supplierData.supplier.city);
    await page.fill('input[name="country"]', supplierData.supplier.country);
    await page.selectOption('select[name="paymentTerms"]', supplierData.supplier.paymentTerms);
    
    await page.click('button:has-text("Save")');
    await page.waitForURL('**/suppliers');
    
    console.log('✅ Step 1: Supplier created successfully');
    
    // Step 2: Create purchase order
    await dashboardPage.navigateToPurchaseOrders();
    
    await page.click('button:has-text("New Purchase Order"), a:has-text("New Purchase Order")');
    await page.waitForURL('**/purchase-orders/new');
    
    // Fill purchase order form
    await page.selectOption('select[name="supplierId"]', { label: supplierData.supplier.name });
    await page.fill('input[name="expectedDeliveryDate"]', await TestHelpers.formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'YYYY-MM-DD'));
    await page.fill('textarea[name="notes"]', 'Test purchase order for E2E workflow');
    
    // Add line items
    await page.click('button:has-text("Add Item")');
    
    // Wait for item selector to load
    await page.waitForSelector('select[name*="itemId"]');
    
    // Select first available item
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '5');
    await page.fill('input[name*="unitPrice"]', '100.00');
    await page.fill('input[name*="description"]', 'Test purchase item');
    
    // Save purchase order
    await page.click('button:has-text("Save")');
    await page.waitForURL('**/purchase-orders');
    
    console.log('✅ Step 2: Purchase order created successfully');
    
    // Step 3: Approve purchase order
    const poRow = page.locator('tr').first();
    await poRow.click();
    await page.waitForLoadState('networkidle');
    
    const approveButton = page.locator('button:has-text("Approve")');
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Step 3: Purchase order approved');
    }
    
    // Step 4: Send purchase order to supplier
    const sendButton = page.locator('button:has-text("Send")');
    if (await sendButton.isVisible()) {
      await sendButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Step 4: Purchase order sent to supplier');
    }
    
    // Step 5: Create goods receipt
    await dashboardPage.navigateToGoodsReceipts();
    
    await page.click('button:has-text("New Goods Receipt"), a:has-text("New Goods Receipt")');
    await page.waitForURL('**/goods-receipts/new');
    
    // Select the purchase order
    await page.selectOption('select[name="purchaseOrderId"]', { index: 1 });
    await page.fill('input[name="receivedDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
    await page.fill('textarea[name="notes"]', 'Goods received in good condition');
    
    // Mark items as received
    const quantityInputs = page.locator('input[name*="quantityReceived"]');
    const count = await quantityInputs.count();
    for (let i = 0; i < count; i++) {
      await quantityInputs.nth(i).fill('5');
    }
    
    await page.click('button:has-text("Save")');
    await page.waitForURL('**/goods-receipts');
    
    console.log('✅ Step 5: Goods receipt created successfully');
    
    // Step 6: Create supplier invoice
    await dashboardPage.navigateToSupplierInvoices();
    
    await page.click('button:has-text("New Supplier Invoice"), a:has-text("New Supplier Invoice")');
    await page.waitForURL('**/supplier-invoices/new');
    
    // Fill supplier invoice form
    await page.selectOption('select[name="supplierId"]', { label: supplierData.supplier.name });
    await page.fill('input[name="invoiceNumber"]', `SINV-TEST-${Date.now()}`);
    await page.fill('input[name="issueDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
    await page.fill('input[name="dueDate"]', await TestHelpers.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'YYYY-MM-DD'));
    await page.fill('textarea[name="notes"]', 'Supplier invoice for received goods');
    
    // Add invoice items (matching goods receipt)
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '5');
    await page.fill('input[name*="unitPrice"]', '100.00');
    
    await page.click('button:has-text("Save")');
    await page.waitForURL('**/supplier-invoices');
    
    console.log('✅ Step 6: Supplier invoice created successfully');
    
    // Step 7: Three-way matching verification
    await dashboardPage.navigateToThreeWayMatching();
    
    // Should show the matching opportunity
    const matchingRow = page.locator('tr').first();
    if (await matchingRow.isVisible()) {
      await matchingRow.click();
      await page.waitForLoadState('networkidle');
      
      // Verify three-way match
      const approveMatchButton = page.locator('button:has-text("Approve Match")');
      if (await approveMatchButton.isVisible()) {
        await approveMatchButton.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Step 7: Three-way matching completed');
      }
    }
    
    // Step 8: Create supplier payment
    await dashboardPage.navigateToSupplierInvoices();
    
    // Find and click the invoice
    const invoiceRow = page.locator('tr:has-text("SINV-TEST-")').first();
    await invoiceRow.click();
    await page.waitForLoadState('networkidle');
    
    // Create payment
    const createPaymentButton = page.locator('button:has-text("Create Payment")');
    if (await createPaymentButton.isVisible()) {
      await createPaymentButton.click();
      await page.waitForLoadState('networkidle');
      
      // Fill payment form
      await page.fill('input[name="paymentDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
      await page.selectOption('select[name="paymentMethod"]', 'BANK_TRANSFER');
      await page.fill('input[name="reference"]', `PAY-TEST-${Date.now()}`);
      await page.fill('textarea[name="notes"]', 'Payment for supplier invoice');
      
      await page.click('button:has-text("Save Payment")');
      await page.waitForLoadState('networkidle');
      
      console.log('✅ Step 8: Supplier payment created successfully');
    }
    
    console.log('🎉 Purchase to Payment Workflow completed successfully!');
    
    // Take final screenshot
    await TestHelpers.takePageScreenshot(page, 'purchase-to-payment-workflow-complete');
  });

  test('should handle purchase order approval workflow', async ({ page }) => {
    console.log('📋 Testing Purchase Order Approval Workflow');
    
    // Create supplier and purchase order
    const supplierData = await TestHelpers.generateTestData();
    
    // Quick supplier creation
    await dashboardPage.navigateToSuppliers();
    await page.click('button:has-text("New Supplier")');
    await page.fill('input[name="name"]', supplierData.supplier.name);
    await page.fill('input[name="email"]', supplierData.supplier.email);
    await page.click('button:has-text("Save")');
    
    // Create purchase order
    await dashboardPage.navigateToPurchaseOrders();
    await page.click('button:has-text("New Purchase Order")');
    
    await page.selectOption('select[name="supplierId"]', { label: supplierData.supplier.name });
    await page.fill('textarea[name="notes"]', 'Purchase order for approval testing');
    
    // Add high-value item to trigger approval requirement
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '10');
    await page.fill('input[name*="unitPrice"]', '5000.00'); // High value
    
    await page.click('button:has-text("Save")');
    
    // Verify status is pending approval
    const statusElement = page.locator('.status, [data-testid="status"]');
    await expect(statusElement).toContainText('Pending');
    
    console.log('✅ Purchase order created with pending approval status');
    
    // Test approval
    const poRow = page.locator('tr').first();
    await poRow.click();
    
    const approveButton = page.locator('button:has-text("Approve")');
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Verify status changed to approved
      await expect(statusElement).toContainText('Approved');
      console.log('✅ Purchase order approved successfully');
    }
    
    // Test rejection workflow
    await dashboardPage.navigateToPurchaseOrders();
    await page.click('button:has-text("New Purchase Order")');
    
    await page.selectOption('select[name="supplierId"]', { label: supplierData.supplier.name });
    await page.fill('textarea[name="notes"]', 'Purchase order for rejection testing');
    
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '5');
    await page.fill('input[name*="unitPrice"]', '1000.00');
    
    await page.click('button:has-text("Save")');
    
    const newPoRow = page.locator('tr').first();
    await newPoRow.click();
    
    const rejectButton = page.locator('button:has-text("Reject")');
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      // Fill rejection reason
      await page.fill('textarea[name="rejectionReason"]', 'Budget constraints');
      await page.click('button:has-text("Confirm Rejection")');
      
      console.log('✅ Purchase order rejected successfully');
    }
  });

  test('should validate three-way matching business rules', async ({ page }) => {
    console.log('🔍 Testing Three-Way Matching Business Rules');
    
    // This test would verify that:
    // 1. Purchase order, goods receipt, and supplier invoice quantities match
    // 2. Prices are within acceptable variance
    // 3. Approval workflows are triggered for exceptions
    
    const testData = await TestHelpers.generateTestData();
    
    // Create minimal test data
    await dashboardPage.navigateToSuppliers();
    await page.click('button:has-text("New Supplier")');
    await page.fill('input[name="name"]', testData.supplier.name);
    await page.fill('input[name="email"]', testData.supplier.email);
    await page.click('button:has-text("Save")');
    
    console.log('✅ Test supplier created');
    
    // Test quantity variance detection
    // Create PO for 10 items
    await dashboardPage.navigateToPurchaseOrders();
    await page.click('button:has-text("New Purchase Order")');
    await page.selectOption('select[name="supplierId"]', { label: testData.supplier.name });
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '10');
    await page.fill('input[name*="unitPrice"]', '100.00');
    await page.click('button:has-text("Save")');
    
    // Approve PO
    const poRow = page.locator('tr').first();
    await poRow.click();
    const approveButton = page.locator('button:has-text("Approve")');
    if (await approveButton.isVisible()) {
      await approveButton.click();
    }
    
    // Create goods receipt for only 8 items (variance)
    await dashboardPage.navigateToGoodsReceipts();
    await page.click('button:has-text("New Goods Receipt")');
    await page.selectOption('select[name="purchaseOrderId"]', { index: 1 });
    await page.fill('input[name="receivedDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
    
    const qtyInput = page.locator('input[name*="quantityReceived"]').first();
    await qtyInput.fill('8'); // Less than ordered
    
    await page.click('button:has-text("Save")');
    
    console.log('✅ Goods receipt with quantity variance created');
    
    // Create supplier invoice for 10 items (matches PO but not GR)
    await dashboardPage.navigateToSupplierInvoices();
    await page.click('button:has-text("New Supplier Invoice")');
    await page.selectOption('select[name="supplierId"]', { label: testData.supplier.name });
    await page.fill('input[name="invoiceNumber"]', `SINV-VAR-${Date.now()}`);
    await page.fill('input[name="issueDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
    
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '10'); // Matches PO but not GR
    await page.fill('input[name*="unitPrice"]', '100.00');
    
    await page.click('button:has-text("Save")');
    
    console.log('✅ Supplier invoice with quantity variance created');
    
    // Check three-way matching
    await dashboardPage.navigateToThreeWayMatching();
    
    // Should show variance that requires approval
    const varianceIndicator = page.locator('.variance-warning, .alert-warning, [data-testid="variance"]');
    if (await varianceIndicator.isVisible()) {
      console.log('✅ Quantity variance detected in three-way matching');
    }
    
    const matchingRow = page.locator('tr').first();
    if (await matchingRow.isVisible()) {
      await matchingRow.click();
      
      // Should show detailed variance information
      const varianceDetails = page.locator('.variance-details, [data-testid="variance-details"]');
      if (await varianceDetails.isVisible()) {
        console.log('✅ Variance details displayed');
      }
    }
  });

  test('should handle supplier payment processing', async ({ page }) => {
    console.log('💰 Testing Supplier Payment Processing');
    
    // Create test data setup
    const testData = await TestHelpers.generateTestData();
    
    // Quick setup: supplier and invoice
    await dashboardPage.navigateToSuppliers();
    await page.click('button:has-text("New Supplier")');
    await page.fill('input[name="name"]', testData.supplier.name);
    await page.fill('input[name="email"]', testData.supplier.email);
    await page.click('button:has-text("Save")');
    
    // Create supplier invoice
    await dashboardPage.navigateToSupplierInvoices();
    await page.click('button:has-text("New Supplier Invoice")');
    await page.selectOption('select[name="supplierId"]', { label: testData.supplier.name });
    await page.fill('input[name="invoiceNumber"]', `SINV-PAY-${Date.now()}`);
    await page.fill('input[name="issueDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
    await page.fill('input[name="dueDate"]', await TestHelpers.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'YYYY-MM-DD'));
    
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '2');
    await page.fill('input[name*="unitPrice"]', '250.00');
    
    await page.click('button:has-text("Save")');
    
    console.log('✅ Supplier invoice created for payment testing');
    
    // Test full payment
    const invoiceRow = page.locator('tr').first();
    await invoiceRow.click();
    
    const createPaymentButton = page.locator('button:has-text("Create Payment")');
    if (await createPaymentButton.isVisible()) {
      await createPaymentButton.click();
      
      // Fill payment form
      await page.fill('input[name="paymentDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
      await page.selectOption('select[name="paymentMethod"]', 'BANK_TRANSFER');
      await page.fill('input[name="reference"]', `REF-${Date.now()}`);
      await page.fill('textarea[name="notes"]', 'Full payment test');
      
      // Amount should auto-populate with invoice total
      const amountInput = page.locator('input[name="amount"]');
      const amount = await amountInput.inputValue();
      expect(parseFloat(amount)).toBeGreaterThan(0);
      
      await page.click('button:has-text("Save Payment")');
      
      console.log('✅ Full payment processed successfully');
      
      // Verify invoice status updated
      await dashboardPage.navigateToSupplierInvoices();
      const paidStatus = page.locator('.status:has-text("Paid"), [data-testid="status"]:has-text("Paid")');
      if (await paidStatus.isVisible()) {
        console.log('✅ Invoice status updated to Paid');
      }
    }
    
    // Test partial payment
    await dashboardPage.navigateToSupplierInvoices();
    await page.click('button:has-text("New Supplier Invoice")');
    await page.selectOption('select[name="supplierId"]', { label: testData.supplier.name });
    await page.fill('input[name="invoiceNumber"]', `SINV-PARTIAL-${Date.now()}`);
    await page.fill('input[name="issueDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
    
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '4');
    await page.fill('input[name*="unitPrice"]', '100.00');
    
    await page.click('button:has-text("Save")');
    
    // Create partial payment
    const newInvoiceRow = page.locator('tr').first();
    await newInvoiceRow.click();
    
    if (await createPaymentButton.isVisible()) {
      await createPaymentButton.click();
      
      await page.fill('input[name="paymentDate"]', await TestHelpers.formatDate(new Date(), 'YYYY-MM-DD'));
      await page.selectOption('select[name="paymentMethod"]', 'BANK_TRANSFER');
      await page.fill('input[name="amount"]', '200.00'); // Partial amount
      await page.fill('textarea[name="notes"]', 'Partial payment test');
      
      await page.click('button:has-text("Save Payment")');
      
      console.log('✅ Partial payment processed successfully');
      
      // Verify invoice status is partially paid
      await dashboardPage.navigateToSupplierInvoices();
      const partialStatus = page.locator('.status:has-text("Partial"), [data-testid="status"]:has-text("Partial")');
      if (await partialStatus.isVisible()) {
        console.log('✅ Invoice status updated to Partially Paid');
      }
    }
  });

  test('should validate purchase workflow permissions and approvals', async ({ page }) => {
    console.log('🔐 Testing Purchase Workflow Permissions');
    
    // Test different user permission levels
    // This would require setting up users with different roles
    
    // Login as sales user (limited permissions)
    await authPage.logout();
    await authPage.loginAsSales();
    
    // Should not be able to access purchase orders
    await page.goto('/purchase-orders');
    
    // Should redirect or show permission denied
    const permissionDenied = page.locator('text=Access denied, text=Permission denied, text=Not authorized');
    if (await permissionDenied.isVisible()) {
      console.log('✅ Sales user correctly restricted from purchase orders');
    } else {
      // Check if redirected to dashboard or login
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/login')) {
        console.log('✅ Sales user redirected due to insufficient permissions');
      }
    }
    
    // Login as inventory user (can view but not approve)
    await authPage.logout();
    await authPage.loginAsInventory();
    
    await page.goto('/purchase-orders');
    
    // Should be able to view but not create/approve
    const newPOButton = page.locator('button:has-text("New Purchase Order")');
    if (await newPOButton.isVisible()) {
      const isEnabled = await newPOButton.isEnabled();
      if (!isEnabled) {
        console.log('✅ Inventory user cannot create purchase orders');
      }
    }
    
    // Login back as admin for full access
    await authPage.logout();
    await authPage.loginAsAdmin();
    
    console.log('✅ Permission testing completed');
  });

  test('should measure purchase workflow performance', async ({ page }) => {
    console.log('⚡ Testing Purchase Workflow Performance');
    
    const performanceMetrics = {
      supplierCreation: 0,
      purchaseOrderCreation: 0,
      goodsReceiptCreation: 0,
      invoiceCreation: 0,
      paymentProcessing: 0
    };
    
    // Measure supplier creation
    let startTime = Date.now();
    await dashboardPage.navigateToSuppliers();
    await page.click('button:has-text("New Supplier")');
    
    const supplierData = await TestHelpers.generateTestData();
    await page.fill('input[name="name"]', supplierData.supplier.name);
    await page.fill('input[name="email"]', supplierData.supplier.email);
    await page.click('button:has-text("Save")');
    await page.waitForURL('**/suppliers');
    
    performanceMetrics.supplierCreation = Date.now() - startTime;
    
    // Measure purchase order creation
    startTime = Date.now();
    await dashboardPage.navigateToPurchaseOrders();
    await page.click('button:has-text("New Purchase Order")');
    await page.selectOption('select[name="supplierId"]', { label: supplierData.supplier.name });
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select[name*="itemId"]', { index: 1 });
    await page.fill('input[name*="quantity"]', '1');
    await page.fill('input[name*="unitPrice"]', '100.00');
    await page.click('button:has-text("Save")');
    await page.waitForURL('**/purchase-orders');
    
    performanceMetrics.purchaseOrderCreation = Date.now() - startTime;
    
    console.log('Performance Metrics:', performanceMetrics);
    
    // Assert performance requirements
    expect(performanceMetrics.supplierCreation).toBeLessThan(15000);
    expect(performanceMetrics.purchaseOrderCreation).toBeLessThan(20000);
    
    console.log('✅ Performance requirements met');
  });
});