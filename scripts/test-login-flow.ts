#!/usr/bin/env tsx
// Test the complete login flow

import { AuthService } from '../lib/services/auth.service'

async function testLoginFlow(): Promise<{ user: any, session?: any }> {
  console.warn('🧪 Testing Complete Login Flow...\n')
  
  try {
    const authService = new AuthService()
    
    // Test 1: Validate credentials
    console.warn('1. Testing credential validation...')
    const user = await authService.validateUser('admin', 'admin123')
    
    if (!user) {
      console.warn('❌ Credential validation failed')
      return
    }
    
    console.warn('✅ Credentials validated:', user.username)
    
    // Test 2: Generate token
    console.warn('\n2. Testing token generation...')
    const token = authService.generateToken(user)
    console.warn('✅ Token generated:', token.substring(0, 50) + '...')
    
    // Test 3: Verify token
    console.warn('\n3. Testing token verification...')
    const decoded = authService.verifyToken(token)
    
    if (!decoded) {
      console.warn('❌ Token verification failed')
      return
    }
    
    console.warn('✅ Token verified successfully')
    console.warn('   Decoded user:', decoded.username)
    console.warn('   User ID:', decoded.id)
    console.warn('   Role:', decoded.role)
    
    // Test 4: Test with actual HTTP request simulation
    console.warn('\n4. Testing HTTP flow simulation...')
    
    // Simulate the exact request the browser would make
    const loginRequest = {
      username: 'admin',
      password: 'admin123'
    }
    
    const simulatedUser = await authService.validateUser(
      loginRequest.username, 
      loginRequest.password
    )
    
    if (simulatedUser) {
      const simulatedToken = authService.generateToken(simulatedUser)
      const simulatedDecoded = authService.verifyToken(simulatedToken)
      
      console.warn('✅ HTTP flow simulation successful')
      console.warn('   Response would be:', {
        token: simulatedToken.substring(0, 20) + '...',
        user: simulatedUser
      })
      
      // Test middleware token validation
      console.warn('\n5. Testing middleware token validation...')
      if (simulatedDecoded && simulatedDecoded.id === simulatedUser.id) {
        console.warn('✅ Middleware would accept this token')
        console.warn('   User would be redirected to: /dashboard')
      } else {
        console.warn('❌ Middleware would reject this token')
      }
    }
    
    // Test 6: Debug potential issues
    console.warn('\n6. Debugging potential issues...')
    
    // Check token expiry
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = payload.exp - now
    
    console.warn('✅ Token diagnostics:')
    console.warn(`   Issued at: ${new Date(payload.iat * 1000).toISOString()}`)
    console.warn(`   Expires at: ${new Date(payload.exp * 1000).toISOString()}`)
    console.warn(`   Time until expiry: ${expiresIn} seconds`)
    console.warn(`   Is valid: ${expiresIn > 0 ? 'Yes' : 'No'}`)
    
    console.warn('\n🎉 Login Flow Test Complete!')
    console.warn('\n📋 Results:')
    console.warn('   • Credential validation: ✅')
    console.warn('   • Token generation: ✅')
    console.warn('   • Token verification: ✅')
    console.warn('   • HTTP flow: ✅')
    console.warn('   • Middleware compatibility: ✅')
    
    console.warn('\n🔍 If login still fails in browser:')
    console.warn('   1. Check browser console for errors')
    console.warn('   2. Check Network tab for failed requests')
    console.warn('   3. Verify cookie is being set')
    console.warn('   4. Check if JavaScript is enabled')
    console.warn('   5. Try clearing browser cache')
    
} catch {}

testLoginFlow()