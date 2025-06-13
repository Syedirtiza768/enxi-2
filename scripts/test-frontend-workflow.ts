import { chromium } from 'playwright';

async function testFrontendWorkflow() {
  console.log('🌐 Starting Frontend Workflow Test');
  console.log('==================================\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('📋 Step 1: Testing Login Page');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[name="email"]');
    
    await page.fill('input[name="email"]', 'admin@enxi.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    console.log('✅ Login successful');

    // Step 2: Navigate to Customers Page
    console.log('\n📋 Step 2: Testing Customers Page');
    await page.goto('http://localhost:3000/customers');
    await page.waitForSelector('h1:has-text("Customers")');
    
    // Check if Add Customer button exists
    const addCustomerBtn = await page.locator('button:has-text("Add Customer")').isVisible();
    console.log(`✅ Add Customer button: ${addCustomerBtn ? 'Found' : 'Missing'}`);

    // Step 3: Create New Customer
    console.log('\n📋 Step 3: Testing Customer Creation Form');
    await page.click('button:has-text("Add Customer")');
    await page.waitForSelector('input[name="name"]');
    
    // Fill customer form
    await page.fill('input[name="name"]', 'VIVEK.J');
    await page.fill('input[name="code"]', 'CUST-VIVEK-002');
    await page.fill('input[name="email"]', 'vivek.j@maritime.ae');
    await page.fill('input[name="phone"]', '+971501234567');
    await page.fill('input[name="address"]', 'WS 105 - Dubai Maritime City');
    await page.fill('input[name="city"]', 'Dubai');
    await page.fill('input[name="country"]', 'UAE');
    
    console.log('✅ Customer form filled');

    // Step 4: Navigate to Sales Cases
    console.log('\n📋 Step 4: Testing Sales Cases Page');
    await page.goto('http://localhost:3000/sales-cases');
    await page.waitForSelector('h1:has-text("Sales Cases")');
    
    const createSalesCaseBtn = await page.locator('button:has-text("Create Sales Case")').isVisible();
    console.log(`✅ Create Sales Case button: ${createSalesCaseBtn ? 'Found' : 'Missing'}`);

    // Step 5: Navigate to Quotations
    console.log('\n📋 Step 5: Testing Quotations Page');
    await page.goto('http://localhost:3000/quotations');
    await page.waitForSelector('h1:has-text("Quotations")');
    
    const newQuotationBtn = await page.locator('a:has-text("New Quotation")').isVisible();
    console.log(`✅ New Quotation button: ${newQuotationBtn ? 'Found' : 'Missing'}`);

    // Step 6: Test Quotation Creation Form
    console.log('\n📋 Step 6: Testing Quotation Creation Form');
    await page.goto('http://localhost:3000/quotations/new');
    await page.waitForSelector('h1:has-text("New Quotation")');
    
    // Check form elements
    const elements = {
      'Customer Select': await page.locator('select[name="customerId"]').isVisible(),
      'Sales Case Select': await page.locator('select[name="salesCaseId"]').isVisible(),
      'Add Item Button': await page.locator('button:has-text("Add Item")').isVisible(),
      'Terms Field': await page.locator('textarea[name="termsAndConditions"]').isVisible(),
      'Save Button': await page.locator('button:has-text("Save")').isVisible()
    };

    for (const [element, isVisible] of Object.entries(elements)) {
      console.log(`  ${isVisible ? '✅' : '❌'} ${element}`);
    }

    // Step 7: Test Sales Orders Page
    console.log('\n📋 Step 7: Testing Sales Orders Page');
    await page.goto('http://localhost:3000/sales-orders');
    await page.waitForSelector('h1:has-text("Sales Orders")');
    console.log('✅ Sales Orders page loaded');

    // Step 8: Test Invoices Page
    console.log('\n📋 Step 8: Testing Invoices Page');
    await page.goto('http://localhost:3000/invoices');
    await page.waitForSelector('h1:has-text("Invoices")');
    
    const newInvoiceBtn = await page.locator('a:has-text("New Invoice")').isVisible();
    console.log(`✅ New Invoice button: ${newInvoiceBtn ? 'Found' : 'Missing'}`);

    // Step 9: Test Payments Page
    console.log('\n📋 Step 9: Testing Payments Page');
    await page.goto('http://localhost:3000/payments');
    await page.waitForSelector('h1:has-text("Customer Payments")');
    console.log('✅ Payments page loaded');

    // Step 10: Test Customer PO Page
    console.log('\n📋 Step 10: Testing Customer PO Page');
    await page.goto('http://localhost:3000/customer-pos');
    await page.waitForSelector('h1:has-text("Customer Purchase Orders")');
    
    const recordPOBtn = await page.locator('a:has-text("Record New PO")').isVisible();
    console.log(`✅ Record PO button: ${recordPOBtn ? 'Found' : 'Missing'}`);

    // Step 11: Test Inventory Items
    console.log('\n📋 Step 11: Testing Inventory Items Page');
    await page.goto('http://localhost:3000/inventory/items');
    await page.waitForSelector('h1:has-text("Inventory Items")');
    
    const addItemBtn = await page.locator('a:has-text("Add Item")').isVisible();
    console.log(`✅ Add Item button: ${addItemBtn ? 'Found' : 'Missing'}`);

    // Step 12: Test Shipments Page
    console.log('\n📋 Step 12: Testing Shipments Page');
    await page.goto('http://localhost:3000/shipments');
    await page.waitForSelector('h1:has-text("Shipments")');
    console.log('✅ Shipments page loaded');

    console.log('\n✅ Frontend workflow test completed successfully!');

  } catch (error) {
    console.error('❌ Frontend test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testFrontendWorkflow().catch(console.error);