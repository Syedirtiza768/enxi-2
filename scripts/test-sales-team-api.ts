#!/usr/bin/env npx tsx

import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

async function testSalesTeamAPI() {
  console.log('🧪 Testing Sales Team API endpoints...\n')

  try {
    // Create test JWT tokens
    const adminToken = jwt.sign(
      {
        id: 'cmbfhby810000v2toyp296q1c', // Use existing admin user ID
        username: 'admin',
        email: 'admin@enxi.com',
        role: 'ADMIN',
      },
      'your-super-secret-jwt-key-change-this-in-production' // JWT secret from .env
    )

    // Get manager user ID first
    const managerUser = await fetch('http://localhost:3000/api/users?search=manager@enxi.com&limit=1', {
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    let managerToken = adminToken
    if (managerUser.ok) {
      const userData = await managerUser.json()
      if (userData.data && userData.data.length > 0) {
        const manager = userData.data[0]
        managerToken = jwt.sign(
          {
            id: manager.id,
            username: manager.username,
            email: manager.email,
            role: manager.role,
          },
          'your-super-secret-jwt-key-change-this-in-production'
        )
      }
    }

    console.log('📋 Testing GET /api/sales-team (hierarchy)...')
    
    const hierarchyResponse = await fetch('http://localhost:3000/api/sales-team', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${managerToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (hierarchyResponse.ok) {
      const hierarchyData = await hierarchyResponse.json()
      console.log('✅ Hierarchy endpoint works:')
      console.log(JSON.stringify(hierarchyData, null, 2))
    } else {
      console.log('❌ Hierarchy endpoint failed:')
      console.log('Status:', hierarchyResponse.status)
      console.log('Response:', await hierarchyResponse.text())
    }

    console.log('\n📋 Testing GET /api/sales-team?view=unassigned...')
    
    const unassignedResponse = await fetch('http://localhost:3000/api/sales-team?view=unassigned', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (unassignedResponse.ok) {
      const unassignedData = await unassignedResponse.json()
      console.log('✅ Unassigned customers endpoint works:')
      console.log(JSON.stringify(unassignedData, null, 2))
    } else {
      console.log('❌ Unassigned customers endpoint failed:')
      console.log('Status:', unassignedResponse.status)
      console.log('Response:', await unassignedResponse.text())
    }

    console.log('\n🏁 API test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSalesTeamAPI()