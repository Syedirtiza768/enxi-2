import { PrismaClient } from '@/lib/generated/prisma'
const prisma = new PrismaClient()

async function testLeadConversion() {
  try {
    console.log('🧪 Testing Lead Conversion...\n')
    
    // Find an admin user to be the creator
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@marinepoweruae.com' }
    })
    
    if (!adminUser) {
      console.error('❌ Admin user not found. Please seed the database first.')
      return
    }
    
    // First, create a test lead
    const testLead = await prisma.lead.create({
      data: {
        firstName: 'Test',
        lastName: 'Conversion',
        email: 'test.conversion@example.com',
        phone: '+971501234567',
        company: 'Test Conversion Company',
        status: 'QUALIFIED',
        source: 'WEBSITE',
        notes: 'Lead for conversion testing',
        creator: {
          connect: { id: adminUser.id }
        }
      }
    })
    
    console.log('✅ Created test lead:', {
      id: testLead.id,
      name: `${testLead.firstName} ${testLead.lastName}`,
      email: testLead.email
    })
    
    // Check if lead can be converted (not already converted)
    if (testLead.status === 'CONVERTED') {
      console.log('❌ Lead is already converted')
      return
    }
    
    console.log('\n✅ Lead is ready for conversion')
    console.log('\nTo convert this lead:')
    console.log('1. Go to the Leads page')
    console.log('2. Find the lead with email:', testLead.email)
    console.log('3. Click the "Convert" button')
    console.log('4. Fill in the additional details and submit')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLeadConversion()