#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the auth token
const tokenPath = path.join(__dirname, '.auth-token');
let authToken = '';

try {
  authToken = fs.readFileSync(tokenPath, 'utf8').trim();
  console.log('✓ Auth token loaded');
} catch (error) {
  console.error('❌ Error: Could not read auth token from .auth-token file');
  console.error('Please run the login script first to generate a token');
  process.exit(1);
}

const API_URL = 'http://localhost:3000';

async function testCreateSalesCase() {
  console.log('\n🔍 Testing Sales Case Creation...\n');

  try {
    // First, get a customer to use
    console.log('1. Fetching customers...');
    const customersResponse = await fetch(`${API_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!customersResponse.ok) {
      console.error('Failed to fetch customers:', await customersResponse.text());
      return;
    }

    const customersData = await customersResponse.json();
    const customers = Array.isArray(customersData) ? customersData : (customersData.data || []);
    
    if (customers.length === 0) {
      console.error('No customers found. Please create a customer first.');
      return;
    }

    const customer = customers[0];
    console.log(`   ✓ Using customer: ${customer.name} (${customer.id})`);

    // Test creating a sales case
    console.log('\n2. Creating new sales case...');
    const salesCaseData = {
      customerId: customer.id,
      title: 'Test Sales Case - ' + new Date().toISOString(),
      description: 'This is a test sales case created via API',
      estimatedValue: 50000,
      assignedTo: '' // Empty for now, will use the authenticated user
    };

    console.log('   Request body:', JSON.stringify(salesCaseData, null, 2));

    const createResponse = await fetch(`${API_URL}/api/sales-cases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(salesCaseData)
    });

    console.log(`   Status: ${createResponse.status}`);
    const responseText = await createResponse.text();
    
    if (!createResponse.ok) {
      console.error(`   ❌ Error creating sales case:`);
      console.error(`   Response: ${responseText}`);
      
      // Try to parse as JSON for better error display
      try {
        const errorData = JSON.parse(responseText);
        console.error('   Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        // Not JSON, already displayed as text
      }
      return;
    }

    const createdCase = JSON.parse(responseText);
    console.log(`   ✓ Sales case created successfully!`);
    console.log(`   - Case Number: ${createdCase.data.caseNumber}`);
    console.log(`   - ID: ${createdCase.data.id}`);
    console.log(`   - Title: ${createdCase.data.title}`);
    console.log(`   - Status: ${createdCase.data.status}`);

    console.log('\n✅ Sales case creation test completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCreateSalesCase();