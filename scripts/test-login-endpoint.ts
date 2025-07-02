import { NextRequest } from 'next/server'

async function testLoginEndpoint() {
  console.log('🔍 Testing login endpoint...')
  
  const baseUrl = 'http://localhost:3000'
  
  // Test cases
  const testCases = [
    {
      name: 'Valid credentials',
      body: { username: 'admin', password: 'demo123' },
      expected: 200
    },
    {
      name: 'Invalid password',
      body: { username: 'admin', password: 'wrongpassword' },
      expected: 401
    },
    {
      name: 'Non-existent user',
      body: { username: 'nonexistent', password: 'password' },
      expected: 401
    },
    {
      name: 'Missing username',
      body: { password: 'demo123' },
      expected: 400
    },
    {
      name: 'Missing password',
      body: { username: 'admin' },
      expected: 400
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`)
    console.log('   Request body:', JSON.stringify(testCase.body))
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.body)
      })
      
      console.log('   Response status:', response.status)
      console.log('   Expected status:', testCase.expected)
      console.log('   Result:', response.status === testCase.expected ? '✅ Pass' : '❌ Fail')
      
      const data = await response.json()
      console.log('   Response data:', JSON.stringify(data, null, 2))
      
      if (response.ok && data.token) {
        console.log('   Token received:', data.token.substring(0, 20) + '...')
        
        // Test using the token
        console.log('\n   Testing authenticated request...')
        const authResponse = await fetch(`${baseUrl}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Cookie': `auth-token=${data.token}`
          }
        })
        
        console.log('   Auth test status:', authResponse.status)
        if (authResponse.ok) {
          const userData = await authResponse.json()
          console.log('   User data:', JSON.stringify(userData, null, 2))
        }
      }
      
    } catch (error) {
      console.log('   ❌ Error:', error instanceof Error ? error.message : error)
    }
  }
}

// Check if running directly
if (require.main === module) {
  testLoginEndpoint().catch(console.error)
}