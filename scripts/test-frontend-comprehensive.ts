import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
}

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  duration?: number;
}

class FrontendTestSuite {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private baseUrl: string;
  private testUser: TestUser;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testUser = {
      email: 'test.admin@enxi.com',
      password: 'Test123!@#',
      name: 'Test Admin',
      role: 'ADMIN'
    };
  }

  async setup(): Promise<void> {
    console.log('🚀 Setting up test environment...');
    
    // Create test user
    await this.createTestUser();
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 100 // Slow down for visibility
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    this.page = await this.context.newPage();
    
    // Login
    await this.login();
  }

  async teardown(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    
    // Clean up test data
    await this.cleanupTestData();
    
    // Display results
    this.displayResults();
  }

  private async createTestUser() {
    try {
      const hashedPassword = await bcrypt.hash(this.testUser.password, 10);
      
      await prisma.user.upsert({
        where: { email: this.testUser.email },
        update: {},
        create: {
          email: this.testUser.email,
          password: hashedPassword,
          name: this.testUser.name,
          role: this.testUser.role,
          isActive: true
        }
      });
      
      console.log('✅ Test user created');
    } catch (error) {
      console.error('❌ Failed to create test user:', error);
      throw error;
    }
  }

  private async login() {
    try {
      await this.page!.goto(`${this.baseUrl}/login`);
      
      // Fill login form
      await this.page!.fill('input[name="email"]', this.testUser.email);
      await this.page!.fill('input[name="password"]', this.testUser.password);
      
      // Submit form
      await this.page!.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page!.waitForURL('**/dashboard', { timeout: 10000 });
      
      console.log('✅ Successfully logged in');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  private async runTest(testName: string, testFn: () => Promise<void>) {
    const startTime = Date.now();
    try {
      await testFn();
      this.results.push({
        test: testName,
        status: 'PASS',
        duration: Date.now() - startTime
      });
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.error(`❌ ${testName}: ${error}`);
    }
  }

  // Test 1: Customer Creation Form
  async testCustomerCreation(): Promise<void> {
    await this.runTest('Customer Creation Form', async () => {
      await this.page!.goto(`${this.baseUrl}/customers`);
      await this.page!.click('text="New Customer"');
      
      // Fill form with all fields
      await this.page!.fill('input[name="name"]', 'Test Customer Ltd');
      await this.page!.fill('input[name="code"]', 'CUST-TEST-001');
      await this.page!.fill('input[name="email"]', 'test@customer.com');
      await this.page!.fill('input[name="phone"]', '+971501234567');
      await this.page!.fill('textarea[name="address"]', '123 Test Street, Dubai, UAE');
      await this.page!.fill('input[name="creditLimit"]', '100000');
      await this.page!.fill('input[name="vatNumber"]', 'VAT123456789');
      
      // Test validation - empty required field
      await this.page!.fill('input[name="name"]', '');
      await this.page!.click('button[type="submit"]');
      
      // Check for validation error
      await this.page!.waitForSelector('text="Name is required"', { timeout: 5000 });
      
      // Fix validation error
      await this.page!.fill('input[name="name"]', 'Test Customer Ltd');
      
      // Submit form
      await this.page!.click('button[type="submit"]');
      
      // Wait for success message
      await this.page!.waitForSelector('text="Customer created successfully"', { timeout: 10000 });
      
      // Verify redirect to customer list
      await this.page!.waitForURL('**/customers', { timeout: 5000 });
      
      // Verify customer appears in list
      await this.page!.waitForSelector('text="Test Customer Ltd"', { timeout: 5000 });
    });
  }

  // Test 2: Sales Case Creation
  async testSalesCaseCreation(): Promise<void> {
    await this.runTest('Sales Case Creation', async () => {
      await this.page!.goto(`${this.baseUrl}/sales-cases`);
      await this.page!.click('text="New Sales Case"');
      
      // Fill form
      await this.page!.fill('input[name="title"]', 'Test Marine Engine Service');
      await this.page!.fill('input[name="refNumber"]', 'SC-TEST-001');
      
      // Select customer (assuming dropdown)
      await this.page!.click('select[name="customerId"]');
      await this.page!.selectOption('select[name="customerId"]', { index: 1 });
      
      await this.page!.fill('textarea[name="description"]', 'Test sales case for marine engine service');
      await this.page!.fill('input[name="estimatedValue"]', '50000');
      
      // Submit form
      await this.page!.click('button[type="submit"]');
      
      // Wait for success and redirect
      await this.page!.waitForSelector('text="Sales case created successfully"', { timeout: 10000 });
      
      // Verify in list
      await this.page!.goto(`${this.baseUrl}/sales-cases`);
      await this.page!.waitForSelector('text="Test Marine Engine Service"', { timeout: 5000 });
    });
  }

  // Test 3: Quotation Creation with Line Items
  async testQuotationCreation(): Promise<void> {
    await this.runTest('Quotation Creation with Line Items', async () => {
      await this.page!.goto(`${this.baseUrl}/quotations/new`);
      
      // Select sales case
      await this.page!.click('select[name="salesCaseId"]');
      await this.page!.selectOption('select[name="salesCaseId"]', { index: 1 });
      
      // Fill quotation details
      await this.page!.fill('input[name="validityDays"]', '30');
      await this.page!.fill('textarea[name="terms"]', 'Payment terms: 30 days net');
      
      // Add line item
      await this.page!.click('text="Add Item"');
      
      // Fill line item details
      await this.page!.fill('input[name="items[0].description"]', 'Marine Engine Service');
      await this.page!.fill('input[name="items[0].quantity"]', '1');
      await this.page!.fill('input[name="items[0].unitPrice"]', '45000');
      
      // Add another item
      await this.page!.click('text="Add Item"');
      await this.page!.fill('input[name="items[1].description"]', 'Spare Parts');
      await this.page!.fill('input[name="items[1].quantity"]', '5');
      await this.page!.fill('input[name="items[1].unitPrice"]', '1000');
      
      // Verify total calculation
      await this.page!.waitForSelector('text="50,000.00"', { timeout: 5000 });
      
      // Submit quotation
      await this.page!.click('button[text="Create Quotation"]');
      
      // Wait for success
      await this.page!.waitForSelector('text="Quotation created successfully"', { timeout: 10000 });
    });
  }

  // Test 4: Quotation PDF Generation
  async testQuotationPDF(): Promise<void> {
    await this.runTest('Quotation PDF Generation', async () => {
      await this.page!.goto(`${this.baseUrl}/quotations`);
      
      // Click on first quotation
      await this.page!.click('tbody tr:first-child');
      
      // Wait for detail page
      await this.page!.waitForSelector('text="Quotation Details"', { timeout: 5000 });
      
      // Click PDF button
      const [download] = await Promise.all([
        this.page!.waitForEvent('download'),
        this.page!.click('button:has-text("Download PDF")')
      ]);
      
      // Verify download
      const fileName = download.suggestedFilename();
      if (!fileName.includes('quotation') || !fileName.endsWith('.pdf')) {
        throw new Error('Invalid PDF filename');
      }
    });
  }

  // Test 5: Customer PO Recording
  async testCustomerPORecording(): Promise<void> {
    await this.runTest('Customer PO Recording', async () => {
      await this.page!.goto(`${this.baseUrl}/customer-pos/new`);
      
      // Select customer
      await this.page!.click('select[name="customerId"]');
      await this.page!.selectOption('select[name="customerId"]', { index: 1 });
      
      // Fill PO details
      await this.page!.fill('input[name="poNumber"]', 'PO-2024-TEST-001');
      await this.page!.fill('input[name="poDate"]', '2024-11-06');
      await this.page!.fill('input[name="amount"]', '50000');
      await this.page!.fill('textarea[name="description"]', 'Customer PO for marine engine service');
      
      // Upload file (mock)
      // await this.page!.setInputFiles('input[type="file"]', './test-po.pdf');
      
      // Submit
      await this.page!.click('button[type="submit"]');
      
      // Wait for success
      await this.page!.waitForSelector('text="Customer PO recorded successfully"', { timeout: 10000 });
    });
  }

  // Test 6: Sales Order Workflow
  async testSalesOrderWorkflow(): Promise<void> {
    await this.runTest('Sales Order Workflow', async () => {
      await this.page!.goto(`${this.baseUrl}/sales-orders`);
      
      // Find draft order and click
      await this.page!.click('tr:has-text("Draft")');
      
      // Wait for detail page
      await this.page!.waitForSelector('text="Sales Order Details"', { timeout: 5000 });
      
      // Test workflow status
      const statusBadge = await this.page!.locator('.badge:has-text("Draft")');
      await statusBadge.waitFor({ timeout: 5000 });
      
      // Approve order
      await this.page!.click('button:has-text("Approve Order")');
      
      // Confirm action
      await this.page!.click('button:has-text("Confirm")');
      
      // Wait for status update
      await this.page!.waitForSelector('.badge:has-text("Confirmed")', { timeout: 10000 });
    });
  }

  // Test 7: Invoice Creation
  async testInvoiceCreation(): Promise<void> {
    await this.runTest('Invoice Creation', async () => {
      await this.page!.goto(`${this.baseUrl}/invoices/new`);
      
      // Select sales order
      await this.page!.click('select[name="salesOrderId"]');
      await this.page!.selectOption('select[name="salesOrderId"]', { index: 1 });
      
      // Fill invoice details
      await this.page!.fill('input[name="invoiceDate"]', '2024-11-06');
      await this.page!.fill('input[name="dueDate"]', '2024-12-06');
      
      // Verify line items are populated from order
      await this.page!.waitForSelector('input[name="items[0].description"]', { timeout: 5000 });
      
      // Submit invoice
      await this.page!.click('button:has-text("Create Invoice")');
      
      // Wait for success
      await this.page!.waitForSelector('text="Invoice created successfully"', { timeout: 10000 });
    });
  }

  // Test 8: Payment Recording
  async testPaymentRecording(): Promise<void> {
    await this.runTest('Payment Recording', async () => {
      await this.page!.goto(`${this.baseUrl}/payments`);
      await this.page!.click('text="Record Payment"');
      
      // Select customer
      await this.page!.click('select[name="customerId"]');
      await this.page!.selectOption('select[name="customerId"]', { index: 1 });
      
      // Fill payment details
      await this.page!.fill('input[name="amount"]', '25000');
      await this.page!.fill('input[name="paymentDate"]', '2024-11-06');
      await this.page!.selectOption('select[name="paymentMethod"]', 'Bank Transfer');
      await this.page!.fill('input[name="reference"]', 'TRF-2024-001');
      
      // Select invoice to apply payment
      await this.page!.check('input[type="checkbox"]:first-of-type');
      
      // Submit payment
      await this.page!.click('button:has-text("Record Payment")');
      
      // Wait for success
      await this.page!.waitForSelector('text="Payment recorded successfully"', { timeout: 10000 });
    });
  }

  // Test 9: List Views and Filters
  async testListViewsAndFilters(): Promise<{ data: Promise<void>[], total: number }> {
    await this.runTest('List Views and Filters', async () => {
      // Test customer list
      await this.page!.goto(`${this.baseUrl}/customers`);
      
      // Test search
      await this.page!.fill('input[placeholder*="Search"]', 'Test Customer');
      await this.page!.waitForSelector('text="Test Customer Ltd"', { timeout: 5000 });
      
      // Clear search
      await this.page!.fill('input[placeholder*="Search"]', '');
      
      // Test pagination (if available)
      const paginationExists = await this.page!.locator('.pagination').count() > 0;
      if (paginationExists) {
        await this.page!.click('button:has-text("Next")');
        await this.page!.waitForTimeout(1000);
        await this.page!.click('button:has-text("Previous")');
      }
      
      // Test quotation list filters
      await this.page!.goto(`${this.baseUrl}/quotations`);
      
      // Test status filter
      await this.page!.selectOption('select[name="status"]', 'Draft');
      await this.page!.waitForTimeout(1000);
      
      // Test date range filter
      await this.page!.fill('input[name="dateFrom"]', '2024-11-01');
      await this.page!.fill('input[name="dateTo"]', '2024-11-30');
      await this.page!.waitForTimeout(1000);
    });
  }

  // Test 10: Navigation and Permissions
  async testNavigationAndPermissions(): Promise<void> {
    await this.runTest('Navigation and Permissions', async () => {
      // Test main navigation
      const navItems = [
        { text: 'Dashboard', url: '/dashboard' },
        { text: 'Customers', url: '/customers' },
        { text: 'Sales Cases', url: '/sales-cases' },
        { text: 'Quotations', url: '/quotations' },
        { text: 'Sales Orders', url: '/sales-orders' },
        { text: 'Invoices', url: '/invoices' },
        { text: 'Payments', url: '/payments' }
      ];
      
      for (const item of navItems) {
        await this.page!.click(`nav >> text="${item.text}"`);
        await this.page!.waitForURL(`**${item.url}`, { timeout: 5000 });
      }
      
      // Test user menu
      await this.page!.click('[data-testid="user-menu"]');
      await this.page!.waitForSelector('text="Profile"', { timeout: 5000 });
      await this.page!.waitForSelector('text="Logout"', { timeout: 5000 });
      
      // Close menu
      await this.page!.click('body');
    });
  }

  // Additional Tests

  async testFormValidation(): Promise<void> {
    await this.runTest('Form Validation', async () => {
      await this.page!.goto(`${this.baseUrl}/customers`);
      await this.page!.click('text="New Customer"');
      
      // Test required fields
      await this.page!.click('button[type="submit"]');
      
      // Check for multiple validation errors
      await this.page!.waitForSelector('text="Name is required"', { timeout: 5000 });
      await this.page!.waitForSelector('text="Code is required"', { timeout: 5000 });
      
      // Test email validation
      await this.page!.fill('input[name="email"]', 'invalid-email');
      await this.page!.click('button[type="submit"]');
      await this.page!.waitForSelector('text="Invalid email address"', { timeout: 5000 });
      
      // Test numeric validation
      await this.page!.fill('input[name="creditLimit"]', 'abc');
      await this.page!.click('button[type="submit"]');
      await this.page!.waitForSelector('text="Must be a valid number"', { timeout: 5000 });
    });
  }

  async testUIResponsiveness(): Promise<void> {
    await this.runTest('UI Responsiveness', async () => {
      // Test mobile viewport
      await this.page!.setViewportSize({ width: 375, height: 812 });
      await this.page!.goto(`${this.baseUrl}/dashboard`);
      
      // Check mobile menu
      await this.page!.click('[data-testid="mobile-menu-toggle"]');
      await this.page!.waitForSelector('nav[data-mobile="true"]', { timeout: 5000 });
      
      // Test tablet viewport
      await this.page!.setViewportSize({ width: 768, height: 1024 });
      await this.page!.reload();
      
      // Test desktop viewport
      await this.page!.setViewportSize({ width: 1920, height: 1080 });
      await this.page!.reload();
    });
  }

  async testErrorHandling(): Promise<void> {
    await this.runTest('Error Handling', async () => {
      // Test 404 page
      await this.page!.goto(`${this.baseUrl}/non-existent-page`);
      await this.page!.waitForSelector('text="Page not found"', { timeout: 5000 });
      
      // Test API error handling
      await this.page!.goto(`${this.baseUrl}/customers`);
      
      // Intercept API call to simulate error
      await this.page!.route('**/api/customers', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await this.page!.reload();
      await this.page!.waitForSelector('text="Failed to load customers"', { timeout: 5000 });
    });
  }

  async testDataPersistence(): Promise<void> {
    await this.runTest('Data Persistence', async () => {
      // Create a customer
      await this.page!.goto(`${this.baseUrl}/customers`);
      await this.page!.click('text="New Customer"');
      
      const customerName = `Test Customer ${Date.now()}`;
      await this.page!.fill('input[name="name"]', customerName);
      await this.page!.fill('input[name="code"]', `CUST-${Date.now()}`);
      await this.page!.fill('input[name="email"]', `test${Date.now()}@example.com`);
      
      await this.page!.click('button[type="submit"]');
      await this.page!.waitForSelector('text="Customer created successfully"', { timeout: 10000 });
      
      // Reload page and verify data persists
      await this.page!.reload();
      await this.page!.waitForSelector(`text="${customerName}"`, { timeout: 5000 });
      
      // Navigate away and back
      await this.page!.goto(`${this.baseUrl}/dashboard`);
      await this.page!.goto(`${this.baseUrl}/customers`);
      await this.page!.waitForSelector(`text="${customerName}"`, { timeout: 5000 });
    });
  }

  private async cleanupTestData() {
    try {
      // Delete test user
      await prisma.user.deleteMany({
        where: { email: this.testUser.email }
      });
      
      // Delete test customers
      await prisma.customer.deleteMany({
        where: { 
          OR: [
            { name: { contains: 'Test Customer' } },
            { code: { contains: 'CUST-TEST' } }
          ]
        }
      });
      
      // Delete test sales cases
      await prisma.salesCase.deleteMany({
        where: {
          OR: [
            { title: { contains: 'Test Marine Engine' } },
            { refNumber: { contains: 'SC-TEST' } }
          ]
        }
      });
      
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Failed to clean up test data:', error);
    }
  }

  private displayResults() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(2)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.error}`);
        });
    }
    
    console.log('\n⏱️  Test Durations:');
    this.results.forEach(r => {
      console.log(`  - ${r.test}: ${r.duration}ms`);
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Frontend Tests\n');
    
    try {
      await this.setup();
      
      // Core functionality tests
      await this.testCustomerCreation();
      await this.testSalesCaseCreation();
      await this.testQuotationCreation();
      await this.testQuotationPDF();
      await this.testCustomerPORecording();
      await this.testSalesOrderWorkflow();
      await this.testInvoiceCreation();
      await this.testPaymentRecording();
      await this.testListViewsAndFilters();
      await this.testNavigationAndPermissions();
      
      // Additional tests
      await this.testFormValidation();
      await this.testUIResponsiveness();
      await this.testErrorHandling();
      await this.testDataPersistence();
      
    } catch (error) {
      console.error('Fatal error during test execution:', error);
    } finally {
      await this.teardown();
    }
  }
}

// Run tests
async function main(): Promise<void> {
  const testSuite = new FrontendTestSuite();
  await testSuite.runAllTests();
  
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});