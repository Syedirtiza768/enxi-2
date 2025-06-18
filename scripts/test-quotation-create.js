#!/usr/bin/env node

/**
 * Test script for creating a quotation
 * Usage: node scripts/test-quotation-create.js
 */

const fetch = require('node-fetch');

async function testQuotationCreate() {
  console.log('=== Testing Quotation Creation ===\n');

  const baseUrl = 'http://localhost:3000';
  
  // First, get a sales case to use
  console.log('1. Fetching sales cases...');
  try {
    const salesCasesResponse = await fetch(`${baseUrl}/api/sales-cases?status=OPEN`, {
      headers: {
        'Cookie': 'auth-token=test-token' // You may need to update this
      }
    });
    
    if (!salesCasesResponse.ok) {
      console.error('Failed to fetch sales cases:', salesCasesResponse.status);
      return;
    }
    
    const salesCasesData = await salesCasesResponse.json();
    console.log('Sales cases response:', JSON.stringify(salesCasesData, null, 2));
    
    if (!salesCasesData.data || salesCasesData.data.length === 0) {
      console.error('No open sales cases found');
      return;
    }
    
    const salesCase = salesCasesData.data[0];
    console.log(`\nUsing sales case: ${salesCase.caseNumber} (${salesCase.id})`);
    
    // Create a test quotation
    console.log('\n2. Creating quotation...');
    
    const quotationData = {
      salesCaseId: salesCase.id,
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB',
      notes: 'Test quotation',
      items: [
        {
          lineNumber: 1,
          isLineHeader: false,
          itemType: 'PRODUCT',
          itemCode: 'TEST-001',
          description: 'Test Product',
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          taxRate: 0
        }
      ]
    };
    
    console.log('Quotation data:', JSON.stringify(quotationData, null, 2));
    
    const createResponse = await fetch(`${baseUrl}/api/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=test-token' // You may need to update this
      },
      body: JSON.stringify(quotationData)
    });
    
    const responseText = await createResponse.text();
    console.log('\nResponse status:', createResponse.status);
    console.log('Response headers:', createResponse.headers.raw());
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('Response data:', JSON.stringify(responseData, null, 2));
      
      if (createResponse.ok) {
        console.log('\n✅ Quotation created successfully!');
        console.log('Quotation ID:', responseData.data?.id);
        console.log('Quotation Number:', responseData.data?.quotationNumber);
      } else {
        console.error('\n❌ Failed to create quotation');
        console.error('Error:', responseData.error);
        console.error('Message:', responseData.message);
        console.error('Details:', responseData.details);
      }
    } catch (parseError) {
      console.error('\n❌ Failed to parse response');
      console.error('Response text:', responseText);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testQuotationCreate().catch(console.error);