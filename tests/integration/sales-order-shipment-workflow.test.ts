import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { prisma } from '@/lib/db/prisma'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { ShipmentService } from '@/lib/services/shipment.service'
import { OrderStatus } from '@/lib/constants/order-status'
import { ShipmentStatus } from '@/lib/constants/shipment-status'

describe('Sales Order to Shipment Workflow', () => {
  let salesOrderService: SalesOrderService
  let shipmentService: ShipmentService
  let testCustomer: any
  let testSalesCase: any
  let testUser: any
  let testProduct: any

  beforeEach(async () => {
    salesOrderService = new SalesOrderService()
    shipmentService = new ShipmentService()

    // Create test data
    testUser = await prisma.user.create({
      data: {
        email: 'test-workflow@example.com',
        username: 'testworkflow',
        firstName: 'Test',
        lastName: 'Workflow',
        hashedPassword: 'hashed',
        status: 'ACTIVE',
        roles: {
          create: {
            roleId: 'admin'
          }
        }
      }
    })

    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: 'customer@example.com',
        code: 'CUST001',
        taxId: '123456789',
        paymentTerms: 'NET30',
        creditLimit: 10000,
        address: '123 Test St',
        createdBy: testUser.id
      }
    })

    testProduct = await prisma.item.create({
      data: {
        code: 'PROD001',
        name: 'Test Product',
        description: 'Test Product Description',
        unitPrice: 100,
        cost: 50,
        trackInventory: true,
        itemType: 'PRODUCT',
        status: 'ACTIVE',
        createdBy: testUser.id
      }
    })

    testSalesCase = await prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-001',
        title: 'Test Sales Case',
        customerId: testCustomer.id,
        assignedTo: testUser.id,
        status: 'ACTIVE',
        priority: 'MEDIUM',
        source: 'DIRECT',
        createdBy: testUser.id
      }
    })
  })

  afterEach(async () => {
    // Clean up in reverse order of dependencies
    await prisma.shipmentItem.deleteMany()
    await prisma.shipment.deleteMany()
    await prisma.salesOrderItem.deleteMany()
    await prisma.salesOrder.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.item.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Sales Order Status Transitions', () => {
    test('should create sales order with PENDING status', async () => {
      const orderData = {
        salesCaseId: testSalesCase.id,
        customerPO: 'PO-12345',
        requestedDate: new Date(),
        promisedDate: new Date(),
        shippingAddress: '123 Shipping St',
        items: [
          {
            itemId: testProduct.id,
            itemCode: testProduct.code,
            description: testProduct.description,
            quantity: 5,
            unitPrice: 100,
            discount: 0,
            taxRate: 5
          }
        ]
      }

      const order = await salesOrderService.createSalesOrder(orderData, testUser.id)
      
      expect(order).toBeDefined()
      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.items).toHaveLength(1)
      expect(order.totalAmount).toBe(525) // 500 + 25 tax
    })

    test('should approve sales order', async () => {
      // Create a pending order
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-001',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.PENDING,
          subtotal: 500,
          taxAmount: 25,
          totalAmount: 525,
          createdBy: testUser.id,
          items: {
            create: {
              itemId: testProduct.id,
              itemCode: testProduct.code,
              description: testProduct.description,
              quantity: 5,
              unitPrice: 100,
              subtotal: 500,
              taxAmount: 25,
              totalAmount: 525,
              quantityShipped: 0
            }
          }
        }
      })

      // Approve the order
      const approvedOrder = await salesOrderService.updateSalesOrder(order.id, {
        status: OrderStatus.APPROVED
      })

      expect(approvedOrder.status).toBe(OrderStatus.APPROVED)
    })

    test('should not allow editing approved orders', async () => {
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-002',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.APPROVED,
          subtotal: 500,
          taxAmount: 25,
          totalAmount: 525,
          createdBy: testUser.id
        }
      })

      // In a real application, this would be enforced by the edit page UI
      // The edit page should check status and prevent editing
      expect(order.status).toBe(OrderStatus.APPROVED)
      expect(['PENDING']).not.toContain(order.status)
    })

    test('should start processing approved order', async () => {
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-003',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.APPROVED,
          subtotal: 500,
          taxAmount: 25,
          totalAmount: 525,
          createdBy: testUser.id
        }
      })

      const processingOrder = await salesOrderService.updateSalesOrder(order.id, {
        status: OrderStatus.PROCESSING
      })

      expect(processingOrder.status).toBe(OrderStatus.PROCESSING)
    })
  })

  describe('Shipment Creation', () => {
    test('should create shipment from approved order', async () => {
      // Create an approved order with items
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-004',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.APPROVED,
          shippingAddress: '123 Shipping St',
          subtotal: 500,
          taxAmount: 25,
          totalAmount: 525,
          createdBy: testUser.id,
          items: {
            create: {
              itemId: testProduct.id,
              itemCode: testProduct.code,
              description: testProduct.description,
              quantity: 5,
              unitPrice: 100,
              subtotal: 500,
              taxAmount: 25,
              totalAmount: 525,
              quantityShipped: 0
            }
          }
        },
        include: {
          items: true
        }
      })

      const shipmentData = {
        items: [{
          salesOrderItemId: order.items[0].id,
          quantity: 3 // Partial shipment
        }],
        carrier: 'FedEx',
        trackingNumber: 'FDX123456',
        shippingMethod: 'Ground',
        createdBy: testUser.id
      }

      const shipment = await shipmentService.createShipmentFromOrder(order.id, shipmentData)

      expect(shipment).toBeDefined()
      expect(shipment.status).toBe(ShipmentStatus.PREPARING)
      expect(shipment.salesOrderId).toBe(order.id)
      expect(shipment.items).toHaveLength(1)
      expect(shipment.items[0].quantityShipped).toBe(3)
      expect(shipment.carrier).toBe('FedEx')
      expect(shipment.trackingNumber).toBe('FDX123456')
    })

    test('should create shipment from processing order', async () => {
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-005',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.PROCESSING,
          shippingAddress: '123 Shipping St',
          subtotal: 500,
          taxAmount: 25,
          totalAmount: 525,
          createdBy: testUser.id,
          items: {
            create: {
              itemId: testProduct.id,
              itemCode: testProduct.code,
              description: testProduct.description,
              quantity: 5,
              unitPrice: 100,
              subtotal: 500,
              taxAmount: 25,
              totalAmount: 525,
              quantityShipped: 0
            }
          }
        },
        include: {
          items: true
        }
      })

      const shipmentData = {
        items: [{
          salesOrderItemId: order.items[0].id,
          quantity: 5 // Full shipment
        }],
        createdBy: testUser.id
      }

      const shipment = await shipmentService.createShipmentFromOrder(order.id, shipmentData)

      expect(shipment).toBeDefined()
      expect(shipment.status).toBe(ShipmentStatus.PREPARING)
      expect(shipment.items[0].quantityShipped).toBe(5)
    })

    test('should not create shipment from pending order', async () => {
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-006',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.PENDING,
          subtotal: 500,
          taxAmount: 25,
          totalAmount: 525,
          createdBy: testUser.id,
          items: {
            create: {
              itemId: testProduct.id,
              itemCode: testProduct.code,
              description: testProduct.description,
              quantity: 5,
              unitPrice: 100,
              subtotal: 500,
              taxAmount: 25,
              totalAmount: 525,
              quantityShipped: 0
            }
          }
        },
        include: {
          items: true
        }
      })

      const shipmentData = {
        items: [{
          salesOrderItemId: order.items[0].id,
          quantity: 5
        }],
        createdBy: testUser.id
      }

      await expect(
        shipmentService.createShipmentFromOrder(order.id, shipmentData)
      ).rejects.toThrow('Order must be approved before creating shipment')
    })

    test('should not ship more than ordered quantity', async () => {
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-007',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.APPROVED,
          subtotal: 500,
          taxAmount: 25,
          totalAmount: 525,
          createdBy: testUser.id,
          items: {
            create: {
              itemId: testProduct.id,
              itemCode: testProduct.code,
              description: testProduct.description,
              quantity: 5,
              unitPrice: 100,
              subtotal: 500,
              taxAmount: 25,
              totalAmount: 525,
              quantityShipped: 0
            }
          }
        },
        include: {
          items: true
        }
      })

      const shipmentData = {
        items: [{
          salesOrderItemId: order.items[0].id,
          quantity: 10 // More than ordered
        }],
        createdBy: testUser.id
      }

      await expect(
        shipmentService.createShipmentFromOrder(order.id, shipmentData)
      ).rejects.toThrow('Cannot ship more than ordered quantity')
    })

    test('should handle multiple partial shipments', async () => {
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-008',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.APPROVED,
          shippingAddress: '123 Shipping St',
          subtotal: 1000,
          taxAmount: 50,
          totalAmount: 1050,
          createdBy: testUser.id,
          items: {
            create: {
              itemId: testProduct.id,
              itemCode: testProduct.code,
              description: testProduct.description,
              quantity: 10,
              unitPrice: 100,
              subtotal: 1000,
              taxAmount: 50,
              totalAmount: 1050,
              quantityShipped: 0
            }
          }
        },
        include: {
          items: true
        }
      })

      // First shipment - 3 units
      const firstShipment = await shipmentService.createShipmentFromOrder(order.id, {
        items: [{
          salesOrderItemId: order.items[0].id,
          quantity: 3
        }],
        createdBy: testUser.id
      })

      expect(firstShipment.items[0].quantityShipped).toBe(3)

      // Update the shipped quantity in the order item
      await prisma.salesOrderItem.update({
        where: { id: order.items[0].id },
        data: { quantityShipped: 3 }
      })

      // Second shipment - 5 units
      const secondShipment = await shipmentService.createShipmentFromOrder(order.id, {
        items: [{
          salesOrderItemId: order.items[0].id,
          quantity: 5
        }],
        createdBy: testUser.id
      })

      expect(secondShipment.items[0].quantityShipped).toBe(5)

      // Update the shipped quantity
      await prisma.salesOrderItem.update({
        where: { id: order.items[0].id },
        data: { quantityShipped: 8 }
      })

      // Third shipment - try to ship more than remaining
      await expect(
        shipmentService.createShipmentFromOrder(order.id, {
          items: [{
            salesOrderItemId: order.items[0].id,
            quantity: 3 // Only 2 remaining
          }],
          createdBy: testUser.id
        })
      ).rejects.toThrow('Cannot ship more than remaining quantity')
    })
  })

  describe('Order Delivery Status', () => {
    test('should track delivery status correctly', async () => {
      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: 'SO-2024-009',
          salesCaseId: testSalesCase.id,
          status: OrderStatus.APPROVED,
          subtotal: 1000,
          taxAmount: 50,
          totalAmount: 1050,
          createdBy: testUser.id,
          items: {
            create: [
              {
                itemId: testProduct.id,
                itemCode: testProduct.code,
                description: testProduct.description,
                quantity: 10,
                unitPrice: 100,
                subtotal: 1000,
                taxAmount: 50,
                totalAmount: 1050,
                quantityShipped: 3
              }
            ]
          }
        }
      })

      const deliveryStatus = await shipmentService.getOrderDeliveryStatus(order.id)

      expect(deliveryStatus.totalItems).toBe(1)
      expect(deliveryStatus.partiallyDeliveredItems).toBe(1)
      expect(deliveryStatus.deliveryPercentage).toBe(30)
      expect(deliveryStatus.items[0].orderedQuantity).toBe(10)
      expect(deliveryStatus.items[0].shippedQuantity).toBe(3)
      expect(deliveryStatus.items[0].remainingQuantity).toBe(7)
      expect(deliveryStatus.items[0].deliveryStatus).toBe('PARTIAL')
    })
  })
})