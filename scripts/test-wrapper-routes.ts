#!/usr/bin/env npx tsx

async function testWrapperRoutes() {
  console.warn('🧪 Testing Wrapper Routes\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    // Get token first
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'demo123' })
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.warn('🔑 Token obtained successfully\n');
    
    // Test 1: No auth required wrapper
    console.warn('1. Testing wrapper without auth (/api/test-wrapper):');
    const noAuthResponse = await fetch(`${BASE_URL}/api/test-wrapper`);
    console.warn(`   Status: ${noAuthResponse.status}`);
    
    if (noAuthResponse.ok) {
      const data = await noAuthResponse.json();
      console.warn(`   ✅ SUCCESS: ${data.message}`);
    } else {
      const error = await noAuthResponse.text();
      console.warn(`   ❌ FAILED: ${error}`);
    }
    
    // Test 2: Auth required wrapper  
    console.warn('\n2. Testing wrapper with auth (/api/test-auth-wrapper):');
    const authResponse = await fetch(`${BASE_URL}/api/test-auth-wrapper`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.warn(`   Status: ${authResponse.status}`);
    
    if (authResponse.ok) {
      const data = await authResponse.json();
      console.warn(`   ✅ SUCCESS: ${data.message}, User: ${data.user?.username}`);
    } else {
      const error = await authResponse.text();
      console.warn(`   ❌ FAILED: ${error}`);
    }
    
    // Test 3: Auth required wrapper without token
    console.warn('\n3. Testing wrapper with auth but no token:');
    const noTokenResponse = await fetch(`${BASE_URL}/api/test-auth-wrapper`);
    console.warn(`   Status: ${noTokenResponse.status}`);
    
    if (noTokenResponse.status === 401) {
      console.warn(`   ✅ CORRECT: Properly rejected without token`);
    } else {
      console.warn(`   ❌ WRONG: Should have been 401 but got ${noTokenResponse.status}`);
    }
    
    // Test 4: Compare with working auth route
    console.warn('\n4. Comparing with working auth route (/api/auth/validate):');
    const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.warn(`   Status: ${validateResponse.status}`);
    
    if (validateResponse.ok) {
      const data = await validateResponse.json();
      console.warn(`   ✅ SUCCESS: ${data.user?.username}`);
    } else {
      console.warn(`   ❌ FAILED: Unexpected failure`);
    }
    
    console.warn('\n🎯 ANALYSIS:');
    
    if (noAuthResponse.ok) {
      console.warn('✅ Universal wrapper works for non-auth routes');
    } else {
      console.warn('❌ Universal wrapper broken for non-auth routes');
    }
    
    if (authResponse.ok) {
      console.warn('✅ Universal wrapper works for auth routes with Bearer token');
      console.warn('🎯 CONCLUSION: The wrapper is working! Issue is elsewhere.');
    } else {
      console.warn('❌ Universal wrapper broken for auth routes');
      console.warn('🎯 CONCLUSION: Issue is in the wrapper authentication handling');
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testWrapperRoutes();