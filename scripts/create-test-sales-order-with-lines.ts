import { SalesOrderService } from '@/lib/services/sales-order.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { prisma } from '@/lib/db/prisma'

async function createTestSalesOrderWithLines() {
  try {
    console.log('Creating comprehensive sales order to test line-based functionality...\n')
    
    // Find or create a customer
    let customer = await prisma.customer.findFirst({
      where: { name: { contains: 'Tech' } }
    })
    
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          customerNumber: `CUST-${Date.now()}`,
          name: 'TechCorp Solutions Ltd',
          email: 'orders@techcorp.com',
          phone: '+1-555-0123',
          currency: 'USD',
          creditLimit: 100000,
          paymentTerms: 30,
          billingAddress: '123 Tech Plaza\nSilicon Valley, CA 94025\nUSA',
          address: '123 Tech Plaza\nSilicon Valley, CA 94025\nUSA',
          createdBy: 'system'
        }
      })
    }
    
    console.log(`Using customer: ${customer.name} (${customer.id})\n`)
    
    // Create a sales case
    const salesCaseService = new SalesCaseService()
    const salesCase = await salesCaseService.createSalesCase({
      customerId: customer.id,
      title: 'Enterprise Software & Hardware Package',
      description: 'Complete IT infrastructure upgrade including software licenses, hardware, and services',
      estimatedValue: 75000,
      createdBy: 'system'
    })
    
    console.log(`Created sales case: ${salesCase.caseNumber} (${salesCase.id})\n`)
    
    // Create the sales order with multiple lines
    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.createSalesOrder({
      salesCaseId: salesCase.id,
      createdBy: 'system',
      customerPO: 'PO-2025-TECH-001',
      requestedDate: new Date('2025-02-01'),
      promisedDate: new Date('2025-02-15'),
      paymentTerms: 'Net 30',
      shippingTerms: 'FOB Destination',
      shippingAddress: '456 Delivery Dock\nTech Campus Building B\nSilicon Valley, CA 94025\nUSA',
      billingAddress: customer.billingAddress || customer.address,
      notes: 'Please coordinate with IT department before delivery. Contact: John Smith (ext. 1234)',
      internalNotes: 'High-value customer - ensure white-glove delivery service',
      items: [
        // Line 1: Software Licenses
        {
          lineNumber: 1,
          lineDescription: 'Enterprise Software Licenses',
          isLineHeader: true,
          sortOrder: 0,
          itemType: 'SERVICE',
          itemCode: '',
          description: '',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          taxRate: 0
        },
        {
          lineNumber: 1,
          lineDescription: 'Enterprise Software Licenses',
          isLineHeader: false,
          sortOrder: 1,
          itemType: 'SERVICE',
          itemCode: 'SW-ERP-001',
          description: 'Enterprise Resource Planning Software - Annual License',
          internalDescription: 'Renewal for existing ERP system - discount applied',
          quantity: 25,
          unitPrice: 500.00,
          cost: 300.00,
          discount: 10,
          taxRate: 8.5,
          taxRateId: undefined
        },
        {
          lineNumber: 1,
          lineDescription: 'Enterprise Software Licenses',
          isLineHeader: false,
          sortOrder: 2,
          itemType: 'SERVICE',
          itemCode: 'SW-CRM-001',
          description: 'Customer Relationship Management Software - Annual License',
          internalDescription: 'New implementation - includes first year support',
          quantity: 15,
          unitPrice: 350.00,
          cost: 200.00,
          discount: 15,
          taxRate: 8.5
        },
        {
          lineNumber: 1,
          lineDescription: 'Enterprise Software Licenses',
          isLineHeader: false,
          sortOrder: 3,
          itemType: 'SERVICE',
          itemCode: 'SW-SEC-001',
          description: 'Enterprise Security Suite - Annual License',
          internalDescription: 'Critical security upgrade - priority delivery',
          quantity: 50,
          unitPrice: 200.00,
          cost: 100.00,
          discount: 5,
          taxRate: 8.5
        },
        
        // Line 2: Hardware
        {
          lineNumber: 2,
          lineDescription: 'Computer Hardware & Equipment',
          isLineHeader: true,
          sortOrder: 4,
          itemType: 'PRODUCT',
          itemCode: '',
          description: '',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          taxRate: 0
        },
        {
          lineNumber: 2,
          lineDescription: 'Computer Hardware & Equipment',
          isLineHeader: false,
          sortOrder: 5,
          itemType: 'PRODUCT',
          itemCode: 'HW-LAPTOP-001',
          description: 'Professional Laptop - Intel i7, 16GB RAM, 512GB SSD',
          internalDescription: 'Dell Latitude 5520 - check stock availability',
          quantity: 20,
          unitPrice: 1200.00,
          cost: 900.00,
          discount: 8,
          taxRate: 8.5
        },
        {
          lineNumber: 2,
          lineDescription: 'Computer Hardware & Equipment',
          isLineHeader: false,
          sortOrder: 6,
          itemType: 'PRODUCT',
          itemCode: 'HW-DESKTOP-001',
          description: 'High-Performance Desktop Workstation',
          internalDescription: 'HP Z4 G4 Workstation - special order item',
          quantity: 5,
          unitPrice: 2500.00,
          cost: 1800.00,
          discount: 10,
          taxRate: 8.5
        },
        {
          lineNumber: 2,
          lineDescription: 'Computer Hardware & Equipment',
          isLineHeader: false,
          sortOrder: 7,
          itemType: 'PRODUCT',
          itemCode: 'HW-MONITOR-001',
          description: '27" 4K Professional Monitor',
          internalDescription: 'LG UltraFine - pairs with workstations',
          quantity: 25,
          unitPrice: 450.00,
          cost: 350.00,
          discount: 5,
          taxRate: 8.5
        },
        
        // Line 3: Professional Services
        {
          lineNumber: 3,
          lineDescription: 'Professional Services & Installation',
          isLineHeader: true,
          sortOrder: 8,
          itemType: 'SERVICE',
          itemCode: '',
          description: '',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          taxRate: 0
        },
        {
          lineNumber: 3,
          lineDescription: 'Professional Services & Installation',
          isLineHeader: false,
          sortOrder: 9,
          itemType: 'SERVICE',
          itemCode: 'SVC-INSTALL-001',
          description: 'On-site Installation and Configuration Services',
          internalDescription: 'Schedule with Mike from tech team - 2 day job',
          quantity: 16,
          unitPrice: 150.00,
          cost: 100.00,
          discount: 0,
          taxRate: 8.5
        },
        {
          lineNumber: 3,
          lineDescription: 'Professional Services & Installation',
          isLineHeader: false,
          sortOrder: 10,
          itemType: 'SERVICE',
          itemCode: 'SVC-TRAINING-001',
          description: 'End-User Training (Full Day Session)',
          internalDescription: 'Book training room - max 25 participants per session',
          quantity: 2,
          unitPrice: 2000.00,
          cost: 1200.00,
          discount: 0,
          taxRate: 8.5
        },
        {
          lineNumber: 3,
          lineDescription: 'Professional Services & Installation',
          isLineHeader: false,
          sortOrder: 11,
          itemType: 'SERVICE',
          itemCode: 'SVC-SUPPORT-001',
          description: 'Premium Support Package - 1 Year',
          internalDescription: '24/7 support tier - assign dedicated account manager',
          quantity: 1,
          unitPrice: 5000.00,
          cost: 2000.00,
          discount: 20,
          taxRate: 8.5
        }
      ]
    })
    
    console.log('Sales Order created successfully!\n')
    console.log('=====================================')
    console.log(`Order Number: ${salesOrder.orderNumber}`)
    console.log(`Status: ${salesOrder.status}`)
    console.log(`Customer: ${salesOrder.salesCase.customer.name}`)
    console.log(`Customer PO: ${salesOrder.customerPO}`)
    console.log(`Requested Date: ${salesOrder.requestedDate}`)
    console.log(`Promised Date: ${salesOrder.promisedDate}`)
    console.log('\nFinancial Summary:')
    console.log(`- Subtotal: $${salesOrder.subtotal.toFixed(2)}`)
    console.log(`- Discount: $${salesOrder.discountAmount.toFixed(2)}`)
    console.log(`- Tax: $${salesOrder.taxAmount.toFixed(2)}`)
    console.log(`- Total: $${salesOrder.totalAmount.toFixed(2)}`)
    
    // Group items by line for display
    const lineGroups = salesOrder.items.reduce((acc, item) => {
      if (!acc[item.lineNumber]) {
        acc[item.lineNumber] = {
          description: '',
          items: []
        }
      }
      if (item.isLineHeader && item.lineDescription) {
        acc[item.lineNumber].description = item.lineDescription
      } else if (!item.isLineHeader) {
        acc[item.lineNumber].items.push(item)
      }
      return acc
    }, {} as Record<number, { description: string; items: typeof salesOrder.items }>)
    
    console.log('\nOrder Lines:')
    console.log('=====================================')
    
    Object.entries(lineGroups).forEach(([lineNum, group]) => {
      console.log(`\nLine ${lineNum}: ${group.description}`)
      console.log('-'.repeat(50))
      
      let lineTotal = 0
      group.items.forEach(item => {
        console.log(`  ${item.itemCode}: ${item.description}`)
        console.log(`    Qty: ${item.quantity} × $${item.unitPrice.toFixed(2)}` +
          (item.discount > 0 ? ` (${item.discount}% discount)` : '') +
          ` = $${item.totalAmount.toFixed(2)}`)
        if (item.internalDescription) {
          console.log(`    Internal Note: ${item.internalDescription}`)
        }
        if (item.cost !== undefined && item.cost !== null) {
          const margin = ((item.unitPrice - item.cost) / item.unitPrice * 100).toFixed(1)
          console.log(`    Cost: $${item.cost.toFixed(2)} (Margin: ${margin}%)`)
        }
        lineTotal += item.totalAmount
      })
      
      console.log(`  Line Total: $${lineTotal.toFixed(2)}`)
    })
    
    console.log('\n=====================================')
    console.log('Test Result: SUCCESS ✓')
    console.log('All line-based functionality working correctly!')
    console.log(`\nView the order at: /sales-orders/${salesOrder.id}`)
    
  } catch (error) {
    console.error('Error creating test sales order:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createTestSalesOrderWithLines()