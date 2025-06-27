import { prisma } from '../lib/db/prisma'

async function checkRawQuotation() {
  const quotationId = 'cmcd8ugzr0169v2dpq2eipa1v'
  
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })
    
    if (!quotation) {
      console.log('Quotation not found')
      return
    }
    
    console.log('=== RAW QUOTATION DATA ===')
    console.log('Quotation Number:', quotation.quotationNumber)
    console.log('Total Items:', quotation.items.length)
    
    console.log('\n=== ITEMS BREAKDOWN ===')
    quotation.items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`)
      console.log('- ID:', item.id)
      console.log('- Line Number:', item.lineNumber)
      console.log('- Is Line Header:', item.isLineHeader)
      console.log('- Item Code:', item.itemCode)
      console.log('- Description:', item.description)
      console.log('- Line Description:', item.lineDescription)
      console.log('- Quantity:', item.quantity)
      console.log('- Unit Price:', item.unitPrice)
      console.log('- Sort Order:', item.sortOrder)
    })
    
    // Group by line number to understand structure
    console.log('\n=== GROUPED BY LINE NUMBER ===')
    const groupedByLine = quotation.items.reduce((acc, item) => {
      if (!acc[item.lineNumber]) {
        acc[item.lineNumber] = []
      }
      acc[item.lineNumber].push(item)
      return acc
    }, {} as Record<number, typeof quotation.items>)
    
    Object.entries(groupedByLine).forEach(([lineNo, items]) => {
      console.log(`\nLine ${lineNo}: ${items.length} items`)
      items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.isLineHeader ? '[HEADER]' : '[ITEM]'} ${item.itemCode} - ${item.description}`)
      })
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkRawQuotation()