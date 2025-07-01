const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkForeignKeys() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Checking Foreign Keys for Invoice Creation ===\n')
  
  try {
    // 1. Get quotation data
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: true,
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    
    if (!quotation) {
      console.log('Quotation not found!')
      return
    }
    
    const customerId = quotation.salesCase.customerId
    
    console.log('1. Customer Check:')
    console.log(`   Customer ID from quotation: ${customerId}`)
    
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })
    
    console.log(`   Customer exists: ${!!customer}`)
    if (customer) {
      console.log(`   Customer name: ${customer.name}`)
    }
    
    console.log('\n2. Item Foreign Keys Check:')
    for (const item of quotation.items) {
      console.log(`\n   Item: ${item.itemCode}`)
      console.log(`   - itemId: ${item.itemId || 'NULL'}`)
      console.log(`   - taxRateId: ${item.taxRateId || 'NULL'}`)
      console.log(`   - unitOfMeasureId: ${item.unitOfMeasureId || 'NULL'}`)
      
      // Check if itemId exists
      if (item.itemId) {
        const inventoryItem = await prisma.item.findUnique({
          where: { id: item.itemId }
        })
        console.log(`   - Item exists: ${!!inventoryItem}`)
        if (!inventoryItem) {
          console.log(`   ❌ INVALID itemId: ${item.itemId}`)
        }
      }
      
      // Check if taxRateId exists
      if (item.taxRateId) {
        const taxRate = await prisma.taxRate.findUnique({
          where: { id: item.taxRateId }
        })
        console.log(`   - TaxRate exists: ${!!taxRate}`)
        if (!taxRate) {
          console.log(`   ❌ INVALID taxRateId: ${item.taxRateId}`)
        }
      }
      
      // Check if unitOfMeasureId exists
      if (item.unitOfMeasureId) {
        const uom = await prisma.unitOfMeasure.findUnique({
          where: { id: item.unitOfMeasureId }
        })
        console.log(`   - UnitOfMeasure exists: ${!!uom}`)
        if (!uom) {
          console.log(`   ❌ INVALID unitOfMeasureId: ${item.unitOfMeasureId}`)
        }
      }
    }
    
    // 3. Check what would be sent to invoice
    console.log('\n3. Invoice Data Foreign Keys:')
    const invoiceData = {
      customerId: customerId,
      items: quotation.items.map(item => ({
        itemId: item.itemId,
        taxRateId: item.taxRateId,
        unitOfMeasureId: item.unitOfMeasureId
      }))
    }
    
    console.log('   Customer ID to use:', invoiceData.customerId)
    console.log('   Items with foreign keys:')
    invoiceData.items.forEach((item, i) => {
      console.log(`   Item ${i + 1}:`, item)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkForeignKeys()