// Browser-based test script for multiline quotations
// Copy and paste this into browser console when on the quotation form page

// Test data for multiline quotation
const testData = {
  lines: [
    // Line 1: Header
    {
      type: 'header',
      description: '💻 Computer Equipment',
    },
    // Line 2: Product
    {
      type: 'product',
      code: 'LAPTOP-PRO-001',
      description: 'MacBook Pro 16" M3 Max - 64GB RAM, 2TB SSD',
      quantity: 3,
      unitPrice: 4999.99,
      discount: 10,
      taxRate: 7.5,
      internalNotes: 'Rush delivery required'
    },
    // Line 3: Product
    {
      type: 'product',
      code: 'MON-4K-DELL',
      description: 'Dell UltraSharp 32" 4K Monitor',
      quantity: 6,
      unitPrice: 899.00,
      discount: 15,
      taxRate: 7.5
    },
    // Line 4: Header
    {
      type: 'header',
      description: '🔧 Professional Services',
    },
    // Line 5: Service
    {
      type: 'service',
      code: 'SVC-SETUP-PRO',
      description: 'Professional Workstation Setup & Configuration',
      quantity: 3,
      unitPrice: 500.00,
      discount: 0,
      taxRate: 0,
      internalNotes: 'Includes OS installation and software setup'
    },
    // Line 6: Service
    {
      type: 'service',
      code: 'SVC-TRAINING',
      description: 'On-site Training (2 days)',
      quantity: 1,
      unitPrice: 2400.00,
      discount: 20,
      taxRate: 0
    },
    // Line 7: Header
    {
      type: 'header',
      description: '🎧 Accessories',
    },
    // Line 8: Product
    {
      type: 'product',
      code: 'ACC-DOCK-TB4',
      description: 'Thunderbolt 4 Docking Station',
      quantity: 3,
      unitPrice: 299.99,
      discount: 5,
      taxRate: 7.5
    },
    // Line 9: Product
    {
      type: 'product',
      code: 'ACC-HEADSET-PRO',
      description: 'Professional Wireless Headset with Noise Cancellation',
      quantity: 6,
      unitPrice: 249.99,
      discount: 10,
      taxRate: 7.5
    },
    // Line 10: Service
    {
      type: 'service',
      code: 'SVC-WARRANTY-EXT',
      description: '3-Year Extended Warranty & Support Package',
      quantity: 1,
      unitPrice: 3500.00,
      discount: 0,
      taxRate: 0,
      internalNotes: 'Covers all hardware and includes priority support'
    }
  ]
};

// Function to fill form programmatically
function fillQuotationForm() {
  console.log('🚀 Starting automated quotation form fill...\n');
  
  // Set basic form fields
  const paymentTermsInput = document.querySelector('input[name="paymentTerms"], #paymentTerms');
  if (paymentTermsInput) {
    paymentTermsInput.value = 'Net 30 days';
    paymentTermsInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  const deliveryTermsInput = document.querySelector('input[name="deliveryTerms"], #deliveryTerms');
  if (deliveryTermsInput) {
    deliveryTermsInput.value = 'FOB Destination - Freight Prepaid';
    deliveryTermsInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  const notesTextarea = document.querySelector('textarea[name="notes"], #notes');
  if (notesTextarea) {
    notesTextarea.value = 'This quotation includes comprehensive IT infrastructure upgrade with professional services and extended support.';
    notesTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  const internalNotesTextarea = document.querySelector('textarea[name="internalNotes"], #internalNotes');
  if (internalNotesTextarea) {
    internalNotesTextarea.value = 'Customer prefers delivery in phases. Phase 1: Hardware, Phase 2: Services. Contact: John Doe (555-0123)';
    internalNotesTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  console.log('✅ Basic form fields filled\n');
  
  // Instructions for line items
  console.log('📝 Manual Steps Required for Line Items:\n');
  console.log('Since the line item editor is a complex React component, please manually add the following items:\n');
  
  testData.lines.forEach((line, index) => {
    console.log(`\n--- Line ${index + 1} ---`);
    if (line.type === 'header') {
      console.log(`Type: HEADER`);
      console.log(`Description: ${line.description}`);
    } else {
      console.log(`Type: ${line.type.toUpperCase()}`);
      console.log(`Code: ${line.code}`);
      console.log(`Description: ${line.description}`);
      console.log(`Quantity: ${line.quantity}`);
      console.log(`Unit Price: $${line.unitPrice}`);
      console.log(`Discount: ${line.discount}%`);
      console.log(`Tax Rate: ${line.taxRate}%`);
      if (line.internalNotes) {
        console.log(`Internal Notes: ${line.internalNotes}`);
      }
    }
  });
  
  // Calculate expected totals
  console.log('\n\n📊 Expected Calculations:\n');
  
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  
  testData.lines.forEach(line => {
    if (line.type !== 'header') {
      const lineSubtotal = line.quantity * line.unitPrice;
      const discountAmount = lineSubtotal * (line.discount / 100);
      const taxableAmount = lineSubtotal - discountAmount;
      const taxAmount = taxableAmount * (line.taxRate / 100);
      
      subtotal += lineSubtotal;
      totalDiscount += discountAmount;
      totalTax += taxAmount;
      
      console.log(`${line.code}: Subtotal: $${lineSubtotal.toFixed(2)}, Discount: -$${discountAmount.toFixed(2)}, Tax: +$${taxAmount.toFixed(2)}`);
    }
  });
  
  const grandTotal = subtotal - totalDiscount + totalTax;
  
  console.log('\n--- Totals ---');
  console.log(`Subtotal: $${subtotal.toFixed(2)}`);
  console.log(`Total Discount: -$${totalDiscount.toFixed(2)}`);
  console.log(`Total Tax: +$${totalTax.toFixed(2)}`);
  console.log(`Grand Total: $${grandTotal.toFixed(2)}`);
  
  console.log('\n\n✅ Test data ready! Please manually add the line items as shown above.');
  console.log('💡 Tip: Use the "Add Line" button to add each item sequentially.');
}

// Function to verify calculations after form is filled
function verifyCalculations() {
  console.log('\n🔍 Verifying form calculations...\n');
  
  // Try to find total elements on the page
  const totalElements = document.querySelectorAll('[class*="total"], [id*="total"]');
  
  if (totalElements.length > 0) {
    console.log('Found total elements:');
    totalElements.forEach(el => {
      if (el.textContent.includes('$') || el.textContent.match(/\d/)) {
        console.log(`${el.className || el.id}: ${el.textContent}`);
      }
    });
  } else {
    console.log('Could not find total elements. Please check manually.');
  }
}

// Function to test form submission
function testSubmission() {
  console.log('\n🚀 Testing form submission...\n');
  
  // Find submit buttons
  const submitButtons = document.querySelectorAll('button[type="submit"], button:contains("Save"), button:contains("Create")');
  
  if (submitButtons.length > 0) {
    console.log(`Found ${submitButtons.length} submit button(s)`);
    console.log('Click the appropriate button to submit the form');
  } else {
    console.log('Submit button not found. Look for Save/Create buttons manually.');
  }
}

// Export test data for manual reference
window.quotationTestData = testData;

// Run the test
console.log('=== Quotation Multiline Test ===\n');
console.log('This script will help you test the quotation form with multiple line items.\n');
console.log('Available functions:');
console.log('- fillQuotationForm() : Fills basic form fields and shows line item data');
console.log('- verifyCalculations() : Checks the calculated totals');
console.log('- testSubmission() : Finds submit buttons');
console.log('- window.quotationTestData : Access the test data object\n');
console.log('Run fillQuotationForm() to start...');