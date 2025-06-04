import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { Item, ItemType, Prisma } from '@/lib/generated/prisma'

export interface CreateItemInput {
  code: string
  name: string
  description?: string
  categoryId: string
  type?: ItemType
  unitOfMeasureId?: string
  unitPrice?: number
  reorderLevel?: number
  isService?: boolean
  trackStock?: boolean
  trackInventory?: boolean
  minStockLevel?: number
  maxStockLevel?: number
  reorderPoint?: number
  standardCost?: number
  listPrice?: number
  inventoryAccountId?: string
  cogsAccountId?: string
  salesAccountId?: string
  isSaleable?: boolean
  isPurchaseable?: boolean
  isActive?: boolean
}

export interface UpdateItemInput {
  code?: string
  name?: string
  description?: string
  categoryId?: string
  type?: ItemType
  unitOfMeasureId?: string
  unitPrice?: number
  trackInventory?: boolean
  trackStock?: boolean
  minStockLevel?: number
  maxStockLevel?: number
  reorderPoint?: number
  reorderLevel?: number
  standardCost?: number
  listPrice?: number
  inventoryAccountId?: string
  cogsAccountId?: string
  salesAccountId?: string
  isActive?: boolean
  isSaleable?: boolean
  isPurchaseable?: boolean
  isService?: boolean
  updatedBy?: string
}

export interface ItemWithDetails extends Item {
  category: {
    id: string
    code: string
    name: string
  }
  unitOfMeasure: {
    id: string
    code: string
    name: string
    symbol?: string | null
  }
  inventoryAccount?: {
    id: string
    code: string
    name: string
  } | null
  cogsAccount?: {
    id: string
    code: string
    name: string
  } | null
  salesAccount?: {
    id: string
    code: string
    name: string
  } | null
  _count?: {
    stockLots: number
    stockMovements: number
  }
  currentStock?: number
  stockValue?: number
  // Computed fields for test compatibility
  unitPrice?: number
  reorderLevel?: number
  isService?: boolean
  trackStock?: boolean
}

export interface StockSummary {
  itemId: string
  item: {
    code: string
    name: string
    unitOfMeasure: {
      code: string
      symbol?: string | null
    }
  }
  totalStock: number
  reservedStock: number
  availableStock: number
  averageCost: number
  totalValue: number
  lastMovementDate?: Date | null
  reorderPoint: number
  minStockLevel: number
  belowMinStock: boolean
  belowReorderPoint: boolean
}

export class ItemService {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  async createItem(
    data: CreateItemInput & { createdBy: string }
  ): Promise<ItemWithDetails> {
    // Validate unit price
    if (data.unitPrice && data.unitPrice < 0) {
      throw new Error('Unit price must be positive')
    }

    // Check if code is unique
    const existingItem = await prisma.item.findUnique({
      where: { code: data.code }
    })

    if (existingItem) {
      throw new Error('Item code already exists')
    }

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    })

    if (!category) {
      throw new Error('Category not found')
    }

    if (!category.isActive) {
      throw new Error('Cannot create item in inactive category')
    }

    // Get or create default unit of measure
    let unitOfMeasureId = data.unitOfMeasureId
    if (!unitOfMeasureId) {
      // Create or get default "Each" unit
      let defaultUOM = await prisma.unitOfMeasure.findFirst({
        where: { code: 'EACH' }
      })
      
      if (!defaultUOM) {
        defaultUOM = await prisma.unitOfMeasure.create({
          data: {
            code: 'EACH',
            name: 'Each',
            symbol: 'ea',
            isActive: true,
            isBaseUnit: true,
            conversionFactor: 1.0,
            createdBy: data.createdBy
          }
        })
      }
      unitOfMeasureId = defaultUOM.id
    }

    // Validate unit of measure exists if provided
    const unitOfMeasure = await prisma.unitOfMeasure.findUnique({
      where: { id: unitOfMeasureId }
    })

    if (!unitOfMeasure) {
      throw new Error('Unit of measure not found')
    }

    if (!unitOfMeasure.isActive) {
      throw new Error('Cannot create item with inactive unit of measure')
    }

    // Validate GL accounts if provided
    if (data.inventoryAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.inventoryAccountId }
      })
      if (!account || account.type !== 'ASSET') {
        throw new Error('Inventory account must be an asset account')
      }
    }

    if (data.cogsAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.cogsAccountId }
      })
      if (!account || account.type !== 'EXPENSE') {
        throw new Error('COGS account must be an expense account')
      }
    }

    if (data.salesAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.salesAccountId }
      })
      if (!account || account.type !== 'INCOME') {
        throw new Error('Sales account must be an income account')
      }
    }

    // Set defaults and map fields appropriately
    const isService = data.isService || data.type === ItemType.SERVICE
    const itemData = {
      code: data.code,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      type: isService ? ItemType.SERVICE : (data.type || ItemType.PRODUCT),
      unitOfMeasureId: unitOfMeasureId,
      trackInventory: data.trackInventory ?? data.trackStock ?? !isService,
      minStockLevel: data.minStockLevel || 0,
      maxStockLevel: data.maxStockLevel || 0,
      reorderPoint: data.reorderPoint || data.reorderLevel || 0,
      standardCost: data.standardCost || 0,
      listPrice: data.listPrice || data.unitPrice || 0,
      inventoryAccountId: data.inventoryAccountId,
      cogsAccountId: data.cogsAccountId,
      salesAccountId: data.salesAccountId,
      isSaleable: data.isSaleable ?? true,
      isPurchaseable: data.isPurchaseable ?? true,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy
    }

    const item = await prisma.item.create({
      data: itemData,
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        unitOfMeasure: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true
          }
        },
        inventoryAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        cogsAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        salesAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        _count: {
          select: {
            stockLots: true,
            stockMovements: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'Item',
      entityId: item.id,
      afterData: item,
    })

    // Add computed fields for test compatibility
    return {
      ...item,
      unitPrice: item.listPrice,
      reorderLevel: item.reorderPoint,
      isService: item.type === ItemType.SERVICE,
      trackStock: item.trackInventory
    }
  }

  async updateItem(
    id: string,
    data: UpdateItemInput & { updatedBy: string }
  ): Promise<ItemWithDetails> {
    const userId = data.updatedBy
    const existingItem = await this.getItem(id)
    if (!existingItem) {
      throw new Error('Item not found')
    }

    // Check code uniqueness if being updated
    if (data.code && data.code !== existingItem.code) {
      const codeExists = await prisma.item.findUnique({
        where: { code: data.code }
      })

      if (codeExists) {
        throw new Error('Item with this code already exists')
      }
    }

    // Validate category if being updated
    if (data.categoryId && data.categoryId !== existingItem.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId }
      })

      if (!category) {
        throw new Error('Category not found')
      }

      if (!category.isActive) {
        throw new Error('Cannot move item to inactive category')
      }
    }

    // Validate unit of measure if being updated
    if (data.unitOfMeasureId && data.unitOfMeasureId !== existingItem.unitOfMeasureId) {
      const unitOfMeasure = await prisma.unitOfMeasure.findUnique({
        where: { id: data.unitOfMeasureId }
      })

      if (!unitOfMeasure) {
        throw new Error('Unit of measure not found')
      }

      if (!unitOfMeasure.isActive) {
        throw new Error('Cannot change to inactive unit of measure')
      }

      // Check if item has stock movements - changing UoM might cause issues
      if (existingItem._count && existingItem._count.stockMovements > 0) {
        throw new Error('Cannot change unit of measure for item with existing stock movements')
      }
    }

    // Validate GL accounts if being updated
    if (data.inventoryAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.inventoryAccountId }
      })
      if (!account || account.type !== 'ASSET') {
        throw new Error('Inventory account must be an asset account')
      }
    }

    if (data.cogsAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.cogsAccountId }
      })
      if (!account || account.type !== 'EXPENSE') {
        throw new Error('COGS account must be an expense account')
      }
    }

    if (data.salesAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.salesAccountId }
      })
      if (!account || account.type !== 'INCOME') {
        throw new Error('Sales account must be an income account')
      }
    }

    // Map fields appropriately  
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    }
    
    // Map unitPrice to listPrice
    if (data.unitPrice !== undefined) {
      updateData.listPrice = data.unitPrice
      delete updateData.unitPrice
    }
    
    // Map reorderLevel to reorderPoint
    if (data.reorderLevel !== undefined) {
      updateData.reorderPoint = data.reorderLevel
      delete updateData.reorderLevel
    }
    
    // Map trackStock to trackInventory
    if (data.trackStock !== undefined) {
      updateData.trackInventory = data.trackStock
      delete updateData.trackStock
    }
    
    // Remove updatedBy field (not a database field)
    delete updateData.updatedBy

    const updatedItem = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        unitOfMeasure: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true
          }
        },
        inventoryAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        cogsAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        salesAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        _count: {
          select: {
            stockLots: true,
            stockMovements: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Item',
      entityId: id,
      beforeData: existingItem,
      afterData: updatedItem,
    })

    // Add computed fields for test compatibility
    return {
      ...updatedItem,
      unitPrice: updatedItem.listPrice,
      reorderLevel: updatedItem.reorderPoint,
      isService: updatedItem.type === ItemType.SERVICE,
      trackStock: updatedItem.trackInventory
    }
  }

  async getItem(id: string): Promise<ItemWithDetails | null> {
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        unitOfMeasure: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true
          }
        },
        inventoryAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        cogsAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        salesAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        _count: {
          select: {
            stockLots: true,
            stockMovements: true
          }
        }
      }
    })

    if (!item) return null

    // Get current stock and value
    const stockInfo = await this.getItemStockSummary(id)
    
    return {
      ...item,
      currentStock: stockInfo?.totalStock || 0,
      stockValue: stockInfo?.totalValue || 0
    }
  }

  async getItemByCode(code: string): Promise<ItemWithDetails | null> {
    const item = await prisma.item.findUnique({
      where: { code },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        unitOfMeasure: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true
          }
        },
        inventoryAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        cogsAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        salesAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        _count: {
          select: {
            stockLots: true,
            stockMovements: true
          }
        }
      }
    })

    if (!item) return null

    // Get current stock and value
    const stockInfo = await this.getItemStockSummary(item.id)
    
    return {
      ...item,
      currentStock: stockInfo?.totalStock || 0,
      stockValue: stockInfo?.totalValue || 0
    }
  }

  async getAllItems(options?: {
    categoryId?: string
    type?: ItemType
    isActive?: boolean
    isSaleable?: boolean
    isPurchaseable?: boolean
    trackInventory?: boolean
    search?: string
    belowMinStock?: boolean
    belowReorderPoint?: boolean
    limit?: number
    offset?: number
  }): Promise<ItemWithDetails[]> {
    const where: Prisma.ItemWhereInput = {}

    if (options?.categoryId) {
      where.categoryId = options.categoryId
    }

    if (options?.type) {
      where.type = options.type
    }

    // Default to active items only unless explicitly specified as undefined
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive
    } else if (!options?.hasOwnProperty('isActive')) {
      // Only default to active if isActive was not provided at all
      where.isActive = true
    }

    if (options?.isSaleable !== undefined) {
      where.isSaleable = options.isSaleable
    }

    if (options?.isPurchaseable !== undefined) {
      where.isPurchaseable = options.isPurchaseable
    }

    if (options?.trackInventory !== undefined) {
      where.trackInventory = options.trackInventory
    }

    if (options?.search) {
      where.OR = [
        { code: { contains: options.search } },
        { name: { contains: options.search } },
        { description: { contains: options.search } }
      ]
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        unitOfMeasure: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true
          }
        },
        inventoryAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        cogsAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        salesAccount: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        _count: {
          select: {
            stockLots: true,
            stockMovements: true
          }
        }
      },
      orderBy: [
        { code: 'asc' }
      ],
      take: options?.limit,
      skip: options?.offset
    })

    // Enhance with stock information
    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        const stockInfo = await this.getItemStockSummary(item.id)
        return {
          ...item,
          currentStock: stockInfo?.totalStock || 0,
          stockValue: stockInfo?.totalValue || 0
        }
      })
    )

    // Apply stock-based filters
    let filteredItems = itemsWithStock

    if (options?.belowMinStock) {
      filteredItems = filteredItems.filter(item => 
        item.trackInventory && 
        item.minStockLevel > 0 && 
        (item.currentStock || 0) < item.minStockLevel
      )
    }

    if (options?.belowReorderPoint) {
      filteredItems = filteredItems.filter(item => 
        item.trackInventory && 
        item.reorderPoint > 0 && 
        (item.currentStock || 0) < item.reorderPoint
      )
    }

    return filteredItems
  }

  async getItemStockSummary(itemId: string): Promise<StockSummary | null> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        code: true,
        name: true,
        reorderPoint: true,
        minStockLevel: true,
        trackInventory: true,
        unitOfMeasure: {
          select: {
            code: true,
            symbol: true
          }
        }
      }
    })

    if (!item || !item.trackInventory) {
      return null
    }

    // Get all active stock lots for this item
    const stockLots = await prisma.stockLot.findMany({
      where: {
        itemId: itemId,
        isActive: true
      },
      select: {
        availableQty: true,
        reservedQty: true,
        unitCost: true
      }
    })

    // Get last movement date
    const lastMovement = await prisma.stockMovement.findFirst({
      where: { itemId: itemId },
      orderBy: { movementDate: 'desc' },
      select: { movementDate: true }
    })

    // Calculate totals
    let totalStock = 0
    let reservedStock = 0
    let totalValue = 0
    let totalCost = 0

    for (const lot of stockLots) {
      totalStock += lot.availableQty
      reservedStock += lot.reservedQty
      const lotValue = lot.availableQty * lot.unitCost
      totalValue += lotValue
      totalCost += lot.availableQty * lot.unitCost
    }

    const availableStock = totalStock - reservedStock
    const averageCost = totalStock > 0 ? totalCost / totalStock : 0

    return {
      itemId: item.id,
      item: {
        code: item.code,
        name: item.name,
        unitOfMeasure: {
          code: item.unitOfMeasure.code,
          symbol: item.unitOfMeasure.symbol
        }
      },
      totalStock,
      reservedStock,
      availableStock,
      averageCost,
      totalValue,
      lastMovementDate: lastMovement?.movementDate || null,
      reorderPoint: item.reorderPoint,
      minStockLevel: item.minStockLevel,
      belowMinStock: item.minStockLevel > 0 && totalStock < item.minStockLevel,
      belowReorderPoint: item.reorderPoint > 0 && totalStock < item.reorderPoint
    }
  }

  async getAllStockSummaries(options?: {
    categoryId?: string
    belowMinStock?: boolean
    belowReorderPoint?: boolean
    zeroStock?: boolean
  }): Promise<StockSummary[]> {
    const where: Prisma.ItemWhereInput = {
      trackInventory: true,
      isActive: true
    }

    if (options?.categoryId) {
      where.categoryId = options.categoryId
    }

    const items = await prisma.item.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        reorderPoint: true,
        minStockLevel: true,
        unitOfMeasure: {
          select: {
            code: true,
            symbol: true
          }
        }
      },
      orderBy: { code: 'asc' }
    })

    const summaries = await Promise.all(
      items.map(async (item) => {
        const summary = await this.getItemStockSummary(item.id)
        return summary
      })
    )

    let filteredSummaries = summaries.filter(s => s !== null) as StockSummary[]

    // Apply filters
    if (options?.belowMinStock) {
      filteredSummaries = filteredSummaries.filter(s => s.belowMinStock)
    }

    if (options?.belowReorderPoint) {
      filteredSummaries = filteredSummaries.filter(s => s.belowReorderPoint)
    }

    if (options?.zeroStock) {
      filteredSummaries = filteredSummaries.filter(s => s.totalStock === 0)
    }

    return filteredSummaries
  }

  async deleteItem(id: string, userId: string): Promise<boolean> {
    const item = await this.getItem(id)
    if (!item) {
      throw new Error('Item not found')
    }

    // Check if item has stock
    const stockSummary = await this.getItemStockSummary(id)
    if (stockSummary && stockSummary.totalStock > 0) {
      throw new Error('Cannot delete item with existing stock')
    }

    // Check if item has movements
    if (item._count && item._count.stockMovements > 0) {
      throw new Error('Cannot delete item with stock movement history')
    }

    await prisma.item.delete({
      where: { id }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Item',
      entityId: id,
      beforeData: item,
    })

    return true
  }

  async getItemById(id: string): Promise<(ItemWithDetails & { 
    currentStock: number
    stockValue: number 
    movements?: any[]
    isLowStock?: boolean
    trackStock?: boolean
  }) | null> {
    const item = await this.getItem(id)
    if (!item) return null

    const stockInfo = await this.getItemStockSummary(id)
    const currentStock = stockInfo?.totalStock || 0
    const stockValue = stockInfo?.totalValue || 0

    // Get recent stock movements
    const movements = await prisma.stockMovement.findMany({
      where: { itemId: id },
      orderBy: { movementDate: 'desc' },
      take: 10,
      select: {
        id: true,
        movementNumber: true,
        movementType: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        movementDate: true
      }
    })

    return {
      ...item,
      currentStock,
      stockValue,
      movements,
      isLowStock: item.reorderPoint > 0 && currentStock < item.reorderPoint,
      trackStock: item.trackInventory
    }
  }

  async generateItemCode(categoryId: string): Promise<string> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      throw new Error('Category not found')
    }

    const prefix = category.code

    // Find the last item with this category prefix
    const lastItem = await prisma.item.findFirst({
      where: {
        code: { startsWith: prefix }
      },
      orderBy: { code: 'desc' }
    })

    if (!lastItem) {
      return `${prefix}-001`
    }

    // Extract number and increment
    const match = lastItem.code.match(/-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `${prefix}-${newNumber.toString().padStart(3, '0')}`
    }

    return `${prefix}-001`
  }

  // Enhanced methods for test compatibility
  async getLowStockItems(): Promise<ItemWithDetails[]> {
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        trackInventory: true,
        reorderPoint: { gt: 0 }
      },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        unitOfMeasure: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true
          }
        }
      }
    })

    const lowStockItems = []

    for (const item of items) {
      const stockInfo = await this.getItemStockSummary(item.id)
      const currentStock = stockInfo?.totalStock || 0
      
      if (currentStock < (item.reorderPoint || 0)) {
        lowStockItems.push({
          ...item,
          currentStock,
          stockValue: stockInfo?.totalValue || 0
        })
      }
    }

    return lowStockItems
  }

  async getStockValueReport(): Promise<{
    totalValue: number
    totalItems: number
    itemDetails: Array<{
      id: string
      code: string
      name: string
      currentStock: number
      stockValue: number
    }>
  }> {
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        trackInventory: true
      },
      select: {
        id: true,
        code: true,
        name: true
      }
    })

    const itemDetails = []
    let totalValue = 0

    for (const item of items) {
      const stockInfo = await this.getItemStockSummary(item.id)
      const currentStock = stockInfo?.totalStock || 0
      const stockValue = stockInfo?.totalValue || 0

      if (currentStock > 0) {
        itemDetails.push({
          ...item,
          currentStock,
          stockValue
        })
        totalValue += stockValue
      }
    }

    return {
      totalValue,
      totalItems: itemDetails.length,
      itemDetails
    }
  }
}