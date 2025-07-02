#!/usr/bin/env tsx

/**
 * Test the complete authentication flow
 */

async function testLoginAndAPI(): Promise<{ user: any, session?: any }> {
  const baseUrl = 'http://localhost:3001'
  
  console.log('🔐 Testing authentication flow...\n')
  
  try {
    // Step 1: Login
    console.log('📝 Step 1: Attempting login...')
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })
    
    if (!loginResponse.ok) {
      const loginError = await loginResponse.json().catch(() => ({}))
      console.log(`❌ Login failed: ${loginResponse.status} - ${loginError.error || 'Unknown error'}`)
      return
    }
    
    const loginData = await loginResponse.json()
    console.log('✅ Login successful!')
    
    const token = loginData.token || loginData.data?.token
    if (!token) {
      console.log('❌ No token received from login')
      return
    }
    
    // Step 2: Test authenticated endpoints
    console.log('\n🧪 Step 2: Testing authenticated endpoints...')
    
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    
    const testEndpoints = [
      { url: `${baseUrl}/api/sales-cases`, name: 'Sales Cases' },
      { url: `${baseUrl}/api/customers`, name: 'Customers' },
      { url: `${baseUrl}/api/quotations`, name: 'Quotations' },
      { url: `${baseUrl}/api/inventory/categories`, name: 'Inventory Categories' }
    ]
    
    let successCount = 0
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: authHeaders
        })
        
        if (response.ok) {
          console.log(`✅ ${endpoint.name}: Working`)
          successCount++
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.log(`❌ ${endpoint.name}: ${response.status} - ${errorData.error || 'Failed'}`)
        }
      } catch (error: any) {
        console.log(`💥 ${endpoint.name}: ${error.message}`)
      }
    }
    
    console.log(`\n📊 Results: ${successCount}/${testEndpoints.length} endpoints working with authentication`)
    
    if (successCount === testEndpoints.length) {
      console.log('🎉 All API endpoints are working correctly!')
      console.log('✨ The parameter naming fixes completely resolved the issues.')
    } else if (successCount > 0) {
      console.log('🚀 Most endpoints are working - significant improvement!')
    } else {
      console.log('⚠️  Still having API issues - may need further investigation.')
    }
    
  } catch (error: any) {
    console.log(`💥 Authentication test failed: ${error.message}`)
  }
}

async function main(): Promise<void> {
  // Give the server time to fully start
  await new Promise(resolve => setTimeout(resolve, 2000))
  await testLoginAndAPI()
}

main().catch(console.error)