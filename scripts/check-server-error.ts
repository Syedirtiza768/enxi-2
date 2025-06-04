#!/usr/bin/env npx tsx

async function checkServerError() {
  console.log('🔍 Checking Server Status\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Check various endpoints
    const endpoints = [
      '/api/auth/validate',
      '/api/auth/login',
      '/api/leads'
    ];

    for (const endpoint of endpoints) {
      console.log(`\nChecking ${endpoint}...`);
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: endpoint.includes('login') ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.includes('login') ? JSON.stringify({
            username: 'admin',
            password: 'demo123'
          }) : undefined
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);

        const text = await response.text();
        
        if (response.headers.get('content-type')?.includes('application/json')) {
          try {
            const data = JSON.parse(text);
            console.log('Response:', data);
          } catch (e) {
            console.log('Invalid JSON:', text.substring(0, 200));
          }
        } else {
          // It's HTML, likely an error page
          console.log('HTML Response (first 500 chars):');
          console.log(text.substring(0, 500));
          
          // Try to extract error message from HTML
          const errorMatch = text.match(/<h1[^>]*>([^<]+)<\/h1>/);
          if (errorMatch) {
            console.log(`\nError: ${errorMatch[1]}`);
          }
          
          const messageMatch = text.match(/<div[^>]*class="[^"]*message[^"]*"[^>]*>([^<]+)<\/div>/);
          if (messageMatch) {
            console.log(`Message: ${messageMatch[1]}`);
          }
        }
      } catch (error: any) {
        console.error(`Failed to fetch ${endpoint}:`, error.message);
      }
    }

    // Check if server is running at all
    console.log('\n\nChecking if server is accessible...');
    try {
      const response = await fetch(BASE_URL);
      console.log(`Homepage status: ${response.status}`);
    } catch (error) {
      console.error('❌ Server is not running or not accessible on port 3000');
      console.log('\nPlease start the server with: npm run dev');
    }

  } catch (error: any) {
    console.error('Unexpected error:', error);
  }
}

checkServerError();