#!/usr/bin/env npx tsx

async function testAuthFix() {
  console.warn('🔧 Testing Authentication Fix\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Step 1: Login to get token
    console.warn('1. Logging in...');
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
    console.warn(`✅ Login successful. Token: ${token.substring(0, 30)}...`);

    // Step 2: Test auth endpoint directly
    console.warn('\n2. Testing auth endpoint...');
    const authTestResponse = await fetch(`${BASE_URL}/api/test-auth`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.warn(`Auth test status: ${authTestResponse.status}`);
    const authTestData = await authTestResponse.json();
    console.warn('Auth test response:', authTestData);

    if (authTestResponse.ok) {
      console.warn('✅ Bearer token authentication is working!');
    } else {
      console.warn('❌ Bearer token authentication failed');
    }

    // Step 3: Test lead creation
    console.warn('\n3. Testing lead creation...');
    const leadResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Lead',
        email: `test${Date.now()}@example.com`,
        phone: '+1234567890',
        company: 'Test Company',
        source: 'WEBSITE'
      })
    });

    console.warn(`Lead creation status: ${leadResponse.status}`);
    const leadData = await leadResponse.json();
    console.warn('Lead creation response:', leadData);

    if (leadResponse.ok) {
      console.warn('✅ Lead creation is working!');
    } else {
      console.warn('❌ Lead creation failed');
    }

    // Step 4: Test debug logs
    console.warn('\n4. Testing debug logs...');
    const debugResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=5`);
    
    console.warn(`Debug logs status: ${debugResponse.status}`);
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.warn(`✅ Debug logs accessible! Found ${debugData.count} logs`);
      
      // Show recent errors
      const recentErrors = debugData.logs.filter((log: any) => 
        log.level === 'ERROR' || log.level === 'WARN'
      );
      
      if (recentErrors.length > 0) {
        console.warn('\nRecent errors/warnings:');
        recentErrors.slice(0, 3).forEach((log: any) => {
          console.warn(`[${log.level}] ${log.message}`);
        });
      }
    } else {
      console.warn('❌ Debug logs still not accessible');
    }

  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

testAuthFix();