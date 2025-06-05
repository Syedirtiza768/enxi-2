#!/usr/bin/env tsx

/**
 * Debug the supplier-related endpoint failures
 */

async function debugEndpoint(url: string, description: string) {
  try {
    console.log(`🔍 Debugging: ${description}`)
    
    // First login to get token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })

    if (!loginResponse.ok) {
      console.log(`❌ ${description}: Login failed`)
      return
    }

    const loginData = await loginResponse.json()
    const token = loginData.token

    // Test the endpoint with verbose error logging
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ ${description}: Working - Got ${data.data?.length || 0} items`)
    } else {
      let errorDetails = ''
      try {
        const errorData = await response.json()
        errorDetails = JSON.stringify(errorData, null, 2)
      } catch {
        errorDetails = await response.text()
      }
      
      console.log(`❌ ${description}: ${response.status}`)
      console.log(`   Error details: ${errorDetails}`)
    }
    
  } catch (error: any) {
    console.log(`💥 ${description}: Network error - ${error.message}`)
  }
  
  console.log('') // Empty line for readability
}

async function main() {
  console.log('🚨 Debugging supplier-related endpoint failures...\n')
  
  await debugEndpoint('http://localhost:3001/api/supplier-invoices', 'Supplier Invoices')
  await debugEndpoint('http://localhost:3001/api/supplier-payments', 'Supplier Payments') 
  await debugEndpoint('http://localhost:3001/api/three-way-matching/dashboard', 'Three-Way Matching Dashboard')
  
  console.log('🔧 Investigation complete. Check the error details above.')
}

main().catch(console.error)