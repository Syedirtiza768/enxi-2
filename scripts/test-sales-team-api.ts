#!/usr/bin/env npx tsx

import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

async function testSalesTeamAPI(): Promise<void> {
  console.warn('🧪 Testing Sales Team API endpoints...\n')

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

    console.warn('📋 Testing GET /api/sales-team (hierarchy)...')
    
    const hierarchyResponse = await fetch('http://localhost:3000/api/sales-team', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${managerToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (hierarchyResponse.ok) {
      const hierarchyData = await hierarchyResponse.json()
      console.warn('✅ Hierarchy endpoint works:')
      console.warn(JSON.stringify(hierarchyData, null, 2))
    } else {
      console.warn('❌ Hierarchy endpoint failed:')
      console.warn('Status:', hierarchyResponse.status)
      console.warn('Response:', await hierarchyResponse.text())
    }

    console.warn('\n📋 Testing GET /api/sales-team?view=unassigned...')
    
    const unassignedResponse = await fetch('http://localhost:3000/api/sales-team?view=unassigned', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (unassignedResponse.ok) {
      const unassignedData = await unassignedResponse.json()
      console.warn('✅ Unassigned customers endpoint works:')
      console.warn(JSON.stringify(unassignedData, null, 2))
    } else {
      console.warn('❌ Unassigned customers endpoint failed:')
      console.warn('Status:', unassignedResponse.status)
      console.warn('Response:', await unassignedResponse.text())
    }

    console.warn('\n🏁 API test completed!')

} catch {}

// Run the test
testSalesTeamAPI()