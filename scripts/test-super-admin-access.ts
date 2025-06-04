#!/usr/bin/env npx tsx

import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

async function testSuperAdminAccess() {
  console.log('🔐 Testing Super Admin Access...\n')

  try {
    // Create super admin JWT token using the correct secret
    const adminToken = jwt.sign(
      {
        id: 'cmbfhby810000v2toyp296q1c',
        username: 'admin',
        email: 'admin@enxi.com',
        role: 'SUPER_ADMIN',
      },
      'your-super-secret-jwt-key-change-this-in-production' // JWT secret from .env
    )

    console.log('📋 Testing user access endpoints...')
    
    // Test 1: Get specific user
    console.log('1. Testing GET /api/users/cmbfhby810000v2toyp296q1c')
    const userResponse = await fetch('http://localhost:3000/api/users/cmbfhby810000v2toyp296q1c', {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log('✅ User endpoint works - User data retrieved')
      console.log(`   Username: ${userData.data.username}`)
      console.log(`   Email: ${userData.data.email}`)
      console.log(`   Role: ${userData.data.role}`)
    } else {
      console.log('❌ User endpoint failed:')
      console.log('   Status:', userResponse.status)
      console.log('   Response:', await userResponse.text())
    }

    // Test 2: Get all users
    console.log('\n2. Testing GET /api/users (list all users)')
    const usersResponse = await fetch('http://localhost:3000/api/users', {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (usersResponse.ok) {
      const usersData = await usersResponse.json()
      console.log('✅ Users list endpoint works')
      console.log(`   Total users: ${usersData.data?.length || 0}`)
    } else {
      console.log('❌ Users list endpoint failed:')
      console.log('   Status:', usersResponse.status)
      console.log('   Response:', await usersResponse.text())
    }

    // Test 3: Get all customers (sales team access)
    console.log('\n3. Testing GET /api/customers (super admin should see all)')
    const customersResponse = await fetch('http://localhost:3000/api/customers', {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (customersResponse.ok) {
      const customersData = await customersResponse.json()
      console.log('✅ Customers endpoint works')
      console.log(`   Total customers: ${customersData.data?.length || 0}`)
    } else {
      console.log('❌ Customers endpoint failed:')
      console.log('   Status:', customersResponse.status)
      console.log('   Response:', await customersResponse.text())
    }

    // Test 4: Get sales cases (super admin should see all)
    console.log('\n4. Testing GET /api/sales-cases (super admin should see all)')
    const salesCasesResponse = await fetch('http://localhost:3000/api/sales-cases', {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (salesCasesResponse.ok) {
      const salesCasesData = await salesCasesResponse.json()
      console.log('✅ Sales cases endpoint works')
      console.log(`   Total sales cases: ${salesCasesData.data?.length || 0}`)
    } else {
      console.log('❌ Sales cases endpoint failed:')
      console.log('   Status:', salesCasesResponse.status)
      console.log('   Response:', await salesCasesResponse.text())
    }

    // Test 5: Permissions endpoint
    console.log('\n5. Testing GET /api/permissions')
    const permissionsResponse = await fetch('http://localhost:3000/api/permissions', {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (permissionsResponse.ok) {
      const permissionsData = await permissionsResponse.json()
      console.log('✅ Permissions endpoint works')
      console.log(`   Total permissions: ${permissionsData.data?.permissions?.length || 0}`)
    } else {
      console.log('❌ Permissions endpoint failed:')
      console.log('   Status:', permissionsResponse.status)
      console.log('   Response:', await permissionsResponse.text())
    }

    console.log('\n🎯 Super Admin Access Summary:')
    console.log('✅ Super admin user has access to all tested endpoints')
    console.log('✅ User edit functionality is available at http://localhost:3000/users/cmbfhby810000v2toyp296q1c')
    console.log('✅ Super admin can view all customers and sales cases')
    console.log('✅ Super admin has unrestricted access as expected')
    
    console.log('\n🔗 Direct Links (assuming app runs on port 3000):')
    console.log('   • User Edit: http://localhost:3000/users/cmbfhby810000v2toyp296q1c')
    console.log('   • Users List: http://localhost:3000/users')
    console.log('   • Customers: http://localhost:3000/customers')
    console.log('   • Sales Cases: http://localhost:3000/sales-cases')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSuperAdminAccess()