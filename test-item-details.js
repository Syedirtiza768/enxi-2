const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testItemDetails() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Item Details Retrieval ===\n')
  
  try {
    // 1. Get raw database data
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          include: {
            item: true, // Include linked inventory item if any
            taxRateConfig: true,
            unitOfMeasure: true
          },
          orderBy: { sortOrder: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    
    console.log('1. Database Content:')
    console.log(`   Quotation: ${quotation.quotationNumber}`)
    console.log(`   Total Items: ${quotation.items.length}`)
    
    console.log('\n2. Item Details:')
    quotation.items.forEach((item, index) => {
      console.log(`\n   Item ${index + 1}:`)
      console.log(`     ID: ${item.id}`)
      console.log(`     Line Number: ${item.lineNumber}`)
      console.log(`     Line Description: ${item.lineDescription || 'NULL'}`)
      console.log(`     Is Line Header: ${item.isLineHeader}`)
      console.log(`     Item Type: ${item.itemType}`)
      console.log(`     Item Code: ${item.itemCode}`)
      console.log(`     Description: ${item.description}`)
      console.log(`     Internal Description: ${item.internalDescription || 'NULL'}`)
      console.log(`     Quantity: ${item.quantity}`)
      console.log(`     Unit Price: ${item.unitPrice}`)
      console.log(`     Cost: ${item.cost || 'NULL'}`)
      console.log(`     Discount: ${item.discount || 0}%`)
      console.log(`     Tax Rate: ${item.taxRate || 0}%`)
      console.log(`     Subtotal: ${item.subtotal}`)
      console.log(`     Total: ${item.totalAmount}`)
      console.log(`     Sort Order: ${item.sortOrder}`)
      console.log(`     Has Linked Item: ${!!item.itemId}`)
      if (item.item) {
        console.log(`     Linked Item Name: ${item.item.name}`)
      }
    })
    
    // 3. Test API response structure
    console.log('\n3. Testing API Response:')
    
    const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}?view=internal`)
    const data = await response.json()
    
    console.log('\n   API Response Structure:')
    console.log(`   Success: ${data.success}`)
    console.log(`   Has data.items: ${!!data.data?.items}`)
    console.log(`   Has data.lines: ${!!data.data?.lines}`)
    
    if (data.data?.lines) {
      console.log('\n   Lines Structure:')
      data.data.lines.forEach((line, lineIndex) => {
        console.log(`\n   Line ${line.lineNumber}:`)
        console.log(`     Description: ${line.lineDescription}`)
        console.log(`     Items Count: ${line.items?.length || 0}`)
        
        if (line.items && line.items.length > 0) {
          line.items.forEach((item, itemIndex) => {
            console.log(`\n     Item ${itemIndex + 1} in Line ${line.lineNumber}:`)
            console.log(`       Item Code: ${item.itemCode}`)
            console.log(`       Description: ${item.description}`)
            console.log(`       Quantity: ${item.quantity}`)
            console.log(`       Unit Price: ${item.unitPrice}`)
            console.log(`       Is Header: ${item.isLineHeader}`)
          })
        }
      })
    }
    
    // 4. Check what the UI would receive
    const uiData = data.data
    if (uiData?.lines && !uiData.items) {
      const extractedItems = uiData.lines.flatMap(line => line.items || [])
      console.log('\n4. UI Extracted Items:')
      console.log(`   Total extracted items: ${extractedItems.length}`)
      extractedItems.forEach((item, i) => {
        console.log(`\n   Extracted Item ${i + 1}:`)
        console.log(`     Item Code: ${item.itemCode}`)
        console.log(`     Description: ${item.description}`)
        console.log(`     Has all details: ${!!(item.quantity && item.unitPrice && item.description)}`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testItemDetails()