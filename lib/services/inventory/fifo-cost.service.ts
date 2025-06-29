import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

export interface FIFOCostResult {
  totalCost: number
  unitCost: number
  costDetails: Array<{
    lotNumber: string
    quantity: number
    unitCost: number
    totalCost: number
  }>
}

export class FIFOCostService {
  /**
   * Calculate FIFO cost for delivered items in a sales case
   */
  async calculateDeliveredItemsCost(salesOrderIds: string[]): Promise<number> {
    if (!salesOrderIds.length) return 0

    // First, get shipments for these sales orders
    const shipments = await prisma.shipment.findMany({
      where: {
        salesOrderId: { in: salesOrderIds },
        status: 'DELIVERED'
      },
      select: { id: true }
    })

    const shipmentIds = shipments.map(s => s.id)

    // Then check if we have stock movements for these shipments
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        referenceType: 'SHIPMENT',
        referenceId: { in: shipmentIds },
        movementType: { in: ['SALE', 'STOCK_OUT'] }
      },
      include: {
        item: true
      }
    })

    // If we have stock movements with costs, use those
    if (stockMovements.length > 0) {
      const movementsWithCost = stockMovements.filter(m => m.totalCost > 0)
      if (movementsWithCost.length > 0) {
        return movementsWithCost.reduce((sum, mov) => sum + mov.totalCost, 0)
      }
    }

    // Otherwise, calculate from delivered items
    const deliveredItems = await prisma.shipmentItem.findMany({
      where: {
        shipment: {
          salesOrderId: { in: salesOrderIds },
          status: 'DELIVERED'
        }
      },
      include: {
        item: true,
        shipment: true
      }
    })

    if (!deliveredItems.length) return 0

    let totalCost = 0

    // Group by item to calculate FIFO for each product
    const itemGroups = deliveredItems.reduce((acc, item) => {
      if (!acc[item.itemId]) acc[item.itemId] = []
      acc[item.itemId].push(item)
      return acc
    }, {} as Record<string, typeof deliveredItems>)

    // Calculate FIFO cost for each item
    for (const [itemId, items] of Object.entries(itemGroups)) {
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
      const costResult = await this.calculateFIFOCost(itemId, totalQuantity)
      totalCost += costResult.totalCost
    }

    return totalCost
  }

  /**
   * Calculate FIFO cost for a specific item and quantity
   */
  async calculateFIFOCost(itemId: string, quantity: number): Promise<FIFOCostResult> {
    // Get available stock lots in FIFO order (oldest first)
    const stockLots = await prisma.stockLot.findMany({
      where: {
        itemId,
        availableQty: { gt: 0 },
        isActive: true
      },
      orderBy: {
        receivedDate: 'asc'
      }
    })

    const costDetails: FIFOCostResult['costDetails'] = []
    let remainingQty = quantity
    let totalCost = 0

    // Apply FIFO logic
    for (const lot of stockLots) {
      if (remainingQty <= 0) break

      const qtyFromLot = Math.min(remainingQty, lot.availableQty)
      const costFromLot = qtyFromLot * lot.unitCost

      costDetails.push({
        lotNumber: lot.lotNumber,
        quantity: qtyFromLot,
        unitCost: lot.unitCost,
        totalCost: costFromLot
      })

      totalCost += costFromLot
      remainingQty -= qtyFromLot
    }

    // If not enough stock, use standard cost from item master
    if (remainingQty > 0) {
      const item = await prisma.item.findUnique({
        where: { id: itemId }
      })

      if (item) {
        const costFromStandard = remainingQty * item.standardCost
        costDetails.push({
          lotNumber: 'STANDARD_COST',
          quantity: remainingQty,
          unitCost: item.standardCost,
          totalCost: costFromStandard
        })
        totalCost += costFromStandard
      }
    }

    const unitCost = quantity > 0 ? totalCost / quantity : 0

    return {
      totalCost,
      unitCost,
      costDetails
    }
  }

  /**
   * Get FIFO cost at a specific date (for historical calculations)
   */
  async calculateFIFOCostAtDate(
    itemId: string, 
    quantity: number, 
    date: Date
  ): Promise<FIFOCostResult> {
    // Get stock lots available at the specified date
    const stockLots = await prisma.stockLot.findMany({
      where: {
        itemId,
        receivedDate: { lte: date },
        isActive: true
      },
      orderBy: {
        receivedDate: 'asc'
      }
    })

    // Calculate available quantity at the date by considering movements
    const lotsWithAvailability = await Promise.all(
      stockLots.map(async (lot) => {
        // Get all movements for this lot up to the date
        const movements = await prisma.stockMovement.findMany({
          where: {
            stockLotId: lot.id,
            movementDate: { lte: date },
            movementType: { in: ['SALE', 'ADJUSTMENT_OUT', 'TRANSFER_OUT'] }
          }
        })

        const usedQty = movements.reduce((sum, mov) => sum + Math.abs(mov.quantity), 0)
        const availableQty = lot.receivedQty - usedQty

        return {
          ...lot,
          availableQty: Math.max(0, availableQty)
        }
      })
    )

    // Apply FIFO logic with historical availability
    const costDetails: FIFOCostResult['costDetails'] = []
    let remainingQty = quantity
    let totalCost = 0

    for (const lot of lotsWithAvailability) {
      if (remainingQty <= 0 || lot.availableQty <= 0) continue

      const qtyFromLot = Math.min(remainingQty, lot.availableQty)
      const costFromLot = qtyFromLot * lot.unitCost

      costDetails.push({
        lotNumber: lot.lotNumber,
        quantity: qtyFromLot,
        unitCost: lot.unitCost,
        totalCost: costFromLot
      })

      totalCost += costFromLot
      remainingQty -= qtyFromLot
    }

    const unitCost = quantity > 0 ? totalCost / quantity : 0

    return {
      totalCost,
      unitCost,
      costDetails
    }
  }

  /**
   * Create stock movements for delivered items (to maintain FIFO integrity)
   */
  async createSaleMovements(
    shipmentId: string,
    userId: string
  ): Promise<void> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        items: {
          include: {
            item: true
          }
        }
      }
    })

    if (!shipment || shipment.status !== 'DELIVERED') {
      throw new Error('Shipment must be delivered to create stock movements')
    }

    // Create movements for each item
    for (const shipmentItem of shipment.items) {
      // Get FIFO cost for this item
      const fifoCost = await this.calculateFIFOCost(
        shipmentItem.itemId,
        shipmentItem.quantity
      )

      // Create stock movement
      const movementNumber = await this.generateMovementNumber()
      
      await prisma.stockMovement.create({
        data: {
          movementNumber,
          itemId: shipmentItem.itemId,
          movementType: 'SALE',
          movementDate: shipment.deliveredAt || new Date(),
          quantity: -shipmentItem.quantity, // Negative for outgoing
          unitCost: fifoCost.unitCost,
          totalCost: fifoCost.totalCost,
          unitOfMeasureId: shipmentItem.item.unitOfMeasureId,
          referenceType: 'SHIPMENT',
          referenceId: shipmentId,
          referenceNumber: shipment.shipmentNumber,
          locationId: shipment.fromLocationId,
          createdBy: userId
        }
      })

      // Update stock lot quantities based on FIFO
      for (const costDetail of fifoCost.costDetails) {
        if (costDetail.lotNumber !== 'STANDARD_COST') {
          await prisma.stockLot.updateMany({
            where: { 
              lotNumber: costDetail.lotNumber,
              itemId: shipmentItem.itemId
            },
            data: {
              availableQty: {
                decrement: costDetail.quantity
              }
            }
          })
        }
      }
    }
  }

  private async generateMovementNumber(): Promise<string> {
    const lastMovement = await prisma.stockMovement.findFirst({
      orderBy: { movementNumber: 'desc' },
      select: { movementNumber: true }
    })

    if (!lastMovement) {
      return 'MOV-0001'
    }

    const match = lastMovement.movementNumber.match(/MOV-(\d+)/)
    if (!match) {
      const count = await prisma.stockMovement.count()
      return `MOV-${(count + 1).toString().padStart(4, '0')}`
    }

    const lastNumber = parseInt(match[1])
    return `MOV-${(lastNumber + 1).toString().padStart(4, '0')}`
  }
}