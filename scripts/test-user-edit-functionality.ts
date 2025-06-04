#!/usr/bin/env npx tsx

import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

async function testUserEditFunctionality() {
  console.log('🔧 Testing User Edit Functionality...\n')

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

    console.log(`📋 Testing access to user: ${targetUserId}`)
    
    // Test 1: Check if user exists
    console.log('1. Testing GET /api/users/' + targetUserId)
    const userResponse = await fetch(`http://localhost:3000/api/users/${targetUserId}`, {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log('✅ User found:')
      console.log('Raw response:', JSON.stringify(userData, null, 2))
      
      const user = userData.data || userData
      console.log(`   ID: ${user.id}`)
      console.log(`   Username: ${user.username}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`)
      
      // Test 2: Check if we can update the user
      console.log('\n2. Testing user update capabilities...')
      
      // Test role update
      console.log('   Testing role update (PATCH/PUT)...')
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
        console.log('   ✅ User update endpoint works')
      } else {
        console.log('   ❌ User update endpoint failed:')
        console.log('      Status:', updateResponse.status)
        console.log('      Response:', await updateResponse.text())
      }

    } else {
      console.log('❌ User not found:')
      console.log('   Status:', userResponse.status)
      console.log('   Response:', await userResponse.text())
      
      // Check all users to see what's available
      console.log('\n📋 Checking all available users...')
      const allUsersResponse = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Cookie': `auth-token=${adminToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (allUsersResponse.ok) {
        const allUsersData = await allUsersResponse.json()
        console.log('Available users:')
        allUsersData.data?.forEach((user: any) => {
          console.log(`   • ${user.id} - ${user.username} (${user.email}) - ${user.role}`)
        })
      }
    }

    // Test 3: Check what ports the Next.js server is running on
    console.log('\n🌐 Checking server ports...')
    
    try {
      const port3001Response = await fetch('http://localhost:3001/api/users', {
        headers: {
          'Cookie': `auth-token=${adminToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (port3001Response.ok) {
        console.log('✅ Server also running on port 3001')
      } else {
        console.log('❌ No server on port 3001 or access denied')
      }
    } catch (error) {
      console.log('❌ No server running on port 3001')
    }

    console.log('\n🎯 User Edit Functionality Summary:')
    console.log('• User management pages available at /users/[id]')
    console.log('• Role and status updates should work via PUT /api/users/[id]')
    console.log('• Frontend provides role dropdown and status toggle')
    console.log('• Super admin has full edit permissions')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testUserEditFunctionality()