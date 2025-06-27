import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'
import { CategoryService } from '@/lib/services/inventory/category.service'
import { UnitOfMeasureService } from '@/lib/services/inventory/unit-of-measure.service'
import { ItemService } from '@/lib/services/inventory/item.service'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { MovementType, ItemType } from "@prisma/client"
import { prisma } from '@/lib/db/prisma'

describe('Stock Movement Service', () => {
  let stockMovementService: StockMovementService
  let categoryService: CategoryService
  let unitService: UnitOfMeasureService
  let itemService: ItemService
  let coaService: ChartOfAccountsService
  let testUserId: string
  let testCategoryId: string
  let testUnitId: string
  let testItemId: string
  let inventoryAccountId: string
  let cogsAccountId: string

  beforeEach(async () => {
    stockMovementService = new StockMovementService()
    categoryService = new CategoryService()
    unitService = new UnitOfMeasureService()
    itemService = new ItemService()
    coaService = new ChartOfAccountsService()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create test category
    const category = await categoryService.createCategory({
      code: 'ELECTRONICS',
      name: 'Electronics',
      createdBy: testUserId
    })
    testCategoryId = category.id

    // Create test unit of measure
    const unit = await unitService.createUnitOfMeasure({
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
      isBaseUnit: true,
      createdBy: testUserId
    })
    testUnitId = unit.id

    // Create GL accounts
    const inventoryAccount = await coaService.createAccount({
      code: '1300',
      name: 'Inventory',
      type: 'ASSET',
      description: 'Inventory Asset',
      createdBy: testUserId
    })
    inventoryAccountId = inventoryAccount.id

    const cogsAccount = await coaService.createAccount({
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'EXPENSE',
      description: 'COGS Expense',
      createdBy: testUserId
    })
    cogsAccountId = cogsAccount.id

    // Create test item
    const item = await itemService.createItem({
      code: 'PHONE-001',
      name: 'Smartphone',
      description: 'Test smartphone',
      categoryId: testCategoryId,
      type: ItemType.PRODUCT,
      unitOfMeasureId: testUnitId,
      trackInventory: true,
      standardCost: 500,
      listPrice: 800,
      inventoryAccountId,
      cogsAccountId,
      minStockLevel: 10,
      reorderPoint: 20,
      createdBy: testUserId
    })
    testItemId = item.id
  })

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.auditLog.deleteMany()
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.stockMovement.deleteMany()
    await prisma.stockLot.deleteMany()
    await prisma.item.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unitOfMeasure.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Stock In Operations', () => {
    it('should create stock in movement with new lot', async () => {
      const movementData = {
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date(),
        quantity: 100,
        unitCost: 450,
        referenceType: 'PURCHASE',
        referenceNumber: 'PO-001',
        notes: 'Initial stock purchase',
        autoCreateLot: true,
        lotNumber: 'LOT-001',
        supplier: 'Test Supplier',
        createdBy: testUserId
      }

      const movement = await stockMovementService.createStockMovement(movementData)

      expect(movement).toBeDefined()
      expect(movement.movementNumber).toMatch(/^SIN-\d{4}$/)
      expect(movement.quantity).toBe(100)
      expect(movement.unitCost).toBe(450)
      expect(movement.totalCost).toBe(45000)
      expect(movement.stockLot).toBeDefined()
      expect(movement.stockLot?.lotNumber).toBe('LOT-001')
      expect(movement.stockLot?.receivedQty).toBe(100)
      expect(movement.stockLot?.availableQty).toBe(100)
      expect(movement.stockLot?.unitCost).toBe(450)
    })

    it('should use standard cost when unit cost not provided', async () => {
      const movement = await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date(),
        quantity: 50,
        autoCreateLot: true,
        createdBy: testUserId
      })

      expect(movement.unitCost).toBe(500) // Standard cost from item
      expect(movement.totalCost).toBe(25000)
    })

    it('should create opening stock', async () => {
      const movement = await stockMovementService.createOpeningStock(
        testItemId,
        200,
        400,
        new Date('2024-01-01'),
        testUserId,
        'OPEN-001'
      )

      expect(movement.movementType).toBe(MovementType.OPENING)
      expect(movement.quantity).toBe(200)
      expect(movement.unitCost).toBe(400)
      expect(movement.stockLot?.lotNumber).toBe('OPEN-001')
      expect(movement.referenceType).toBe('OPENING')
    })

    it('should prevent duplicate opening stock', async () => {
      await stockMovementService.createOpeningStock(
        testItemId,
        100,
        400,
        new Date('2024-01-01'),
        testUserId
      )

      await expect(
        stockMovementService.createOpeningStock(
          testItemId,
          50,
          400,
          new Date('2024-01-01'),
          testUserId
        )
      ).rejects.toThrow('Opening stock already exists for this item')
    })
  })

  describe('Stock Out Operations', () => {
    beforeEach(async () => {
      // Create initial stock lots for testing FIFO
      await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date('2024-01-01'),
        quantity: 100,
        unitCost: 400,
        autoCreateLot: true,
        lotNumber: 'LOT-001',
        createdBy: testUserId
      })

      await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date('2024-01-02'),
        quantity: 150,
        unitCost: 450,
        autoCreateLot: true,
        lotNumber: 'LOT-002',
        createdBy: testUserId
      })

      await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date('2024-01-03'),
        quantity: 200,
        unitCost: 500,
        autoCreateLot: true,
        lotNumber: 'LOT-003',
        createdBy: testUserId
      })
    })

    it('should create stock out movement using FIFO', async () => {
      const movement = await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_OUT,
        movementDate: new Date(),
        quantity: 120,
        referenceType: 'SALE',
        referenceNumber: 'SO-001',
        createdBy: testUserId
      })

      expect(movement).toBeDefined()
      expect(movement.movementNumber).toMatch(/^SOUT-\d{4}$/)
      expect(movement.quantity).toBe(-120) // Negative for stock out
      expect(movement.unitCost).toBeCloseTo(408.33, 2) // Weighted average: (100*400 + 20*450) / 120

      // Check available stock after movement
      const availableStock = await stockMovementService.getAvailableStock(testItemId)
      expect(availableStock).toBe(330) // 450 - 120 = 330
    })

    it('should prevent stock out when insufficient stock', async () => {
      await expect(
        stockMovementService.createStockMovement({
          itemId: testItemId,
          movementType: MovementType.STOCK_OUT,
          movementDate: new Date(),
          quantity: 500, // More than available (450)
          createdBy: testUserId
        })
      ).rejects.toThrow('Insufficient stock')
    })

    it('should calculate correct FIFO allocation', async () => {
      const fifoResult = await stockMovementService.allocateFIFO(testItemId, 180)

      expect(fifoResult.totalQuantityAllocated).toBe(180)
      expect(fifoResult.insufficientStock).toBe(false)
      expect(fifoResult.allocations).toHaveLength(2)
      
      // First allocation - entire LOT-001
      expect(fifoResult.allocations[0].quantityUsed).toBe(100)
      expect(fifoResult.allocations[0].unitCost).toBe(400)
      expect(fifoResult.allocations[0].totalCost).toBe(40000)
      
      // Second allocation - partial LOT-002
      expect(fifoResult.allocations[1].quantityUsed).toBe(80)
      expect(fifoResult.allocations[1].unitCost).toBe(450)
      expect(fifoResult.allocations[1].totalCost).toBe(36000)

      // Check average cost
      expect(fifoResult.averageCost).toBeCloseTo(422.22, 2) // (40000 + 36000) / 180
    })

    it('should handle insufficient stock in FIFO allocation', async () => {
      const fifoResult = await stockMovementService.allocateFIFO(testItemId, 500)

      expect(fifoResult.totalQuantityAllocated).toBe(450) // All available stock
      expect(fifoResult.insufficientStock).toBe(true)
      expect(fifoResult.shortfallQuantity).toBe(50)
      expect(fifoResult.allocations).toHaveLength(3) // All three lots
    })
  })

  describe('Stock Adjustments', () => {
    beforeEach(async () => {
      // Create initial stock
      await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date(),
        quantity: 100,
        unitCost: 400,
        autoCreateLot: true,
        createdBy: testUserId
      })
    })

    it('should create positive stock adjustment', async () => {
      const adjustment = await stockMovementService.adjustStock(
        testItemId,
        25,
        'Stock count correction - found extra units',
        testUserId,
        400
      )

      expect(adjustment.movementType).toBe(MovementType.ADJUSTMENT)
      expect(adjustment.quantity).toBe(25)
      expect(adjustment.notes).toBe('Stock count correction - found extra units')
      expect(adjustment.referenceType).toBe('ADJUSTMENT')

      const availableStock = await stockMovementService.getAvailableStock(testItemId)
      expect(availableStock).toBe(125) // 100 + 25
    })

    it('should create negative stock adjustment', async () => {
      const adjustment = await stockMovementService.adjustStock(
        testItemId,
        -10,
        'Stock damaged during handling',
        testUserId
      )

      expect(adjustment.movementType).toBe(MovementType.ADJUSTMENT)
      expect(adjustment.quantity).toBe(-10) // Stored with correct sign for negative adjustment
      expect(adjustment.notes).toBe('Stock damaged during handling')

      const availableStock = await stockMovementService.getAvailableStock(testItemId)
      expect(availableStock).toBe(90) // 100 - 10
    })

    it('should prevent zero adjustment', async () => {
      await expect(
        stockMovementService.adjustStock(testItemId, 0, 'No adjustment', testUserId)
      ).rejects.toThrow('Adjustment quantity cannot be zero')
    })
  })

  describe('Stock Queries and Reports', () => {
    beforeEach(async () => {
      // Create various stock movements for testing
      await stockMovementService.createOpeningStock(
        testItemId,
        50,
        350,
        new Date('2024-01-01'),
        testUserId
      )

      await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date('2024-01-05'),
        quantity: 100,
        unitCost: 400,
        autoCreateLot: true,
        createdBy: testUserId
      })

      await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_OUT,
        movementDate: new Date('2024-01-10'),
        quantity: 30,
        createdBy: testUserId
      })
    })

    it('should get available stock correctly', async () => {
      const availableStock = await stockMovementService.getAvailableStock(testItemId)
      expect(availableStock).toBe(120) // 50 + 100 - 30
    })

    it('should calculate stock value correctly', async () => {
      const stockValue = await stockMovementService.getStockValue(testItemId)
      // Remaining: 20 units at 350 (from opening) + 100 units at 400 (from purchase)
      // = 20 * 350 + 100 * 400 = 7000 + 40000 = 47000
      expect(stockValue).toBe(47000)
    })

    it('should get item stock history', async () => {
      const history = await stockMovementService.getItemStockHistory(testItemId)

      expect(history).toHaveLength(3)
      expect(history[0].movementType).toBe(MovementType.STOCK_OUT) // Most recent first
      expect(history[1].movementType).toBe(MovementType.STOCK_IN)
      expect(history[2].movementType).toBe(MovementType.OPENING)
    })

    it('should filter stock history by date range', async () => {
      const history = await stockMovementService.getItemStockHistory(testItemId, {
        dateFrom: new Date('2024-01-05'),
        dateTo: new Date('2024-01-15')
      })

      expect(history).toHaveLength(2) // STOCK_IN and STOCK_OUT only
      expect(history.every(h => h.movementDate >= new Date('2024-01-05'))).toBe(true)
    })

    it('should filter stock history by movement type', async () => {
      const inboundHistory = await stockMovementService.getItemStockHistory(testItemId, {
        movementType: MovementType.STOCK_IN
      })

      expect(inboundHistory).toHaveLength(1)
      expect(inboundHistory[0].movementType).toBe(MovementType.STOCK_IN)
    })

    it('should get stock lots with details', async () => {
      const stockLots = await stockMovementService.getStockLots(testItemId, {
        isActive: true,
        hasStock: true
      })

      expect(stockLots.length).toBeGreaterThan(0)
      expect(stockLots.every(lot => lot.isActive)).toBe(true)
      expect(stockLots.every(lot => lot.availableQty > 0)).toBe(true)
    })
  })

  describe('Business Validations', () => {
    it('should validate item exists', async () => {
      await expect(
        stockMovementService.createStockMovement({
          itemId: 'non-existent-id',
          movementType: MovementType.STOCK_IN,
          movementDate: new Date(),
          quantity: 10,
          createdBy: testUserId
        })
      ).rejects.toThrow('Item not found')
    })

    it('should validate item tracks inventory', async () => {
      // Create service item (non-trackable)
      const serviceItem = await itemService.createItem({
        code: 'SERV-001',
        name: 'Consulting Service',
        categoryId: testCategoryId,
        type: ItemType.SERVICE,
        unitOfMeasureId: testUnitId,
        trackInventory: false,
        createdBy: testUserId
      })

      await expect(
        stockMovementService.createStockMovement({
          itemId: serviceItem.id,
          movementType: MovementType.STOCK_IN,
          movementDate: new Date(),
          quantity: 10,
          createdBy: testUserId
        })
      ).rejects.toThrow('Item does not track inventory')
    })

    it('should validate unit of measure exists', async () => {
      await expect(
        stockMovementService.createStockMovement({
          itemId: testItemId,
          movementType: MovementType.STOCK_IN,
          movementDate: new Date(),
          quantity: 10,
          unitOfMeasureId: 'non-existent-uom',
          createdBy: testUserId
        })
      ).rejects.toThrow('Unit of measure not found')
    })

    it('should validate opening stock parameters', async () => {
      await expect(
        stockMovementService.createOpeningStock(
          testItemId,
          -10, // Negative quantity
          400,
          new Date(),
          testUserId
        )
      ).rejects.toThrow('Opening stock quantity must be positive')

      await expect(
        stockMovementService.createOpeningStock(
          testItemId,
          10,
          -400, // Negative cost
          new Date(),
          testUserId
        )
      ).rejects.toThrow('Opening stock unit cost cannot be negative')
    })
  })

  describe('Number Generation', () => {
    it('should generate sequential movement numbers', async () => {
      const movement1 = await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date(),
        quantity: 10,
        createdBy: testUserId
      })

      const movement2 = await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date(),
        quantity: 20,
        createdBy: testUserId
      })

      expect(movement1.movementNumber).toBe('SIN-0001')
      expect(movement2.movementNumber).toBe('SIN-0002')
    })

    it('should use different prefixes for different movement types', async () => {
      // Create stock first
      await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date(),
        quantity: 100,
        createdBy: testUserId
      })

      const outMovement = await stockMovementService.createStockMovement({
        itemId: testItemId,
        movementType: MovementType.STOCK_OUT,
        movementDate: new Date(),
        quantity: 10,
        createdBy: testUserId
      })

      const adjustment = await stockMovementService.adjustStock(
        testItemId,
        5,
        'Test adjustment',
        testUserId
      )

      expect(outMovement.movementNumber).toBe('SOUT-0001')
      expect(adjustment.movementNumber).toBe('ADJ-0001')
    })
  })
})