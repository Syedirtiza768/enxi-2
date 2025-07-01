const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testInvoiceCreation() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Invoice Creation from Quotation ===\n')
  
  try {
    // 1. Get quotation data
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
      console.log('Quotation not found!')
      return
    }
    
    console.log('1. Quotation Data:')
    console.log(`   Number: ${quotation.quotationNumber}`)
    console.log(`   Customer: ${quotation.salesCase.customer.name}`)
    console.log(`   Customer ID: ${quotation.salesCase.customerId}`)
    console.log(`   Total: ${quotation.totalAmount}`)
    console.log(`   Items: ${quotation.items.length}`)
    
    console.log('\n2. Quotation Items:')
    quotation.items.forEach((item, i) => {
      console.log(`\n   Item ${i + 1}:`)
      console.log(`     Line Number: ${item.lineNumber}`)
      console.log(`     Line Description: ${item.lineDescription || 'NULL'}`)
      console.log(`     Is Line Header: ${item.isLineHeader}`)
      console.log(`     Item Code: ${item.itemCode}`)
      console.log(`     Description: ${item.description}`)
      console.log(`     Quantity: ${item.quantity}`)
      console.log(`     Unit Price: ${item.unitPrice}`)
      console.log(`     Total: ${item.totalAmount}`)
    })
    
    // 3. Check what the invoice service would receive
    console.log('\n3. Invoice Creation Data Structure:')
    const invoiceData = {
      customerId: quotation.salesCase.customerId,
      type: 'SALES',
      status: 'DRAFT',
      paymentTerms: quotation.paymentTerms || 'Net 30',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      billingAddress: quotation.salesCase.customer.billingAddress || quotation.salesCase.customer.address || '',
      notes: `Invoice created from quotation ${quotation.quotationNumber}`,
      items: quotation.items.map((item, index) => ({
        lineNumber: item.lineNumber,
        lineDescription: item.lineDescription,
        isLineHeader: item.isLineHeader,
        itemType: item.itemType,
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        internalDescription: item.internalDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: item.cost,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
        taxRateId: item.taxRateId,
        unitOfMeasureId: item.unitOfMeasureId,
        subtotal: item.subtotal,
        discountAmount: item.discountAmount,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
        sortOrder: index
      })),
      createdBy: 'system'
    }
    
    console.log('\n   Invoice data preview:')
    console.log(`     Customer ID: ${invoiceData.customerId}`)
    console.log(`     Type: ${invoiceData.type}`)
    console.log(`     Payment Terms: ${invoiceData.paymentTerms}`)
    console.log(`     Due Date: ${invoiceData.dueDate.toISOString()}`)
    console.log(`     Billing Address: ${invoiceData.billingAddress || 'EMPTY'}`)
    console.log(`     Items Count: ${invoiceData.items.length}`)
    
    // 4. Check for potential issues
    console.log('\n4. Potential Issues Check:')
    const issues = []
    
    if (!invoiceData.customerId) {
      issues.push('Missing customer ID')
    }
    
    if (!invoiceData.billingAddress) {
      issues.push('Empty billing address')
    }
    
    if (invoiceData.items.length === 0) {
      issues.push('No items to invoice')
    }
    
    // Check if any items have invalid data
    invoiceData.items.forEach((item, i) => {
      if (!item.itemCode) issues.push(`Item ${i + 1}: Missing item code`)
      if (!item.description) issues.push(`Item ${i + 1}: Missing description`)
      if (item.quantity <= 0 && !item.isLineHeader) issues.push(`Item ${i + 1}: Invalid quantity`)
      if (item.unitPrice < 0) issues.push(`Item ${i + 1}: Invalid unit price`)
    })
    
    if (issues.length > 0) {
      console.log('\n   ❌ Issues found:')
      issues.forEach(issue => console.log(`      - ${issue}`))
    } else {
      console.log('\n   ✅ No issues detected')
    }
    
    // 5. Test invoice API endpoint
    console.log('\n5. Testing Invoice API:')
    
    try {
      const response = await fetch('http://localhost:3000/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('   ✅ Success! Invoice created:')
        console.log(`      Response:`, result)
      } else {
        console.log('   ❌ Error from API:')
        console.log(`      Status: ${response.status}`)
        console.log(`      Error:`, result)
        if (result.details) {
          console.log(`      Details:`, result.details)
        }
      }
    } catch (error) {
      console.log('   ❌ Error calling API:')
      console.log(`      ${error.message}`)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInvoiceCreation()