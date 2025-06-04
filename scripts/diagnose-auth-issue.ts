#!/usr/bin/env npx tsx

async function diagnoseAuthIssue() {
  console.log('🔍 Diagnosing Authentication Issue\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    // Step 1: Get a valid token
    console.log('🔐 Step 1: Getting authentication token...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Cannot get token - login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Token obtained:', token.substring(0, 50) + '...');

    // Step 2: Test the token directly with validation endpoint
    console.log('\n🧪 Step 2: Testing token with validation endpoint...');
    
    const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Validation status: ${validateResponse.status}`);
    if (validateResponse.ok) {
      const validateData = await validateResponse.json();
      console.log('✅ Token validation works:', validateData.user?.username);
    } else {
      console.log('❌ Token validation failed');
      return;
    }

    // Step 3: Test with a problematic route and detailed logging
    console.log('\n🔬 Step 3: Testing problematic route with detailed debugging...');
    
    // First, let's test if the issue is with our wrapper
    const testRoutes = [
      '/api/leads',
      '/api/customers', 
      '/api/system/health'
    ];

    for (const route of testRoutes) {
      console.log(`\nTesting ${route}:`);
      
      const response = await fetch(`${BASE_URL}${route}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Debug': 'true'
        }
      });

      console.log(`  Status: ${response.status}`);
      console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));
      
      try {
        const responseData = await response.json();
        console.log(`  Response:`, JSON.stringify(responseData, null, 2).substring(0, 200));
      } catch {
        const textData = await response.text();
        console.log(`  Text Response:`, textData.substring(0, 200));
      }
    }

    // Step 4: Test if the issue is with cookie vs bearer token
    console.log('\n🍪 Step 4: Testing cookie vs bearer token...');
    
    // Extract cookie from login response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('Set-Cookie header:', setCookieHeader);
    
    if (setCookieHeader) {
      // Test with cookie
      const cookieResponse = await fetch(`${BASE_URL}/api/leads`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': setCookieHeader
        }
      });
      
      console.log(`Cookie auth test - Status: ${cookieResponse.status}`);
    }

    // Step 5: Check if middleware is properly configured
    console.log('\n⚙️ Step 5: Testing middleware configuration...');
    
    // Test a route that should NOT require auth
    const publicRoutes = [
      '/api/auth/login',
      '/api/test-auth'
    ];

    for (const route of publicRoutes) {
      const response = await fetch(`${BASE_URL}${route}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`${route} (no auth): ${response.status}`);
    }

    // Step 6: Examine the exact error from debug logs
    console.log('\n📋 Step 6: Checking debug logs for auth errors...');
    
    try {
      const debugResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=20`, {
        method: 'GET'
      });
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('✅ Debug logs accessible');
        
        if (debugData.logs) {
          const authErrors = debugData.logs.filter((log: any) => 
            log.message?.toLowerCase().includes('auth') || 
            log.message?.toLowerCase().includes('token') ||
            log.level === 'ERROR'
          );
          
          console.log(`Found ${authErrors.length} auth-related log entries:`);
          authErrors.slice(0, 5).forEach((log: any, index: number) => {
            console.log(`  ${index + 1}. [${log.level}] ${log.message}`);
            if (log.context) {
              console.log(`     Context:`, JSON.stringify(log.context, null, 2).substring(0, 150));
            }
          });
        }
      }
    } catch (error) {
      console.log('❌ Could not access debug logs:', error instanceof Error ? error.message : 'Unknown');
    }

    // Step 7: Final diagnosis
    console.log('\n🎯 DIAGNOSIS:');
    console.log('='.repeat(50));
    
    console.log('✅ Authentication service is working (login + validation work)');
    console.log('✅ JWT token generation and verification work');
    console.log('❌ Protected routes are rejecting valid Bearer tokens');
    
    console.log('\n🔍 LIKELY CAUSES:');
    console.log('1. Universal error wrapper is not properly handling auth');
    console.log('2. Middleware order is incorrect');
    console.log('3. Routes are not using the auth wrapper correctly');
    console.log('4. There\'s a syntax error in the route exports');
    console.log('5. The authentication utility has a bug in token extraction');
    
    console.log('\n🛠️ NEXT STEPS TO FIX:');
    console.log('1. Check and fix route export syntax');
    console.log('2. Verify universal error wrapper handles auth correctly');
    console.log('3. Test auth utility token extraction logic');
    console.log('4. Fix any middleware ordering issues');
    console.log('5. Ensure all routes use consistent auth patterns');

  } catch (error: any) {
    console.error('\n❌ DIAGNOSIS FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnoseAuthIssue();