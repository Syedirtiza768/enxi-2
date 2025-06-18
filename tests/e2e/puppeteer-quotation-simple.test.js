const puppeteer = require('puppeteer');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SALES_CASE_ID = 'cmc1d2rxm0003v2ogxh67lc1a';

// Simple test data - just a few items to test
const testItems = [
  {
    code: 'TEST-001',
    description: 'Test Product 1',
    quantity: 2,
    unitPrice: 100,
    discount: 10,
    taxRate: 7.5
  },
  {
    code: 'TEST-002',
    description: 'Test Service 1',
    quantity: 1,
    unitPrice: 500,
    discount: 0,
    taxRate: 0
  }
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting Puppeteer Test - Simple Version\n');
  console.log('This test will:');
  console.log('1. Open a Chrome browser');
  console.log('2. Navigate to the quotation form');
  console.log('3. Fill in the form automatically');
  console.log('4. You just watch - no input needed!\n');
  
  const browser = await puppeteer.launch({
    headless: false, // You'll see the browser
    slowMo: 200,     // Slow down actions so you can see them
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to the page
    console.log('📍 Step 1: Opening quotation form...');
    const url = `${BASE_URL}/quotations/new?salesCaseId=${SALES_CASE_ID}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await delay(3000); // Wait for page to fully load
    
    // Step 2: Check if we're on the right page
    const pageTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : 'No title found';
    });
    console.log(`✅ On page: ${pageTitle}\n`);
    
    // Step 3: Fill payment terms
    console.log('📝 Step 2: Filling payment terms...');
    const paymentFilled = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const paymentInput = inputs.find(input => 
        input.placeholder?.toLowerCase().includes('payment') ||
        input.name?.toLowerCase().includes('payment')
      );
      if (paymentInput) {
        paymentInput.focus();
        paymentInput.value = 'Net 30 days';
        paymentInput.dispatchEvent(new Event('input', { bubbles: true }));
        paymentInput.blur();
        return true;
      }
      return false;
    });
    
    if (paymentFilled) {
      console.log('✅ Payment terms filled\n');
    } else {
      console.log('⚠️  Could not find payment terms field\n');
    }
    
    await delay(1000);
    
    // Step 4: Fill delivery terms
    console.log('📝 Step 3: Filling delivery terms...');
    const deliveryFilled = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const deliveryInput = inputs.find(input => 
        input.placeholder?.toLowerCase().includes('delivery') ||
        input.name?.toLowerCase().includes('delivery')
      );
      if (deliveryInput) {
        deliveryInput.focus();
        deliveryInput.value = 'FOB Shipping Point';
        deliveryInput.dispatchEvent(new Event('input', { bubbles: true }));
        deliveryInput.blur();
        return true;
      }
      return false;
    });
    
    if (deliveryFilled) {
      console.log('✅ Delivery terms filled\n');
    }
    
    await delay(1000);
    
    // Step 5: Try to add a line item
    console.log('📝 Step 4: Looking for Add Line button...');
    
    // Scroll down to find the button
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    
    await delay(1000);
    
    const addButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('add line') || 
               text.includes('add item') || 
               text.includes('add row');
      });
      
      if (addButton) {
        console.log('Button found:', addButton.textContent);
        // Highlight the button
        addButton.style.border = '3px solid red';
        addButton.style.backgroundColor = 'yellow';
        return true;
      }
      return false;
    });
    
    if (addButtonFound) {
      console.log('✅ Found Add Line button - highlighted in yellow!\n');
    } else {
      console.log('❌ Could not find Add Line button\n');
    }
    
    // Step 6: Show current state
    console.log('📊 Current form state:');
    const formState = await page.evaluate(() => {
      const state = {
        customer: 'Not selected',
        salesCase: 'Not selected',
        itemCount: 0
      };
      
      // Check for customer info
      const customerInfo = document.querySelector('[class*="bg-gray-50"]');
      if (customerInfo && customerInfo.textContent.length > 10) {
        state.customer = 'Selected';
      }
      
      // Check for sales case
      const selects = document.querySelectorAll('select');
      const salesCaseSelect = Array.from(selects).find(s => 
        s.name?.includes('salesCase') || 
        Array.from(s.options).some(opt => opt.text.includes('CASE-'))
      );
      if (salesCaseSelect && salesCaseSelect.value) {
        state.salesCase = 'Selected';
      }
      
      // Count item rows
      const itemRows = document.querySelectorAll('[data-testid*="item"], tr[class*="item"], tbody tr');
      state.itemCount = itemRows.length;
      
      return state;
    });
    
    console.log(`  Customer: ${formState.customer}`);
    console.log(`  Sales Case: ${formState.salesCase}`);
    console.log(`  Line Items: ${formState.itemCount}`);
    
    console.log('\n✅ Test completed!');
    console.log('\n📌 What you just saw:');
    console.log('- Puppeteer opened Chrome automatically');
    console.log('- It navigated to the quotation form');
    console.log('- It filled in some fields');
    console.log('- It highlighted the Add Line button');
    console.log('- All without any manual input!\n');
    console.log('💡 The browser will stay open. Press Ctrl+C to close it.\n');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    
    // Take a screenshot on error
    try {
      await page.screenshot({ path: 'error-screenshot.png' });
      console.log('📸 Error screenshot saved: error-screenshot.png');
    } catch (e) {
      // Ignore screenshot errors
    }
  }
}

// Run the test
console.log('='.repeat(60));
console.log('🤖 Puppeteer Automation Test');
console.log('='.repeat(60));
console.log('\n⚠️  Make sure the dev server is running: npm run dev\n');

runTest().catch(console.error);