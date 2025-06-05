#!/usr/bin/env npx tsx

// Simple direct test without complex client
async function testLeadCreation() {
  console.warn('🔍 Simple Lead Creation Test\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Step 1: Test if server is running
    console.warn('1. Testing server connection...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/auth/validate`);
      console.warn(`Server response: ${healthResponse.status} ${healthResponse.statusText}`);
} catch (error) {
      console.error('Error:', error);
      // Step 2: Login
    console.warn('\n2. Attempting login...');
    const loginResponse = await fetch(`${BASE_URL
    }/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });

    const loginData = await loginResponse.json();
    console.warn(`Login response: ${loginResponse.status}`);
    console.warn('Login data:', loginData);

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.warn(`✅ Got token: ${token ? token.substring(0, 20) + '...' : 'none'}`);

    // Step 3: Create a lead
    console.warn('\n3. Creating lead...');
    const leadResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        phone: '+1234567890',
        company: 'Test Company',
        source: 'WEBSITE',
        jobTitle: 'Manager',
        notes: 'Testing lead creation'
      })
    });

    const leadData = await leadResponse.json();
    console.warn(`Lead response: ${leadResponse.status}`);
    console.warn('Lead data:', leadData);

    if (leadResponse.ok) {
      console.warn('✅ Lead created successfully!');
    } else {
      console.warn('❌ Lead creation failed');
    }

    // Step 4: Check debug logs
    console.warn('\n4. Fetching debug logs...');
    const logsResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.warn(`\n📋 Recent logs (${logsData.logs?.length || 0} entries):\n`);
      
      const relevantLogs = logsData.logs?.filter((log: any) => 
        log.message.toLowerCase().includes('lead') ||
        log.level === 'ERROR' ||
        log.level === 'WARN'
      );

      if (relevantLogs?.length > 0) {
        relevantLogs.forEach((log: any) => {
          console.warn(`[${log.level}] ${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}`);
          if (log.error) {
            console.warn('  Error:', log.error.message);
          }
          if (log.data) {
            console.warn('  Data:', JSON.stringify(log.data, null, 2));
          }
        });
      } else {
        console.warn('No relevant logs found');
      }
    } else {
      console.warn('Could not fetch debug logs:', logsResponse.status);
    }

  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
  }
}

// Run the test
testLeadCreation();