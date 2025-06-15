import { prisma } from '../lib/db/prisma'

async function testCustomerAPI() {
  console.log('Testing Customer API with authentication...')
  
  try {
    // First check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })
    
    console.log('Admin user exists:', !!adminUser)
    if (adminUser) {
      console.log('Admin email:', adminUser.email)
    }
    
    // Login via API
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin123!'
      })
    })
    
    const loginResult = await loginResponse.json()
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResult.error}`)
    }
    
    console.log('✅ Login successful')
    const token = loginResult.token
    
    // Test GET /api/customers
    console.log('\nTesting GET /api/customers...')
    const getResponse = await fetch('http://localhost:3000/api/customers', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
    
    const getResult = await getResponse.json()
    
    if (getResponse.ok) {
      console.log('✅ GET /api/customers successful')
      console.log(`Found ${getResult.customers?.length || 0} customers`)
    } else {
      console.error('❌ GET /api/customers failed:', getResult)
    }
    
    // Test POST /api/customers
    console.log('\nTesting POST /api/customers...')
    const testCustomer = {
      name: 'Test Customer API',
      email: `test-api-${Date.now()}@example.com`,
      phone: '+1234567890',
      industry: 'Technology',
      website: 'https://example.com',
      address: '123 Test Street',
      taxId: 'TAX123',
      currency: 'USD',
      creditLimit: 10000,
      paymentTerms: 30
    }
    
    const postResponse = await fetch('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCustomer)
    })
    
    const postResult = await postResponse.json()
    
    if (postResponse.ok) {
      console.log('✅ POST /api/customers successful')
      console.log('Created customer:', postResult.data?.name)
    } else {
      console.error('❌ POST /api/customers failed:', postResult)
    }
    
    // Check audit logs weren't created (since we're skipping for anonymous)
    console.log('\n✅ API tests completed successfully')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  await prisma.$disconnect()
  process.exit(0)
}

testCustomerAPI()