import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// Import the API handlers
import { GET as getShipments, POST as createShipment } from '@/app/api/shipments/route'
import { GET as getShipment, PUT as updateShipment } from '@/app/api/shipments/[id]/route'
import { POST as confirmShipment } from '@/app/api/shipments/[id]/confirm/route'
import { POST as deliverShipment } from '@/app/api/shipments/[id]/deliver/route'
import { POST as cancelShipment } from '@/app/api/shipments/[id]/cancel/route'

describe('Shipment API Integration Tests', () => {
  let testCustomer: any
  let testUser: any
  let testSalesCase: any
  let testSalesOrder: any
  let testItem: any

  beforeEach(async () => {
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
      where: { name: { startsWith: 'Test' } }
    })
    await prisma.item.deleteMany({
      where: { code: { startsWith: 'TEST-' } }
    })

    // Create test data
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        shippingAddress: '123 Test St, Test City, TC 12345',
        billingAddress: '123 Test St, Test City, TC 12345',
      },
    })

    testUser = await prisma.user.findFirst() || await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@user.com',
        passwordHash: 'hash123',
        role: 'ADMIN',
      },
    })

    testItem = await prisma.item.create({
      data: {
        code: 'TEST-ITEM-001',
        name: 'Test Item',
        description: 'Test item for shipment testing',
        unitPrice: 100.00,
        standardCost: 60.00,
        categoryId: null,
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
        shippingAddress: testCustomer.shippingAddress,
        billingAddress: testCustomer.billingAddress,
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
      where: { name: { startsWith: 'Test' } }
    })
    await prisma.item.deleteMany({
      where: { code: { startsWith: 'TEST-' } }
    })
  })

  describe('POST /api/shipments', () => {
    it('should create a new shipment from sales order', async () => {
      const requestBody = {
        salesOrderId: testSalesOrder.id,
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 5,
          },
        ],
        carrier: 'FedEx',
        trackingNumber: 'TEST123456',
        createdBy: testUser.id,
      }

      const request = new NextRequest('http://localhost/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await createShipment(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.shipmentNumber).toMatch(/^SHP-\d{4}-\d{5}$/)
      expect(data.status).toBe('PREPARING')
      expect(data.carrier).toBe('FedEx')
      expect(data.trackingNumber).toBe('TEST123456')
      expect(data.items).toHaveLength(1)
      expect(data.items[0].quantityShipped).toBe(5)
    })

    it('should return 400 for invalid order status', async () => {
      // Update order to pending status
      await prisma.salesOrder.update({
        where: { id: testSalesOrder.id },
        data: { status: 'PENDING' },
      })

      const requestBody = {
        salesOrderId: testSalesOrder.id,
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 5,
          },
        ],
        createdBy: testUser.id,
      }

      const request = new NextRequest('http://localhost/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await createShipment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Order must be approved')
    })

    it('should return 400 for excessive quantity', async () => {
      const requestBody = {
        salesOrderId: testSalesOrder.id,
        items: [
          {
            salesOrderItemId: testSalesOrder.items[0].id,
            quantity: 15, // More than ordered (10)
          },
        ],
        createdBy: testUser.id,
      }

      const request = new NextRequest('http://localhost/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await createShipment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot ship more than ordered quantity')
    })
  })

  describe('GET /api/shipments', () => {
    let testShipment: any

    beforeEach(async () => {
      testShipment = await prisma.shipment.create({
        data: {
          shipmentNumber: 'TEST-SHP-001',
          salesOrderId: testSalesOrder.id,
          status: 'PREPARING',
          shipToAddress: testCustomer.shippingAddress,
          createdBy: testUser.id,
          items: {
            create: [
              {
                salesOrderItemId: testSalesOrder.items[0].id,
                itemId: testItem.id,
                itemCode: testItem.code,
                description: testItem.description,
                quantityShipped: 5,
              },
            ],
          },
        },
      })
    })

    it('should return all shipments with pagination', async () => {
      const request = new NextRequest('http://localhost/api/shipments?page=1&limit=10')
      
      const response = await getShipments(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.total).toBeGreaterThan(0)
      expect(data.page).toBe(1)
      expect(data.limit).toBe(10)
    })

    it('should filter shipments by status', async () => {
      const request = new NextRequest('http://localhost/api/shipments?status=PREPARING')
      
      const response = await getShipments(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.forEach((shipment: any) => {
        expect(shipment.status).toBe('PREPARING')
      })
    })
  })

  describe('GET /api/shipments/[id]', () => {
    let testShipment: any

    beforeEach(async () => {
      testShipment = await prisma.shipment.create({
        data: {
          shipmentNumber: 'TEST-SHP-002',
          salesOrderId: testSalesOrder.id,
          status: 'PREPARING',
          shipToAddress: testCustomer.shippingAddress,
          createdBy: testUser.id,
          items: {
            create: [
              {
                salesOrderItemId: testSalesOrder.items[0].id,
                itemId: testItem.id,
                itemCode: testItem.code,
                description: testItem.description,
                quantityShipped: 3,
              },
            ],
          },
        },
      })
    })

    it('should return specific shipment with details', async () => {
      const request = new NextRequest(`http://localhost/api/shipments/${testShipment.id}`)
      
      const response = await getShipment(request, { params: { id: testShipment.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(testShipment.id)
      expect(data.shipmentNumber).toBe('TEST-SHP-002')
      expect(data.items).toBeDefined()
      expect(data.items).toHaveLength(1)
    })

    it('should return 404 for non-existent shipment', async () => {
      const request = new NextRequest('http://localhost/api/shipments/nonexistent')
      
      const response = await getShipment(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Shipment not found')
    })
  })

  describe('POST /api/shipments/[id]/confirm', () => {
    let testShipment: any

    beforeEach(async () => {
      testShipment = await prisma.shipment.create({
        data: {
          shipmentNumber: 'TEST-SHP-003',
          salesOrderId: testSalesOrder.id,
          status: 'READY',
          shipToAddress: testCustomer.shippingAddress,
          createdBy: testUser.id,
          items: {
            create: [
              {
                salesOrderItemId: testSalesOrder.items[0].id,
                itemId: testItem.id,
                itemCode: testItem.code,
                description: testItem.description,
                quantityShipped: 4,
              },
            ],
          },
        },
      })
    })

    it('should confirm shipment and update status to SHIPPED', async () => {
      const requestBody = {
        shippedBy: testUser.id,
        actualCarrier: 'UPS',
        actualTrackingNumber: 'UPS123456',
      }

      const request = new NextRequest(`http://localhost/api/shipments/${testShipment.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await confirmShipment(request, { params: { id: testShipment.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('SHIPPED')
      expect(data.shippedBy).toBe(testUser.id)
      expect(data.carrier).toBe('UPS')
      expect(data.trackingNumber).toBe('UPS123456')
      expect(data.shippedAt).toBeDefined()
    })

    it('should return 400 if shipment is already shipped', async () => {
      // First, ship the shipment
      await prisma.shipment.update({
        where: { id: testShipment.id },
        data: { status: 'SHIPPED' },
      })

      const requestBody = {
        shippedBy: testUser.id,
      }

      const request = new NextRequest(`http://localhost/api/shipments/${testShipment.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await confirmShipment(request, { params: { id: testShipment.id } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already shipped')
    })
  })

  describe('POST /api/shipments/[id]/deliver', () => {
    let testShipment: any

    beforeEach(async () => {
      testShipment = await prisma.shipment.create({
        data: {
          shipmentNumber: 'TEST-SHP-004',
          salesOrderId: testSalesOrder.id,
          status: 'IN_TRANSIT',
          shipToAddress: testCustomer.shippingAddress,
          createdBy: testUser.id,
          shippedAt: new Date(),
          items: {
            create: [
              {
                salesOrderItemId: testSalesOrder.items[0].id,
                itemId: testItem.id,
                itemCode: testItem.code,
                description: testItem.description,
                quantityShipped: 6,
              },
            ],
          },
        },
      })
    })

    it('should mark shipment as delivered', async () => {
      const requestBody = {
        deliveredBy: testUser.id,
        deliveryNotes: 'Left at front door',
        recipientName: 'John Doe',
      }

      const request = new NextRequest(`http://localhost/api/shipments/${testShipment.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await deliverShipment(request, { params: { id: testShipment.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('DELIVERED')
      expect(data.deliveredBy).toBe(testUser.id)
      expect(data.deliveredAt).toBeDefined()
    })
  })

  describe('POST /api/shipments/[id]/cancel', () => {
    let testShipment: any

    beforeEach(async () => {
      testShipment = await prisma.shipment.create({
        data: {
          shipmentNumber: 'TEST-SHP-005',
          salesOrderId: testSalesOrder.id,
          status: 'PREPARING',
          shipToAddress: testCustomer.shippingAddress,
          createdBy: testUser.id,
        },
      })
    })

    it('should cancel a preparing shipment', async () => {
      const requestBody = {
        cancelledBy: testUser.id,
        reason: 'Customer requested cancellation',
      }

      const request = new NextRequest(`http://localhost/api/shipments/${testShipment.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await cancelShipment(request, { params: { id: testShipment.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('CANCELLED')
    })

    it('should return 400 if trying to cancel shipped shipment', async () => {
      // Update shipment to shipped status
      await prisma.shipment.update({
        where: { id: testShipment.id },
        data: { status: 'SHIPPED' },
      })

      const requestBody = {
        cancelledBy: testUser.id,
        reason: 'Test cancellation',
      }

      const request = new NextRequest(`http://localhost/api/shipments/${testShipment.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await cancelShipment(request, { params: { id: testShipment.id } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot cancel shipment that is already shipped')
    })
  })
})