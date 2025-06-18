const fetch = require('node-fetch');

async function testQuotationAPI() {
  const testData = {
    salesCaseId: 'cmc1d2rxm0003v2ogxh67lc1a',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentTerms: '30 days',
    deliveryTerms: 'FOB',
    notes: 'Test quotation',
    internalNotes: 'Internal test',
    items: [
      {
        lineNumber: 1,
        lineDescription: '',
        isLineHeader: false,
        itemType: 'PRODUCT',
        itemCode: 'TEST-001',
        description: 'Test Product',
        internalDescription: '',
        quantity: 1,
        unitPrice: 100,
        discount: 0,
        taxRate: 0,
        cost: 0,
        sortOrder: 0
      }
    ]
  };

  console.log('Testing quotation API with data:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/quotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('\nResponse status:', response.status);
    console.log('Response headers:', response.headers.raw());

    const responseText = await response.text();
    console.log('\nResponse body:', responseText);

    if (responseText) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('\nParsed response:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testQuotationAPI();