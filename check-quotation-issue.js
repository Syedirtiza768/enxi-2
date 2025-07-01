const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkQuotationIssue() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Checking Quotation Issue ===\n')
  
  try {
    // 1. Check raw database data
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
    
    if (!quotation) {
      console.log('❌ Quotation not found!')
      return
    }
    
    console.log('1. Database Status:')
    console.log(`   Quotation: ${quotation.quotationNumber}`)
    console.log(`   Status: ${quotation.status}`)
    console.log(`   Customer: ${quotation.salesCase.customer.name}`)
    console.log(`   Total Amount: ${quotation.totalAmount}`)
    console.log(`   Items Count: ${quotation.items.length}`)
    
    console.log('\n2. Items Analysis:')
    quotation.items.forEach((item, index) => {
      console.log(`\n   Item ${index + 1}:`)
      console.log(`     ID: ${item.id}`)
      console.log(`     Line Number: ${item.lineNumber}`)
      console.log(`     Line Description: ${item.lineDescription || '❌ NULL/EMPTY'}`)
      console.log(`     Is Line Header: ${item.isLineHeader}`)
      console.log(`     Item Code: ${item.itemCode}`)
      console.log(`     Description: ${item.description}`)
      console.log(`     Quantity: ${item.quantity}`)
      console.log(`     Unit Price: ${item.unitPrice}`)
      console.log(`     Sort Order: ${item.sortOrder}`)
    })
    
    // 3. Check line grouping
    console.log('\n3. Line Grouping:')
    const lineGroups = {}
    quotation.items.forEach(item => {
      if (!lineGroups[item.lineNumber]) {
        lineGroups[item.lineNumber] = []
      }
      lineGroups[item.lineNumber].push(item)
    })
    
    Object.entries(lineGroups).forEach(([lineNo, items]) => {
      const header = items.find(i => i.isLineHeader)
      console.log(`\n   Line ${lineNo}:`)
      console.log(`     Has Header: ${!!header}`)
      console.log(`     Items Count: ${items.length}`)
      console.log(`     Line Description: ${header?.lineDescription || items[0]?.lineDescription || '❌ MISSING'}`)
    })
    
    // 4. Test API endpoints
    console.log('\n4. Testing API Endpoints:')
    
    // Test regular GET
    try {
      const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}`)
      const data = await response.json()
      console.log('\n   Regular GET:')
      console.log(`     Success: ${data.success}`)
      console.log(`     Has Data: ${!!data.data}`)
      console.log(`     Items: ${data.data?.items?.length || 0}`)
    } catch (error) {
      console.log('   Regular GET failed:', error.message)
    }
    
    // Test internal view
    try {
      const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}?view=internal`)
      const data = await response.json()
      console.log('\n   Internal View:')
      console.log(`     Success: ${data.success}`)
      console.log(`     Has Lines: ${!!data.data?.lines}`)
      console.log(`     Lines Count: ${data.data?.lines?.length || 0}`)
      
      if (data.data?.lines) {
        data.data.lines.forEach(line => {
          console.log(`\n     Line ${line.lineNumber}:`)
          console.log(`       Description: ${line.lineDescription}`)
          console.log(`       Items: ${line.items?.length || 0}`)
        })
      }
    } catch (error) {
      console.log('   Internal View failed:', error.message)
    }
    
    // 5. Check for common issues
    console.log('\n5. Issue Detection:')
    const issues = []
    
    // Check for missing line descriptions
    const itemsWithoutLineDesc = quotation.items.filter(i => !i.lineDescription)
    if (itemsWithoutLineDesc.length > 0) {
      issues.push(`${itemsWithoutLineDesc.length} items missing line descriptions`)
    }
    
    // Check for orphaned items (no header in their line)
    Object.entries(lineGroups).forEach(([lineNo, items]) => {
      const hasHeader = items.some(i => i.isLineHeader)
      if (!hasHeader) {
        issues.push(`Line ${lineNo} has no header item`)
      }
    })
    
    // Check for duplicate sort orders
    const sortOrders = quotation.items.map(i => i.sortOrder)
    const uniqueSortOrders = [...new Set(sortOrders)]
    if (sortOrders.length !== uniqueSortOrders.length) {
      issues.push('Duplicate sort orders detected')
    }
    
    if (issues.length > 0) {
      console.log('\n   ❌ Issues Found:')
      issues.forEach(issue => console.log(`      - ${issue}`))
    } else {
      console.log('\n   ✅ No structural issues detected')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkQuotationIssue()