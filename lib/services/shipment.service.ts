import { BaseService } from './base.service'
import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { InventoryService } from './inventory/inventory.service'
import { 
  Prisma,
  Shipment,
  ShipmentItem,
  SalesOrder,
  Customer
} from "@prisma/client"
import { OrderStatus } from '@/lib/constants/order-status'
import { ShipmentStatus } from '@/lib/constants/shipment-status'
import { MovementType } from '@/lib/types/shared-enums'
import { AuditAction } from '@/lib/validators/audit.validator'

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
  private auditService: AuditService
  private inventoryService: InventoryService

  constructor() {
    super('ShipmentService')
    this.auditService = new AuditService()
    this.inventoryService = new InventoryService()
  }

  async createShipmentFromOrder(salesOrderId: string, data: CreateShipmentDto): Promise<Shipment & {
    items: ShipmentItem[]
    salesOrder: SalesOrder & { customer: Customer | null }
  }> {
    return this.withLogging('createShipmentFromOrder', async () => {
      // Validate order exists and is approved
      const order = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: {
            include: {
              item: true
            }
          },
          salesCase: {
            include: {
              customer: true
            }
          }
        },
      })

      if (!order) {
        throw new Error('Sales order not found')
      }

      if (order.status !== OrderStatus.APPROVED && order.status !== OrderStatus.PROCESSING) {
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
          shipToAddress: order.shippingAddress || order.salesCase?.customer?.address || '',
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
                quantity: item.quantity,
                quantityShipped: item.quantity,
              }
            }),
          },
        },
        include: {
          items: true,
          salesOrder: {
            include: {
              salesCase: {
                include: {
                  customer: true
                }
              }
            },
          },
        },
      })
    })
  }

  async confirmShipment(shipmentId: string, data: ConfirmShipmentDto): Promise<Shipment> {
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

      // Use transaction to ensure atomic updates with increased timeout
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

        // Batch fetch all items that track inventory
        const itemIds = shipment.items.map(item => item.itemId)
        const inventoryItems = await tx.item.findMany({
          where: {
            id: { in: itemIds },
            trackInventory: true
          },
          select: {
            id: true,
            trackInventory: true,
            inventoryAccountId: true,
            cogsAccountId: true,
            unitOfMeasureId: true
          }
        })

        // Create a map for quick lookup
        const inventoryItemMap = new Map(inventoryItems.map(item => [item.id, item]))

        // Prepare batch updates for sales order items
        const salesOrderItemUpdates = shipment.items.map(item => 
          tx.salesOrderItem.update({
            where: { id: item.salesOrderItemId },
            data: {
              quantityShipped: {
                increment: item.quantityShipped,
              },
            },
          })
        )

        // Execute batch updates
        await Promise.all(salesOrderItemUpdates)

        // Process inventory in a simplified way for items that track inventory
        let movementIndex = 0
        for (const item of shipment.items) {
          const inventoryItem = inventoryItemMap.get(item.itemId)
          
          if (inventoryItem && inventoryItem.trackInventory) {
            // Generate movement number
            const movementNumber = `MOV-${new Date().getFullYear()}-${Date.now()}-${movementIndex++}`
            
            // Create a simple stock movement record without complex FIFO processing
            await tx.stockMovement.create({
              data: {
                movementNumber,
                itemId: item.itemId,
                quantity: -item.quantityShipped, // Negative for outbound
                movementType: 'ISSUE', // Use string value directly
                referenceType: 'SHIPMENT',
                referenceId: shipment.id,
                referenceNumber: shipment.shipmentNumber,
                movementDate: new Date(),
                unitCost: 0, // Will be calculated later in background
                totalCost: 0, // Will be calculated later in background
                unitOfMeasureId: inventoryItem.unitOfMeasureId, // Use item's UOM from batch fetch
                createdBy: data.shippedBy
              }
            })

            // Update inventory balance in a simple way
            const balance = await tx.inventoryBalance.findFirst({
              where: { itemId: item.itemId }
            })

            if (balance) {
              await tx.inventoryBalance.update({
                where: { id: balance.id },
                data: {
                  availableQuantity: {
                    decrement: item.quantityShipped
                  },
                  totalQuantity: {
                    decrement: item.quantityShipped
                  },
                  lastMovementDate: new Date()
                }
              })
            }
          }
        }

        // Update sales order status if needed
        await this.updateOrderStatusAfterShipment(tx, shipment.salesOrderId)

        // Return the updated shipment with relations
        return await tx.shipment.findUnique({
          where: { id: shipmentId },
          include: {
            items: {
              include: {
                item: true,
              },
            },
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
        }) as Shipment
      }, {
        timeout: 30000, // 30 seconds timeout
        maxWait: 30000 // Maximum time to wait for a transaction slot
      })
    })
  }

  async deliverShipment(shipmentId: string, data: DeliverShipmentDto): Promise<Shipment> {
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

        // Return the updated shipment with relations
        return await tx.shipment.findUnique({
          where: { id: shipmentId },
          include: {
            items: {
              include: {
                item: true,
              },
            },
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
        }) as Shipment
      })
    })
  }

  async cancelShipment(shipmentId: string, _data: CancelShipmentDto): Promise<Shipment> {
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

      // Update and return with relations
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: ShipmentStatus.CANCELLED,
        },
      })

      return await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          items: {
            include: {
              item: true,
            },
          },
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
      }) as Shipment
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
  }): Promise<{
    data: any[]
    total: number
    page: number
    limit: number
  }> {
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
        prisma.shipment.count({ where })])

      return {
        data,
        total,
        page,
        limit,
      }
    })
  }

  async getShipmentsByOrder(salesOrderId: string): Promise<(Shipment & { items: ShipmentItem[] })[]> {
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
  }): Promise<{
    data: any[]
    total: number
    page: number
    limit: number
  }> {
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
        prisma.shipment.count({ where })])

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
  }): Promise<Shipment> {
    return this.withLogging('updateTrackingInfo', async () => {
      // Update and return with relations
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: trackingData,
      })

      return await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          items: {
            include: {
              item: true,
            },
          },
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
      }) as Shipment
    })
  }

  async getOrderDeliveryStatus(salesOrderId: string): Promise<{
    orderStatus: string
    totalItems: number
    fullyDeliveredItems: number
    partiallyDeliveredItems: number
    undeliveredItems: number
    deliveryPercentage: number
    items: Array<{
      id: string
      itemCode: string
      description: string
      orderedQuantity: number
      shippedQuantity: number
      remainingQuantity: number
      deliveryStatus: 'UNDELIVERED' | 'PARTIAL' | 'COMPLETE'
    }>
  }> {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: true
      }
    })

    if (!order) {
      throw new Error('Sales order not found')
    }

    const items = order.items.map(item => {
      const remainingQuantity = item.quantity - item.quantityShipped
      let deliveryStatus: 'UNDELIVERED' | 'PARTIAL' | 'COMPLETE' = 'UNDELIVERED'
      
      if (item.quantityShipped >= item.quantity) {
        deliveryStatus = 'COMPLETE'
      } else if (item.quantityShipped > 0) {
        deliveryStatus = 'PARTIAL'
      }

      return {
        id: item.id,
        itemCode: item.itemCode,
        description: item.description,
        orderedQuantity: item.quantity,
        shippedQuantity: item.quantityShipped,
        remainingQuantity,
        deliveryStatus
      }
    })

    const fullyDeliveredItems = items.filter(i => i.deliveryStatus === 'COMPLETE').length
    const partiallyDeliveredItems = items.filter(i => i.deliveryStatus === 'PARTIAL').length
    const undeliveredItems = items.filter(i => i.deliveryStatus === 'UNDELIVERED').length

    const totalOrderedQty = items.reduce((sum, item) => sum + item.orderedQuantity, 0)
    const totalShippedQty = items.reduce((sum, item) => sum + item.shippedQuantity, 0)
    const deliveryPercentage = totalOrderedQty > 0 ? (totalShippedQty / totalOrderedQty) * 100 : 0

    return {
      orderStatus: order.status,
      totalItems: items.length,
      fullyDeliveredItems,
      partiallyDeliveredItems,
      undeliveredItems,
      deliveryPercentage,
      items
    }
  }

  async createPartialShipment(salesOrderId: string, data: CreateShipmentDto): Promise<Shipment & {
    items: ShipmentItem[]
    salesOrder: SalesOrder & { customer: Customer | null }
  }> {
    // This method is essentially the same as createShipmentFromOrder
    // but emphasizes that partial shipments are supported
    return this.createShipmentFromOrder(salesOrderId, data)
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

  private async updateOrderStatusAfterShipment(_tx: unknown, salesOrderId: string): Promise<void> {
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

  private async updateOrderStatusAfterDelivery(_tx: unknown, salesOrderId: string): Promise<void> {
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