const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const SALES_CASE_ID = 'cmc1d2rxm0003v2ogxh67lc1a';

// Simple test data with just 2 items
const simpleQuotationData = {
  salesCaseId: SALES_CASE_ID,
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  paymentTerms: '30 days',
  deliveryTerms: 'FOB',
  notes: 'Simple test quotation',
  internalNotes: 'Testing basic functionality',
  items: [
    {
      lineNumber: 1,
      itemType: 'PRODUCT',
      itemCode: 'TEST-001',
      description: 'Test Product 1',
      quantity: 1,
      unitPrice: 100,
      discount: 0,
      taxRate: 0,
      sortOrder: 1
    },
    {
      lineNumber: 2,
      itemType: 'SERVICE',
      itemCode: 'TEST-SVC-001',
      description: 'Test Service 1',
      quantity: 2,
      unitPrice: 50,
      discount: 10,
      taxRate: 7.5,
      sortOrder: 2
    }
  ]
};

async function testSimpleQuotation() {
  console.log('Testing simple quotation creation...\n');
  console.log('Request Data:', JSON.stringify(simpleQuotationData, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simpleQuotationData)
    });

    console.log('\nResponse Status:', response.status);
    console.log('Response Headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('Response Body:', responseText);
    
    if (responseText) {
      try {
        const result = JSON.parse(responseText);
        
        if (response.ok && result.success) {
          console.log('\n✅ Quotation created successfully!');
          console.log('Quotation ID:', result.data.id);
          console.log('Quotation Number:', result.data.quotationNumber);
        } else {
          console.log('\n❌ Error:', result);
        }
      } catch (parseError) {
        console.log('\n❌ Failed to parse response:', parseError.message);
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

testSimpleQuotation();