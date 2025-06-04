import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { JournalEntryService } from '../accounting/journal-entry.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { StockMovement, StockLot, MovementType, Prisma } from '@/lib/generated/prisma'

export interface CreateStockMovementInput {
  itemId: string
  movementType: MovementType
  movementDate: Date
  quantity: number
  unitCost?: number
  unitOfMeasureId?: string
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  locationId?: string
  location?: string
  notes?: string
  autoCreateLot?: boolean
  lotNumber?: string
  expiryDate?: Date
  supplier?: string
  purchaseRef?: string
}

export interface StockMovementWithDetails extends StockMovement {
  item: {
    id: string
    code: string
    name: string
    trackInventory: boolean
    standardCost: number
    unitOfMeasure: {
      code: string
      symbol?: string | null
    }
  }
  stockLot?: StockLot | null
  unitOfMeasure: {
    id: string
    code: string
    name: string
    symbol?: string | null
  }
  journalEntry?: {
    id: string
    entryNumber: string
    status: string
  } | null
}

export interface StockLotWithDetails extends StockLot {
  item: {
    id: string
    code: string
    name: string
    unitOfMeasure: {
      code: string
      symbol?: string | null
    }
  }
  movements: StockMovement[]
}

export interface FIFOAllocation {
  lotId: string
  lotNumber: string
  quantityUsed: number
  unitCost: number
  totalCost: number
  remainingQuantity: number
}

export interface FIFOResult {
  totalQuantityAllocated: number
  totalCost: number
  averageCost: number
  allocations: FIFOAllocation[]
  insufficientStock: boolean
  shortfallQuantity: number
}

export class StockMovementService {
  private auditService: AuditService
  private journalEntryService: JournalEntryService

  constructor() {
    this.auditService = new AuditService()
    this.journalEntryService = new JournalEntryService()
  }

  async createStockMovement(
    data: CreateStockMovementInput & { createdBy: string }
  ): Promise<StockMovementWithDetails> {
    // Validate item exists and is trackable
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
      include: {
        unitOfMeasure: true,
        inventoryAccount: true,
        cogsAccount: true
      }
    })

    if (!item) {
      throw new Error('Item not found')
    }

    if (!item.trackInventory) {
      throw new Error('Item does not track inventory')
    }

    // Validate unit of measure
    let unitOfMeasureId = data.unitOfMeasureId || item.unitOfMeasureId
    const unitOfMeasure = await prisma.unitOfMeasure.findUnique({
      where: { id: unitOfMeasureId }
    })

    if (!unitOfMeasure) {
      throw new Error('Unit of measure not found')
    }

    // Determine unit cost
    let unitCost = data.unitCost || 0
    if (unitCost === 0 && (data.movementType === MovementType.STOCK_IN || data.movementType === MovementType.ADJUSTMENT)) {
      unitCost = item.standardCost || 0
    }

    // Validate stock availability for outbound movements and negative adjustments
    if (data.movementType === MovementType.STOCK_OUT && data.quantity > 0) {
      const availableStock = await this.getAvailableStock(data.itemId)
      if (availableStock < data.quantity) {
        throw new Error(`Insufficient stock. Available: ${availableStock}, Required: ${data.quantity}`)
      }
    } else if (data.movementType === MovementType.ADJUSTMENT && data.quantity < 0) {
      const availableStock = await this.getAvailableStock(data.itemId)
      const adjustmentQuantity = Math.abs(data.quantity)
      if (availableStock < adjustmentQuantity) {
        throw new Error(`Insufficient stock for negative adjustment. Available: ${availableStock}, Required: ${adjustmentQuantity}`)
      }
    }

    // Create transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate movement number
      const movementNumber = await this.generateMovementNumber(data.movementType)

      // Handle stock lot operations
      let stockLotId: string | undefined

      if (data.movementType === MovementType.STOCK_IN || data.movementType === MovementType.OPENING || 
         (data.movementType === MovementType.ADJUSTMENT && data.quantity > 0)) {
        // Create or find stock lot for inbound movements and positive adjustments
        if (data.autoCreateLot !== false) {
          const lotNumber = data.lotNumber || await this.generateLotNumber(data.itemId)
          const adjustedQuantity = Math.abs(data.quantity)
          
          const stockLot = await tx.stockLot.create({
            data: {
              lotNumber,
              itemId: data.itemId,
              receivedDate: data.movementDate,
              expiryDate: data.expiryDate,
              supplier: data.supplier,
              purchaseRef: data.purchaseRef,
              receivedQty: adjustedQuantity,
              availableQty: adjustedQuantity,
              unitCost,
              totalCost: adjustedQuantity * unitCost,
              createdBy: data.createdBy
            }
          })
          stockLotId = stockLot.id
        }
      } else if (data.movementType === MovementType.STOCK_OUT || 
                (data.movementType === MovementType.ADJUSTMENT && data.quantity < 0)) {
        // For outbound movements and negative adjustments, use FIFO allocation
        const allocationQuantity = Math.abs(data.quantity)
        const fifoResult = await this.allocateFIFO(data.itemId, allocationQuantity, tx)
        
        if (fifoResult.insufficientStock) {
          throw new Error(`Insufficient stock for FIFO allocation. Shortfall: ${fifoResult.shortfallQuantity}`)
        }

        // Use weighted average cost for the movement
        unitCost = fifoResult.averageCost
      }

      // Create the stock movement
      const stockMovement = await tx.stockMovement.create({
        data: {
          movementNumber,
          itemId: data.itemId,
          stockLotId,
          movementType: data.movementType,
          movementDate: data.movementDate,
          quantity: data.movementType === MovementType.STOCK_OUT ? -Math.abs(data.quantity) : 
                   data.movementType === MovementType.ADJUSTMENT ? data.quantity : Math.abs(data.quantity),
          unitCost,
          totalCost: Math.abs(data.quantity) * unitCost,
          unitOfMeasureId,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          referenceNumber: data.referenceNumber,
          locationId: data.locationId,
          location: data.location,
          notes: data.notes,
          createdBy: data.createdBy
        },
        include: {
          item: {
            include: {
              unitOfMeasure: {
                select: {
                  code: true,
                  symbol: true
                }
              }
            }
          },
          stockLot: true,
          unitOfMeasure: true
        }
      })

      // Create journal entry for GL integration
      if (item.inventoryAccount && (item.cogsAccount || data.movementType === MovementType.STOCK_IN)) {
        const journalEntry = await this.createInventoryJournalEntry(
          stockMovement,
          item,
          data.createdBy,
          tx
        )
        
        // Update stock movement with journal entry reference
        await tx.stockMovement.update({
          where: { id: stockMovement.id },
          data: { journalEntryId: journalEntry.id }
        })
      }

      return stockMovement
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'StockMovement',
      entityId: result.id,
      afterData: result,
    })

    return result as StockMovementWithDetails
  }

  async allocateFIFO(
    itemId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ): Promise<FIFOResult> {
    const client = tx || prisma

    // Get available stock lots ordered by FIFO (oldest first)
    const stockLots = await client.stockLot.findMany({
      where: {
        itemId,
        isActive: true,
        availableQty: { gt: 0 }
      },
      orderBy: [
        { receivedDate: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    const allocations: FIFOAllocation[] = []
    let remainingQuantity = quantity
    let totalCost = 0
    let totalQuantityAllocated = 0

    for (const lot of stockLots) {
      if (remainingQuantity <= 0) break

      const quantityToAllocate = Math.min(remainingQuantity, lot.availableQty)
      const allocationCost = quantityToAllocate * lot.unitCost

      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        quantityUsed: quantityToAllocate,
        unitCost: lot.unitCost,
        totalCost: allocationCost,
        remainingQuantity: lot.availableQty - quantityToAllocate
      })

      // Update lot quantities if transaction is provided
      if (tx) {
        await tx.stockLot.update({
          where: { id: lot.id },
          data: {
            availableQty: lot.availableQty - quantityToAllocate
          }
        })
      }

      totalCost += allocationCost
      totalQuantityAllocated += quantityToAllocate
      remainingQuantity -= quantityToAllocate
    }

    const averageCost = totalQuantityAllocated > 0 ? totalCost / totalQuantityAllocated : 0

    return {
      totalQuantityAllocated,
      totalCost,
      averageCost,
      allocations,
      insufficientStock: remainingQuantity > 0,
      shortfallQuantity: remainingQuantity
    }
  }

  private async createInventoryJournalEntry(
    stockMovement: any,
    item: any,
    userId: string,
    tx: Prisma.TransactionClient
  ) {
    const lines = []

    if (stockMovement.movementType === MovementType.STOCK_IN || stockMovement.movementType === MovementType.OPENING) {
      // Debit Inventory, Credit to Inventory Adjustment account
      lines.push({
        accountId: item.inventoryAccount.id,
        description: `Stock in - ${item.name}`,
        debitAmount: Math.abs(stockMovement.totalCost),
        creditAmount: 0
      })

      // Create or find adjustment account
      let adjustmentAccount = await tx.account.findFirst({
        where: { code: '5900' }
      })

      if (!adjustmentAccount) {
        // Create the adjustment account if it doesn't exist
        adjustmentAccount = await tx.account.create({
          data: {
            code: '5900',
            name: 'Inventory Adjustments',
            type: 'EXPENSE',
            description: 'Inventory adjustment account',
            createdBy: userId
          }
        })
      }

      lines.push({
        accountId: adjustmentAccount.id,
        description: `Stock in adjustment - ${item.name}`,
        debitAmount: 0,
        creditAmount: Math.abs(stockMovement.totalCost)
      })
    } else if (stockMovement.movementType === MovementType.STOCK_OUT && item.cogsAccount) {
      // Debit COGS, Credit Inventory
      lines.push({
        accountId: item.cogsAccount.id,
        description: `COGS - ${item.name}`,
        debitAmount: Math.abs(stockMovement.totalCost),
        creditAmount: 0
      })

      lines.push({
        accountId: item.inventoryAccount.id,
        description: `Stock out - ${item.name}`,
        debitAmount: 0,
        creditAmount: Math.abs(stockMovement.totalCost)
      })
    } else if (stockMovement.movementType === MovementType.ADJUSTMENT) {
      // For adjustments, use the adjustment account
      let adjustmentAccount = await tx.account.findFirst({
        where: { code: '5900' }
      })

      if (!adjustmentAccount) {
        adjustmentAccount = await tx.account.create({
          data: {
            code: '5900',
            name: 'Inventory Adjustments',
            type: 'EXPENSE',
            description: 'Inventory adjustment account',
            createdBy: userId
          }
        })
      }

      if (stockMovement.quantity > 0) {
        // Positive adjustment - increase inventory
        lines.push({
          accountId: item.inventoryAccount.id,
          description: `Inventory adjustment (increase) - ${item.name}`,
          debitAmount: Math.abs(stockMovement.totalCost),
          creditAmount: 0
        })

        lines.push({
          accountId: adjustmentAccount.id,
          description: `Inventory adjustment (increase) - ${item.name}`,
          debitAmount: 0,
          creditAmount: Math.abs(stockMovement.totalCost)
        })
      } else {
        // Negative adjustment - decrease inventory
        lines.push({
          accountId: adjustmentAccount.id,
          description: `Inventory adjustment (decrease) - ${item.name}`,
          debitAmount: Math.abs(stockMovement.totalCost),
          creditAmount: 0
        })

        lines.push({
          accountId: item.inventoryAccount.id,
          description: `Inventory adjustment (decrease) - ${item.name}`,
          debitAmount: 0,
          creditAmount: Math.abs(stockMovement.totalCost)
        })
      }
    }

    if (lines.length >= 2) {
      return await this.journalEntryService.createJournalEntry({
        date: stockMovement.movementDate,
        description: `${stockMovement.movementType} - ${item.name} (${stockMovement.movementNumber})`,
        reference: stockMovement.referenceNumber || stockMovement.movementNumber,
        currency: 'USD',
        lines,
        createdBy: userId
      }, tx)
    }

    return null
  }

  async getAvailableStock(itemId: string): Promise<number> {
    const stockLots = await prisma.stockLot.findMany({
      where: {
        itemId,
        isActive: true
      },
      select: {
        availableQty: true
      }
    })

    return stockLots.reduce((total, lot) => total + lot.availableQty, 0)
  }

  async getStockValue(itemId: string): Promise<number> {
    const stockLots = await prisma.stockLot.findMany({
      where: {
        itemId,
        isActive: true
      },
      select: {
        availableQty: true,
        unitCost: true
      }
    })

    return stockLots.reduce((total, lot) => total + (lot.availableQty * lot.unitCost), 0)
  }

  async getItemStockHistory(
    itemId: string,
    options?: {
      dateFrom?: Date
      dateTo?: Date
      movementType?: MovementType
      limit?: number
      offset?: number
    }
  ): Promise<StockMovementWithDetails[]> {
    const where: Prisma.StockMovementWhereInput = { itemId }

    if (options?.dateFrom || options?.dateTo) {
      where.movementDate = {}
      if (options.dateFrom) {
        where.movementDate.gte = options.dateFrom
      }
      if (options.dateTo) {
        where.movementDate.lte = options.dateTo
      }
    }

    if (options?.movementType) {
      where.movementType = options.movementType
    }

    return prisma.stockMovement.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            trackInventory: true,
            standardCost: true,
            unitOfMeasure: {
              select: {
                code: true,
                symbol: true
              }
            }
          }
        },
        stockLot: true,
        unitOfMeasure: true,
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            status: true
          }
        }
      },
      orderBy: [
        { movementDate: 'desc' },
        { createdAt: 'desc' }
      ],
      take: options?.limit,
      skip: options?.offset
    })
  }

  async getStockLots(
    itemId: string,
    options?: {
      isActive?: boolean
      hasStock?: boolean
      expiryDateBefore?: Date
      limit?: number
      offset?: number
    }
  ): Promise<StockLotWithDetails[]> {
    const where: Prisma.StockLotWhereInput = { itemId }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive
    }

    if (options?.hasStock) {
      where.availableQty = { gt: 0 }
    }

    if (options?.expiryDateBefore) {
      where.expiryDate = { lte: options.expiryDateBefore }
    }

    return prisma.stockLot.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: {
              select: {
                code: true,
                symbol: true
              }
            }
          }
        },
        stockMovements: {
          orderBy: { movementDate: 'desc' },
          take: 10
        }
      },
      orderBy: [
        { receivedDate: 'asc' },
        { createdAt: 'asc' }
      ],
      take: options?.limit,
      skip: options?.offset
    })
  }

  async adjustStock(
    itemId: string,
    adjustmentQuantity: number,
    reason: string,
    userId: string,
    unitCost?: number
  ): Promise<StockMovementWithDetails> {
    if (adjustmentQuantity === 0) {
      throw new Error('Adjustment quantity cannot be zero')
    }

    // For adjustments, pass the signed quantity directly
    return this.createStockMovement({
      itemId,
      movementType: MovementType.ADJUSTMENT,
      movementDate: new Date(),
      quantity: adjustmentQuantity, // Pass signed quantity for adjustments
      unitCost,
      referenceType: 'ADJUSTMENT',
      referenceNumber: `ADJ-${Date.now()}`,
      notes: reason,
      autoCreateLot: adjustmentQuantity > 0,
      createdBy: userId
    })
  }

  async createOpeningStock(
    itemId: string,
    quantity: number,
    unitCost: number,
    asOfDate: Date,
    userId: string,
    lotNumber?: string
  ): Promise<StockMovementWithDetails> {
    if (quantity <= 0) {
      throw new Error('Opening stock quantity must be positive')
    }

    if (unitCost < 0) {
      throw new Error('Opening stock unit cost cannot be negative')
    }

    // Check if opening stock already exists
    const existingOpening = await prisma.stockMovement.findFirst({
      where: {
        itemId,
        movementType: MovementType.OPENING
      }
    })

    if (existingOpening) {
      throw new Error('Opening stock already exists for this item')
    }

    return this.createStockMovement({
      itemId,
      movementType: MovementType.OPENING,
      movementDate: asOfDate,
      quantity,
      unitCost,
      referenceType: 'OPENING',
      referenceNumber: `OPEN-${Date.now()}`,
      notes: 'Opening stock balance',
      autoCreateLot: true,
      lotNumber: lotNumber || `OPEN-${Date.now()}`,
      createdBy: userId
    })
  }

  private async generateMovementNumber(movementType: MovementType): Promise<string> {
    const prefix = this.getMovementPrefix(movementType)
    
    const lastMovement = await prisma.stockMovement.findFirst({
      where: {
        movementNumber: { startsWith: prefix }
      },
      orderBy: { movementNumber: 'desc' }
    })

    if (!lastMovement) {
      return `${prefix}-0001`
    }

    const match = lastMovement.movementNumber.match(/-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `${prefix}-${newNumber.toString().padStart(4, '0')}`
    }

    return `${prefix}-0001`
  }

  private getMovementPrefix(movementType: MovementType): string {
    switch (movementType) {
      case MovementType.STOCK_IN:
        return 'SIN'
      case MovementType.STOCK_OUT:
        return 'SOUT'
      case MovementType.ADJUSTMENT:
        return 'ADJ'
      case MovementType.OPENING:
        return 'OPEN'
      case MovementType.TRANSFER:
        return 'XFER'
      default:
        return 'MOV'
    }
  }

  private async generateLotNumber(itemId: string): Promise<string> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { code: true }
    })

    const prefix = item ? item.code : 'LOT'
    const timestamp = Date.now()
    
    return `${prefix}-${timestamp}`
  }

  async getExpiringLots(daysAhead: number = 30): Promise<StockLotWithDetails[]> {
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + daysAhead)

    return this.getStockLots('', {
      isActive: true,
      hasStock: true,
      expiryDateBefore: expiryDate
    })
  }

  async getStockMovement(id: string): Promise<StockMovementWithDetails | null> {
    return prisma.stockMovement.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            trackInventory: true,
            standardCost: true,
            unitOfMeasure: {
              select: {
                code: true,
                symbol: true
              }
            }
          }
        },
        stockLot: true,
        unitOfMeasure: true,
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            status: true
          }
        }
      }
    })
  }

  async getAllMovements(options: {
    type?: MovementType
    dateFrom?: Date
    dateTo?: Date
    locationId?: string
    limit?: number
    offset?: number
  } = {}): Promise<StockMovementWithDetails[]> {
    const {
      type,
      dateFrom,
      dateTo,
      locationId,
      limit = 100,
      offset = 0
    } = options

    const where: any = {}
    
    if (type) {
      where.movementType = type
    }
    
    if (dateFrom || dateTo) {
      where.movementDate = {}
      if (dateFrom) where.movementDate.gte = dateFrom
      if (dateTo) where.movementDate.lte = dateTo
    }
    
    if (locationId) {
      where.locationId = locationId
    }

    return prisma.stockMovement.findMany({
      where,
      orderBy: { movementDate: 'desc' },
      take: limit,
      skip: offset,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: {
              select: {
                code: true,
                symbol: true
              }
            }
          }
        },
        location: {
          select: {
            id: true,
            name: true
          }
        },
        stockLot: true,
        unitOfMeasure: true
      }
    })
  }
}