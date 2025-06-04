#!/usr/bin/env npx tsx

import { AuthService } from '../lib/services/auth.service';

async function testAuth() {
  console.log('🔍 Testing Authentication Directly\n');

  try {
    const authService = new AuthService();

    // Step 1: Test user validation
    console.log('1. Testing user validation...');
    const user = await authService.validateUser('admin', 'demo123');
    
    if (user) {
      console.log('✅ User validation successful:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } else {
      console.log('❌ User validation failed');
      return;
    }

    // Step 2: Test token generation
    console.log('\n2. Testing token generation...');
    const token = authService.generateToken(user);
    console.log('✅ Token generated:', token.substring(0, 50) + '...');

    // Step 3: Test token verification
    console.log('\n3. Testing token verification...');
    const verifiedUser = authService.verifyToken(token);
    
    if (verifiedUser) {
      console.log('✅ Token verification successful:', {
        id: verifiedUser.id,
        username: verifiedUser.username,
        email: verifiedUser.email,
        role: verifiedUser.role
      });
    } else {
      console.log('❌ Token verification failed');
      return;
    }

    // Step 4: Test JWT secret
    console.log('\n4. Testing JWT secret...');
    console.log('JWT_SECRET is set:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET value:', process.env.JWT_SECRET?.substring(0, 20) + '...');

  } catch (error: any) {
    console.error('Auth test error:', error.message);
    console.error(error);
  }
}

testAuth();