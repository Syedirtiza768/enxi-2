const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const BASE_URL = 'http://localhost:3000';
const SALES_CASE_ID = 'cmc1d2rxm0003v2ogxh67lc1a';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Test data for multiline quotation
const testData = {
  basicInfo: {
    paymentTerms: 'Net 30 days',
    deliveryTerms: 'FOB Destination - Freight Prepaid',
    notes: 'This quotation includes comprehensive IT infrastructure upgrade with professional services.',
    internalNotes: 'Customer prefers phased delivery. Contact: John Doe (555-0123)'
  },
  lineItems: [
    {
      type: 'header',
      description: 'Computer Equipment',
      lineNumber: 1
    },
    {
      type: 'product',
      code: 'LAPTOP-PRO-001',
      description: 'MacBook Pro 16" M3 Max - 64GB RAM, 2TB SSD',
      quantity: 3,
      unitPrice: 4999.99,
      discount: 10,
      taxRate: 7.5,
      internalDescription: 'Rush delivery required',
      lineNumber: 2
    },
    {
      type: 'product',
      code: 'MON-4K-DELL',
      description: 'Dell UltraSharp 32" 4K Monitor',
      quantity: 6,
      unitPrice: 899.00,
      discount: 15,
      taxRate: 7.5,
      lineNumber: 3
    },
    {
      type: 'header',
      description: 'Professional Services',
      lineNumber: 4
    },
    {
      type: 'service',
      code: 'SVC-SETUP-PRO',
      description: 'Professional Workstation Setup & Configuration',
      quantity: 3,
      unitPrice: 500.00,
      discount: 0,
      taxRate: 0,
      internalDescription: 'Includes OS and software installation',
      lineNumber: 5
    },
    {
      type: 'service',
      code: 'SVC-TRAINING',
      description: 'On-site Training (2 days)',
      quantity: 1,
      unitPrice: 2400.00,
      discount: 20,
      taxRate: 0,
      lineNumber: 6
    },
    {
      type: 'header',
      description: 'Accessories',
      lineNumber: 7
    },
    {
      type: 'product',
      code: 'ACC-DOCK-TB4',
      description: 'Thunderbolt 4 Docking Station',
      quantity: 3,
      unitPrice: 299.99,
      discount: 5,
      taxRate: 7.5,
      lineNumber: 8
    },
    {
      type: 'product',
      code: 'ACC-HEADSET-PRO',
      description: 'Professional Wireless Headset with Noise Cancellation',
      quantity: 6,
      unitPrice: 249.99,
      discount: 10,
      taxRate: 7.5,
      lineNumber: 9
    },
    {
      type: 'service',
      code: 'SVC-WARRANTY-EXT',
      description: '3-Year Extended Warranty & Support Package',
      quantity: 1,
      unitPrice: 3500.00,
      discount: 0,
      taxRate: 0,
      internalDescription: 'Includes 24/7 support and on-site service',
      lineNumber: 10
    }
  ]
};

// Helper functions
async function ensureScreenshotsDir() {
  try {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating screenshots directory:', error);
  }
}

async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function waitAndClick(page, selector, options = {}) {
  await page.waitForSelector(selector, { visible: true, ...options });
  await page.click(selector);
}

async function waitAndType(page, selector, text, options = {}) {
  await page.waitForSelector(selector, { visible: true, ...options });
  await page.click(selector, { clickCount: 3 }); // Triple click to select all
  await page.type(selector, text);
}

async function fillBasicInfo(page, data) {
  console.log('📝 Filling basic quotation information...');
  
  // Payment Terms
  const paymentTermsSelector = 'input[name="paymentTerms"], input[placeholder*="payment terms" i]';
  await waitAndType(page, paymentTermsSelector, data.paymentTerms);
  
  // Delivery Terms
  const deliveryTermsSelector = 'input[name="deliveryTerms"], input[placeholder*="delivery terms" i]';
  await waitAndType(page, deliveryTermsSelector, data.deliveryTerms);
  
  // Notes
  const notesSelector = 'textarea[name="notes"], textarea[placeholder*="special instructions" i]';
  await waitAndType(page, notesSelector, data.notes);
  
  // Internal Notes - first check if we need to expand the section
  try {
    const internalNotesToggle = await page.$('button:has-text("Internal Notes"), [aria-label*="internal notes" i]');
    if (internalNotesToggle) {
      await internalNotesToggle.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // Internal notes might be visible by default
  }
  
  const internalNotesSelector = 'textarea[name="internalNotes"], textarea[placeholder*="internal notes" i]';
  await waitAndType(page, internalNotesSelector, data.internalNotes);
  
  console.log('✅ Basic information filled');
}

async function addLineItem(page, item, index) {
  console.log(`📦 Adding line item ${index + 1}: ${item.type} - ${item.description || item.code}`);
  
  // Click Add Line button
  const addLineButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent.toLowerCase().includes('add line') || 
      btn.textContent.toLowerCase().includes('add item') ||
      btn.textContent.toLowerCase().includes('add row')
    );
  });
  
  if (addLineButton) {
    await addLineButton.click();
    await page.waitForTimeout(500); // Wait for new row to appear
  } else {
    console.error('❌ Could not find Add Line button');
    return;
  }
  
  // The new row should be the last one
  const rowIndex = index;
  
  if (item.type === 'header') {
    // For headers, we need to check a checkbox or select header type
    try {
      // Try to find and check the header checkbox
      const headerCheckbox = await page.$(`[name="items[${rowIndex}].isLineHeader"], [name="lines[${rowIndex}].isLineHeader"]`);
      if (headerCheckbox) {
        await headerCheckbox.click();
      } else {
        // Try to find a select dropdown for item type
        const typeSelect = await page.$(`select[name="items[${rowIndex}].itemType"], select[name="lines[${rowIndex}].type"]`);
        if (typeSelect) {
          await typeSelect.select('HEADER');
        }
      }
    } catch (e) {
      console.log('Could not set header type, trying alternative method...');
    }
    
    // Fill header description
    await waitAndType(page, `[name="items[${rowIndex}].description"], [name="lines[${rowIndex}].description"]`, item.description);
  } else {
    // For products and services
    // Item type
    try {
      const typeSelect = await page.$(`select[name="items[${rowIndex}].itemType"], select[name="lines[${rowIndex}].type"]`);
      if (typeSelect) {
        await typeSelect.select(item.type.toUpperCase());
      }
    } catch (e) {
      // Type might be set differently
    }
    
    // Item code
    await waitAndType(page, `[name="items[${rowIndex}].itemCode"], [name="lines[${rowIndex}].code"]`, item.code);
    
    // Description
    await waitAndType(page, `[name="items[${rowIndex}].description"], [name="lines[${rowIndex}].description"]`, item.description);
    
    // Quantity
    await waitAndType(page, `[name="items[${rowIndex}].quantity"], [name="lines[${rowIndex}].quantity"]`, item.quantity.toString());
    
    // Unit price
    await waitAndType(page, `[name="items[${rowIndex}].unitPrice"], [name="lines[${rowIndex}].price"]`, item.unitPrice.toString());
    
    // Discount
    await waitAndType(page, `[name="items[${rowIndex}].discount"], [name="lines[${rowIndex}].discount"]`, item.discount.toString());
    
    // Tax rate
    await waitAndType(page, `[name="items[${rowIndex}].taxRate"], [name="lines[${rowIndex}].tax"]`, item.taxRate.toString());
    
    // Internal description if present
    if (item.internalDescription) {
      try {
        await waitAndType(page, `[name="items[${rowIndex}].internalDescription"], [name="lines[${rowIndex}].internalNotes"]`, item.internalDescription);
      } catch (e) {
        // Internal description field might not be visible
      }
    }
  }
  
  console.log(`✅ Line item ${index + 1} added`);
  await page.waitForTimeout(500); // Brief pause between items
}

async function verifyCalculations(page) {
  console.log('\n🔍 Verifying calculations...');
  
  // Expected calculations
  let expectedSubtotal = 0;
  let expectedDiscount = 0;
  let expectedTax = 0;
  
  testData.lineItems.forEach(item => {
    if (item.type !== 'header') {
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
  
  console.log('Expected values:');
  console.log(`  Subtotal: $${expectedSubtotal.toFixed(2)}`);
  console.log(`  Discount: $${expectedDiscount.toFixed(2)}`);
  console.log(`  Tax: $${expectedTax.toFixed(2)}`);
  console.log(`  Total: $${expectedTotal.toFixed(2)}`);
  
  // Try to find and read actual values from the page
  try {
    const actualValues = await page.evaluate(() => {
      const findValue = (text) => {
        const elements = Array.from(document.querySelectorAll('*'));
        const element = elements.find(el => 
          el.textContent.includes(text) && 
          el.textContent.match(/\$[\d,]+\.?\d*/)
        );
        if (element) {
          const match = element.textContent.match(/\$([\d,]+\.?\d*)/);
          return match ? parseFloat(match[1].replace(/,/g, '')) : null;
        }
        return null;
      };
      
      return {
        subtotal: findValue('Subtotal'),
        discount: findValue('Discount'),
        tax: findValue('Tax'),
        total: findValue('Total') || findValue('Grand Total')
      };
    });
    
    console.log('\nActual values found:');
    console.log(`  Subtotal: ${actualValues.subtotal ? '$' + actualValues.subtotal.toFixed(2) : 'Not found'}`);
    console.log(`  Discount: ${actualValues.discount ? '$' + actualValues.discount.toFixed(2) : 'Not found'}`);
    console.log(`  Tax: ${actualValues.tax ? '$' + actualValues.tax.toFixed(2) : 'Not found'}`);
    console.log(`  Total: ${actualValues.total ? '$' + actualValues.total.toFixed(2) : 'Not found'}`);
    
    // Verify if values match (within small tolerance for rounding)
    const tolerance = 0.02; // 2 cents tolerance for rounding
    if (actualValues.total) {
      const difference = Math.abs(actualValues.total - expectedTotal);
      if (difference <= tolerance) {
        console.log('\n✅ Calculations verified - totals match!');
      } else {
        console.log(`\n⚠️  Total mismatch: Expected $${expectedTotal.toFixed(2)}, got $${actualValues.total.toFixed(2)}`);
      }
    }
  } catch (error) {
    console.log('⚠️  Could not verify calculations automatically');
  }
}

async function submitQuotation(page, saveAsDraft = true) {
  console.log(`\n🚀 Submitting quotation (${saveAsDraft ? 'Draft' : 'Send'})...`);
  
  const buttonText = saveAsDraft ? 'draft' : 'send';
  const submitButton = await page.evaluateHandle((text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent.toLowerCase().includes(text) ||
      btn.textContent.toLowerCase().includes('save') ||
      btn.textContent.toLowerCase().includes('create')
    );
  }, buttonText);
  
  if (submitButton) {
    await submitButton.click();
    console.log('✅ Submit button clicked');
    
    // Wait for navigation or success message
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        page.waitForSelector('.toast-success, [role="alert"], .success-message', { timeout: 30000 })
      ]);
      console.log('✅ Quotation submitted successfully');
      
      // Check if we're on the quotation detail page
      const currentUrl = page.url();
      if (currentUrl.includes('/quotations/') && !currentUrl.includes('/new')) {
        console.log(`✅ Redirected to quotation detail page: ${currentUrl}`);
        const quotationId = currentUrl.split('/quotations/')[1];
        console.log(`📋 Quotation ID: ${quotationId}`);
      }
    } catch (error) {
      console.error('❌ Error waiting for submission:', error.message);
    }
  } else {
    console.error('❌ Could not find submit button');
  }
}

// Main test function
async function runTest() {
  console.log('🚀 Starting Puppeteer Quotation Multiline Test\n');
  
  await ensureScreenshotsDir();
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 50, // Slow down actions for visibility
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to quotation creation page
    const url = `${BASE_URL}/quotations/new?salesCaseId=${SALES_CASE_ID}`;
    console.log(`📍 Navigating to: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Take initial screenshot
    await takeScreenshot(page, '01-initial-page-load');
    
    // Wait for the form to be ready
    await page.waitForSelector('form, [class*="form"]', { timeout: 10000 });
    
    // Fill basic information
    await fillBasicInfo(page, testData.basicInfo);
    await takeScreenshot(page, '02-basic-info-filled');
    
    // Add all line items
    console.log(`\n📦 Adding ${testData.lineItems.length} line items...`);
    for (let i = 0; i < testData.lineItems.length; i++) {
      await addLineItem(page, testData.lineItems[i], i);
      
      // Take screenshot every 3 items
      if ((i + 1) % 3 === 0) {
        await takeScreenshot(page, `03-line-items-${i + 1}`);
      }
    }
    
    // Final screenshot with all items
    await takeScreenshot(page, '04-all-items-added');
    
    // Verify calculations
    await verifyCalculations(page);
    
    // Submit the quotation
    await submitQuotation(page, true); // Save as draft
    
    // Take final screenshot
    await takeScreenshot(page, '05-after-submission');
    
    console.log('\n✅ Test completed successfully!');
    console.log(`📸 Screenshots saved in: ${SCREENSHOTS_DIR}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await takeScreenshot(page, 'error-screenshot');
    throw error;
  } finally {
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will remain open for inspection. Press Ctrl+C to close.');
    // Uncomment the line below to close browser automatically
    // await browser.close();
  }
}

// Run the test
runTest().catch(console.error);

// Export for use in other test frameworks
module.exports = { runTest, testData };