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

async function testSalesCasesAPI() {
  console.log('\n🔍 Testing Sales Cases API...\n');

  try {
    // Test 1: GET /api/sales-cases
    console.log('1. Testing GET /api/sales-cases');
    const response = await fetch(`${API_URL}/api/sales-cases`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`   ✓ Success! Found ${data.total} sales cases`);
    console.log(`   Page: ${data.page}/${data.totalPages}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n   Sample case:');
      const sampleCase = data.data[0];
      console.log(`   - Case Number: ${sampleCase.caseNumber}`);
      console.log(`   - Title: ${sampleCase.title}`);
      console.log(`   - Status: ${sampleCase.status}`);
      console.log(`   - Customer: ${sampleCase.customer?.name || 'N/A'}`);
    }

    // Test 2: GET with search parameter
    console.log('\n2. Testing GET /api/sales-cases with search');
    const searchResponse = await fetch(`${API_URL}/api/sales-cases?search=test`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${searchResponse.status}`);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log(`   ✓ Search successful! Found ${searchData.total} matching cases`);
    } else {
      const errorText = await searchResponse.text();
      console.error(`   ❌ Search error: ${errorText}`);
    }

    // Test 3: GET with pagination
    console.log('\n3. Testing GET /api/sales-cases with pagination');
    const pageResponse = await fetch(`${API_URL}/api/sales-cases?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${pageResponse.status}`);
    
    if (pageResponse.ok) {
      const pageData = await pageResponse.json();
      console.log(`   ✓ Pagination successful!`);
      console.log(`   - Returned ${pageData.data.length} items`);
      console.log(`   - Total items: ${pageData.total}`);
      console.log(`   - Page ${pageData.page} of ${pageData.totalPages}`);
    } else {
      const errorText = await pageResponse.text();
      console.error(`   ❌ Pagination error: ${errorText}`);
    }

    console.log('\n✅ Sales Cases API tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

// Run the tests
testSalesCasesAPI();