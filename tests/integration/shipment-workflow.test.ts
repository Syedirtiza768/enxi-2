import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ShipmentService } from '@/lib/services/shipment.service'
import { prisma } from '@/lib/db/prisma'

describe('Shipment Workflow Integration Tests', () => {
  let shipmentService: ShipmentService
  let testCustomer: any
  let testUser: any
  let testSalesCase: any
  let testSalesOrder: any
  let testItem: any

  beforeEach(async () => {
    shipmentService = new ShipmentService()

    // Clean up existing test data
    await prisma.shipment.deleteMany({
      where: { shipmentNumber: { startsWith: 'TEST-' } }
    })
    await prisma.salesOrder.deleteMany({
      where: { orderNumber: { startsWith: 'TEST-' } }
    })
    await prisma.salesCase.deleteMany({
      where: { title: { startsWith: 'Test' } }
    })
    await prisma.customer.deleteMany({
      where: { customerNumber: { startsWith: 'TEST-' } }
    })
    await prisma.item.deleteMany({
      where: { code: { startsWith: 'TEST-' } }
    })

    // Get or create test user first
    testUser = await prisma.user.findFirst() || await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@user.com',
        passwordHash: 'hash123',
        role: 'ADMIN',
      },
    })

    // Create test data
    testCustomer = await prisma.customer.create({
      data: {
        customerNumber: 'TEST-CUST-001',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St, Test City, TC 12345',
        createdBy: testUser.id,
      },
    })

    testItem = await prisma.item.create({
      data: {
        code: 'TEST-ITEM-001',
        name: 'Test Item',
        description: 'Test item for shipment testing',
        unitPrice: 100.00,
        costPrice: 60.00,
        categoryId: null,
        createdBy: testUser.id,
      },
    })

    testSalesCase = await prisma.salesCase.create({
      data: {
        title: 'Test Sales Case',
        description: 'Test case for shipment testing',
        customerId: testCustomer.id,
        value: 1000.00,
        probability: 90,
        expectedCloseDate: new Date(),
        status: 'QUALIFIED',
        assignedTo: testUser.id,
        createdBy: testUser.id,
      },
    })

    testSalesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: 'TEST-SO-001',
        salesCaseId: testSalesCase.id,
        status: 'APPROVED',
        orderDate: new Date(),
        totalAmount: 1000.00,
        subtotal: 1000.00,
        shippingAddress: testCustomer.address,
        billingAddress: testCustomer.address,
        createdBy: testUser.id,
        items: {
          create: [
            {
              itemId: testItem.id,
              itemCode: testItem.code,
              description: testItem.description,
              quantity: 10,
              unitPrice: 100.00,
              subtotal: 1000.00,
              totalAmount: 1000.00,
            },
          ],
        },
      },
      include: { items: true },
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.shipment.deleteMany({
      where: { shipmentNumber: { startsWith: 'TEST-' } }
    })
    await prisma.salesOrder.deleteMany({
      where: { orderNumber: { startsWith: 'TEST-' } }
    })
    await prisma.salesCase.deleteMany({
      where: { title: { startsWith: 'Test' } }
    })
    await prisma.customer.deleteMany({
      where: { customerNumber: { startsWith: 'TEST-' } }
    })
    await prisma.item.deleteMany({
      where: { code: { startsWith: 'TEST-' } }
    })
  })

  describe('Complete Shipment Workflow', () => {
    it('should execute end-to-end shipment workflow', async () => {
      // Step 1: Create shipment from order
      const shipment = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 5, // Partial shipment
          },
        ],
        carrier: 'FedEx',
        trackingNumber: 'TEST123456',
        createdBy: testUser.id,
      })

      expect(shipment.status).toBe('PREPARING')
      expect(shipment.shipmentNumber).toMatch(/^SHP-\d{4}-\d{5}$/)
      expect(shipment.items).toHaveLength(1)
      expect(shipment.items[0].quantityShipped).toBe(5)

      // Step 2: Update tracking information
      const updatedShipment = await shipmentService.updateTrackingInfo(shipment.id, {
        carrier: 'UPS',
        trackingNumber: 'UPS789123',
        estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      })

      expect(updatedShipment.carrier).toBe('UPS')
      expect(updatedShipment.trackingNumber).toBe('UPS789123')

      // Step 3: Confirm shipment (this should deduct inventory)
      const confirmedShipment = await shipmentService.confirmShipment(shipment.id, {
        shippedBy: testUser.id,
      })

      expect(confirmedShipment.status).toBe('SHIPPED')
      expect(confirmedShipment.shippedAt).toBeDefined()
      expect(confirmedShipment.shippedBy).toBe(testUser.id)

      // Verify stock movement was created
      const stockMovements = await prisma.stockMovement.findMany({
        where: {
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
        },
      })

      expect(stockMovements).toHaveLength(1)
      expect(stockMovements[0].type).toBe('OUT')
      expect(stockMovements[0].quantity).toBe(5)
      expect(stockMovements[0].itemId).toBe(testItem.id)

      // Verify sales order item quantity was updated
      const updatedOrderItem = await prisma.salesOrderItem.findUnique({
        where: { id: testSalesOrder.items[0].id },
      })

      expect(updatedOrderItem?.quantityShipped).toBe(5)

      // Step 4: Mark as delivered
      const deliveredShipment = await shipmentService.deliverShipment(shipment.id, {
        deliveredBy: testUser.id,
        deliveryNotes: 'Left at front door',
        recipientName: 'John Doe',
      })

      expect(deliveredShipment.status).toBe('DELIVERED')
      expect(deliveredShipment.deliveredAt).toBeDefined()
      expect(deliveredShipment.deliveredBy).toBe(testUser.id)

      // Verify order status is still SHIPPED (not DELIVERED) because only partial shipment
      const updatedOrder = await prisma.salesOrder.findUnique({
        where: { id: testSalesOrder.id },
        include: { items: true },
      })

      expect(updatedOrder?.status).toBe('SHIPPED') // Should remain SHIPPED since not fully delivered
    })

    it('should update order status to DELIVERED when all items are shipped', async () => {
      // Create shipment for full quantity
      const shipment = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 10, // Full quantity
          },
        ],
        carrier: 'FedEx',
        createdBy: testUser.id,
      })

      // Confirm shipment
      await shipmentService.confirmShipment(shipment.id, {
        shippedBy: testUser.id,
      })

      // Deliver shipment
      await shipmentService.deliverShipment(shipment.id, {
        deliveredBy: testUser.id,
      })

      // Verify order status is now DELIVERED
      const updatedOrder = await prisma.salesOrder.findUnique({
        where: { id: testSalesOrder.id },
      })

      expect(updatedOrder?.status).toBe('DELIVERED')
    })

    it('should handle partial shipments correctly', async () => {
      // Create first partial shipment
      const shipment1 = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 3,
          },
        ],
        carrier: 'FedEx',
        createdBy: testUser.id,
      })

      await shipmentService.confirmShipment(shipment1.id, {
        shippedBy: testUser.id,
      })

      // Create second partial shipment
      const shipment2 = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 4,
          },
        ],
        carrier: 'UPS',
        createdBy: testUser.id,
      })

      await shipmentService.confirmShipment(shipment2.id, {
        shippedBy: testUser.id,
      })

      // Verify order item quantities
      const updatedOrderItem = await prisma.salesOrderItem.findUnique({
        where: { id: testSalesOrder.items[0].id },
      })

      expect(updatedOrderItem?.quantityShipped).toBe(7) // 3 + 4

      // Create final shipment for remaining quantity
      const shipment3 = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 3, // Remaining quantity
          },
        ],
        carrier: 'DHL',
        createdBy: testUser.id,
      })

      await shipmentService.confirmShipment(shipment3.id, {
        shippedBy: testUser.id,
      })

      // Deliver all shipments
      await shipmentService.deliverShipment(shipment1.id, { deliveredBy: testUser.id })
      await shipmentService.deliverShipment(shipment2.id, { deliveredBy: testUser.id })
      await shipmentService.deliverShipment(shipment3.id, { deliveredBy: testUser.id })

      // Verify final order status
      const finalOrder = await prisma.salesOrder.findUnique({
        where: { id: testSalesOrder.id },
        include: { items: true },
      })

      expect(finalOrder?.status).toBe('DELIVERED')
      expect(finalOrder?.items[0].quantityShipped).toBe(10) // Full quantity shipped
    })

    it('should prevent shipment of excessive quantities', async () => {
      await expect(
        shipmentService.createShipmentFromOrder(testSalesOrder.id, {
          items: [
            {
              salesOrderItemId: testSalesOrder.items[0].id,
              quantity: 15, // More than ordered (10)
            },
          ],
          createdBy: testUser.id,
        })
      ).rejects.toThrow('Cannot ship more than ordered quantity')
    })

    it('should allow cancellation of preparing shipments', async () => {
      const shipment = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 5,
          },
        ],
        createdBy: testUser.id,
      })

      const cancelledShipment = await shipmentService.cancelShipment(shipment.id, {
        cancelledBy: testUser.id,
        reason: 'Customer cancelled order',
      })

      expect(cancelledShipment.status).toBe('CANCELLED')
    })

    it('should retrieve shipments by order', async () => {
      // Create multiple shipments for the same order
      const shipment1 = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [{ salesOrderItemId: testSalesOrder.items[0].id, quantity: 3 }],
        createdBy: testUser.id,
      })

      const shipment2 = await shipmentService.createShipmentFromOrder(testSalesOrder.id, {
        items: [{ salesOrderItemId: testSalesOrder.items[0].id, quantity: 2 }],
        createdBy: testUser.id,
      })

      const orderShipments = await shipmentService.getShipmentsByOrder(testSalesOrder.id)

      expect(orderShipments).toHaveLength(2)
      expect(orderShipments.map(s => s.id)).toContain(shipment1.id)
      expect(orderShipments.map(s => s.id)).toContain(shipment2.id)
    })
  })
})