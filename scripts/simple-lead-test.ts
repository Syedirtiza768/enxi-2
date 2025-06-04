#!/usr/bin/env npx tsx

// Simple direct test without complex client
async function testLeadCreation() {
  console.log('🔍 Simple Lead Creation Test\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Step 1: Test if server is running
    console.log('1. Testing server connection...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/auth/validate`);
      console.log(`Server response: ${healthResponse.status} ${healthResponse.statusText}`);
    } catch (error) {
      console.error('❌ Server not running or not accessible');
      console.log('Please start the server with: npm run dev');
      return;
    }

    // Step 2: Login
    console.log('\n2. Attempting login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });

    const loginData = await loginResponse.json();
    console.log(`Login response: ${loginResponse.status}`);
    console.log('Login data:', loginData);

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log(`✅ Got token: ${token ? token.substring(0, 20) + '...' : 'none'}`);

    // Step 3: Create a lead
    console.log('\n3. Creating lead...');
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
    console.log(`Lead response: ${leadResponse.status}`);
    console.log('Lead data:', leadData);

    if (leadResponse.ok) {
      console.log('✅ Lead created successfully!');
    } else {
      console.log('❌ Lead creation failed');
    }

    // Step 4: Check debug logs
    console.log('\n4. Fetching debug logs...');
    const logsResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.log(`\n📋 Recent logs (${logsData.logs?.length || 0} entries):\n`);
      
      const relevantLogs = logsData.logs?.filter((log: any) => 
        log.message.toLowerCase().includes('lead') ||
        log.level === 'ERROR' ||
        log.level === 'WARN'
      );

      if (relevantLogs?.length > 0) {
        relevantLogs.forEach((log: any) => {
          console.log(`[${log.level}] ${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}`);
          if (log.error) {
            console.log('  Error:', log.error.message);
          }
          if (log.data) {
            console.log('  Data:', JSON.stringify(log.data, null, 2));
          }
        });
      } else {
        console.log('No relevant logs found');
      }
    } else {
      console.log('Could not fetch debug logs:', logsResponse.status);
    }

  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
  }
}

// Run the test
testLeadCreation();