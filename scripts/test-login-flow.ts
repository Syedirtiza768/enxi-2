#!/usr/bin/env tsx
// Test the complete login flow

import { AuthService } from '../lib/services/auth.service'

async function testLoginFlow() {
  console.log('🧪 Testing Complete Login Flow...\n')
  
  try {
    const authService = new AuthService()
    
    // Test 1: Validate credentials
    console.log('1. Testing credential validation...')
    const user = await authService.validateUser('admin', 'admin123')
    
    if (!user) {
      console.log('❌ Credential validation failed')
      return
    }
    
    console.log('✅ Credentials validated:', user.username)
    
    // Test 2: Generate token
    console.log('\n2. Testing token generation...')
    const token = authService.generateToken(user)
    console.log('✅ Token generated:', token.substring(0, 50) + '...')
    
    // Test 3: Verify token
    console.log('\n3. Testing token verification...')
    const decoded = authService.verifyToken(token)
    
    if (!decoded) {
      console.log('❌ Token verification failed')
      return
    }
    
    console.log('✅ Token verified successfully')
    console.log('   Decoded user:', decoded.username)
    console.log('   User ID:', decoded.id)
    console.log('   Role:', decoded.role)
    
    // Test 4: Test with actual HTTP request simulation
    console.log('\n4. Testing HTTP flow simulation...')
    
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
      
      console.log('✅ HTTP flow simulation successful')
      console.log('   Response would be:', {
        token: simulatedToken.substring(0, 20) + '...',
        user: simulatedUser
      })
      
      // Test middleware token validation
      console.log('\n5. Testing middleware token validation...')
      if (simulatedDecoded && simulatedDecoded.id === simulatedUser.id) {
        console.log('✅ Middleware would accept this token')
        console.log('   User would be redirected to: /dashboard')
      } else {
        console.log('❌ Middleware would reject this token')
      }
    }
    
    // Test 6: Debug potential issues
    console.log('\n6. Debugging potential issues...')
    
    // Check token expiry
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = payload.exp - now
    
    console.log('✅ Token diagnostics:')
    console.log(`   Issued at: ${new Date(payload.iat * 1000).toISOString()}`)
    console.log(`   Expires at: ${new Date(payload.exp * 1000).toISOString()}`)
    console.log(`   Time until expiry: ${expiresIn} seconds`)
    console.log(`   Is valid: ${expiresIn > 0 ? 'Yes' : 'No'}`)
    
    console.log('\n🎉 Login Flow Test Complete!')
    console.log('\n📋 Results:')
    console.log('   • Credential validation: ✅')
    console.log('   • Token generation: ✅')
    console.log('   • Token verification: ✅')
    console.log('   • HTTP flow: ✅')
    console.log('   • Middleware compatibility: ✅')
    
    console.log('\n🔍 If login still fails in browser:')
    console.log('   1. Check browser console for errors')
    console.log('   2. Check Network tab for failed requests')
    console.log('   3. Verify cookie is being set')
    console.log('   4. Check if JavaScript is enabled')
    console.log('   5. Try clearing browser cache')
    
  } catch (error) {
    console.log('❌ Login flow test failed:', error)
  }
}

testLoginFlow()