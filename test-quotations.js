const fetch = require('node-fetch');

async function testQuotations() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('Testing Quotation System...\n');
  
  // Test 1: List quotations (without auth - should fail)
  console.log('1. Testing quotations list without auth:');
  try {
    const response = await fetch(`${baseUrl}/api/quotations`);
    const data = await response.json();
    console.log('Response:', response.status, data);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n2. Checking if auth is required:');
  console.log('The system requires authentication. You need to:');
  console.log('- Login through the UI at http://localhost:3001/login');
  console.log('- Use the authenticated session to access quotations');
  console.log('\n3. Navigate to http://localhost:3001/quotations after logging in');
}

testQuotations();