const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixQuotation() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Fixing Quotation ===\n')
  
  try {
    // 1. Update the line description
    const updateResult = await prisma.quotationItem.updateMany({
      where: {
        quotationId: quotationId,
        lineNumber: 1
      },
      data: {
        lineDescription: 'Electrical Components'
      }
    })
    
    console.log(`Updated ${updateResult.count} items with line description`)
    
    // 2. Verify the fix
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })
    
    console.log('\nVerification:')
    console.log(`Items: ${quotation.items.length}`)
    quotation.items.forEach((item, i) => {
      console.log(`\nItem ${i + 1}:`)
      console.log(`  Line Description: ${item.lineDescription || 'NULL'}`)
      console.log(`  Item Code: ${item.itemCode}`)
      console.log(`  Is Header: ${item.isLineHeader}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixQuotation()