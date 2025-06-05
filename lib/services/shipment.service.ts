import { BaseService } from './base.service'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

// Define status constants
const ShipmentStatus = {
  PREPARING: 'PREPARING' as const,
  READY: 'READY' as const,
  SHIPPED: 'SHIPPED' as const,
  IN_TRANSIT: 'IN_TRANSIT' as const,
  DELIVERED: 'DELIVERED' as const,
  RETURNED: 'RETURNED' as const,
  CANCELLED: 'CANCELLED' as const,
}

const OrderStatus = {
  PENDING: 'PENDING' as const,
  APPROVED: 'APPROVED' as const,
  PROCESSING: 'PROCESSING' as const,
  SHIPPED: 'SHIPPED' as const,
  DELIVERED: 'DELIVERED' as const,
  INVOICED: 'INVOICED' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
  ON_HOLD: 'ON_HOLD' as const,
}

interface CreateShipmentDto {
  items: {
    salesOrderItemId: string
    quantity: number
  }[]
  carrier?: string
  trackingNumber?: string
  shippingMethod?: string
  shipFromAddress?: string
  notes?: string
  createdBy: string
}

interface ConfirmShipmentDto {
  shippedBy: string
  actualCarrier?: string
  actualTrackingNumber?: string
}

interface DeliverShipmentDto {
  deliveredBy: string
  deliveryNotes?: string
  recipientName?: string
}

interface CancelShipmentDto {
  cancelledBy: string
  reason: string
}

export class ShipmentService extends BaseService {
  constructor() {
    super('ShipmentService')
  }

  async createShipmentFromOrder(salesOrderId: string, data: CreateShipmentDto) {
    return this.withLogging('createShipmentFromOrder', async () => {
      // Validate order exists and is approved
      const order = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: true,
          customer: true,
        },
      })

      if (!order) {
        throw new Error('Sales order not found')
      }

      if (order.status !== OrderStatus.APPROVED) {
        throw new Error('Order must be approved before creating shipment')
      }

      // Validate shipment items
      for (const shipItem of data.items) {
        const orderItem = order.items.find(item => item.id === shipItem.salesOrderItemId)
        if (!orderItem) {
          throw new Error(`Order item ${shipItem.salesOrderItemId} not found`)
        }

        if (shipItem.quantity > orderItem.quantity) {
          throw new Error('Cannot ship more than ordered quantity')
        }

        const remainingQuantity = orderItem.quantity - orderItem.quantityShipped
        if (shipItem.quantity > remainingQuantity) {
          throw new Error('Cannot ship more than remaining quantity')
        }
      }

      // Generate shipment number
      const shipmentNumber = await this.generateShipmentNumber()

      // Create shipment with items
      return await prisma.shipment.create({
        data: {
          shipmentNumber,
          salesOrderId,
          status: ShipmentStatus.PREPARING,
          carrier: data.carrier,
          trackingNumber: data.trackingNumber,
          shippingMethod: data.shippingMethod,
          shipToAddress: order.shippingAddress || order.customer.shippingAddress || '',
          shipFromAddress: data.shipFromAddress,
          createdBy: data.createdBy,
          items: {
            create: data.items.map(item => {
              const orderItem = order.items.find(oi => oi.id === item.salesOrderItemId)!
              return {
                salesOrderItemId: item.salesOrderItemId,
                itemId: orderItem.itemId!,
                itemCode: orderItem.itemCode,
                description: orderItem.description,
                quantityShipped: item.quantity,
              }
            }),
          },
        },
        include: {
          items: true,
          salesOrder: {
            include: {
              customer: true,
            },
          },
        },
      })
    })
  }

  async confirmShipment(shipmentId: string, data: ConfirmShipmentDto) {
    return this.withLogging('confirmShipment', async () => {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          items: true,
        },
      })

      if (!shipment) {
        throw new Error('Shipment not found')
      }

      if (shipment.status === ShipmentStatus.SHIPPED || 
          shipment.status === ShipmentStatus.DELIVERED) {
        throw new Error('Shipment is already shipped')
      }

      if (shipment.status === ShipmentStatus.CANCELLED) {
        throw new Error('Cannot ship cancelled shipment')
      }

      // Use transaction to ensure atomic updates
      return await prisma.$transaction(async (tx) => {
        // Update shipment status
        const updatedShipment = await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: ShipmentStatus.SHIPPED,
            shippedBy: data.shippedBy,
            shippedAt: new Date(),
            carrier: data.actualCarrier || shipment.carrier,
            trackingNumber: data.actualTrackingNumber || shipment.trackingNumber,
          },
        })

        // Create stock movements for inventory deduction
        for (const item of shipment.items) {
          await tx.stockMovement.create({
            data: {
              type: 'OUT',
              itemId: item.itemId,
              quantity: item.quantityShipped,
              reason: 'SHIPMENT',
              referenceType: 'SHIPMENT',
              referenceId: shipment.id,
              description: `Shipment ${shipment.shipmentNumber}`,
              performedBy: data.shippedBy,
            },
          })

          // Update sales order item shipped quantity
          await tx.salesOrderItem.update({
            where: { id: item.salesOrderItemId },
            data: {
              quantityShipped: {
                increment: item.quantityShipped,
              },
            },
          })
        }

        // Update sales order status if needed
        await this.updateOrderStatusAfterShipment(tx, shipment.salesOrderId)

        return updatedShipment
      })
    })
  }

  async deliverShipment(shipmentId: string, data: DeliverShipmentDto) {
    return this.withLogging('deliverShipment', async () => {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      })

      if (!shipment) {
        throw new Error('Shipment not found')
      }

      if (shipment.status !== ShipmentStatus.SHIPPED && 
          shipment.status !== ShipmentStatus.IN_TRANSIT) {
        throw new Error('Shipment must be shipped before marking as delivered')
      }

      return await prisma.$transaction(async (tx) => {
        // Update shipment
        const updatedShipment = await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: ShipmentStatus.DELIVERED,
            deliveredBy: data.deliveredBy,
            deliveredAt: new Date(),
          },
        })

        // Check if all order items are delivered
        await this.updateOrderStatusAfterDelivery(tx, shipment.salesOrderId)

        return updatedShipment
      })
    })
  }

  async cancelShipment(shipmentId: string, _data: CancelShipmentDto) {
    return this.withLogging('cancelShipment', async () => {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      })

      if (!shipment) {
        throw new Error('Shipment not found')
      }

      if (shipment.status === ShipmentStatus.SHIPPED || 
          shipment.status === ShipmentStatus.DELIVERED) {
        throw new Error('Cannot cancel shipment that is already shipped')
      }

      return await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: ShipmentStatus.CANCELLED,
        },
      })
    })
  }

  async getShipments(options?: {
    page?: number
    limit?: number
    filters?: {
      status?: string
      salesOrderId?: string
      startDate?: Date
      endDate?: Date
    }
  }) {
    return this.withLogging('getShipments', async () => {
      const page = options?.page || 1
      const limit = options?.limit || 10
      const skip = (page - 1) * limit

      const where: Prisma.ShipmentWhereInput = {}

      if (options?.filters?.status) {
        where.status = options.filters.status as unknown
      }

      if (options?.filters?.salesOrderId) {
        where.salesOrderId = options.filters.salesOrderId
      }

      if (options?.filters?.startDate || options?.filters?.endDate) {
        where.shipmentDate = {}
        if (options.filters.startDate) {
          where.shipmentDate.gte = options.filters.startDate
        }
        if (options.filters.endDate) {
          where.shipmentDate.lte = options.filters.endDate
        }
      }

      const [data, total] = await Promise.all([
        prisma.shipment.findMany({
          where,
          include: {
            items: true,
            salesOrder: {
              include: {
                salesCase: {
                  include: {
                    customer: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.shipment.count({ where }),
      ])

      return {
        data,
        total,
        page,
        limit,
      }
    })
  }

  async getShipmentsByOrder(salesOrderId: string) {
    return this.withLogging('getShipmentsByOrder', async () => {
      return await prisma.shipment.findMany({
        where: { salesOrderId },
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  }

  async getShipmentsByCustomer(customerId: string, options?: {
    status?: keyof typeof ShipmentStatus
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }) {
    return this.withLogging('getShipmentsByCustomer', async () => {
      const page = options?.page || 1
      const limit = options?.limit || 10
      const skip = (page - 1) * limit

      const where: Prisma.ShipmentWhereInput = {
        salesOrder: {
          salesCase: {
            customerId,
          },
        },
      }

      if (options?.status) {
        where.status = options.status
      }

      if (options?.startDate || options?.endDate) {
        where.shipmentDate = {}
        if (options.startDate) {
          where.shipmentDate.gte = options.startDate
        }
        if (options.endDate) {
          where.shipmentDate.lte = options.endDate
        }
      }

      const [data, total] = await Promise.all([
        prisma.shipment.findMany({
          where,
          include: {
            items: true,
            salesOrder: {
              include: {
                salesCase: {
                  include: {
                    customer: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.shipment.count({ where }),
      ])

      return {
        data,
        total,
        page,
        limit,
      }
    })
  }

  async updateTrackingInfo(shipmentId: string, trackingData: {
    carrier?: string
    trackingNumber?: string
    estimatedDeliveryDate?: Date
  }) {
    return this.withLogging('updateTrackingInfo', async () => {
      return await prisma.shipment.update({
        where: { id: shipmentId },
        data: trackingData,
      })
    })
  }

  private async generateShipmentNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.shipment.count({
      where: {
        shipmentNumber: {
          startsWith: `SHP-${year}-`,
        },
      },
    })
    
    const nextNumber = count + 1
    return `SHP-${year}-${nextNumber.toString().padStart(5, '0')}`
  }

  private async updateOrderStatusAfterShipment(_tx: unknown, salesOrderId: string) {
    const order = await (_tx as Record<string, unknown>).salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true },
    })

    if (!order) return

    // Check if any items are shipped
    const hasShippedItems = order.items.some(item => item.quantityShipped > 0)
    
    if (hasShippedItems && order.status === OrderStatus.APPROVED) {
      await (_tx as Record<string, unknown>).salesOrder.update({
        where: { id: salesOrderId },
        data: { status: OrderStatus.SHIPPED },
      })
    }
  }

  private async updateOrderStatusAfterDelivery(_tx: unknown, salesOrderId: string) {
    const order = await (_tx as Record<string, unknown>).salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true },
    })

    if (!order) return

    // Check if all items are fully delivered
    const allDelivered = order.items.every(item => 
      item.quantityShipped >= item.quantity
    )
    
    if (allDelivered) {
      await (_tx as Record<string, unknown>).salesOrder.update({
        where: { id: salesOrderId },
        data: { status: OrderStatus.DELIVERED },
      })
    }
  }
}