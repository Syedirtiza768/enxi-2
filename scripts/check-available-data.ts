import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  try {
    // Check customers
    const customers = await prisma.customer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    console.log('=== Available Customers ===')
    customers.forEach(c => {
      console.log(`- ID: ${c.id}, Name: ${c.name}, Email: ${c.email}`)
    })
    
    // Check sales cases
    const salesCases = await prisma.salesCase.findMany({
      take: 5,
      where: { status: { in: ['NEW', 'ACTIVE'] } },
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    })
    console.log('\n=== Available Sales Cases ===')
    salesCases.forEach(sc => {
      console.log(`- ID: ${sc.id}, Case #: ${sc.caseNumber}, Customer: ${sc.customer.name}, Status: ${sc.status}`)
    })
    
    // Check inventory items
    const items = await prisma.item.findMany({
      take: 10,
      where: { 
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log('\n=== Available Inventory Items ===')
    items.forEach(item => {
      console.log(`- ID: ${item.id}, Code: ${item.code}, Name: ${item.name}, Type: ${item.type}`)
    })
    
    // Check tax rates
    const taxRates = await prisma.taxRate.findMany({
      where: { isActive: true }
    })
    console.log('\n=== Available Tax Rates ===')
    taxRates.forEach(tr => {
      console.log(`- ID: ${tr.id}, Name: ${tr.name}, Rate: ${tr.rate}%`)
    })
    
    // Check units of measure
    const uoms = await prisma.unitOfMeasure.findMany({
      take: 5
    })
    console.log('\n=== Available Units of Measure ===')
    uoms.forEach(uom => {
      console.log(`- ID: ${uom.id}, Code: ${uom.code}, Name: ${uom.name}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()