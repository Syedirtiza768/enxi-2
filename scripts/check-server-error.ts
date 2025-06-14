#!/usr/bin/env npx tsx

async function checkServerError(): Promise<boolean> {
  console.warn('🔍 Checking Server Status\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Check various endpoints
    const endpoints = [
      '/api/auth/validate',
      '/api/auth/login',
      '/api/leads'
    ];

    for (const endpoint of endpoints) {
      console.warn(`\nChecking ${endpoint}...`);
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: endpoint.includes('login') ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.includes('login') ? JSON.stringify({
            username: 'admin',
            password: 'demo123'
          }) : undefined
        });

        console.warn(`Status: ${response.status} ${response.statusText}`);
        console.warn(`Content-Type: ${response.headers.get('content-type')}`);

        const text = await response.text();
        
        if (response.headers.get('content-type')?.includes('application/json')) {
          try {
            const data = JSON.parse(text);
            console.warn('Response:', data);
          } catch (e) {
            console.warn('Invalid JSON:', text.substring(0, 200));
          }
        } else {
          // It's HTML, likely an error page
          console.warn('HTML Response (first 500 chars):');
          console.warn(text.substring(0, 500));
          
          // Try to extract error message from HTML
          const errorMatch = text.match(/<h1[^>]*>([^<]+)<\/h1>/);
          if (errorMatch) {
            console.warn(`\nError: ${errorMatch[1]}`);
          }
          
          const messageMatch = text.match(/<div[^>]*class="[^"]*message[^"]*"[^>]*>([^<]+)<\/div>/);
          if (messageMatch) {
            console.warn(`Message: ${messageMatch[1]}`);
          }
        }
      } catch (error: any) {
        console.error(`Failed to fetch ${endpoint}:`, error.message);
      }
    }

    // Check if server is running at all
    console.warn('\n\nChecking if server is accessible...');
    try {
      const response = await fetch(BASE_URL);
      console.warn(`Homepage status: ${response.status}`);
} catch (error) {
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
  }
}

checkServerError();