import { prisma } from '@/lib/db/prisma'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { ShipmentService } from '@/lib/services/shipment.service'
import { OrderStatus } from '@/lib/constants/order-status'

async function testSalesOrderWorkflow() {
  console.log('🧪 Testing Sales Order to Shipment Workflow...\n')

  const salesOrderService = new SalesOrderService()
  const shipmentService = new ShipmentService()

  try {
    // Step 1: Create test data
    console.log('1️⃣ Creating test data...')
    
    let testUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'admin@enxi.com' },
          { username: 'admin' }
        ]
      }
    })
    
    if (!testUser) {
      // Find any active user for testing
      testUser = await prisma.user.findFirst({
        where: { isActive: true }
      })
      
      if (!testUser) {
        throw new Error('No active users found in database. Please run seed script first.')
      }
    }

    const testCustomer = await prisma.customer.findFirst({
      where: { email: { contains: 'test' } }
    }) || await prisma.customer.create({
      data: {
        name: 'Test Customer for Workflow',
        email: 'test-workflow@example.com',
        code: 'CUST-TEST-001',
        taxId: '123456789',
        paymentTerms: 'NET30',
        creditLimit: 10000,
        address: '123 Test St, Test City, TC 12345',
        createdBy: testUser.id
      }
    })

    const testProduct = await prisma.item.findFirst({
      where: { code: 'TEST-PROD-001' }
    }) || await prisma.item.create({
      data: {
        code: 'TEST-PROD-001',
        name: 'Test Product for Workflow',
        description: 'Product for testing sales order workflow',
        unitPrice: 100,
        cost: 50,
        trackInventory: true,
        itemType: 'PRODUCT',
        status: 'ACTIVE',
        createdBy: testUser.id
      }
    })

    const testSalesCase = await prisma.salesCase.create({
      data: {
        caseNumber: `SC-TEST-${Date.now()}`,
        title: 'Test Sales Case for Workflow',
        customerId: testCustomer.id,
        assignedTo: testUser.id,
        status: 'ACTIVE',
        priority: 'MEDIUM',
        source: 'DIRECT',
        createdBy: testUser.id
      }
    })

    console.log('✅ Test data created\n')

    // Step 2: Create sales order
    console.log('2️⃣ Creating sales order...')
    
    const orderData = {
      salesCaseId: testSalesCase.id,
      customerPO: 'PO-TEST-12345',
      requestedDate: new Date(),
      promisedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      shippingAddress: testCustomer.address || '123 Test St',
      items: [
        {
          itemId: testProduct.id,
          itemCode: testProduct.code,
          description: testProduct.description,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxRate: 5
        }
      ]
    }

    const salesOrder = await salesOrderService.createSalesOrder(orderData, testUser.id)
    console.log(`✅ Sales order created: ${salesOrder.orderNumber} (Status: ${salesOrder.status})\n`)

    // Step 3: Test that order cannot be shipped while PENDING
    console.log('3️⃣ Testing shipment restriction for PENDING order...')
    
    try {
      await shipmentService.createShipmentFromOrder(salesOrder.id, {
        items: [{
          salesOrderItemId: salesOrder.items[0].id,
          quantity: 5
        }],
        createdBy: testUser.id
      })
      console.log('❌ ERROR: Shipment was created for PENDING order (should have failed)')
    } catch (error: any) {
      console.log(`✅ Correctly prevented shipment: ${error.message}\n`)
    }

    // Step 4: Approve the order
    console.log('4️⃣ Approving sales order...')
    
    const approvedOrder = await salesOrderService.updateSalesOrder(salesOrder.id, {
      status: OrderStatus.APPROVED
    })
    console.log(`✅ Order approved (Status: ${approvedOrder.status})\n`)

    // Step 5: Create shipment from approved order
    console.log('5️⃣ Creating shipment from APPROVED order...')
    
    const shipment = await shipmentService.createShipmentFromOrder(approvedOrder.id, {
      items: [{
        salesOrderItemId: approvedOrder.items[0].id,
        quantity: 6 // Partial shipment
      }],
      carrier: 'FedEx',
      trackingNumber: 'FDX-TEST-123456',
      shippingMethod: 'Ground',
      createdBy: testUser.id
    })
    
    console.log(`✅ Shipment created: ${shipment.shipmentNumber}`)
    console.log(`   - Carrier: ${shipment.carrier}`)
    console.log(`   - Tracking: ${shipment.trackingNumber}`)
    console.log(`   - Items shipped: ${shipment.items[0].quantityShipped} of ${approvedOrder.items[0].quantity}\n`)

    // Step 6: Check delivery status
    console.log('6️⃣ Checking order delivery status...')
    
    const deliveryStatus = await shipmentService.getOrderDeliveryStatus(approvedOrder.id)
    console.log(`✅ Delivery Status:`)
    console.log(`   - Total items: ${deliveryStatus.totalItems}`)
    console.log(`   - Delivery percentage: ${deliveryStatus.deliveryPercentage}%`)
    console.log(`   - Items partially delivered: ${deliveryStatus.partiallyDeliveredItems}\n`)

    // Step 7: Start processing (alternative workflow)
    console.log('7️⃣ Testing PROCESSING status workflow...')
    
    const processingOrder = await salesOrderService.updateSalesOrder(approvedOrder.id, {
      status: OrderStatus.PROCESSING
    })
    console.log(`✅ Order status changed to: ${processingOrder.status}\n`)

    // Step 8: Create another shipment while processing
    console.log('8️⃣ Creating shipment from PROCESSING order...')
    
    const secondShipment = await shipmentService.createShipmentFromOrder(processingOrder.id, {
      items: [{
        salesOrderItemId: processingOrder.items[0].id,
        quantity: 4 // Remaining items
      }],
      carrier: 'UPS',
      trackingNumber: 'UPS-TEST-789012',
      createdBy: testUser.id
    })
    
    console.log(`✅ Second shipment created: ${secondShipment.shipmentNumber}`)
    console.log(`   - Carrier: ${secondShipment.carrier}`)
    console.log(`   - Items shipped: ${secondShipment.items[0].quantityShipped}\n`)

    // Cleanup
    console.log('🧹 Cleaning up test data...')
    
    await prisma.shipmentItem.deleteMany({
      where: { shipment: { salesOrderId: salesOrder.id } }
    })
    await prisma.shipment.deleteMany({
      where: { salesOrderId: salesOrder.id }
    })
    await prisma.salesOrderItem.deleteMany({
      where: { salesOrderId: salesOrder.id }
    })
    await prisma.salesOrder.delete({
      where: { id: salesOrder.id }
    })
    await prisma.salesCase.delete({
      where: { id: testSalesCase.id }
    })
    
    console.log('✅ Test data cleaned up\n')
    console.log('🎉 All workflow tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testSalesOrderWorkflow()