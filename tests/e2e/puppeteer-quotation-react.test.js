const puppeteer = require('puppeteer');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SALES_CASE_ID = 'cmc1d2rxm0003v2ogxh67lc1a';

// Test data
const quotationData = {
  paymentTerms: 'Net 30 days',
  deliveryTerms: 'FOB Destination',
  notes: 'Automated test quotation with multiple lines',
  internalNotes: 'Internal: Testing multiline functionality',
  items: [
    // Header 1
    {
      isHeader: true,
      description: 'Computer Equipment'
    },
    // Products
    {
      code: 'LAPTOP-001',
      description: 'High-Performance Laptop - Intel i9, 32GB RAM',
      quantity: 5,
      unitPrice: 2499.99,
      discount: 10,
      taxRate: 7.5
    },
    {
      code: 'MONITOR-4K',
      description: '27" 4K Professional Monitor',
      quantity: 10,
      unitPrice: 699.99,
      discount: 15,
      taxRate: 7.5
    },
    // Header 2
    {
      isHeader: true,
      description: 'Services'
    },
    // Services
    {
      code: 'SETUP-SVC',
      description: 'Professional Setup Service',
      quantity: 1,
      unitPrice: 1500.00,
      discount: 0,
      taxRate: 0
    },
    {
      code: 'TRAINING-2D',
      description: 'On-site Training (2 days)',
      quantity: 1,
      unitPrice: 2000.00,
      discount: 20,
      taxRate: 0
    },
    // More products
    {
      code: 'KEYBOARD-MECH',
      description: 'Mechanical Keyboard - RGB Backlit',
      quantity: 15,
      unitPrice: 149.99,
      discount: 5,
      taxRate: 7.5
    },
    {
      code: 'MOUSE-PRO',
      description: 'Professional Wireless Mouse',
      quantity: 15,
      unitPrice: 89.99,
      discount: 5,
      taxRate: 7.5
    },
    {
      code: 'WEBCAM-4K',
      description: '4K Webcam with Auto-focus',
      quantity: 8,
      unitPrice: 199.99,
      discount: 10,
      taxRate: 7.5
    },
    {
      code: 'WARRANTY-3Y',
      description: '3-Year Extended Warranty',
      quantity: 1,
      unitPrice: 2999.99,
      discount: 0,
      taxRate: 0
    }
  ]
};

async function runQuotationTest() {
  console.log('🚀 Starting Puppeteer Quotation Test (React-aware version)\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('PAGE LOG:', msg.text());
    }
  });
  
  try {
    // Navigate to the quotation form
    const url = `${BASE_URL}/quotations/new?salesCaseId=${SALES_CASE_ID}`;
    console.log(`📍 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for the form to load
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('✅ Form loaded\n');
    
    // Inject our test data and interaction logic into the page
    await page.evaluate((data) => {
      console.log('Starting form automation...');
      
      // Helper to trigger React events
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
        
        if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else {
          valueSetter.call(element, value);
        }
        
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };
      
      // Fill basic fields
      const fillField = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) {
          if (element.tagName === 'SELECT') {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            setNativeValue(element, value);
          }
          return true;
        }
        return false;
      };
      
      // Try multiple selectors for each field
      const paymentSelectors = ['input[name="paymentTerms"]', '#paymentTerms', 'input[placeholder*="payment"]'];
      const deliverySelectors = ['input[name="deliveryTerms"]', '#deliveryTerms', 'input[placeholder*="delivery"]'];
      const notesSelectors = ['textarea[name="notes"]', '#notes', 'textarea[placeholder*="special"]'];
      const internalSelectors = ['textarea[name="internalNotes"]', '#internalNotes', 'textarea[placeholder*="internal"]'];
      
      // Fill basic info
      console.log('Filling basic information...');
      paymentSelectors.some(sel => fillField(sel, data.paymentTerms));
      deliverySelectors.some(sel => fillField(sel, data.deliveryTerms));
      notesSelectors.some(sel => fillField(sel, data.notes));
      internalSelectors.some(sel => fillField(sel, data.internalNotes));
      
      // Store data for line items
      window.testLineItems = data.items;
      window.currentItemIndex = 0;
      
      console.log('Basic info filled. Ready to add line items.');
    }, quotationData);
    
    console.log('📝 Basic information filled\n');
    
    // Function to add line items one by one
    const addNextLineItem = async () => {
      const hasMore = await page.evaluate(() => {
        if (window.currentItemIndex >= window.testLineItems.length) {
          return false;
        }
        
        const item = window.testLineItems[window.currentItemIndex];
        console.log(`Adding item ${window.currentItemIndex + 1}/${window.testLineItems.length}:`, item.description || 'Header');
        
        // Find and click Add Line button
        const addButtons = Array.from(document.querySelectorAll('button'));
        const addButton = addButtons.find(btn => 
          btn.textContent.toLowerCase().includes('add line') || 
          btn.textContent.toLowerCase().includes('add item') ||
          btn.textContent.toLowerCase().includes('add row') ||
          btn.innerHTML.includes('plus')
        );
        
        if (addButton) {
          addButton.click();
          window.currentItemIndex++;
          return true;
        }
        
        console.error('Add button not found');
        return false;
      });
      
      if (!hasMore) {
        return false;
      }
      
      // Wait for new row to appear
      await page.waitForTimeout(500);
      
      // Fill the newly added row
      await page.evaluate(() => {
        const item = window.testLineItems[window.currentItemIndex - 1];
        const rowIndex = window.currentItemIndex - 1;
        
        // Helper function from before
        const setNativeValue = (element, value) => {
          const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
          const prototype = Object.getPrototypeOf(element);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
          
          if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
          } else {
            valueSetter.call(element, value);
          }
          
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        };
        
        // Try to fill fields for this row
        const fillRowField = (fieldName, value) => {
          // Try multiple selector patterns
          const selectors = [
            `[name="items[${rowIndex}].${fieldName}"]`,
            `[name="items.${rowIndex}.${fieldName}"]`,
            `[name="lines[${rowIndex}].${fieldName}"]`,
            `#items_${rowIndex}_${fieldName}`,
            `[data-row="${rowIndex}"][data-field="${fieldName}"]`
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              setNativeValue(element, value);
              return true;
            }
          }
          
          // Try to find by position in table
          const rows = document.querySelectorAll('tr[data-row], tbody tr');
          if (rows[rowIndex]) {
            const input = rows[rowIndex].querySelector(`input[placeholder*="${fieldName}"], input[name*="${fieldName}"]`);
            if (input) {
              setNativeValue(input, value);
              return true;
            }
          }
          
          return false;
        };
        
        if (item.isHeader) {
          // Check header checkbox or set type
          const headerCheckbox = document.querySelector(`[name="items[${rowIndex}].isLineHeader"]`);
          if (headerCheckbox) {
            headerCheckbox.checked = true;
            headerCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
          fillRowField('description', item.description);
        } else {
          // Fill product/service fields
          fillRowField('itemCode', item.code);
          fillRowField('code', item.code);
          fillRowField('description', item.description);
          fillRowField('quantity', item.quantity.toString());
          fillRowField('unitPrice', item.unitPrice.toString());
          fillRowField('price', item.unitPrice.toString());
          fillRowField('discount', item.discount.toString());
          fillRowField('taxRate', item.taxRate.toString());
          fillRowField('tax', item.taxRate.toString());
        }
        
        console.log(`✅ Item ${rowIndex + 1} filled`);
      });
      
      return true;
    };
    
    // Add all line items
    console.log(`📦 Adding ${quotationData.items.length} line items...\n`);
    while (await addNextLineItem()) {
      await page.waitForTimeout(300); // Brief pause between items
    }
    
    console.log('\n✅ All line items added');
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', `quotation-filled-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
    
    // Calculate and display expected totals
    const totals = await page.evaluate(() => {
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      
      window.testLineItems.forEach(item => {
        if (!item.isHeader) {
          const lineSubtotal = item.quantity * item.unitPrice;
          const discountAmount = lineSubtotal * (item.discount / 100);
          const taxableAmount = lineSubtotal - discountAmount;
          const taxAmount = taxableAmount * (item.taxRate / 100);
          
          subtotal += lineSubtotal;
          totalDiscount += discountAmount;
          totalTax += taxAmount;
        }
      });
      
      return {
        subtotal: subtotal.toFixed(2),
        discount: totalDiscount.toFixed(2),
        tax: totalTax.toFixed(2),
        total: (subtotal - totalDiscount + totalTax).toFixed(2)
      };
    });
    
    console.log('\n📊 Expected Totals:');
    console.log(`  Subtotal: $${totals.subtotal}`);
    console.log(`  Discount: $${totals.discount}`);
    console.log(`  Tax: $${totals.tax}`);
    console.log(`  Total: $${totals.total}`);
    
    // Try to submit the form
    console.log('\n🚀 Attempting to save quotation...');
    
    const submitted = await page.evaluate(() => {
      // Find submit button
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitButton = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('save') ||
        btn.textContent.toLowerCase().includes('create') ||
        btn.textContent.toLowerCase().includes('draft')
      );
      
      if (submitButton && !submitButton.disabled) {
        console.log('Found submit button:', submitButton.textContent);
        submitButton.click();
        return true;
      }
      
      console.error('Submit button not found or disabled');
      return false;
    });
    
    if (submitted) {
      console.log('✅ Submit button clicked');
      
      // Wait for response
      try {
        await Promise.race([
          page.waitForNavigation({ timeout: 30000 }),
          page.waitForSelector('.toast, [role="alert"]', { timeout: 30000 })
        ]);
        
        const finalUrl = page.url();
        console.log(`\n✅ Final URL: ${finalUrl}`);
        
        if (finalUrl.includes('/quotations/') && !finalUrl.includes('/new')) {
          console.log('🎉 Quotation created successfully!');
          const quotationId = finalUrl.split('/quotations/')[1].split('?')[0];
          console.log(`📋 Quotation ID: ${quotationId}`);
        }
      } catch (error) {
        console.log('⏱️  Waiting for submission result...');
      }
    }
    
    console.log('\n✅ Test completed!');
    console.log('💡 Browser will remain open for manual inspection.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Take error screenshot
    try {
      const errorScreenshot = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log(`📸 Error screenshot: ${errorScreenshot}`);
    } catch (e) {
      // Ignore screenshot errors
    }
  }
}

// Run the test
console.log('='.repeat(60));
console.log('Puppeteer Quotation Test - React-aware Version');
console.log('='.repeat(60));
console.log('\nMake sure the development server is running on port 3000\n');

runQuotationTest().catch(console.error);