#!/usr/bin/env npx tsx

async function testWrapperRoutes() {
  console.log('🧪 Testing Wrapper Routes\n');
  
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
    
    console.log('🔑 Token obtained successfully\n');
    
    // Test 1: No auth required wrapper
    console.log('1. Testing wrapper without auth (/api/test-wrapper):');
    const noAuthResponse = await fetch(`${BASE_URL}/api/test-wrapper`);
    console.log(`   Status: ${noAuthResponse.status}`);
    
    if (noAuthResponse.ok) {
      const data = await noAuthResponse.json();
      console.log(`   ✅ SUCCESS: ${data.message}`);
    } else {
      const error = await noAuthResponse.text();
      console.log(`   ❌ FAILED: ${error}`);
    }
    
    // Test 2: Auth required wrapper  
    console.log('\n2. Testing wrapper with auth (/api/test-auth-wrapper):');
    const authResponse = await fetch(`${BASE_URL}/api/test-auth-wrapper`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${authResponse.status}`);
    
    if (authResponse.ok) {
      const data = await authResponse.json();
      console.log(`   ✅ SUCCESS: ${data.message}, User: ${data.user?.username}`);
    } else {
      const error = await authResponse.text();
      console.log(`   ❌ FAILED: ${error}`);
    }
    
    // Test 3: Auth required wrapper without token
    console.log('\n3. Testing wrapper with auth but no token:');
    const noTokenResponse = await fetch(`${BASE_URL}/api/test-auth-wrapper`);
    console.log(`   Status: ${noTokenResponse.status}`);
    
    if (noTokenResponse.status === 401) {
      console.log(`   ✅ CORRECT: Properly rejected without token`);
    } else {
      console.log(`   ❌ WRONG: Should have been 401 but got ${noTokenResponse.status}`);
    }
    
    // Test 4: Compare with working auth route
    console.log('\n4. Comparing with working auth route (/api/auth/validate):');
    const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${validateResponse.status}`);
    
    if (validateResponse.ok) {
      const data = await validateResponse.json();
      console.log(`   ✅ SUCCESS: ${data.user?.username}`);
    } else {
      console.log(`   ❌ FAILED: Unexpected failure`);
    }
    
    console.log('\n🎯 ANALYSIS:');
    
    if (noAuthResponse.ok) {
      console.log('✅ Universal wrapper works for non-auth routes');
    } else {
      console.log('❌ Universal wrapper broken for non-auth routes');
    }
    
    if (authResponse.ok) {
      console.log('✅ Universal wrapper works for auth routes with Bearer token');
      console.log('🎯 CONCLUSION: The wrapper is working! Issue is elsewhere.');
    } else {
      console.log('❌ Universal wrapper broken for auth routes');
      console.log('🎯 CONCLUSION: Issue is in the wrapper authentication handling');
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testWrapperRoutes();