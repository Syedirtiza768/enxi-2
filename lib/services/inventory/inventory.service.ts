import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { AuditService } from '../audit.service'
import { JournalEntryService } from '../accounting/journal-entry.service'
import { 
  Item,
  StockMovement,
  StockLot,
  Prisma,
  Location,
  UnitOfMeasure
} from "@prisma/client"
import { MovementType } from '@/lib/types/shared-enums'
import { CreateJournalLineInput } from '@/lib/types/accounting.types'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'

export interface ItemWithStock extends Item {
  currentStock: number
  stockLots: StockLot[]
  reorderNeeded: boolean
}

export interface StockMovementWithDetails extends StockMovement {
  item: {
    id: string
    code: string
    name: string
  }
  stockLot?: {
    id: string
    lotNumber: string
    receivedDate: Date
  } | null
  location?: Location | null
  unitOfMeasure: UnitOfMeasure
}

export interface CreateStockMovementInput {
  itemId: string
  movementType: MovementType
  quantity: number
  unitCost: number
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  location?: string
  notes?: string
  stockLotId?: string
}

export interface InventoryAdjustmentInput {
  itemId: string
  adjustmentQuantity: number
  reason: string
  unitCost?: number
}

export interface StockTransferInput {
  itemId: string
  fromLocation: string
  toLocation: string
  quantity: number
}

export class InventoryService extends BaseService {
  private auditService: AuditService
  private journalEntryService: JournalEntryService

  constructor() {
    super('InventoryService')
    this.auditService = new AuditService()
    this.journalEntryService = new JournalEntryService()
  }

  async getCurrentStock(itemId: string): Promise<number> {
    return this.withLogging('getCurrentStock', async () => {
      const result = await prisma.stockMovement.aggregate({
        where: { itemId },
        _sum: { quantity: true }
      })
      
      return result._sum.quantity || 0
    })
  }

  async getStockByLocation(itemId: string, location: string): Promise<number> {
    return this.withLogging('getStockByLocation', async () => {
      const result = await prisma.stockMovement.aggregate({
        where: { 
          itemId,
          locationName: location 
        },
        _sum: { quantity: true }
      })
      
      return result._sum.quantity || 0
    })
  }

  async getItemsWithStock(): Promise<ItemWithStock[]> {
    return this.withLogging('getItemsWithStock', async () => {
      const items = await prisma.item.findMany({
        where: { 
          trackInventory: true,
          isActive: true 
        },
        include: {
          stockLots: {
            where: { isActive: true },
            orderBy: { receivedDate: 'asc' }
          }
        }
      })

      const itemsWithStock = await Promise.all(
        items.map(async (item) => {
          const currentStock = await this.getCurrentStock(item.id)
          const reorderNeeded = currentStock <= item.reorderPoint
          
          return {
            ...item,
            currentStock,
            reorderNeeded
          }
        })
      )

      return itemsWithStock
    })
  }

  async getItemsNeedingReorder(): Promise<ItemWithStock[]> {
    return this.withLogging('getItemsNeedingReorder', async () => {
      const itemsWithStock = await this.getItemsWithStock()
      return itemsWithStock.filter(item => item.reorderNeeded)
    })
  }

  async createStockMovement(
    data: CreateStockMovementInput & { createdBy: string }
  ): Promise<StockMovementWithDetails> {
    return this.withLogging('createStockMovement', async () => {
      return await prisma.$transaction(async (tx) => {
        const item = await tx.item.findUnique({
          where: { id: data.itemId }
        })

        if (!item) {
          throw new Error('Item not found')
        }

        if (!item.trackInventory) {
          throw new Error('Item does not track inventory')
        }

        // Generate movement number
        const movementNumber = await this.generateMovementNumber(tx)

        // Calculate total cost
        const totalCost = Math.abs(data.quantity) * data.unitCost

        // For stock out movements, ensure sufficient stock (except for adjustments)
        if (data.quantity < 0 && data.movementType !== MovementType.ADJUSTMENT) {
          const currentStock = await this.getCurrentStock(data.itemId)
          if (currentStock + data.quantity < 0) {
            throw new Error(`Insufficient stock. Current: ${currentStock}, Required: ${Math.abs(data.quantity)}`)
          }
        }

        // Handle FIFO for stock out movements
        let stockLotId = data.stockLotId
        if (data.quantity < 0 && !stockLotId) {
          stockLotId = await this.getFIFOStockLot(data.itemId, Math.abs(data.quantity), tx)
        }

        // Create stock movement
        const movement = await tx.stockMovement.create({
          data: {
            movementNumber,
            itemId: data.itemId,
            stockLotId,
            movementType: data.movementType,
            movementDate: new Date(),
            quantity: data.quantity,
            unitCost: data.unitCost,
            totalCost,
            unitOfMeasureId: item.unitOfMeasureId,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            referenceNumber: data.referenceNumber,
            locationName: data.location,
            notes: data.notes,
            createdBy: data.createdBy
          }
        })

        // Update stock lot quantities for inbound movements
        if (data.quantity > 0 && data.movementType === MovementType.STOCK_IN) {
          await this.updateOrCreateStockLot(data.itemId, data.quantity, data.unitCost, tx)
        }

        // Update stock lot quantities for outbound movements
        if (data.quantity < 0 && stockLotId) {
          await this.updateStockLotQuantity(stockLotId, data.quantity, tx)
        }

        // Create journal entry for inventory transaction
        if (item.inventoryAccountId && item.cogsAccountId) {
          await this.createInventoryJournalEntry(movement, item, data.createdBy, tx)
        }

        // Audit log
        await this.auditService.logAction({
          userId: data.createdBy,
          action: AuditAction.CREATE,
          entityType: EntityType.STOCK_MOVEMENT,
          entityId: movement.id,
          severity: 'MEDIUM',
          metadata: {
            itemCode: item.code,
            movementType: data.movementType,
            quantity: data.quantity,
            totalCost
          }
        })

        // Need to get the complete movement with all relations
        const completeMovement = await tx.stockMovement.findUnique({
          where: { id: movement.id },
          include: {
            item: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            stockLot: {
              select: {
                id: true,
                lotNumber: true,
                receivedDate: true
              }
            },
            location: true,
            unitOfMeasure: true
          }
        })

        if (!completeMovement) {
          throw new Error('Failed to create stock movement')
        }

        return completeMovement
      })
    })
  }

  async getStockMovement(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<StockMovementWithDetails> {
    return this.withLogging('getStockMovement', async () => {
      const client = tx || prisma

      const movement = await client.stockMovement.findUnique({
        where: { id },
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          stockLot: {
            select: {
              id: true,
              lotNumber: true,
              receivedDate: true
            }
          },
          location: true,
          unitOfMeasure: true
        }
      })

      if (!movement) {
        throw new Error('Stock movement not found')
      }

      return movement
    })
  }

  async getAllStockMovements(filters: {
    itemId?: string
    movementType?: MovementType
    dateFrom?: Date
    dateTo?: Date
    location?: string
  } = {}): Promise<StockMovementWithDetails[]> {
    return this.withLogging('getAllStockMovements', async () => {
      const where: Prisma.StockMovementWhereInput = {}

      if (filters.itemId) where.itemId = filters.itemId
      if (filters.movementType) where.movementType = filters.movementType
      if (filters.location) where.locationName = filters.location

      if (filters.dateFrom || filters.dateTo) {
        where.movementDate = {}
        if (filters.dateFrom) where.movementDate.gte = filters.dateFrom
        if (filters.dateTo) where.movementDate.lte = filters.dateTo
      }

      const movements = await prisma.stockMovement.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          stockLot: {
            select: {
              id: true,
              lotNumber: true,
              receivedDate: true
            }
          },
          location: true,
          unitOfMeasure: true
        },
        orderBy: { movementDate: 'desc' }
      })

      return movements
    })
  }

  async adjustInventory(
    data: InventoryAdjustmentInput & { createdBy: string }
  ): Promise<StockMovementWithDetails> {
    return this.withLogging('adjustInventory', async () => {
      const item = await prisma.item.findUnique({
        where: { id: data.itemId }
      })

      if (!item) {
        throw new Error('Item not found')
      }

      const unitCost = data.unitCost || item.standardCost

      return this.createStockMovement({
        itemId: data.itemId,
        movementType: MovementType.ADJUSTMENT,
        quantity: data.adjustmentQuantity,
        unitCost,
        referenceType: 'ADJUSTMENT',
        notes: data.reason,
        createdBy: data.createdBy
      })
    })
  }

  async transferStock(
    data: StockTransferInput & { createdBy: string }
  ): Promise<{ outMovement: StockMovementWithDetails, inMovement: StockMovementWithDetails }> {
    return this.withLogging('transferStock', async () => {
      return await prisma.$transaction(async (tx) => {
        const item = await tx.item.findUnique({
          where: { id: data.itemId }
        })

        if (!item) {
          throw new Error('Item not found')
        }

        // Check if sufficient stock at source location
        const sourceStock = await this.getStockByLocation(data.itemId, data.fromLocation)
        if (sourceStock < data.quantity) {
          throw new Error(`Insufficient stock at ${data.fromLocation}. Available: ${sourceStock}`)
        }

        // Create outbound movement from source
        const outMovement = await this.createStockMovement({
          itemId: data.itemId,
          movementType: MovementType.TRANSFER,
          quantity: -data.quantity,
          unitCost: item.standardCost,
          referenceType: 'TRANSFER_OUT',
          location: data.fromLocation,
          notes: `Transfer to ${data.toLocation}`,
          createdBy: data.createdBy
        })

        // Create inbound movement to destination
        const inMovement = await this.createStockMovement({
          itemId: data.itemId,
          movementType: MovementType.TRANSFER,
          quantity: data.quantity,
          unitCost: item.standardCost,
          referenceType: 'TRANSFER_IN',
          location: data.toLocation,
          notes: `Transfer from ${data.fromLocation}`,
          createdBy: data.createdBy
        })

        return { outMovement, inMovement }
      })
    })
  }

  async getStockValuation(itemId?: string): Promise<{
    totalValue: number
    items: Array<{
      itemId: string
      itemCode: string
      itemName: string
      quantity: number
      averageCost: number
      totalValue: number
    }>
  }> {
    return this.withLogging('getStockValuation', async () => {
      const where: Prisma.StockMovementWhereInput = itemId ? { itemId } : {}
      
      // Get all stock movements grouped by item
      const stockData = await prisma.stockMovement.groupBy({
        by: ['itemId'],
        where,
        _sum: {
          quantity: true,
          totalCost: true
        }
      })

      const items = await Promise.all(
        stockData.map(async (stock) => {
          const item = await prisma.item.findUnique({
            where: { id: stock.itemId },
            select: { code: true, name: true }
          })

          const quantity = stock._sum.quantity || 0
          const totalCost = stock._sum.totalCost || 0
          const averageCost = quantity > 0 ? totalCost / quantity : 0
          const totalValue = quantity * averageCost

          return {
            itemId: stock.itemId,
            itemCode: item?.code || '',
            itemName: item?.name || '',
            quantity,
            averageCost,
            totalValue
          }
        })
      )

      const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0)

      return { totalValue, items }
    })
  }

  async processStockReceiving(
    itemId: string,
    quantity: number,
    unitCost: number,
    referenceData: {
      type: string
      id: string
      number: string
    },
    createdBy: string
  ): Promise<StockMovementWithDetails> {
    return this.withLogging('processStockReceiving', async () => {
      return this.createStockMovement({
        itemId,
        movementType: MovementType.STOCK_IN,
        quantity,
        unitCost,
        referenceType: referenceData.type,
        referenceId: referenceData.id,
        referenceNumber: referenceData.number,
        createdBy
      })
    })
  }

  async processStockIssue(
    itemId: string,
    quantity: number,
    referenceData: {
      type: string
      id: string
      number: string
    },
    createdBy: string
  ): Promise<StockMovementWithDetails> {
    return this.withLogging('processStockIssue', async () => {
      // Get current average cost for the item
      const averageCost = await this.getAverageCost(itemId)

      return this.createStockMovement({
        itemId,
        movementType: MovementType.STOCK_OUT,
        quantity: -quantity,
        unitCost: averageCost,
        referenceType: referenceData.type,
        referenceId: referenceData.id,
        referenceNumber: referenceData.number,
        createdBy
      })
    })
  }

  // Private helper methods

  private async generateMovementNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `SM${year}`
    
    const client = tx || prisma
    
    const latestMovement = await client.stockMovement.findFirst({
      where: {
        movementNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        movementNumber: 'desc'
      }
    })

    let nextNumber = 1
    if (latestMovement) {
      const currentNumber = parseInt(latestMovement.movementNumber.substring(prefix.length))
      nextNumber = currentNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`
  }

  private async getFIFOStockLot(
    itemId: string,
    requiredQuantity: number,
    tx: Prisma.TransactionClient
  ): Promise<string | undefined> {
    const oldestLot = await tx.stockLot.findFirst({
      where: {
        itemId,
        availableQty: { gt: 0 },
        isActive: true
      },
      orderBy: { receivedDate: 'asc' }
    })

    return oldestLot?.id
  }

  async allocateFIFOStock(
    itemId: string,
    requiredQuantity: number,
    tx?: Prisma.TransactionClient
  ): Promise<Array<{ stockLotId: string; lotNumber: string; quantity: number; unitCost: number }>> {
    return this.withLogging('allocateFIFOStock', async () => {
      const client = tx || prisma
      
      const availableLots = await client.stockLot.findMany({
        where: {
          itemId,
          availableQty: { gt: 0 },
          isActive: true
        },
        orderBy: { receivedDate: 'asc' }
      })

      const allocations: Array<{ stockLotId: string; lotNumber: string; quantity: number; unitCost: number }> = []
      let remainingQty = requiredQuantity

      for (const lot of availableLots) {
        if (remainingQty <= 0) break

        const allocatedQty = Math.min(lot.availableQty, remainingQty)
        allocations.push({
          stockLotId: lot.id,
          lotNumber: lot.lotNumber,
          quantity: allocatedQty,
          unitCost: lot.unitCost
        })

        remainingQty -= allocatedQty
      }

      if (remainingQty > 0) {
        throw new Error(`Insufficient stock. Required: ${requiredQuantity}, Available: ${requiredQuantity - remainingQty}`)
      }

      return allocations
    })
  }

  async calculateFIFOCost(
    itemId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ): Promise<{ totalCost: number; averageCost: number; allocations: Array<{ stockLotId: string; quantity: number; unitCost: number; cost: number }> }> {
    return this.withLogging('calculateFIFOCost', async () => {
      const allocations = await this.allocateFIFOStock(itemId, quantity, tx)
      
      let totalCost = 0
      const detailedAllocations = allocations.map(allocation => {
        const cost = allocation.quantity * allocation.unitCost
        totalCost += cost
        return {
          stockLotId: allocation.stockLotId,
          quantity: allocation.quantity,
          unitCost: allocation.unitCost,
          cost
        }
      })

      const averageCost = totalCost / quantity

      return {
        totalCost,
        averageCost,
        allocations: detailedAllocations
      }
    })
  }

  async reserveFIFOStock(
    itemId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    return this.withLogging('reserveFIFOStock', async () => {
      const client = tx || prisma
      const allocations = await this.allocateFIFOStock(itemId, quantity, client)

      for (const allocation of allocations) {
        await client.stockLot.update({
          where: { id: allocation.stockLotId },
          data: {
            availableQty: { decrement: allocation.quantity },
            reservedQty: { increment: allocation.quantity }
          }
        })

        // Create reservation record if needed (would require StockReservation model)
        // This is already in the schema, so we can implement it later
      }
    })
  }

  async releaseFIFOReservation(
    itemId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    return this.withLogging('releaseFIFOReservation', async () => {
      const client = tx || prisma
      
      // Find lots with reservations for this reference
      // This would be implemented when we have StockReservation tracking
      // For now, we'll update based on the oldest reserved lots
      
      const reservedLots = await client.stockLot.findMany({
        where: {
          itemId,
          reservedQty: { gt: 0 },
          isActive: true
        },
        orderBy: { receivedDate: 'asc' }
      })

      let remainingQty = quantity

      for (const lot of reservedLots) {
        if (remainingQty <= 0) break

        const releaseQty = Math.min(lot.reservedQty, remainingQty)
        
        await client.stockLot.update({
          where: { id: lot.id },
          data: {
            availableQty: { increment: releaseQty },
            reservedQty: { decrement: releaseQty }
          }
        })

        remainingQty -= releaseQty
      }
    })
  }

  private async updateOrCreateStockLot(
    itemId: string,
    quantity: number,
    unitCost: number,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const lotNumber = await this.generateLotNumber(itemId, tx)
    
    await tx.stockLot.create({
      data: {
        itemId,
        lotNumber,
        receivedDate: new Date(),
        receivedQty: quantity,
        availableQty: quantity,
        unitCost,
        totalCost: quantity * unitCost,
        isActive: true,
        createdBy: 'system' // This should be passed from the parent method
      }
    })
  }

  private async updateStockLotQuantity(
    stockLotId: string,
    quantity: number,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    await tx.stockLot.update({
      where: { id: stockLotId },
      data: {
        availableQty: {
          increment: quantity // quantity is negative for outbound
        }
      }
    })

    // Deactivate lot if fully consumed
    const lot = await tx.stockLot.findUnique({
      where: { id: stockLotId }
    })

    if (lot && lot.availableQty <= 0) {
      await tx.stockLot.update({
        where: { id: stockLotId },
        data: { isActive: false }
      })
    }
  }

  private async generateLotNumber(
    itemId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const item = await tx.item.findUnique({
      where: { id: itemId },
      select: { code: true }
    })

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    
    const latestLot = await tx.stockLot.findFirst({
      where: {
        lotNumber: {
          startsWith: `${item?.code}-${date}`
        }
      },
      orderBy: { lotNumber: 'desc' }
    })

    let sequence = 1
    if (latestLot) {
      const lastSequence = latestLot.lotNumber.split('-').pop()
      sequence = parseInt(lastSequence || '1') + 1
    }

    return `${item?.code}-${date}-${sequence.toString().padStart(3, '0')}`
  }

  private async getAverageCost(itemId: string): Promise<number> {
    const result = await prisma.stockMovement.aggregate({
      where: {
        itemId,
        quantity: { gt: 0 } // Only positive movements for average cost
      },
      _avg: { unitCost: true }
    })

    return result._avg.unitCost || 0
  }

  private async createInventoryJournalEntry(
    movement: StockMovement,
    item: Item,
    userId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    if (!item.inventoryAccountId || !item.cogsAccountId) {
      return // No GL accounts configured
    }

    const lines: CreateJournalLineInput[] = []

    if (movement.quantity > 0) {
      // Stock in: Debit Inventory, Credit varies based on movement type
      lines.push({
        accountId: item.inventoryAccountId,
        description: `Stock received - ${movement.movementNumber}`,
        debitAmount: movement.totalCost,
        creditAmount: 0
      })

      // Credit side depends on movement type
      if (movement.movementType === MovementType.STOCK_IN) {
        // Import account codes
        const { ACCOUNT_CODES } = await import('@/lib/constants/default-accounts')
        
        // Credit Inventory Adjustments for opening stock
        const adjustmentAccountId = await this.getAccountByCode(ACCOUNT_CODES.INVENTORY_ADJUSTMENTS)
        lines.push({
          accountId: adjustmentAccountId,
          description: `Stock adjustment - ${movement.movementNumber}`,
          debitAmount: 0,
          creditAmount: movement.totalCost
        })
      }
    } else {
      // Stock out: Credit Inventory, Debit COGS
      lines.push({
        accountId: item.cogsAccountId,
        description: `Stock issued - ${movement.movementNumber}`,
        debitAmount: movement.totalCost,
        creditAmount: 0
      })

      lines.push({
        accountId: item.inventoryAccountId,
        description: `Stock issued - ${movement.movementNumber}`,
        debitAmount: 0,
        creditAmount: movement.totalCost
      })
    }

    if (lines.length >= 2) {
      await this.journalEntryService.createJournalEntry({
        date: movement.movementDate,
        description: `Inventory ${movement.movementType} - ${movement.movementNumber}`,
        reference: movement.movementNumber,  
        currency: 'USD',
        lines,
        createdBy: userId
      }, tx)
    }
  }

  private async getAccountByCode(code: string): Promise<string> {
    const account = await prisma.account.findFirst({
      where: { code }
    })
    
    if (!account) {
      throw new Error(`Account with code ${code} not found`)
    }
    
    return account.id
  }
}