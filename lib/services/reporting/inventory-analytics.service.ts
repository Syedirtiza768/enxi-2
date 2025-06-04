import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { MovementType } from '@/lib/generated/prisma'

export interface InventoryMetrics {
  totalValue: number
  totalQuantity: number
  lowStockItems: number
  outOfStockItems: number
  expiringItems: number
  totalLocations: number
  averageCost: number
  turnoverRate: number
}

export interface StockMovementAnalytics {
  dailyMovements: Array<{
    date: string
    stockIn: number
    stockOut: number
    adjustments: number
    netMovement: number
  }>
  movementsByType: Array<{
    type: string
    count: number
    totalQuantity: number
    totalValue: number
  }>
  topMovingItems: Array<{
    itemCode: string
    itemName: string
    totalMovements: number
    netQuantity: number
    frequency: number
  }>
  locationMovements: Array<{
    locationCode: string
    locationName: string
    stockIn: number
    stockOut: number
    netMovement: number
  }>
}

export interface InventoryValuation {
  totalCost: number
  totalMarketValue: number
  unrealizedGainLoss: number
  categoryBreakdown: Array<{
    categoryName: string
    quantity: number
    cost: number
    marketValue: number
    percentage: number
  }>
  locationBreakdown: Array<{
    locationName: string
    totalQuantity: number
    totalCost: number
    utilization: number
  }>
  ageAnalysis: Array<{
    ageRange: string
    itemCount: number
    totalValue: number
    percentage: number
  }>
}

export interface LowStockAnalysis {
  criticalItems: Array<{
    itemCode: string
    itemName: string
    currentStock: number
    reorderPoint: number
    reorderQuantity: number
    estimatedDaysLeft: number
    locationName: string
  }>
  outOfStockItems: Array<{
    itemCode: string
    itemName: string
    lastStockDate: Date
    daysOutOfStock: number
    locationName: string
  }>
  expiringItems: Array<{
    itemCode: string
    itemName: string
    lotNumber: string
    expiryDate: Date
    daysToExpiry: number
    quantity: number
    locationName: string
  }>
}

export interface ABC_Analysis {
  aItems: Array<{
    itemCode: string
    itemName: string
    annualValue: number
    percentage: number
    classification: 'A'
  }>
  bItems: Array<{
    itemCode: string
    itemName: string
    annualValue: number
    percentage: number
    classification: 'B'
  }>
  cItems: Array<{
    itemCode: string
    itemName: string
    annualValue: number
    percentage: number
    classification: 'C'
  }>
  summary: {
    aItemsPercentage: number
    bItemsPercentage: number
    cItemsPercentage: number
    aValuePercentage: number
    bValuePercentage: number
    cValuePercentage: number
  }
}

export class InventoryAnalyticsService extends BaseService {
  constructor() {
    super('InventoryAnalyticsService')
  }

  async getInventoryMetrics(): Promise<InventoryMetrics> {
    return this.withLogging('getInventoryMetrics', async () => {
      const [
        valuationData,
        lowStockCount,
        outOfStockCount,
        expiringCount,
        locationCount,
        turnoverRate
      ] = await Promise.all([
        this.getInventoryValuation(),
        this.getLowStockItemCount(),
        this.getOutOfStockItemCount(),
        this.getExpiringItemCount(),
        this.getLocationCount(),
        this.calculateTurnoverRate()
      ])

      return {
        totalValue: valuationData.totalCost,
        totalQuantity: await this.getTotalInventoryQuantity(),
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
        expiringItems: expiringCount,
        totalLocations: locationCount,
        averageCost: valuationData.totalCost > 0 
          ? valuationData.totalCost / Math.max(await this.getTotalInventoryQuantity(), 1)
          : 0,
        turnoverRate
      }
    })
  }

  async getStockMovementAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<StockMovementAnalytics> {
    return this.withLogging('getStockMovementAnalytics', async () => {
      const [
        dailyMovements,
        movementsByType,
        topMovingItems,
        locationMovements
      ] = await Promise.all([
        this.getDailyMovements(startDate, endDate),
        this.getMovementsByType(startDate, endDate),
        this.getTopMovingItems(startDate, endDate),
        this.getLocationMovements(startDate, endDate)
      ])

      return {
        dailyMovements,
        movementsByType,
        topMovingItems,
        locationMovements
      }
    })
  }

  async getInventoryValuation(): Promise<InventoryValuation> {
    return this.withLogging('getInventoryValuation', async () => {
      // Get current inventory balances with cost and market value
      const inventoryBalances = await prisma.inventoryBalance.findMany({
        include: {
          item: {
            include: {
              category: true,
              unitOfMeasure: true
            }
          },
          location: true
        }
      })

      let totalCost = 0
      let totalMarketValue = 0
      const categoryMap = new Map<string, any>()
      const locationMap = new Map<string, any>()

      for (const balance of inventoryBalances) {
        const cost = balance.averageCost * balance.totalQuantity
        const marketValue = balance.item.standardCost * balance.totalQuantity
        
        totalCost += cost
        totalMarketValue += marketValue

        // Category breakdown
        const categoryName = balance.item.category?.name || 'Uncategorized'
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            categoryName,
            quantity: 0,
            cost: 0,
            marketValue: 0,
            percentage: 0
          })
        }
        const categoryData = categoryMap.get(categoryName)
        categoryData.quantity += balance.totalQuantity
        categoryData.cost += cost
        categoryData.marketValue += marketValue

        // Location breakdown
        const locationName = balance.location?.name || 'Unknown Location'
        if (!locationMap.has(locationName)) {
          locationMap.set(locationName, {
            locationName,
            totalQuantity: 0,
            totalCost: 0,
            utilization: 0
          })
        }
        const locationData = locationMap.get(locationName)
        locationData.totalQuantity += balance.totalQuantity
        locationData.totalCost += cost
        locationData.utilization = balance.location?.maxCapacity 
          ? (balance.totalQuantity / balance.location.maxCapacity) * 100
          : 0
      }

      // Calculate percentages for categories
      const categoryBreakdown = Array.from(categoryMap.values()).map(category => ({
        ...category,
        percentage: totalCost > 0 ? (category.cost / totalCost) * 100 : 0
      }))

      const locationBreakdown = Array.from(locationMap.values())

      // Age analysis (simplified - based on last movement date)
      const ageAnalysis = await this.getInventoryAgeAnalysis()

      return {
        totalCost,
        totalMarketValue,
        unrealizedGainLoss: totalMarketValue - totalCost,
        categoryBreakdown,
        locationBreakdown,
        ageAnalysis
      }
    })
  }

  async getLowStockAnalysis(): Promise<LowStockAnalysis> {
    return this.withLogging('getLowStockAnalysis', async () => {
      const [criticalItems, outOfStockItems, expiringItems] = await Promise.all([
        this.getCriticalStockItems(),
        this.getOutOfStockItems(),
        this.getExpiringItems()
      ])

      return {
        criticalItems,
        outOfStockItems,
        expiringItems
      }
    })
  }

  async getABCAnalysis(): Promise<ABC_Analysis> {
    return this.withLogging('getABCAnalysis', async () => {
      // Get annual consumption value for each item
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const itemConsumption = await prisma.stockMovement.groupBy({
        by: ['itemId'],
        where: {
          movementDate: { gte: oneYearAgo },
          movementType: { in: [MovementType.STOCK_OUT] }
        },
        _sum: {
          totalCost: true,
          quantity: true
        }
      })

      // Get item details
      const itemDetails = await prisma.item.findMany({
        where: {
          id: { in: itemConsumption.map(ic => ic.itemId) }
        },
        select: {
          id: true,
          code: true,
          name: true
        }
      })

      const itemMap = new Map(itemDetails.map(item => [item.id, item]))

      // Calculate annual values and sort
      const itemsWithValue = itemConsumption
        .map(ic => ({
          itemId: ic.itemId,
          itemCode: itemMap.get(ic.itemId)?.code || '',
          itemName: itemMap.get(ic.itemId)?.name || '',
          annualValue: ic._sum.totalCost || 0
        }))
        .sort((a, b) => b.annualValue - a.annualValue)

      const totalValue = itemsWithValue.reduce((sum, item) => sum + item.annualValue, 0)
      
      // ABC Classification (80-15-5 rule)
      let cumulativeValue = 0
      const aItems = []
      const bItems = []
      const cItems = []

      for (const item of itemsWithValue) {
        cumulativeValue += item.annualValue
        const percentage = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0

        if (percentage <= 80) {
          aItems.push({
            ...item,
            percentage: totalValue > 0 ? (item.annualValue / totalValue) * 100 : 0,
            classification: 'A' as const
          })
        } else if (percentage <= 95) {
          bItems.push({
            ...item,
            percentage: totalValue > 0 ? (item.annualValue / totalValue) * 100 : 0,
            classification: 'B' as const
          })
        } else {
          cItems.push({
            ...item,
            percentage: totalValue > 0 ? (item.annualValue / totalValue) * 100 : 0,
            classification: 'C' as const
          })
        }
      }

      const totalItems = itemsWithValue.length
      const aValue = aItems.reduce((sum, item) => sum + item.annualValue, 0)
      const bValue = bItems.reduce((sum, item) => sum + item.annualValue, 0)
      const cValue = cItems.reduce((sum, item) => sum + item.annualValue, 0)

      return {
        aItems,
        bItems,
        cItems,
        summary: {
          aItemsPercentage: totalItems > 0 ? (aItems.length / totalItems) * 100 : 0,
          bItemsPercentage: totalItems > 0 ? (bItems.length / totalItems) * 100 : 0,
          cItemsPercentage: totalItems > 0 ? (cItems.length / totalItems) * 100 : 0,
          aValuePercentage: totalValue > 0 ? (aValue / totalValue) * 100 : 0,
          bValuePercentage: totalValue > 0 ? (bValue / totalValue) * 100 : 0,
          cValuePercentage: totalValue > 0 ? (cValue / totalValue) * 100 : 0
        }
      }
    })
  }

  // Private helper methods

  private async getTotalInventoryQuantity(): Promise<number> {
    const result = await prisma.inventoryBalance.aggregate({
      _sum: { totalQuantity: true }
    })
    return result._sum.totalQuantity || 0
  }

  private async getLowStockItemCount(): Promise<number> {
    return await prisma.inventoryBalance.count({
      where: {
        totalQuantity: { lte: prisma.inventoryBalance.fields.reorderPoint }
      }
    })
  }

  private async getOutOfStockItemCount(): Promise<number> {
    return await prisma.inventoryBalance.count({
      where: { totalQuantity: { lte: 0 } }
    })
  }

  private async getExpiringItemCount(): Promise<number> {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    return await prisma.stockLot.count({
      where: {
        expiryDate: { lte: thirtyDaysFromNow },
        availableQty: { gt: 0 }
      }
    })
  }

  private async getLocationCount(): Promise<number> {
    return await prisma.location.count({
      where: { isActive: true }
    })
  }

  private async calculateTurnoverRate(): Promise<number> {
    // Annual inventory turnover = COGS / Average Inventory Value
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const cogs = await prisma.stockMovement.aggregate({
      where: {
        movementDate: { gte: oneYearAgo },
        movementType: { in: [MovementType.STOCK_OUT] }
      },
      _sum: { totalCost: true }
    })

    const avgInventoryValue = await prisma.inventoryBalance.aggregate({
      _avg: { averageCost: true }
    })

    const avgValue = avgInventoryValue._avg.averageCost || 0
    return avgValue > 0 ? (cogs._sum.totalCost || 0) / avgValue : 0
  }

  private async getDailyMovements(startDate: Date, endDate: Date) {
    const movements = await prisma.stockMovement.groupBy({
      by: ['movementDate', 'movementType'],
      where: {
        movementDate: { gte: startDate, lte: endDate }
      },
      _sum: { quantity: true, totalCost: true },
      _count: { id: true },
      orderBy: { movementDate: 'asc' }
    })

    const dailyMap = new Map<string, any>()

    for (const movement of movements) {
      const dateKey = movement.movementDate.toISOString().split('T')[0]
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          stockIn: 0,
          stockOut: 0,
          adjustments: 0,
          netMovement: 0
        })
      }

      const dayData = dailyMap.get(dateKey)
      const quantity = movement._sum.quantity || 0

      switch (movement.movementType) {
        case MovementType.STOCK_IN:
        case MovementType.PURCHASE:
        case MovementType.OPENING:
          dayData.stockIn += quantity
          dayData.netMovement += quantity
          break
        case MovementType.STOCK_OUT:
        case MovementType.SALE:
          dayData.stockOut += quantity
          dayData.netMovement -= quantity
          break
        case MovementType.ADJUSTMENT:
          dayData.adjustments += Math.abs(quantity)
          dayData.netMovement += quantity
          break
      }
    }

    return Array.from(dailyMap.values())
  }

  private async getMovementsByType(startDate: Date, endDate: Date) {
    return await prisma.stockMovement.groupBy({
      by: ['movementType'],
      where: {
        movementDate: { gte: startDate, lte: endDate }
      },
      _count: { id: true },
      _sum: { quantity: true, totalCost: true }
    }).then(results => 
      results.map(result => ({
        type: result.movementType,
        count: result._count.id,
        totalQuantity: result._sum.quantity || 0,
        totalValue: result._sum.totalCost || 0
      }))
    )
  }

  private async getTopMovingItems(startDate: Date, endDate: Date) {
    const movements = await prisma.stockMovement.groupBy({
      by: ['itemId'],
      where: {
        movementDate: { gte: startDate, lte: endDate }
      },
      _count: { id: true },
      _sum: { quantity: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    })

    const itemIds = movements.map(m => m.itemId)
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, code: true, name: true }
    })

    const itemMap = new Map(items.map(item => [item.id, item]))

    return movements.map(movement => ({
      itemCode: itemMap.get(movement.itemId)?.code || '',
      itemName: itemMap.get(movement.itemId)?.name || '',
      totalMovements: movement._count.id,
      netQuantity: movement._sum.quantity || 0,
      frequency: movement._count.id / Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    }))
  }

  private async getLocationMovements(startDate: Date, endDate: Date) {
    const movements = await prisma.stockMovement.groupBy({
      by: ['locationId', 'movementType'],
      where: {
        movementDate: { gte: startDate, lte: endDate },
        locationId: { not: null }
      },
      _sum: { quantity: true }
    })

    const locationIds = [...new Set(movements.map(m => m.locationId).filter(Boolean))]
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, locationCode: true, name: true }
    })

    const locationMap = new Map(locations.map(loc => [loc.id, loc]))
    const resultMap = new Map<string, any>()

    for (const movement of movements) {
      if (!movement.locationId) continue

      const location = locationMap.get(movement.locationId)
      if (!location) continue

      if (!resultMap.has(movement.locationId)) {
        resultMap.set(movement.locationId, {
          locationCode: location.locationCode,
          locationName: location.name,
          stockIn: 0,
          stockOut: 0,
          netMovement: 0
        })
      }

      const locationData = resultMap.get(movement.locationId)
      const quantity = movement._sum.quantity || 0

      if ([MovementType.STOCK_IN, MovementType.PURCHASE, MovementType.OPENING].includes(movement.movementType)) {
        locationData.stockIn += quantity
        locationData.netMovement += quantity
      } else if ([MovementType.STOCK_OUT, MovementType.SALE].includes(movement.movementType)) {
        locationData.stockOut += quantity
        locationData.netMovement -= quantity
      }
    }

    return Array.from(resultMap.values())
  }

  private async getInventoryAgeAnalysis() {
    // Simplified age analysis based on last movement date
    const now = new Date()
    const ranges = [
      { label: '0-30 days', min: 0, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '91-180 days', min: 91, max: 180 },
      { label: '180+ days', min: 181, max: Number.MAX_SAFE_INTEGER }
    ]

    const results = []
    let totalValue = 0

    for (const range of ranges) {
      let startDate: Date
      let endDate: Date
      
      if (range.max === Number.MAX_SAFE_INTEGER) {
        // For 180+ days range
        startDate = new Date(1970, 0, 1) // Very old date
        endDate = new Date(now)
        endDate.setDate(now.getDate() - 181)
      } else {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - range.max)
        endDate = new Date(now)
        if (range.min > 0) {
          endDate.setDate(now.getDate() - range.min)
        }
      }

      const count = await prisma.inventoryBalance.count({
        where: {
          updatedAt: { 
            gte: startDate,
            ...(range.min > 0 ? { lte: endDate } : {})
          }
        }
      })

      const value = await prisma.inventoryBalance.aggregate({
        where: {
          updatedAt: { 
            gte: startDate,
            ...(range.min > 0 ? { lte: endDate } : {})
          }
        },
        _sum: { totalValue: true }
      })

      const rangeValue = value._sum.totalValue || 0
      totalValue += rangeValue

      results.push({
        ageRange: range.label,
        itemCount: count,
        totalValue: rangeValue,
        percentage: 0 // Will calculate after getting total
      })
    }

    return results.map(result => ({
      ...result,
      percentage: totalValue > 0 ? (result.totalValue / totalValue) * 100 : 0
    }))
  }

  private async getCriticalStockItems() {
    return await prisma.inventoryBalance.findMany({
      where: {
        totalQuantity: { lte: prisma.inventoryBalance.fields.reorderPoint }
      },
      include: {
        item: { select: { code: true, name: true } },
        location: { select: { name: true } }
      }
    }).then(items => 
      items.map(item => ({
        itemCode: item.item.code,
        itemName: item.item.name,
        currentStock: item.totalQuantity,
        reorderPoint: item.reorderPoint || 0,
        reorderQuantity: item.reorderQuantity || 0,
        estimatedDaysLeft: 0, // Would need consumption rate calculation
        locationName: item.location?.name || 'Unknown'
      }))
    )
  }

  private async getOutOfStockItems() {
    return await prisma.inventoryBalance.findMany({
      where: { totalQuantity: { lte: 0 } },
      include: {
        item: { select: { code: true, name: true } },
        location: { select: { name: true } }
      }
    }).then(items => 
      items.map(item => ({
        itemCode: item.item.code,
        itemName: item.item.name,
        lastStockDate: item.updatedAt,
        daysOutOfStock: Math.floor((Date.now() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        locationName: item.location?.name || 'Unknown'
      }))
    )
  }

  private async getExpiringItems() {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    return await prisma.stockLot.findMany({
      where: {
        expiryDate: { lte: thirtyDaysFromNow },
        availableQty: { gt: 0 }
      },
      include: {
        item: { select: { code: true, name: true } }
      }
    }).then(lots => 
      lots.map(lot => ({
        itemCode: lot.item.code,
        itemName: lot.item.name,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate!,
        daysToExpiry: Math.floor((lot.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        quantity: lot.availableQty,
        locationName: 'N/A' // StockLot doesn't have direct location reference
      }))
    )
  }
}