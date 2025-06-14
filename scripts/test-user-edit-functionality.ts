#!/usr/bin/env npx tsx

import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

async function testUserEditFunctionality(): Promise<void> {
  console.warn('🔧 Testing User Edit Functionality...\n')

  try {
    // Create super admin JWT token
    const adminToken = jwt.sign(
      {
        id: 'cmbfhby810000v2toyp296q1c',
        username: 'admin',
        email: 'admin@enxi.com',
        role: 'SUPER_ADMIN',
      },
      'your-super-secret-jwt-key-change-this-in-production'
    )

    const targetUserId = 'cmbfhfyv80000v2yeuhorcid6'

    console.warn(`📋 Testing access to user: ${targetUserId}`)
    
    // Test 1: Check if user exists
    console.warn('1. Testing GET /api/users/' + targetUserId)
    const userResponse = await fetch(`http://localhost:3000/api/users/${targetUserId}`, {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.warn('✅ User found:')
      console.warn('Raw response:', JSON.stringify(userData, null, 2))
      
      const user = userData.data || userData
      console.warn(`   ID: ${user.id}`)
      console.warn(`   Username: ${user.username}`)
      console.warn(`   Email: ${user.email}`)
      console.warn(`   Role: ${user.role}`)
      console.warn(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`)
      
      // Test 2: Check if we can update the user
      console.warn('\n2. Testing user update capabilities...')
      
      // Test role update
      console.warn('   Testing role update (PATCH/PUT)...')
      const updateResponse = await fetch(`http://localhost:3000/api/users/${targetUserId}`, {
        method: 'PUT',
        headers: {
          'Cookie': `auth-token=${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: user.role, // Keep same role for test
          isActive: user.isActive, // Keep same status for test
        }),
      })

      if (updateResponse.ok) {
        console.warn('   ✅ User update endpoint works')
      } else {
        console.warn('   ❌ User update endpoint failed:')
        console.warn('      Status:', updateResponse.status)
        console.warn('      Response:', await updateResponse.text())
      }

    } else {
      console.warn('❌ User not found:')
      console.warn('   Status:', userResponse.status)
      console.warn('   Response:', await userResponse.text())
      
      // Check all users to see what's available
      console.warn('\n📋 Checking all available users...')
      const allUsersResponse = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Cookie': `auth-token=${adminToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (allUsersResponse.ok) {
        const allUsersData = await allUsersResponse.json()
        console.warn('Available users:')
        allUsersData.data?.forEach((user: any) => {
          console.warn(`   • ${user.id} - ${user.username} (${user.email}) - ${user.role}`)
        })
      }
    }

    // Test 3: Check what ports the Next.js server is running on
    console.warn('\n🌐 Checking server ports...')
    
    try {
      const port3001Response = await fetch('http://localhost:3001/api/users', {
        headers: {
          'Cookie': `auth-token=${adminToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (port3001Response.ok) {
        console.warn('✅ Server also running on port 3001')
      } else {
        console.warn('❌ No server on port 3001 or access denied')
      }
} catch (error) {
      console.error('Error:', error);
      console.warn('\n🎯 User Edit Functionality Summary:')
    console.warn('• User management pages available at /users/[id]')
    console.warn('• Role and status updates should work via PUT /api/users/[id]')
    console.warn('• Frontend provides role dropdown and status toggle')
    console.warn('• Super admin has full edit permissions')
    } catch {}

// Run the test
testUserEditFunctionality()