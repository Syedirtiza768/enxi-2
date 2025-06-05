#!/usr/bin/env npx tsx

async function testAuthHeader() {
  console.warn('🔍 Testing Auth Header Processing\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Step 1: Login to get a token
    console.warn('1. Getting token...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.warn('Token received:', token.substring(0, 50) + '...');

    // Step 2: Test the validate endpoint with the token
    console.warn('\n2. Testing auth validation endpoint...');
    const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.warn('Validate response status:', validateResponse.status);
    
    if (validateResponse.ok) {
      const validateData = await validateResponse.json();
      console.warn('✅ Auth validation successful:', validateData);
    } else {
      const errorText = await validateResponse.text();
      console.warn('❌ Auth validation failed:', errorText.substring(0, 200));
    }

    // Step 3: Test debug logs with explicit NODE_ENV
    console.warn('\n3. Testing debug logs...');
    const logsResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.warn('Debug logs response status:', logsResponse.status);
    
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.warn('✅ Debug logs accessible:', logsData.count, 'logs');
    } else {
      const errorText = await logsResponse.text();
      console.warn('❌ Debug logs failed:', errorText.substring(0, 200));
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testAuthHeader();