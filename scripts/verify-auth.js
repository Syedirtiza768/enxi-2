#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';

async function verifyAuth() {
  console.log('🔍 Checking authentication status...\n');

  // Check for auth token file
  const tokenPath = path.join(__dirname, '..', '.auth-token');
  let token = null;

  if (fs.existsSync(tokenPath)) {
    token = fs.readFileSync(tokenPath, 'utf8').trim();
    console.log('✅ Auth token file found');
    console.log(`📍 Token preview: ${token.substring(0, 20)}...`);
  } else {
    console.log('❌ No auth token file found');
  }

  // Test the token
  if (token) {
    console.log('\n🧪 Testing token validity...');
    
    try {
      const response = await fetch(`${API_URL}/api/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `auth-token=${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          console.log('✅ Token is valid!');
          console.log(`👤 Logged in as: ${data.user.username} (${data.user.role})`);
          console.log(`📧 Email: ${data.user.email || 'N/A'}`);
          
          // Test a protected endpoint
          console.log('\n🧪 Testing protected endpoint access...');
          const testResponse = await fetch(`${API_URL}/api/accounting/journal-entries`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (testResponse.ok) {
            console.log('✅ Protected endpoints are accessible');
          } else {
            console.log('⚠️  Protected endpoint returned:', testResponse.status);
          }
          
          return true;
        } else {
          console.log('❌ Token validation failed:', data);
        }
      } else {
        console.log('❌ Token is invalid or expired');
        console.log('   Status:', response.status);
      }
    } catch (error) {
      console.log('❌ Error validating token:', error.message);
    }
  }

  console.log('\n📝 To authenticate, run:');
  console.log('   node scripts/login.js');
  console.log('\n🌐 For browser access:');
  console.log('   1. Visit http://localhost:3000/login');
  console.log('   2. Login with username: admin, password: demo123');
  console.log('   3. The browser will automatically store the auth cookie');

  return false;
}

// Run verification
verifyAuth().then(isAuthenticated => {
  if (isAuthenticated) {
    console.log('\n✨ Authentication is working correctly!');
  } else {
    console.log('\n⚠️  You need to authenticate first.');
  }
  process.exit(isAuthenticated ? 0 : 1);
});