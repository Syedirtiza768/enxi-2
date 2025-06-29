import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function forceMarineData() {
  console.log('🌊 Force creating marine data...')
  
  try {
    // Get admin user
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
    const createdBy = admin?.id || 'system'
    
    // Force delete any existing marine customer with this email
    await prisma.customer.deleteMany({
      where: { 
        OR: [
          { email: 'test@dubaimaritimetest.ae' },
          { customerNumber: 'MAR-TEST-001' }
        ]
      }
    })
    
    // Create a test marine customer
    const testCustomer = await prisma.customer.create({
      data: {
        name: 'Dubai Maritime Test LLC',
        customerNumber: 'MAR-TEST-001',
        email: 'test@dubaimaritimetest.ae',
        phone: '+971-4-3999999',
        address: 'Test Marina, Dubai, UAE',
        currency: 'AED',
        paymentTerms: 30,
        creditLimit: 100000,
        industry: 'Marine & Shipping',
        website: 'www.dubaimaritimetest.ae',
        createdBy,
      }
    })
    
    console.log('✅ Created test customer:', testCustomer.customerNumber)
    
    // Check what customers we have
    const allCustomers = await prisma.customer.findMany({
      select: { customerNumber: true, name: true, email: true }
    })
    
    console.log('\n📊 All customers in database:')
    allCustomers.forEach(c => {
      console.log(`   ${c.customerNumber}: ${c.name} (${c.email})`)
    })
    
    console.log(`\nTotal customers: ${allCustomers.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

forceMarineData().catch(console.error)