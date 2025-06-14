import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main(): Promise<SalesCase> {
  try {
    // Check if there are any sales cases
    const salesCases = await prisma.salesCase.findMany({
      include: {
        customer: true
      }
    })
    
    console.log('Total sales cases:', salesCases.length)
    
    if (salesCases.length > 0) {
      console.log('\nExisting sales cases:')
      salesCases.forEach(sc => {
        console.log(`- ID: ${sc.id}, Case #: ${sc.caseNumber}, Title: ${sc.title}, Customer: ${sc.customer.name}`)
      })
    }
    
    // Check for the specific ID
    const specificCase = await prisma.salesCase.findUnique({
      where: { id: 'cmbq9v25t01o8v2i9768h89g5' },
      include: { customer: true }
    })
    
    if (specificCase) {
      console.log('\nFound specific case:', specificCase)
    } else {
      console.log('\nSpecific case not found. Creating a test case...')
      
      // First check if we have a customer
      const customer = await prisma.customer.findFirst()
      
      if (!customer) {
        console.log('No customer found. Please run seed script first.')
        return
      }
      
      // Create a sales case
      const newCase = await prisma.salesCase.create({
        data: {
          id: 'cmbq9v25t01o8v2i9768h89g5',
          caseNumber: 'SC-2025-001',
          title: 'Test Sales Case',
          description: 'Test sales case for debugging',
          status: 'NEW',
          estimatedValue: 50000,
          actualValue: 0,
          cost: 0,
          profitMargin: 0,
          customerId: customer.id,
          createdBy: 'system'
        },
        include: { customer: true }
      })
      
      console.log('Created test sales case:', newCase)
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()