const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const SALES_CASE_ID = 'cmc1d2rxm0003v2ogxh67lc1a'; // From the URL parameter

// Test data for multiline quotation
const quotationData = {
  salesCaseId: SALES_CASE_ID,
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  paymentTerms: '30 days',
  deliveryTerms: 'FOB Warehouse',
  notes: 'This is a test quotation with multiple lines and mixed item types.',
  internalNotes: 'Internal note: Test multiline functionality thoroughly',
  items: [
    // Line 1: Header for Computer Equipment
    {
      lineNumber: 1,
      lineDescription: 'Computer Equipment',
      isLineHeader: true,
      itemType: 'PRODUCT',
      itemCode: 'HEADER-1',
      description: 'Computer Equipment Section',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
      sortOrder: 1
    },
    // Line 2: Existing inventory item (assuming these exist)
    {
      lineNumber: 2,
      lineDescription: 'High-end workstation',
      isLineHeader: false,
      itemType: 'PRODUCT',
      // itemId is optional, omit for new items
      itemCode: 'COMP-WS-001',
      description: 'Dell Precision 5680 Workstation - Intel Core i9, 64GB RAM, 2TB SSD',
      internalDescription: 'Latest model with extended warranty',
      quantity: 2,
      unitPrice: 3500.00,
      discount: 10, // 10% discount
      taxRate: 7.5, // 7.5% tax
      // taxRateId is optional
      // unitOfMeasureId is optional
      cost: 2800.00,
      sortOrder: 2
    },
    // Line 3: Another product
    {
      lineNumber: 3,
      lineDescription: 'Professional monitor',
      isLineHeader: false,
      itemType: 'PRODUCT',
      itemCode: 'MON-4K-27',
      description: 'LG UltraFine 27" 4K Monitor with USB-C',
      quantity: 4,
      unitPrice: 799.99,
      discount: 15, // 15% discount
      taxRate: 7.5,
      sortOrder: 3
    },
    // Line 4: Header for Software
    {
      lineNumber: 4,
      lineDescription: 'Software Licenses',
      isLineHeader: true,
      itemType: 'SERVICE',
      itemCode: 'HEADER-2',
      description: 'Software & Licensing',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
      sortOrder: 4
    },
    // Line 5: Software service
    {
      lineNumber: 5,
      lineDescription: 'Microsoft Office Suite',
      isLineHeader: false,
      itemType: 'SERVICE',
      itemCode: 'SW-MS365-BUS',
      description: 'Microsoft 365 Business Premium - Annual License',
      quantity: 10,
      unitPrice: 264.00,
      discount: 20, // 20% volume discount
      taxRate: 0, // No tax on software licenses
      sortOrder: 5
    },
    // Line 6: Custom software development
    {
      lineNumber: 6,
      lineDescription: 'Custom integration',
      isLineHeader: false,
      itemType: 'SERVICE',
      itemCode: 'SVC-DEV-INT',
      description: 'Custom API Integration Development - 40 hours',
      internalDescription: 'Integration with existing CRM system',
      quantity: 1,
      unitPrice: 4000.00,
      discount: 0,
      taxRate: 7.5,
      sortOrder: 6
    },
    // Line 7: Header for Accessories
    {
      lineNumber: 7,
      lineDescription: 'Accessories & Peripherals',
      isLineHeader: true,
      itemType: 'PRODUCT',
      itemCode: 'HEADER-3',
      description: 'Computer Accessories',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
      sortOrder: 7
    },
    // Line 8: Keyboard
    {
      lineNumber: 8,
      lineDescription: 'Mechanical keyboard',
      isLineHeader: false,
      itemType: 'PRODUCT',
      itemCode: 'ACC-KB-MECH',
      description: 'Logitech MX Mechanical Wireless Keyboard',
      quantity: 5,
      unitPrice: 169.99,
      discount: 5,
      taxRate: 7.5,
      sortOrder: 8
    },
    // Line 9: Mouse
    {
      lineNumber: 9,
      lineDescription: 'Wireless mouse',
      isLineHeader: false,
      itemType: 'PRODUCT',
      itemCode: 'ACC-MS-WL',
      description: 'Logitech MX Master 3S Wireless Mouse',
      quantity: 5,
      unitPrice: 99.99,
      discount: 5,
      taxRate: 7.5,
      sortOrder: 9
    },
    // Line 10: Support service
    {
      lineNumber: 10,
      lineDescription: 'Extended Support',
      isLineHeader: false,
      itemType: 'SERVICE',
      itemCode: 'SVC-SUP-EXT',
      description: '3-Year Extended Support and Maintenance Package',
      internalDescription: 'Includes 24/7 phone support and on-site service',
      quantity: 1,
      unitPrice: 2500.00,
      discount: 0,
      taxRate: 0,
      sortOrder: 10
    }
  ]
};

// Function to create quotation
async function createQuotation() {
  console.log('Creating multiline quotation with', quotationData.items.length, 'items...');
  console.log('Sales Case ID:', SALES_CASE_ID);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quotationData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error creating quotation:', result);
      return null;
    }

    console.log('Quotation created successfully!');
    console.log('Quotation ID:', result.data.id);
    console.log('Quotation Number:', result.data.quotationNumber);
    
    // Calculate totals for verification
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    
    quotationData.items.forEach(item => {
      if (!item.isLineHeader) {
        const lineSubtotal = item.quantity * item.unitPrice;
        const discountAmount = lineSubtotal * (item.discount / 100);
        const taxableAmount = lineSubtotal - discountAmount;
        const taxAmount = taxableAmount * (item.taxRate / 100);
        
        subtotal += lineSubtotal;
        totalDiscount += discountAmount;
        totalTax += taxAmount;
      }
    });
    
    const total = subtotal - totalDiscount + totalTax;
    
    console.log('\nCalculated Totals:');
    console.log('Subtotal:', subtotal.toFixed(2));
    console.log('Total Discount:', totalDiscount.toFixed(2));
    console.log('Total Tax:', totalTax.toFixed(2));
    console.log('Grand Total:', total.toFixed(2));
    
    return result.data;
  } catch (error) {
    console.error('Failed to create quotation:', error);
    return null;
  }
}

// Function to fetch and display quotation details
async function getQuotationDetails(quotationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quotations/${quotationId}`);
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching quotation:', result);
      return;
    }
    
    console.log('\n--- Quotation Details ---');
    console.log('Number:', result.data.quotationNumber);
    console.log('Status:', result.data.status);
    console.log('Valid Until:', new Date(result.data.validUntil).toLocaleDateString());
    console.log('Total Items:', result.data.items.length);
    console.log('Subtotal:', result.data.subtotal);
    console.log('Tax Amount:', result.data.taxAmount);
    console.log('Discount Amount:', result.data.discountAmount);
    console.log('Total Amount:', result.data.totalAmount);
    
    console.log('\n--- Line Items ---');
    result.data.items.forEach(item => {
      if (item.isLineHeader) {
        console.log(`\n[${item.lineNumber}] === ${item.description} ===`);
      } else {
        console.log(`[${item.lineNumber}] ${item.description}`);
        console.log(`    Code: ${item.itemCode}, Qty: ${item.quantity}, Price: ${item.unitPrice}`);
        console.log(`    Discount: ${item.discount}%, Tax: ${item.taxRate}%`);
        console.log(`    Total: ${item.totalAmount}`);
      }
    });
  } catch (error) {
    console.error('Failed to fetch quotation details:', error);
  }
}

// Main execution
async function main() {
  console.log('Starting Quotation Multiline Test');
  console.log('=================================\n');
  
  const quotation = await createQuotation();
  
  if (quotation) {
    console.log('\nFetching created quotation details...');
    await getQuotationDetails(quotation.id);
    
    console.log('\n=================================');
    console.log('Test completed successfully!');
    console.log('\nYou can view the quotation at:');
    console.log(`${API_BASE_URL}/quotations/${quotation.id}`);
  } else {
    console.log('\nTest failed - quotation was not created');
  }
}

// Run the test
main().catch(console.error);