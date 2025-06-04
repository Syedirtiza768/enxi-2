import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { 
  InventoryBalance,
  MovementType,
  Prisma
} from '@/lib/generated/prisma'

export interface InventoryBalanceWithDetails extends InventoryBalance {
  location: {
    id: string
    locationCode: string
    name: string
    type: string
  }
  item: {
    id: string
    code: string
    name: string
    description?: string | null
    type: string
    unitOfMeasure: {
      code: string
      name: string
      symbol?: string | null
    }
  }
}

export interface LocationStockSummary {
  locationId: string
  locationName: string
  itemId: string
  itemCode: string
  itemName: string
  availableQuantity: number
  reservedQuantity: number
  onOrderQuantity: number
  totalQuantity: number
  averageCost: number
  totalValue: number
  minStockLevel?: number | null
  maxStockLevel?: number | null
  reorderPoint?: number | null
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK'
}

export interface MultiLocationStockSummary {
  itemId: string
  itemCode: string
  itemName: string
  totalQuantityAllLocations: number
  totalValueAllLocations: number
  locationsWithStock: number
  locationDetails: LocationStockSummary[]
}

export class InventoryBalanceService extends BaseService {
  constructor() {
    super('InventoryBalanceService')
  }

  async updateInventoryBalance(
    locationId: string,
    itemId: string,
    movementType: MovementType,
    quantity: number,
    unitCost?: number
  ): Promise<InventoryBalance> {
    return this.withLogging('updateInventoryBalance', async () => {
      return prisma.$transaction(async (tx) => {
        // Get or create inventory balance record
        let balance = await tx.inventoryBalance.findUnique({
          where: {
            locationId_itemId: {
              locationId,
              itemId
            }
          }
        })

        if (!balance) {
          // Create new balance record
          balance = await tx.inventoryBalance.create({
            data: {
              locationId,
              itemId,
              availableQuantity: 0,
              reservedQuantity: 0,
              onOrderQuantity: 0,
              totalQuantity: 0,
              averageCost: 0,
              totalValue: 0
            }
          })
        }

        // Calculate new quantities and values
        let newQuantity = balance.totalQuantity
        let newValue = balance.totalValue
        let newAverageCost = balance.averageCost

        switch (movementType) {
          case MovementType.STOCK_IN:
          case MovementType.OPENING:
            newQuantity += quantity
            if (unitCost && unitCost > 0) {
              // Update average cost using weighted average
              const additionalValue = quantity * unitCost
              newValue += additionalValue
              newAverageCost = newQuantity > 0 ? newValue / newQuantity : 0
            }
            break

          case MovementType.STOCK_OUT:
            newQuantity -= quantity
            if (newQuantity < 0) {
              // Allow negative stock only if location permits it
              const location = await tx.location.findUnique({
                where: { id: locationId }
              })
              if (!location?.allowNegativeStock) {
                throw new Error('Insufficient stock and negative stock not allowed for this location')
              }
            }
            // Reduce value using current average cost
            const outValue = quantity * balance.averageCost
            newValue = Math.max(0, newValue - outValue)
            break

          case MovementType.ADJUSTMENT:
            const oldQuantity = newQuantity
            newQuantity += quantity // quantity can be positive or negative for adjustments
            
            if (unitCost && unitCost > 0) {
              if (quantity > 0) {
                // Positive adjustment - add value
                const additionalValue = quantity * unitCost
                newValue += additionalValue
                newAverageCost = newQuantity > 0 ? newValue / newQuantity : 0
              } else {
                // Negative adjustment - reduce value proportionally
                const adjustmentValue = Math.abs(quantity) * balance.averageCost
                newValue = Math.max(0, newValue - adjustmentValue)
              }
            }
            break
        }

        // Ensure non-negative values
        newQuantity = Math.max(0, newQuantity)
        newValue = Math.max(0, newValue)
        newAverageCost = newQuantity > 0 ? newValue / newQuantity : 0

        // Update available quantity (total - reserved)
        const newAvailableQuantity = Math.max(0, newQuantity - balance.reservedQuantity)

        // Update the balance record
        const updatedBalance = await tx.inventoryBalance.update({
          where: {
            locationId_itemId: {
              locationId,
              itemId
            }
          },
          data: {
            totalQuantity: newQuantity,
            availableQuantity: newAvailableQuantity,
            averageCost: newAverageCost,
            totalValue: newValue,
            lastMovementDate: new Date()
          }
        })

        return updatedBalance
      })
    })
  }

  async reserveStock(
    locationId: string,
    itemId: string,
    quantity: number,
    reservationType: 'SALES_ORDER' | 'TRANSFER' | 'OTHER' = 'SALES_ORDER'
  ): Promise<InventoryBalance> {
    return this.withLogging('reserveStock', async () => {
      return prisma.$transaction(async (tx) => {
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            locationId_itemId: {
              locationId,
              itemId
            }
          }
        })

        if (!balance) {
          throw new Error('Inventory balance not found')
        }

        if (balance.availableQuantity < quantity) {
          throw new Error(`Insufficient available stock. Available: ${balance.availableQuantity}, Requested: ${quantity}`)
        }

        const updatedBalance = await tx.inventoryBalance.update({
          where: {
            locationId_itemId: {
              locationId,
              itemId
            }
          },
          data: {
            reservedQuantity: balance.reservedQuantity + quantity,
            availableQuantity: balance.availableQuantity - quantity
          }
        })

        return updatedBalance
      })
    })
  }

  async releaseStock(
    locationId: string,
    itemId: string,
    quantity: number
  ): Promise<InventoryBalance> {
    return this.withLogging('releaseStock', async () => {
      return prisma.$transaction(async (tx) => {
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            locationId_itemId: {
              locationId,
              itemId
            }
          }
        })

        if (!balance) {
          throw new Error('Inventory balance not found')
        }

        if (balance.reservedQuantity < quantity) {
          throw new Error(`Cannot release more than reserved. Reserved: ${balance.reservedQuantity}, Requested: ${quantity}`)
        }

        const updatedBalance = await tx.inventoryBalance.update({
          where: {
            locationId_itemId: {
              locationId,
              itemId
            }
          },
          data: {
            reservedQuantity: balance.reservedQuantity - quantity,
            availableQuantity: balance.availableQuantity + quantity
          }
        })

        return updatedBalance
      })
    })
  }

  async getLocationInventoryBalance(
    locationId: string,
    itemId: string
  ): Promise<InventoryBalanceWithDetails | null> {
    return this.withLogging('getLocationInventoryBalance', async () => {
      return prisma.inventoryBalance.findUnique({
        where: {
          locationId_itemId: {
            locationId,
            itemId
          }
        },
        include: {
          location: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              unitOfMeasure: {
                select: {
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            }
          }
        }
      }) as Promise<InventoryBalanceWithDetails | null>
    })
  }

  async getLocationStockSummary(locationId: string): Promise<LocationStockSummary[]> {
    return this.withLogging('getLocationStockSummary', async () => {
      const balances = await prisma.inventoryBalance.findMany({
        where: { locationId },
        include: {
          location: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              unitOfMeasure: {
                select: {
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            }
          }
        },
        orderBy: [
          { totalValue: 'desc' },
          { item: { name: 'asc' } }
        ]
      })

      return balances.map(balance => {
        let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' = 'IN_STOCK'

        if (balance.totalQuantity <= 0) {
          stockStatus = 'OUT_OF_STOCK'
        } else if (balance.minStockLevel && balance.totalQuantity <= balance.minStockLevel) {
          stockStatus = 'LOW_STOCK'
        } else if (balance.maxStockLevel && balance.totalQuantity > balance.maxStockLevel) {
          stockStatus = 'OVERSTOCK'
        }

        return {
          locationId: balance.locationId,
          locationName: balance.location.name,
          itemId: balance.itemId,
          itemCode: balance.item.code,
          itemName: balance.item.name,
          availableQuantity: balance.availableQuantity,
          reservedQuantity: balance.reservedQuantity,
          onOrderQuantity: balance.onOrderQuantity,
          totalQuantity: balance.totalQuantity,
          averageCost: balance.averageCost,
          totalValue: balance.totalValue,
          minStockLevel: balance.minStockLevel,
          maxStockLevel: balance.maxStockLevel,
          reorderPoint: balance.reorderPoint,
          stockStatus
        }
      })
    })
  }

  async getMultiLocationStockSummary(itemId?: string): Promise<MultiLocationStockSummary[]> {
    return this.withLogging('getMultiLocationStockSummary', async () => {
      const where: Prisma.InventoryBalanceWhereInput = {}
      if (itemId) {
        where.itemId = itemId
      }

      const balances = await prisma.inventoryBalance.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              unitOfMeasure: {
                select: {
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            }
          }
        }
      })

      // Group by item
      const itemGroups = new Map<string, InventoryBalanceWithDetails[]>()
      
      balances.forEach(balance => {
        if (!itemGroups.has(balance.itemId)) {
          itemGroups.set(balance.itemId, [])
        }
        itemGroups.get(balance.itemId)!.push(balance as InventoryBalanceWithDetails)
      })

      // Create summary for each item
      const summaries: MultiLocationStockSummary[] = []

      itemGroups.forEach((itemBalances, itemId) => {
        const firstBalance = itemBalances[0]
        const totalQuantityAllLocations = itemBalances.reduce((sum, b) => sum + b.totalQuantity, 0)
        const totalValueAllLocations = itemBalances.reduce((sum, b) => sum + b.totalValue, 0)
        const locationsWithStock = itemBalances.filter(b => b.totalQuantity > 0).length

        const locationDetails = itemBalances.map(balance => {
          let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' = 'IN_STOCK'

          if (balance.totalQuantity <= 0) {
            stockStatus = 'OUT_OF_STOCK'
          } else if (balance.minStockLevel && balance.totalQuantity <= balance.minStockLevel) {
            stockStatus = 'LOW_STOCK'
          } else if (balance.maxStockLevel && balance.totalQuantity > balance.maxStockLevel) {
            stockStatus = 'OVERSTOCK'
          }

          return {
            locationId: balance.locationId,
            locationName: balance.location.name,
            itemId: balance.itemId,
            itemCode: balance.item.code,
            itemName: balance.item.name,
            availableQuantity: balance.availableQuantity,
            reservedQuantity: balance.reservedQuantity,
            onOrderQuantity: balance.onOrderQuantity,
            totalQuantity: balance.totalQuantity,
            averageCost: balance.averageCost,
            totalValue: balance.totalValue,
            minStockLevel: balance.minStockLevel,
            maxStockLevel: balance.maxStockLevel,
            reorderPoint: balance.reorderPoint,
            stockStatus
          }
        })

        summaries.push({
          itemId,
          itemCode: firstBalance.item.code,
          itemName: firstBalance.item.name,
          totalQuantityAllLocations,
          totalValueAllLocations,
          locationsWithStock,
          locationDetails
        })
      })

      return summaries.sort((a, b) => a.itemCode.localeCompare(b.itemCode))
    })
  }

  async getLowStockItems(locationId?: string): Promise<LocationStockSummary[]> {
    return this.withLogging('getLowStockItems', async () => {
      const where: Prisma.InventoryBalanceWhereInput = {
        AND: [
          { totalQuantity: { gt: 0 } },
          {
            OR: [
              {
                AND: [
                  { minStockLevel: { not: null } },
                  { totalQuantity: { lte: prisma.inventoryBalance.fields.minStockLevel } }
                ]
              },
              {
                AND: [
                  { reorderPoint: { not: null } },
                  { totalQuantity: { lte: prisma.inventoryBalance.fields.reorderPoint } }
                ]
              }
            ]
          }
        ]
      }

      if (locationId) {
        where.locationId = locationId
      }

      const balances = await prisma.inventoryBalance.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              unitOfMeasure: {
                select: {
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            }
          }
        },
        orderBy: [
          { totalQuantity: 'asc' },
          { item: { name: 'asc' } }
        ]
      })

      return balances.map(balance => ({
        locationId: balance.locationId,
        locationName: balance.location.name,
        itemId: balance.itemId,
        itemCode: balance.item.code,
        itemName: balance.item.name,
        availableQuantity: balance.availableQuantity,
        reservedQuantity: balance.reservedQuantity,
        onOrderQuantity: balance.onOrderQuantity,
        totalQuantity: balance.totalQuantity,
        averageCost: balance.averageCost,
        totalValue: balance.totalValue,
        minStockLevel: balance.minStockLevel,
        maxStockLevel: balance.maxStockLevel,
        reorderPoint: balance.reorderPoint,
        stockStatus: 'LOW_STOCK' as const
      }))
    })
  }

  async getOutOfStockItems(locationId?: string): Promise<LocationStockSummary[]> {
    return this.withLogging('getOutOfStockItems', async () => {
      const where: Prisma.InventoryBalanceWhereInput = {
        totalQuantity: { lte: 0 }
      }

      if (locationId) {
        where.locationId = locationId
      }

      const balances = await prisma.inventoryBalance.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              unitOfMeasure: {
                select: {
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            }
          }
        },
        orderBy: [
          { item: { name: 'asc' } }
        ]
      })

      return balances.map(balance => ({
        locationId: balance.locationId,
        locationName: balance.location.name,
        itemId: balance.itemId,
        itemCode: balance.item.code,
        itemName: balance.item.name,
        availableQuantity: balance.availableQuantity,
        reservedQuantity: balance.reservedQuantity,
        onOrderQuantity: balance.onOrderQuantity,
        totalQuantity: balance.totalQuantity,
        averageCost: balance.averageCost,
        totalValue: balance.totalValue,
        minStockLevel: balance.minStockLevel,
        maxStockLevel: balance.maxStockLevel,
        reorderPoint: balance.reorderPoint,
        stockStatus: 'OUT_OF_STOCK' as const
      }))
    })
  }

  async updateStockLevels(
    locationId: string,
    itemId: string,
    stockLevels: {
      minStockLevel?: number
      maxStockLevel?: number
      reorderPoint?: number
    }
  ): Promise<InventoryBalance> {
    return this.withLogging('updateStockLevels', async () => {
      // Ensure inventory balance exists
      let balance = await prisma.inventoryBalance.findUnique({
        where: {
          locationId_itemId: {
            locationId,
            itemId
          }
        }
      })

      if (!balance) {
        // Create balance record if it doesn't exist
        balance = await prisma.inventoryBalance.create({
          data: {
            locationId,
            itemId,
            availableQuantity: 0,
            reservedQuantity: 0,
            onOrderQuantity: 0,
            totalQuantity: 0,
            averageCost: 0,
            totalValue: 0,
            ...stockLevels
          }
        })
      } else {
        // Update existing balance
        balance = await prisma.inventoryBalance.update({
          where: {
            locationId_itemId: {
              locationId,
              itemId
            }
          },
          data: stockLevels
        })
      }

      return balance
    })
  }
}