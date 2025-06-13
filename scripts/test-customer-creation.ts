import { PrismaClient } from '../lib/generated/prisma'
import { CustomerService } from '../lib/services/customer.service'

const prisma = new PrismaClient()

async function testCustomerCreation() {
  try {
    console.log('🧪 Testing customer creation...')
    
    // Get an admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (!admin) {
      console.error('❌ No admin user found')
      return
    }
    
    console.log(`✅ Found admin user: ${admin.username}`)
    
    // Test data
    const testCustomerData = {
      name: 'Test Customer ABC',
      email: 'test@customer.com',
      phone: '+971 50 123 4567',
      industry: 'Technology',
      website: 'https://testcustomer.com',
      address: 'Business Bay, Dubai, UAE',
      taxId: '100123456789999',
      currency: 'AED',
      creditLimit: 50000,
      paymentTerms: 30,
      createdBy: admin.id
    }
    
    console.log('📝 Creating customer with data:', testCustomerData)
    
    const customerService = new CustomerService()
    const customer = await customerService.createCustomer(testCustomerData)
    
    console.log('✅ Customer created successfully!')
    console.log('Customer ID:', customer.id)
    console.log('Customer Number:', customer.customerNumber)
    console.log('AR Account:', customer.account?.code)
    
  } catch (error) {
    console.error('❌ Error creating customer:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testCustomerCreation()