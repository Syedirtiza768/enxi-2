// Test with absolute minimal data to isolate the issue
const fetch = require('node-fetch');

async function testMinimalQuotation() {
  // Start with the most minimal valid quotation
  const minimalData = {
    salesCaseId: 'cmc1d2rxm0003v2ogxh67lc1a',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        itemCode: 'TEST',
        description: 'Test Item',
        quantity: 1,
        unitPrice: 100
      }
    ]
  };

  console.log('Testing with minimal data:', JSON.stringify(minimalData, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/quotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalData)
    });

    const responseText = await response.text();
    console.log('\nStatus:', response.status);
    
    if (responseText) {
      try {
        const data = JSON.parse(responseText);
        console.log('Response:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Raw response:', responseText);
      }
    } else {
      console.log('Empty response body');
      
      // Try to get more info
      console.log('\nTrying to check server health...');
      const healthCheck = await fetch('http://localhost:3000/api/auth/validate');
      console.log('Auth endpoint status:', healthCheck.status);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMinimalQuotation();