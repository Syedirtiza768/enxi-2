#!/usr/bin/env npx tsx

async function diagnoseAuthIssue() {
  console.warn('🔍 Diagnosing Authentication Issue\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    // Step 1: Get a valid token
    console.warn('🔐 Step 1: Getting authentication token...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });

    if (!loginResponse.ok) {
      console.warn('❌ Cannot get token - login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.warn('✅ Token obtained:', token.substring(0, 50) + '...');

    // Step 2: Test the token directly with validation endpoint
    console.warn('\n🧪 Step 2: Testing token with validation endpoint...');
    
    const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.warn(`Validation status: ${validateResponse.status}`);
    if (validateResponse.ok) {
      const validateData = await validateResponse.json();
      console.warn('✅ Token validation works:', validateData.user?.username);
    } else {
      console.warn('❌ Token validation failed');
      return;
    }

    // Step 3: Test with a problematic route and detailed logging
    console.warn('\n🔬 Step 3: Testing problematic route with detailed debugging...');
    
    // First, let's test if the issue is with our wrapper
    const testRoutes = [
      '/api/leads',
      '/api/customers', 
      '/api/system/health'
    ];

    for (const route of testRoutes) {
      console.warn(`\nTesting ${route}:`);
      
      const response = await fetch(`${BASE_URL}${route}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Debug': 'true'
        }
      });

      console.warn(`  Status: ${response.status}`);
      console.warn(`  Headers:`, Object.fromEntries(response.headers.entries()));
      
      try {
        const responseData = await response.json();
        console.warn(`  Response:`, JSON.stringify(responseData, null, 2).substring(0, 200));
      } catch (error) {
      console.error('Error:', error);
      const textData = await response.text();
        console.warn(`  Text Response:`, textData.substring(0, 200));
    }
    }

    // Step 4: Test if the issue is with cookie vs bearer token
    console.warn('\n🍪 Step 4: Testing cookie vs bearer token...');
    
    // Extract cookie from login response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.warn('Set-Cookie header:', setCookieHeader);
    
    if (setCookieHeader) {
      // Test with cookie
      const cookieResponse = await fetch(`${BASE_URL}/api/leads`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': setCookieHeader
        }
      });
      
      console.warn(`Cookie auth test - Status: ${cookieResponse.status}`);
    }

    // Step 5: Check if middleware is properly configured
    console.warn('\n⚙️ Step 5: Testing middleware configuration...');
    
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
      
      console.warn(`${route} (no auth): ${response.status}`);
    }

    // Step 6: Examine the exact error from debug logs
    console.warn('\n📋 Step 6: Checking debug logs for auth errors...');
    
    try {
      const debugResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=20`, {
        method: 'GET'
      });
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.warn('✅ Debug logs accessible');
        
        if (debugData.logs) {
          const authErrors = debugData.logs.filter((log: any) => 
            log.message?.toLowerCase().includes('auth') || 
            log.message?.toLowerCase().includes('token') ||
            log.level === 'ERROR'
          );
          
          console.warn(`Found ${authErrors.length} auth-related log entries:`);
          authErrors.slice(0, 5).forEach((log: any, index: number) => {
            console.warn(`  ${index + 1}. [${log.level}] ${log.message}`);
            if (log.context) {
              console.warn(`     Context:`, JSON.stringify(log.context, null, 2).substring(0, 150));
            }
          });
        }
      }
} catch (error) {
    // Step 7: Final diagnosis
    console.warn('\n🎯 DIAGNOSIS:');
    console.warn('='.repeat(50));
    
    console.warn('✅ Authentication service is working (login + validation work)');
    console.warn('✅ JWT token generation and verification work');
    console.warn('❌ Protected routes are rejecting valid Bearer tokens');
    
    console.warn('\n🔍 LIKELY CAUSES:');
    console.warn('1. Universal error wrapper is not properly handling auth');
    console.warn('2. Middleware order is incorrect');
    console.warn('3. Routes are not using the auth wrapper correctly');
    console.warn('4. There\'s a syntax error in the route exports');
    console.warn('5. The authentication utility has a bug in token extraction');
    
    console.warn('\n🛠️ NEXT STEPS TO FIX:');
    console.warn('1. Check and fix route export syntax');
    console.warn('2. Verify universal error wrapper handles auth correctly');
    console.warn('3. Test auth utility token extraction logic');
    console.warn('4. Fix any middleware ordering issues');
    console.warn('5. Ensure all routes use consistent auth patterns');

    }
  } catch (error: any) {
    console.error('\n❌ DIAGNOSIS FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnoseAuthIssue();