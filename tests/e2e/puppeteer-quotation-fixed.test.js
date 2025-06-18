const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

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
    {
      isHeader: true,
      description: 'Computer Equipment'
    },
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
    {
      isHeader: true,
      description: 'Services'
    },
    {
      code: 'SETUP-SVC',
      description: 'Professional Setup Service',
      quantity: 1,
      unitPrice: 1500.00,
      discount: 0,
      taxRate: 0
    }
  ]
};

// Ensure screenshots directory exists
async function ensureScreenshotsDir() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

async function takeScreenshot(page, name) {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join(screenshotsDir, `${name}-${timestamp}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filepath}`);
}

async function runQuotationTest() {
  console.log('🚀 Starting Puppeteer Quotation Test\n');
  
  await ensureScreenshotsDir();
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error') {
      console.log('PAGE:', msg.text());
    }
  });
  
  // Log network errors
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url());
  });
  
  try {
    // Navigate to the quotation form
    const url = `${BASE_URL}/quotations/new?salesCaseId=${SALES_CASE_ID}`;
    console.log(`📍 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for the page to load - look for the main container
    await page.waitForSelector('.max-w-5xl, [class*="container"], main', { timeout: 10000 });
    console.log('✅ Page loaded\n');
    
    // Take initial screenshot
    await takeScreenshot(page, '01-initial');
    
    // Wait a bit for React to fully render
    await page.waitForTimeout(2000);
    
    // Check if customer is pre-filled
    const customerInfo = await page.evaluate(() => {
      const customerElements = document.querySelectorAll('[class*="bg-gray-50"] p');
      if (customerElements.length > 0) {
        return Array.from(customerElements).map(el => el.textContent).join(', ');
      }
      return null;
    });
    
    if (customerInfo) {
      console.log(`✅ Customer pre-filled: ${customerInfo}\n`);
    }
    
    // Fill basic quotation fields
    console.log('📝 Filling basic information...');
    
    // Payment terms
    await page.evaluate((terms) => {
      const inputs = document.querySelectorAll('input');
      const paymentInput = Array.from(inputs).find(input => 
        input.placeholder?.toLowerCase().includes('payment') ||
        input.name?.includes('paymentTerms') ||
        input.id?.includes('payment')
      );
      if (paymentInput) {
        paymentInput.value = terms;
        paymentInput.dispatchEvent(new Event('input', { bubbles: true }));
        paymentInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, quotationData.paymentTerms);
    
    // Delivery terms
    await page.evaluate((terms) => {
      const inputs = document.querySelectorAll('input');
      const deliveryInput = Array.from(inputs).find(input => 
        input.placeholder?.toLowerCase().includes('delivery') ||
        input.name?.includes('deliveryTerms') ||
        input.id?.includes('delivery')
      );
      if (deliveryInput) {
        deliveryInput.value = terms;
        deliveryInput.dispatchEvent(new Event('input', { bubbles: true }));
        deliveryInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, quotationData.deliveryTerms);
    
    // Notes
    await page.evaluate((notes) => {
      const textareas = document.querySelectorAll('textarea');
      const notesTextarea = Array.from(textareas).find(textarea => 
        textarea.placeholder?.toLowerCase().includes('special') ||
        textarea.placeholder?.toLowerCase().includes('instructions') ||
        textarea.name?.includes('notes') && !textarea.name?.includes('internal')
      );
      if (notesTextarea) {
        notesTextarea.value = notes;
        notesTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        notesTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, quotationData.notes);
    
    // Try to expand internal notes if collapsed
    const expandedInternalNotes = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const internalNotesButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('internal notes') ||
        btn.innerHTML?.includes('CollapsibleTrigger')
      );
      if (internalNotesButton) {
        internalNotesButton.click();
        return true;
      }
      return false;
    });
    
    if (expandedInternalNotes) {
      console.log('✅ Expanded internal notes section');
      await page.waitForTimeout(500);
    }
    
    // Internal notes
    await page.evaluate((notes) => {
      const textareas = document.querySelectorAll('textarea');
      const internalTextarea = Array.from(textareas).find(textarea => 
        textarea.placeholder?.toLowerCase().includes('internal') ||
        textarea.name?.includes('internalNotes')
      );
      if (internalTextarea) {
        internalTextarea.value = notes;
        internalTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        internalTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, quotationData.internalNotes);
    
    console.log('✅ Basic information filled\n');
    await takeScreenshot(page, '02-basic-info');
    
    // Scroll to line items section
    await page.evaluate(() => {
      const itemsSection = document.querySelector('[class*="CleanItemEditor"], [class*="LineBasedItemEditor"], [class*="item-editor"]');
      if (itemsSection) {
        itemsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Find which editor is being used
    const editorType = await page.evaluate(() => {
      if (document.querySelector('[class*="CleanItemEditor"]')) return 'clean';
      if (document.querySelector('[class*="LineBasedItemEditor"]')) return 'line-based';
      return 'unknown';
    });
    
    console.log(`📦 Item editor type: ${editorType}\n`);
    
    // Add line items
    console.log(`📦 Adding ${quotationData.items.length} line items...`);
    
    for (let i = 0; i < quotationData.items.length; i++) {
      const item = quotationData.items[i];
      console.log(`\nAdding item ${i + 1}: ${item.isHeader ? 'Header - ' : ''}${item.description || item.code}`);
      
      // Find and click Add Line button
      const addButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addButton = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          const hasIcon = btn.querySelector('svg, [class*="icon"]');
          return text.includes('add line') || 
                 text.includes('add item') || 
                 text.includes('add row') ||
                 (hasIcon && (text.includes('add') || text === ''));
        });
        
        if (addButton && !addButton.disabled) {
          console.log('Found add button:', addButton.textContent);
          addButton.click();
          return true;
        }
        return false;
      });
      
      if (!addButtonClicked) {
        console.log('❌ Could not find Add Line button');
        continue;
      }
      
      await page.waitForTimeout(1000); // Wait for new row
      
      // Fill the new row (it should be the last one)
      const rowFilled = await page.evaluate((item, index) => {
        // Find all item rows
        const rows = document.querySelectorAll('[data-testid*="item-row"], tr[class*="item"], .item-row, tbody tr');
        const lastRow = rows[rows.length - 1];
        
        if (!lastRow) {
          console.error('No row found');
          return false;
        }
        
        // Helper to set value and trigger events
        const setValue = (element, value) => {
          if (!element) return false;
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          return true;
        };
        
        if (item.isHeader) {
          // For headers, check the header checkbox
          const headerCheckbox = lastRow.querySelector('input[type="checkbox"]');
          if (headerCheckbox && !headerCheckbox.checked) {
            headerCheckbox.click();
          }
          
          // Set description
          const descInput = lastRow.querySelector('input[placeholder*="description" i], input[name*="description" i]');
          return setValue(descInput, item.description);
        } else {
          // For products/services
          const inputs = lastRow.querySelectorAll('input, select');
          let filled = false;
          
          // Find inputs by placeholder or name
          inputs.forEach(input => {
            const placeholder = input.placeholder?.toLowerCase() || '';
            const name = input.name?.toLowerCase() || '';
            
            if ((placeholder.includes('code') || name.includes('code')) && item.code) {
              setValue(input, item.code);
              filled = true;
            } else if ((placeholder.includes('description') || name.includes('description')) && item.description) {
              setValue(input, item.description);
              filled = true;
            } else if ((placeholder.includes('qty') || placeholder.includes('quantity') || name.includes('quantity')) && item.quantity) {
              setValue(input, item.quantity.toString());
              filled = true;
            } else if ((placeholder.includes('price') || name.includes('price')) && item.unitPrice) {
              setValue(input, item.unitPrice.toString());
              filled = true;
            } else if ((placeholder.includes('discount') || name.includes('discount')) && item.discount !== undefined) {
              setValue(input, item.discount.toString());
              filled = true;
            } else if ((placeholder.includes('tax') || name.includes('tax')) && item.taxRate !== undefined) {
              setValue(input, item.taxRate.toString());
              filled = true;
            }
          });
          
          return filled;
        }
      }, item, i);
      
      if (rowFilled) {
        console.log(`✅ Item ${i + 1} added`);
      } else {
        console.log(`❌ Failed to fill item ${i + 1}`);
      }
      
      // Take screenshot every 2 items
      if ((i + 1) % 2 === 0) {
        await takeScreenshot(page, `03-items-${i + 1}`);
      }
    }
    
    console.log('\n✅ All items added');
    await takeScreenshot(page, '04-all-items');
    
    // Calculate expected totals
    let expectedSubtotal = 0;
    let expectedDiscount = 0;
    let expectedTax = 0;
    
    quotationData.items.forEach(item => {
      if (!item.isHeader) {
        const lineSubtotal = item.quantity * item.unitPrice;
        const discountAmount = lineSubtotal * (item.discount / 100);
        const taxableAmount = lineSubtotal - discountAmount;
        const taxAmount = taxableAmount * (item.taxRate / 100);
        
        expectedSubtotal += lineSubtotal;
        expectedDiscount += discountAmount;
        expectedTax += taxAmount;
      }
    });
    
    const expectedTotal = expectedSubtotal - expectedDiscount + expectedTax;
    
    console.log('\n📊 Expected Totals:');
    console.log(`  Subtotal: $${expectedSubtotal.toFixed(2)}`);
    console.log(`  Discount: $${expectedDiscount.toFixed(2)}`);
    console.log(`  Tax: $${expectedTax.toFixed(2)}`);
    console.log(`  Total: $${expectedTotal.toFixed(2)}`);
    
    // Try to find and click submit button
    console.log('\n🚀 Looking for submit button...');
    
    const submitClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return (text.includes('save') || text.includes('create') || text.includes('draft')) && 
               !btn.disabled;
      });
      
      if (submitButton) {
        console.log('Found submit button:', submitButton.textContent);
        submitButton.click();
        return true;
      }
      return false;
    });
    
    if (submitClicked) {
      console.log('✅ Submit button clicked');
      
      // Wait for response
      try {
        await Promise.race([
          page.waitForNavigation({ timeout: 30000 }),
          page.waitForSelector('[role="alert"], .toast', { timeout: 30000 })
        ]);
        
        const currentUrl = page.url();
        console.log(`\n✅ Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/quotations/') && !currentUrl.includes('/new')) {
          console.log('🎉 Quotation created successfully!');
          await takeScreenshot(page, '05-success');
        }
      } catch (e) {
        console.log('⏱️  Waiting for submission...');
        await takeScreenshot(page, '05-after-submit');
      }
    }
    
    console.log('\n✅ Test completed!');
    console.log('💡 Browser will remain open. Press Ctrl+C to close.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await takeScreenshot(page, 'error');
    
    // Try to get more error details from the page
    const pageErrors = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    console.log('\nPage details:', pageErrors);
  }
}

// Run the test
console.log('='.repeat(60));
console.log('Puppeteer Quotation Test - Fixed Version');
console.log('='.repeat(60));
console.log('\nEnsure the dev server is running: npm run dev\n');

runQuotationTest().catch(console.error);