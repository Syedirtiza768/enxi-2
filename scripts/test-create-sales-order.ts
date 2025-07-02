import { SalesOrderService } from '@/lib/services/sales-order.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { prisma } from '@/lib/db/prisma'

async function createTestSalesOrder() {
  try {
    console.log('Starting sales order creation test...\n')
    
    // Find a customer
    const customer = await prisma.customer.findFirst({})
    
    if (!customer) {
      console.error('No active customer found. Please seed the database first.')
      return
    }
    
    console.log(`Found customer: ${customer.name} (${customer.id})\n`)
    
    // Create a sales case first
    const salesCaseService = new SalesCaseService()
    const salesCase = await salesCaseService.createSalesCase({
      customerId: customer.id,
      title: 'Test Sales Order Case',
      description: 'Test case for creating a sales order',
      createdBy: 'system'
    })
    
    console.log(`Created sales case: ${salesCase.caseNumber} (${salesCase.id})\n`)
    
    // Create the sales order
    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.createSalesOrder({
      salesCaseId: salesCase.id,
      createdBy: 'system',
      items: [
        {
          itemCode: 'TEST-001',
          description: 'Test Product Item',
          quantity: 10,
          unitPrice: 100.00,
          discount: 5,
          taxRate: 10
        },
        {
          itemCode: 'TEST-002',
          description: 'Test Service Item',
          quantity: 5,
          unitPrice: 200.00,
          discount: 0,
          taxRate: 10
        }
      ],
      requestedDate: new Date('2025-01-20'),
      promisedDate: new Date('2025-01-25'),
      paymentTerms: 'Net 30',
      shippingTerms: 'FOB Destination',
      shippingAddress: '123 Test Street\nTest City, TC 12345',
      billingAddress: customer.billingAddress || customer.address || '456 Billing St\nBilling City, BC 67890',
      customerPO: 'TEST-PO-001',
      notes: 'This is a test sales order created via script'
    })
    
    console.log('Sales Order created successfully!\n')
    console.log('Order Details:')
    console.log(`- Order Number: ${salesOrder.orderNumber}`)
    console.log(`- Status: ${salesOrder.status}`)
    console.log(`- Order Date: ${salesOrder.orderDate}`)
    console.log(`- Customer: ${salesOrder.salesCase.customer.name}`)
    console.log(`- Total Amount: ${salesOrder.totalAmount}`)
    console.log(`- Items: ${salesOrder.items.length}`)
    
    console.log('\nOrder Items:')
    salesOrder.items.forEach(item => {
      console.log(`- ${item.itemCode}: ${item.description} (Qty: ${item.quantity}, Price: ${item.unitPrice}, Total: ${item.totalAmount})`)
    })
    
  } catch (error) {
    console.error('Error creating sales order:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createTestSalesOrder()