#!/usr/bin/env node
// Load environment variables
require('dotenv').config()

const API_BASE_URL = 'http://localhost:3000/api'

interface TestResult {
  step: string
  success: boolean
  details?: any
  error?: string
}

const results: TestResult[] = []

function logResult(result: TestResult) {
  const icon = result.success ? '✅' : '❌'
  console.log(`${icon} ${result.step}`)
  if (result.details) {
    console.log('   Details:', JSON.stringify(result.details, null, 2))
  }
  if (result.error) {
    console.log('   Error:', result.error)
  }
  results.push(result)
}

async function testLogin(): Promise<{ user: any, session?: any }> {
  console.log('\n🔐 Testing Login...')
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })

    const data = await response.json()
    
    if (response.ok && data.token) {
      logResult({
        step: 'Login',
        success: true,
        details: { user: data.user }
      })
      return data.token
    } else {
      logResult({
        step: 'Login',
        success: false,
        error: data.error || 'Login failed'
      })
      return null
    }
  } catch (error) {
    logResult({
      step: 'Login',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

async function testCreateCustomer(token: string, customerData: any) {
  console.log(`\n👤 Creating customer: ${customerData.name}...`)
  
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(customerData)
    })

    const data = await response.json()
    
    if (response.ok && data.success) {
      logResult({
        step: `Create Customer: ${customerData.name}`,
        success: true,
        details: {
          id: data.data.id,
          customerNumber: data.data.customerNumber,
          accountCode: data.data.account?.code
        }
      })
      return data.data
    } else {
      logResult({
        step: `Create Customer: ${customerData.name}`,
        success: false,
        error: data.error || 'Customer creation failed',
        details: data.details
      })
      return null
    }
  } catch (error) {
    logResult({
      step: `Create Customer: ${customerData.name}`,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

async function testGetCustomers(token: string) {
  console.log('\n📋 Fetching all customers...')
  
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()
    
    if (response.ok && data.success) {
      logResult({
        step: 'Get Customers',
        success: true,
        details: {
          count: data.data.length,
          customers: data.data.map((c: any) => ({
            name: c.name,
            customerNumber: c.customerNumber,
            accountCode: c.account?.code
          }))
        }
      })
      return data.data
    } else {
      logResult({
        step: 'Get Customers',
        success: false,
        error: data.error || 'Failed to fetch customers'
      })
      return []
    }
  } catch (error) {
    logResult({
      step: 'Get Customers',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return []
  }
}

async function main(): Promise<void> {
  console.log('🧪 Testing Customer Creation Fix')
  console.log('================================')
  
  // Step 1: Login
  const token = await testLogin()
  if (!token) {
    console.error('\n❌ Login failed. Cannot continue with tests.')
    process.exit(1)
  }

  // Step 2: Create multiple customers to test unique account code generation
  const testCustomers = [
    {
      name: 'Test Company Alpha',
      email: `alpha${Date.now()}@test.com`,
      phone: '+1234567890',
      industry: 'Technology',
      currency: 'USD',
      creditLimit: 50000,
      paymentTerms: 30
    },
    {
      name: 'Test Company Beta',
      email: `beta${Date.now()}@test.com`,
      phone: '+0987654321',
      industry: 'Manufacturing',
      currency: 'AED',
      creditLimit: 75000,
      paymentTerms: 45
    },
    {
      name: 'Test Company Gamma',
      email: `gamma${Date.now()}@test.com`,
      phone: '+1122334455',
      industry: 'Retail',
      currency: 'USD',
      creditLimit: 25000,
      paymentTerms: 15
    }
  ]

  const createdCustomers = []
  for (const customerData of testCustomers) {
    const customer = await testCreateCustomer(token, customerData)
    if (customer) {
      createdCustomers.push(customer)
    }
    // Small delay to avoid race conditions
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Step 3: Test duplicate email handling
  console.log('\n🔄 Testing duplicate email handling...')
  if (createdCustomers.length > 0) {
    const duplicateData = {
      ...testCustomers[0],
      email: createdCustomers[0].email // Use existing email
    }
    await testCreateCustomer(token, duplicateData)
  }

  // Step 4: Get all customers
  await testGetCustomers(token)

  // Summary
  console.log('\n📊 Test Summary')
  console.log('==============')
  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length
  
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failureCount}`)
  console.log(`📈 Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`)

  if (failureCount === 0) {
    console.log('\n🎉 All tests passed! Customer creation is working properly.')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.')
  }
}

// Run the tests
main().catch(console.error)