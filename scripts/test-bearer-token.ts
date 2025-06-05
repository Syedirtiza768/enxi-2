#!/usr/bin/env npx tsx

async function testBearerToken() {
  console.warn('🔍 Testing Bearer Token Processing\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    // Get token
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'demo123' })
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.warn('🔑 Token obtained:', token.substring(0, 50) + '...');
    
    // Test Bearer token extraction by creating a test endpoint
    console.warn('\n🧪 Testing Bearer token with auth validation endpoint...');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.warn('Headers being sent:', headers);
    
    // Test with the validation endpoint (which works)
    const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
      method: 'GET',
      headers
    });
    
    console.warn(`Validation endpoint status: ${validateResponse.status}`);
    
    if (validateResponse.ok) {
      const data = await validateResponse.json();
      console.warn('✅ Bearer token works with validation endpoint');
      console.warn('User:', data.user?.username);
    }
    
    // Now test with a problematic endpoint
    console.warn('\n🔬 Testing with problematic leads endpoint...');
    
    const leadsResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'GET',
      headers
    });
    
    console.warn(`Leads endpoint status: ${leadsResponse.status}`);
    
    if (!leadsResponse.ok) {
      const errorData = await leadsResponse.json();
      console.warn('❌ Leads endpoint failed:', errorData);
      
      // Let's examine the request/response more carefully
      console.warn('\n🔍 Detailed analysis:');
      console.warn('Request headers:', Object.fromEntries(Object.entries(headers)));
      console.warn('Response headers:', Object.fromEntries(leadsResponse.headers.entries()));
    }
    
    // Test if the issue is route-specific by trying other endpoints
    console.warn('\n🎯 Testing multiple endpoints with same token...');
    
    const testEndpoints = [
      '/api/auth/validate',  // Known working
      '/api/leads',          // Known failing
      '/api/customers',      // Likely failing
      '/api/test-auth'       // Test endpoint
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const statusEmoji = response.status >= 200 && response.status < 300 ? '✅' : '❌';
        console.warn(`${statusEmoji} ${endpoint}: ${response.status}`);
        
        if (!response.ok) {
          try {
            const errorData = await response.json();
            console.warn(`   Error: ${JSON.stringify(errorData)}`);
          } catch (error) {
      console.error('Error:', error);
      const text = await response.text();
            console.warn(`   Text: ${text.substring(0, 100)
    }`);
          }
        }
} catch {      }
    }
    
    console.warn('\n🔍 CONCLUSION:');
    
    // Check if auth/validate works but others don't
    const validateWorks = await fetch(`${BASE_URL}/api/auth/validate`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }).then(r => r.ok);
    
    const leadsWorks = await fetch(`${BASE_URL}/api/leads`, {
      method: 'GET', 
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }).then(r => r.ok);
    
    if (validateWorks && !leadsWorks) {
      console.warn('🎯 ISSUE IDENTIFIED: Bearer token works for /api/auth/validate but fails for other routes');
      console.warn('   This suggests the issue is in:');
      console.warn('   1. The universal error wrapper implementation');
      console.warn('   2. How routes are exported after our changes');
      console.warn('   3. Middleware ordering in specific routes');
      console.warn('\n🛠️ SOLUTION: Fix the universal error wrapper or route exports');
    } else if (!validateWorks) {
      console.warn('🎯 ISSUE IDENTIFIED: Bearer token parsing is completely broken');
      console.warn('   This suggests the issue is in the auth utility itself');
    } else {
      console.warn('🎯 UNEXPECTED: Bearer tokens seem to be working now');
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBearerToken();