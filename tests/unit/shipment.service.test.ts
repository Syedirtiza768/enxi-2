import { ShipmentService } from '@/lib/services/shipment.service'
import { prisma } from '@/lib/db/prisma'

// Define enums for testing
enum ShipmentStatus {
  PREPARING = 'PREPARING',
  READY = 'READY',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  INVOICED = 'INVOICED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    shipment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    shipmentItem: {
      createMany: jest.fn(),
    },
    salesOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    salesOrderItem: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}))

describe('ShipmentService', () => {
  let shipmentService: ShipmentService
  const mockPrisma = prisma as any

  beforeEach(() => {
    shipmentService = new ShipmentService()
    jest.clearAllMocks()
  })

  describe('createShipmentFromOrder', () => {
    const mockSalesOrder = {
      id: 'order-1',
      orderNumber: 'SO-2025-00001',
      customerId: 'customer-1',
      status: OrderStatus.APPROVED,
      shippingAddress: '123 Main St',
      items: [
        {
          id: 'item-1',
          itemId: 'product-1',
          itemCode: 'PROD-001',
          description: 'Product 1',
          quantity: 10,
          quantityShipped: 0,
        },
        {
          id: 'item-2',
          itemId: 'product-2',
          itemCode: 'PROD-002',
          description: 'Product 2',
          quantity: 5,
          quantityShipped: 2, // Partially shipped
        },
      ],
    }

    it('should create a shipment from an approved sales order', async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue(mockSalesOrder)
      mockPrisma.shipment.count.mockResolvedValue(0)
      mockPrisma.shipment.create.mockResolvedValue({
        id: 'shipment-1',
        shipmentNumber: 'SHP-2025-00001',
        salesOrderId: 'order-1',
        status: ShipmentStatus.PREPARING,
      })

      const result = await shipmentService.createShipmentFromOrder('order-1', {
        items: [
          { salesOrderItemId: 'item-1', quantity: 5 },
          { salesOrderItemId: 'item-2', quantity: 3 },
        ],
        carrier: 'FedEx',
        trackingNumber: '123456789',
        createdBy: 'user-1',
      })

      expect(mockPrisma.shipment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shipmentNumber: 'SHP-2025-00001',
          salesOrderId: 'order-1',
          status: ShipmentStatus.PREPARING,
          carrier: 'FedEx',
          trackingNumber: '123456789',
          shipToAddress: '123 Main St',
          createdBy: 'user-1',
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                salesOrderItemId: 'item-1',
                quantityShipped: 5,
              }),
              expect.objectContaining({
                salesOrderItemId: 'item-2',
                quantityShipped: 3,
              }),
            ]),
          },
        }),
        include: expect.any(Object),
      })
    })

    it('should throw error if order is not approved', async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        ...mockSalesOrder,
        status: OrderStatus.PENDING,
      })

      await expect(
        shipmentService.createShipmentFromOrder('order-1', {
          items: [],
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Order must be approved before creating shipment')
    })

    it('should throw error if trying to ship more than ordered quantity', async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue(mockSalesOrder)

      await expect(
        shipmentService.createShipmentFromOrder('order-1', {
          items: [{ salesOrderItemId: 'item-1', quantity: 15 }], // More than ordered
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Cannot ship more than ordered quantity')
    })

    it('should throw error if trying to ship more than remaining quantity', async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue(mockSalesOrder)

      await expect(
        shipmentService.createShipmentFromOrder('order-1', {
          items: [{ salesOrderItemId: 'item-2', quantity: 4 }], // More than remaining (5-2=3)
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Cannot ship more than remaining quantity')
    })
  })

  describe('confirmShipment', () => {
    const mockShipment = {
      id: 'shipment-1',
      shipmentNumber: 'SHP-2025-00001',
      status: ShipmentStatus.READY,
      salesOrderId: 'order-1',
      items: [
        {
          id: 'ship-item-1',
          itemId: 'product-1',
          quantityShipped: 5,
          salesOrderItemId: 'order-item-1',
        },
      ],
    }

    it('should confirm shipment and deduct inventory', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue(mockShipment)
      mockPrisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
      })

      const result = await shipmentService.confirmShipment('shipment-1', {
        shippedBy: 'user-1',
      })

      // Verify shipment status update
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'shipment-1' },
        data: expect.objectContaining({
          status: ShipmentStatus.SHIPPED,
          shippedBy: 'user-1',
          shippedAt: expect.any(Date),
        }),
      })

      // Verify inventory deduction via stock movement
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OUT',
          itemId: 'product-1',
          quantity: 5,
          reason: 'SHIPMENT',
          referenceType: 'SHIPMENT',
          referenceId: 'shipment-1',
          description: expect.stringContaining('SHP-2025-00001'),
        }),
      })

      // Verify order item quantity update
      expect(mockPrisma.salesOrderItem.update).toHaveBeenCalledWith({
        where: { id: 'order-item-1' },
        data: {
          quantityShipped: {
            increment: 5,
          },
        },
      })
    })

    it('should throw error if shipment is already shipped', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.SHIPPED,
      })

      await expect(
        shipmentService.confirmShipment('shipment-1', { shippedBy: 'user-1' })
      ).rejects.toThrow('Shipment is already shipped')
    })
  })

  describe('deliverShipment', () => {
    const mockShipment = {
      id: 'shipment-1',
      status: ShipmentStatus.IN_TRANSIT,
      salesOrderId: 'order-1',
    }

    it('should mark shipment as delivered', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue(mockShipment)
      mockPrisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.DELIVERED,
        deliveredAt: new Date(),
      })

      const result = await shipmentService.deliverShipment('shipment-1', {
        deliveredBy: 'user-1',
        deliveryNotes: 'Left at front door',
      })

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'shipment-1' },
        data: expect.objectContaining({
          status: ShipmentStatus.DELIVERED,
          deliveredBy: 'user-1',
          deliveredAt: expect.any(Date),
        }),
      })
    })

    it('should update sales order status if all items are delivered', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue(mockShipment)
      mockPrisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.DELIVERED,
      })
      
      // Mock checking if all order items are delivered
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        items: [
          { quantity: 10, quantityShipped: 10 },
          { quantity: 5, quantityShipped: 5 },
        ],
      })

      await shipmentService.deliverShipment('shipment-1', {
        deliveredBy: 'user-1',
      })

      expect(mockPrisma.salesOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.DELIVERED },
      })
    })
  })

  describe('cancelShipment', () => {
    it('should cancel a shipment in PREPARING status', async () => {
      const mockShipment = {
        id: 'shipment-1',
        status: ShipmentStatus.PREPARING,
      }

      mockPrisma.shipment.findUnique.mockResolvedValue(mockShipment)
      mockPrisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.CANCELLED,
      })

      await shipmentService.cancelShipment('shipment-1', {
        cancelledBy: 'user-1',
        reason: 'Customer request',
      })

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'shipment-1' },
        data: expect.objectContaining({
          status: ShipmentStatus.CANCELLED,
        }),
      })
    })

    it('should throw error if shipment is already shipped', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'shipment-1',
        status: ShipmentStatus.SHIPPED,
      })

      await expect(
        shipmentService.cancelShipment('shipment-1', {
          cancelledBy: 'user-1',
          reason: 'Test',
        })
      ).rejects.toThrow('Cannot cancel shipment that is already shipped')
    })
  })

  describe('getShipmentsByOrder', () => {
    it('should return all shipments for an order', async () => {
      const mockShipments = [
        { id: 'shipment-1', shipmentNumber: 'SHP-001' },
        { id: 'shipment-2', shipmentNumber: 'SHP-002' },
      ]

      mockPrisma.shipment.findMany.mockResolvedValue(mockShipments)

      const result = await shipmentService.getShipmentsByOrder('order-1')

      expect(mockPrisma.shipment.findMany).toHaveBeenCalledWith({
        where: { salesOrderId: 'order-1' },
        include: expect.objectContaining({
          items: true,
        }),
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockShipments)
    })
  })

  describe('generateShipmentNumber', () => {
    it('should generate unique shipment number', async () => {
      mockPrisma.shipment.count.mockResolvedValue(5)

      const result = await shipmentService['generateShipmentNumber']()

      expect(result).toBe('SHP-2025-00006')
    })
  })
})