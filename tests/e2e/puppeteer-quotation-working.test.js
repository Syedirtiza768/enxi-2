const puppeteer = require('puppeteer');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SALES_CASE_ID = 'cmc1d2rxm0003v2ogxh67lc1a';

// Test data with multiple line items
const quotationData = {
  paymentTerms: '30 days',
  deliveryTerms: 'FOB Warehouse',
  specialInstructions: 'Please ensure all items are properly packaged. Contact before delivery.',
  internalNotes: 'Customer prefers morning deliveries. Account manager: John Doe',
  items: [
    // Header 1
    {
      isHeader: true,
      description: 'Computer Equipment'
    },
    // Products
    {
      code: 'LAPTOP-HP-001',
      description: 'HP EliteBook 850 G8 - Intel i7, 16GB RAM, 512GB SSD',
      quantity: 5,
      unitPrice: 1899.99,
      discount: 10,
      taxRate: 7.5
    },
    {
      code: 'MONITOR-DELL-27',
      description: 'Dell UltraSharp 27" 4K USB-C Monitor',
      quantity: 5,
      unitPrice: 649.99,
      discount: 15,
      taxRate: 7.5
    },
    {
      code: 'DOCK-USB4',
      description: 'Universal USB4 Docking Station',
      quantity: 5,
      unitPrice: 299.99,
      discount: 5,
      taxRate: 7.5
    },
    // Header 2
    {
      isHeader: true,
      description: 'Professional Services'
    },
    // Services
    {
      code: 'SVC-SETUP',
      description: 'Workstation Setup and Configuration Service',
      quantity: 5,
      unitPrice: 250.00,
      discount: 0,
      taxRate: 0
    },
    {
      code: 'SVC-TRAINING',
      description: 'End User Training (Full Day)',
      quantity: 2,
      unitPrice: 1200.00,
      discount: 20,
      taxRate: 0
    },
    // Header 3
    {
      isHeader: true,
      description: 'Software & Licenses'
    },
    // More items
    {
      code: 'SW-MS365',
      description: 'Microsoft 365 Business Standard - Annual License',
      quantity: 5,
      unitPrice: 264.00,
      discount: 15,
      taxRate: 0
    },
    {
      code: 'SW-ADOBE-CC',
      description: 'Adobe Creative Cloud - Annual License',
      quantity: 3,
      unitPrice: 599.99,
      discount: 10,
      taxRate: 0
    },
    {
      code: 'SVC-SUPPORT',
      description: '1 Year Premium Support Package',
      quantity: 1,
      unitPrice: 2999.99,
      discount: 0,
      taxRate: 0
    }
  ]
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQuotationTest() {
  console.log('🚀 Starting Automated Quotation Test\n');
  console.log(`📋 Test will create a quotation with ${quotationData.items.length} line items\n`);
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 150, // Slow enough to see actions
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Log console messages from the page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  
  try {
    // Navigate to quotation form
    console.log('📍 Step 1: Navigating to quotation form...');
    const url = `${BASE_URL}/quotations/new?salesCaseId=${SALES_CASE_ID}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await delay(3000);
    
    console.log('✅ Page loaded\n');
    
    // Check if customer is pre-populated
    console.log('📝 Step 2: Checking customer information...');
    const customerExists = await page.evaluate(() => {
      const customerSection = document.querySelector('.bg-gray-50');
      return customerSection && customerSection.textContent.length > 20;
    });
    
    if (customerExists) {
      console.log('✅ Customer is pre-populated from sales case\n');
    } else {
      console.log('⚠️  Customer not pre-populated\n');
    }
    
    // Scroll to payment terms
    await page.evaluate(() => {
      const paymentCard = Array.from(document.querySelectorAll('.text-gray-500')).find(el => 
        el.textContent.includes('Payment Terms')
      );
      if (paymentCard) {
        paymentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await delay(1000);
    
    // Fill Payment Terms (Select dropdown)
    console.log('📝 Step 3: Setting payment terms...');
    const paymentSet = await page.evaluate(() => {
      // Find the payment terms select trigger
      const paymentCard = Array.from(document.querySelectorAll('div')).find(el => 
        el.textContent.includes('Payment Terms') && el.querySelector('button')
      );
      if (paymentCard) {
        const selectTrigger = paymentCard.querySelector('button[role="combobox"]');
        if (selectTrigger) {
          selectTrigger.click();
          return true;
        }
      }
      return false;
    });
    
    if (paymentSet) {
      await delay(500);
      // Click the "Net 30 days" option
      await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('[role="option"]'));
        const net30 = options.find(opt => opt.textContent.includes('30 days'));
        if (net30) net30.click();
      });
      console.log('✅ Payment terms set to Net 30 days\n');
    }
    
    // Fill Delivery Terms (Input field)
    console.log('📝 Step 4: Filling delivery terms...');
    await page.evaluate((terms) => {
      const input = document.querySelector('input[placeholder*="Ex-Works"]');
      if (input) {
        input.focus();
        input.value = terms;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.blur();
      }
    }, quotationData.deliveryTerms);
    console.log('✅ Delivery terms filled\n');
    
    // Expand Additional Information section
    console.log('📝 Step 5: Expanding additional information...');
    const expanded = await page.evaluate(() => {
      const trigger = Array.from(document.querySelectorAll('div')).find(el => 
        el.textContent === 'Click to expand'
      );
      if (trigger) {
        trigger.click();
        return true;
      }
      return false;
    });
    
    if (expanded) {
      await delay(1000);
      
      // Fill Special Instructions
      await page.evaluate((text) => {
        const textarea = document.querySelector('textarea[placeholder*="special instructions"]');
        if (textarea) {
          textarea.focus();
          textarea.value = text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.blur();
        }
      }, quotationData.specialInstructions);
      
      // Fill Internal Notes
      await page.evaluate((text) => {
        const textareas = Array.from(document.querySelectorAll('textarea'));
        const internalNotes = textareas.find(ta => 
          ta.previousElementSibling?.textContent.includes('Internal Notes') ||
          ta.placeholder?.includes('internal')
        );
        if (internalNotes) {
          internalNotes.focus();
          internalNotes.value = text;
          internalNotes.dispatchEvent(new Event('input', { bubbles: true }));
          internalNotes.blur();
        }
      }, quotationData.internalNotes);
      
      console.log('✅ Additional information filled\n');
    }
    
    // Scroll to line items section
    await page.evaluate(() => {
      const itemsSection = document.querySelector('[class*="Quote Items"], [class*="Quote Lines"]')?.parentElement;
      if (itemsSection) {
        itemsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await delay(1000);
    
    // Add line items
    console.log(`📦 Step 6: Adding ${quotationData.items.length} line items...`);
    console.log('This will take a few moments...\n');
    
    for (let i = 0; i < quotationData.items.length; i++) {
      const item = quotationData.items[i];
      
      // Click Add Line button
      const addClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addButton = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          const hasPlus = btn.innerHTML.includes('svg') || btn.innerHTML.includes('plus');
          return text.includes('add line') || text.includes('add item') || 
                 (hasPlus && btn.parentElement?.textContent?.includes('line'));
        });
        if (addButton && !addButton.disabled) {
          addButton.click();
          return true;
        }
        return false;
      });
      
      if (!addClicked) {
        console.log('❌ Could not find Add Line button');
        break;
      }
      
      await delay(1000);
      
      // Fill the new row based on item type
      if (item.isHeader) {
        console.log(`  Adding header: ${item.description}`);
        // For headers, we need to check the header checkbox and fill description
        await page.evaluate((desc, rowIndex) => {
          const rows = document.querySelectorAll('tbody tr, [class*="item-row"]');
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            // Check header checkbox
            const checkbox = lastRow.querySelector('input[type="checkbox"]');
            if (checkbox && !checkbox.checked) checkbox.click();
            
            // Fill description
            const descInput = lastRow.querySelector('input[type="text"]');
            if (descInput) {
              descInput.value = desc;
              descInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }, item.description, i);
      } else {
        console.log(`  Adding item: ${item.code} - ${item.description}`);
        // For regular items, fill all fields
        await page.evaluate((itemData, rowIndex) => {
          const rows = document.querySelectorAll('tbody tr, [class*="item-row"]');
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            const inputs = lastRow.querySelectorAll('input[type="text"], input[type="number"]');
            
            // Fill fields in order (typically: code, description, quantity, price, discount, tax)
            if (inputs[0]) { // Code
              inputs[0].value = itemData.code;
              inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (inputs[1]) { // Description
              inputs[1].value = itemData.description;
              inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (inputs[2]) { // Quantity
              inputs[2].value = itemData.quantity;
              inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (inputs[3]) { // Price
              inputs[3].value = itemData.unitPrice;
              inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (inputs[4]) { // Discount
              inputs[4].value = itemData.discount;
              inputs[4].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (inputs[5]) { // Tax
              inputs[5].value = itemData.taxRate;
              inputs[5].dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }, item, i);
      }
      
      await delay(500);
    }
    
    console.log('\n✅ All items added\n');
    
    // Calculate expected totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    quotationData.items.forEach(item => {
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
    
    const grandTotal = subtotal - totalDiscount + totalTax;
    
    console.log('📊 Expected Totals:');
    console.log(`  Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`  Discount: -$${totalDiscount.toFixed(2)}`);
    console.log(`  Tax: +$${totalTax.toFixed(2)}`);
    console.log(`  Grand Total: $${grandTotal.toFixed(2)}\n`);
    
    // Scroll to bottom to see totals and submit button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1000);
    
    // Find and click Save button
    console.log('🚀 Step 7: Saving quotation...');
    const saveClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return (text.includes('save') || text.includes('create')) && 
               !text.includes('cancel') && !btn.disabled;
      });
      if (saveButton) {
        // Highlight button before clicking
        saveButton.style.border = '3px solid green';
        saveButton.style.backgroundColor = '#10b981';
        saveButton.click();
        return true;
      }
      return false;
    });
    
    if (saveClicked) {
      console.log('✅ Save button clicked\n');
      console.log('⏳ Waiting for quotation to be created...');
      
      // Wait for navigation or success message
      await delay(5000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/quotations/') && !currentUrl.includes('/new')) {
        console.log('\n🎉 SUCCESS! Quotation created!');
        console.log(`📋 Quotation URL: ${currentUrl}\n`);
      } else {
        console.log('\n⚠️  Still on form page - check for validation errors\n');
      }
    }
    
    console.log('✅ Test completed!');
    console.log('\n💡 The browser will stay open so you can review the results.');
    console.log('   Press Ctrl+C when you\'re done.\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take screenshot on error
    const screenshotPath = path.join(__dirname, `error-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Error screenshot saved: ${screenshotPath}`);
  }
}

// Main execution
console.log('='.repeat(70));
console.log('🤖 Puppeteer Automated Quotation Test');
console.log('='.repeat(70));
console.log('\n📌 This test will:');
console.log('   1. Open Chrome automatically');
console.log('   2. Navigate to the quotation form');
console.log('   3. Fill all fields including ' + quotationData.items.length + ' line items');
console.log('   4. Calculate totals');
console.log('   5. Save the quotation');
console.log('\n🎬 You just watch - no manual input needed!\n');
console.log('⚠️  Make sure the dev server is running: npm run dev\n');

runQuotationTest().catch(console.error);