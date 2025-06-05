#!/usr/bin/env npx tsx

import { AuthService } from '../lib/services/auth.service';

async function testAuth() {
  console.warn('🔍 Testing Authentication Directly\n');

  try {
    const authService = new AuthService();

    // Step 1: Test user validation
    console.warn('1. Testing user validation...');
    const user = await authService.validateUser('admin', 'demo123');
    
    if (user) {
      console.warn('✅ User validation successful:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } else {
      console.warn('❌ User validation failed');
      return;
    }

    // Step 2: Test token generation
    console.warn('\n2. Testing token generation...');
    const token = authService.generateToken(user);
    console.warn('✅ Token generated:', token.substring(0, 50) + '...');

    // Step 3: Test token verification
    console.warn('\n3. Testing token verification...');
    const verifiedUser = authService.verifyToken(token);
    
    if (verifiedUser) {
      console.warn('✅ Token verification successful:', {
        id: verifiedUser.id,
        username: verifiedUser.username,
        email: verifiedUser.email,
        role: verifiedUser.role
      });
    } else {
      console.warn('❌ Token verification failed');
      return;
    }

    // Step 4: Test JWT secret
    console.warn('\n4. Testing JWT secret...');
    console.warn('JWT_SECRET is set:', !!process.env.JWT_SECRET);
    console.warn('JWT_SECRET value:', process.env.JWT_SECRET?.substring(0, 20) + '...');

  } catch (error: any) {
    console.error('Auth test error:', error.message);
    console.error(error);
  }
}

testAuth();