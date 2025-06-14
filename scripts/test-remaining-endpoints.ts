#!/usr/bin/env tsx

/**
 * Test the previously failing API endpoints
 */

async function testAuthenticatedEndpoint(url: string, description: string) {
  try {
    // First login to get token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })

    if (!loginResponse.ok) {
      console.log(`❌ ${description}: Login failed`)
      return false
    }

    const loginData = await loginResponse.json()
    const token = loginData.token

    // Test the endpoint
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      console.log(`✅ ${description}: Working`)
      return true
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.log(`❌ ${description}: ${response.status} - ${errorData.error || 'Failed'}`)
      return false
    }
  } catch (error: any) {
    console.log(`💥 ${description}: ${error.message}`)
    return false
  }
}

async function main(): Promise<void> {
  console.log('🧪 Testing previously failing API endpoints...\n')
  
  const endpoints = [
    { url: 'http://localhost:3001/api/inventory/categories/tree?isActive=true&includeChildren=true', name: 'Inventory Categories Tree' },
    { url: 'http://localhost:3001/api/supplier-invoices', name: 'Supplier Invoices' },
    { url: 'http://localhost:3001/api/supplier-payments', name: 'Supplier Payments' },
    { url: 'http://localhost:3001/api/three-way-matching/dashboard', name: 'Three-Way Matching Dashboard' },
    { url: 'http://localhost:3001/api/accounting/accounts', name: 'Accounting Accounts' },
    { url: 'http://localhost:3001/api/shipments', name: 'Shipments' },
    { url: 'http://localhost:3001/api/users', name: 'Users' }
  ]

  let successCount = 0
  
  for (const endpoint of endpoints) {
    if (await testAuthenticatedEndpoint(endpoint.url, endpoint.name)) {
      successCount++
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n📊 Results: ${successCount}/${endpoints.length} endpoints working`)
  
  if (successCount === endpoints.length) {
    console.log('🎉 All previously failing endpoints are now working!')
  } else {
    console.log('⚠️  Some endpoints still need attention.')
  }
}

main().catch(console.error)