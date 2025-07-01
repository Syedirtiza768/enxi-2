const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testApiResponse() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing API Response ===\n')
  
  try {
    // 1. First get the raw data from database
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
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
    console.log(`   Items in DB: ${quotation.items.length}`)
    console.log(`   First item:`, {
      lineNumber: quotation.items[0]?.lineNumber,
      lineDescription: quotation.items[0]?.lineDescription,
      isLineHeader: quotation.items[0]?.isLineHeader,
      quantity: quotation.items[0]?.quantity
    })
    
    // 2. Test different API endpoints
    console.log('\n2. API Responses:')
    
    // Test default endpoint (should be internal view)
    try {
      const defaultResponse = await fetch(`http://localhost:3000/api/quotations/${quotationId}`)
      const defaultData = await defaultResponse.json()
      console.log('\n   Default endpoint (internal view):')
      console.log(`   - Success: ${defaultData.success}`)
      console.log(`   - View: ${defaultData.view}`)
      console.log(`   - Has data.items: ${!!defaultData.data?.items}`)
      console.log(`   - Items length: ${defaultData.data?.items?.length || 'undefined'}`)
      console.log(`   - Has data.lines: ${!!defaultData.data?.lines}`)
      console.log(`   - Lines length: ${defaultData.data?.lines?.length || 'undefined'}`)
      
      if (defaultData.data?.lines?.[0]) {
        console.log(`   - First line:`, {
          lineNumber: defaultData.data.lines[0].lineNumber,
          lineDescription: defaultData.data.lines[0].lineDescription,
          itemCount: defaultData.data.lines[0].items?.length
        })
      }
    } catch (e) {
      console.log('   Default endpoint error:', e.message)
    }
    
    // Test explicit internal view
    try {
      const internalResponse = await fetch(`http://localhost:3000/api/quotations/${quotationId}?view=internal`)
      const internalData = await internalResponse.json()
      console.log('\n   Explicit internal view:')
      console.log(`   - Success: ${internalData.success}`)
      console.log(`   - View: ${internalData.view}`)
      console.log(`   - Has data.items: ${!!internalData.data?.items}`)
      console.log(`   - Items length: ${internalData.data?.items?.length || 'undefined'}`)
      console.log(`   - Has data.lines: ${!!internalData.data?.lines}`)
      console.log(`   - Lines length: ${internalData.data?.lines?.length || 'undefined'}`)
    } catch (e) {
      console.log('   Internal view error:', e.message)
    }
    
    // Test client view
    try {
      const clientResponse = await fetch(`http://localhost:3000/api/quotations/${quotationId}?view=client`)
      const clientData = await clientResponse.json()
      console.log('\n   Client view:')
      console.log(`   - Success: ${clientData.success}`)
      console.log(`   - View: ${clientData.view}`)
      console.log(`   - Has data.items: ${!!clientData.data?.items}`)
      console.log(`   - Items length: ${clientData.data?.items?.length || 'undefined'}`)
      console.log(`   - Has data.lines: ${!!clientData.data?.lines}`)
      console.log(`   - Lines length: ${clientData.data?.lines?.length || 'undefined'}`)
    } catch (e) {
      console.log('   Client view error:', e.message)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiResponse()