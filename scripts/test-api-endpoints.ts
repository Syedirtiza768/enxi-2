#!/usr/bin/env tsx

/**
 * Script to test the critical API endpoints that were failing
 */

async function testEndpoint(url: string, description: string, authToken?: string) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    console.log(`🔍 Testing: ${description}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    
    const status = response.status
    let data: any
    
    try {
      data = await response.json()
    } catch {
      data = { error: 'Invalid JSON response' }
    }
    
    if (response.ok) {
      console.log(`✅ ${description}: ${status} - Success`)
      return true
    } else {
      console.log(`❌ ${description}: ${status} - ${data.error || 'Failed'}`)
      return false
    }
  } catch (error: any) {
    console.log(`💥 ${description}: Network error - ${error.message}`)
    return false
  }
}

async function main(): Promise<void> {
  console.log('🚀 Testing API endpoints on http://localhost:3001\n')
  
  // Give the server a moment to fully start
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const baseUrl = 'http://localhost:3001'
  
  // Test public endpoints (no auth required)
  console.log('📋 Testing public endpoints:')
  await testEndpoint(`${baseUrl}/api/system/health`, 'System Health')
  
  console.log('\n🔒 Testing authenticated endpoints (will fail with 401 - that\'s expected):')
  
  // Test the previously failing endpoints
  const testResults = await Promise.all([
    testEndpoint(`${baseUrl}/api/sales-cases`, 'Sales Cases List'),
    testEndpoint(`${baseUrl}/api/customers`, 'Customers List'),
    testEndpoint(`${baseUrl}/api/quotations?page=1&limit=20`, 'Quotations List'),
    testEndpoint(`${baseUrl}/api/sales-cases/metrics`, 'Sales Cases Metrics'),
    testEndpoint(`${baseUrl}/api/inventory/categories`, 'Inventory Categories'),
    testEndpoint(`${baseUrl}/api/inventory/items`, 'Inventory Items'),
    testEndpoint(`${baseUrl}/api/leads`, 'Leads List'),
    testEndpoint(`${baseUrl}/api/suppliers`, 'Suppliers List')
  ])
  
  const successful = testResults.filter(Boolean).length
  const total = testResults.length
  
  console.log(`\n📊 Results: ${successful}/${total} endpoints responded (expecting 401 auth errors)`)
  
  if (successful === total) {
    console.log('✨ All endpoints are responding correctly!')
    console.log('🎯 The parameter naming fixes resolved the API issues.')
  } else {
    console.log('⚠️  Some endpoints may still have issues.')
  }
  
  console.log('\n💡 To test with authentication, use the frontend interface at http://localhost:3001')
}

main().catch(console.error)