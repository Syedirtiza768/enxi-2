import { PrismaClient, MovementType } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

function generateItemCode(prefix: string): string {
  const random = Math.floor(Math.random() * 10000)
  return `${prefix}-${random.toString().padStart(4, '0')}`
}

function generateMovementNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `MOV-${timestamp}-${random}`
}

async function main() {
  console.log('🌱 Starting inventory demo seeding...')

  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed-admin.ts first.')
    }

    console.log('✅ Found admin user:', adminUser.email)

    // 1. Create units of measure
    console.log('\n📏 Creating units of measure...')
    
    const piece = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS',
        name: 'Pieces',
        symbol: 'pcs',
        isBaseUnit: true,
        createdBy: adminUser.id
      }
    })

    const kilogram = await prisma.unitOfMeasure.create({
      data: {
        code: 'KG',
        name: 'Kilogram',
        symbol: 'kg',
        isBaseUnit: true,
        createdBy: adminUser.id
      }
    })

    const meter = await prisma.unitOfMeasure.create({
      data: {
        code: 'M',
        name: 'Meter',
        symbol: 'm',
        isBaseUnit: true,
        createdBy: adminUser.id
      }
    })

    const box = await prisma.unitOfMeasure.create({
      data: {
        code: 'BOX',
        name: 'Box',
        symbol: 'box',
        baseUnitId: piece.id,
        conversionFactor: 12, // 1 box = 12 pieces
        createdBy: adminUser.id
      }
    })

    console.log('✅ Created units of measure')

    // 2. Create categories
    console.log('\n📁 Creating categories...')
    
    const electronics = await prisma.category.create({
      data: {
        code: 'ELEC',
        name: 'Electronics',
        description: 'Electronic components and devices',
        createdBy: adminUser.id
      }
    })

    const rawMaterials = await prisma.category.create({
      data: {
        code: 'RAW',
        name: 'Raw Materials',
        description: 'Raw materials for production',
        createdBy: adminUser.id
      }
    })

    const packaging = await prisma.category.create({
      data: {
        code: 'PACK',
        name: 'Packaging',
        description: 'Packaging materials',
        createdBy: adminUser.id
      }
    })

    console.log('✅ Created categories')

    // 3. Create GL accounts for inventory
    console.log('\n💰 Creating GL accounts...')
    
    const inventoryAccount = await prisma.account.create({
      data: {
        code: 'INV-1000',
        name: 'Inventory - General',
        type: 'ASSET',
        currency: 'USD',
        createdBy: adminUser.id
      }
    })

    const cogsAccount = await prisma.account.create({
      data: {
        code: 'COGS-5000',
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        currency: 'USD',
        createdBy: adminUser.id
      }
    })

    console.log('✅ Created GL accounts')

    // 4. Create inventory items
    console.log('\n📦 Creating inventory items...')
    
    const items = []

    // Electronics items
    const laptop = await prisma.item.create({
      data: {
        code: generateItemCode('LAPTOP'),
        name: 'Business Laptop - Core i7',
        description: 'High-performance business laptop with 16GB RAM, 512GB SSD',
        categoryId: electronics.id,
        type: 'PRODUCT',
        unitOfMeasureId: piece.id,
        trackInventory: true,
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderPoint: 10,
        standardCost: 800,
        listPrice: 1200,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        createdBy: adminUser.id
      }
    })
    items.push(laptop)

    const monitor = await prisma.item.create({
      data: {
        code: generateItemCode('MON'),
        name: '24" LED Monitor',
        description: 'Full HD 24-inch LED monitor with HDMI',
        categoryId: electronics.id,
        type: 'PRODUCT',
        unitOfMeasureId: piece.id,
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 20,
        standardCost: 150,
        listPrice: 250,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        createdBy: adminUser.id
      }
    })
    items.push(monitor)

    // Raw materials
    const steelSheet = await prisma.item.create({
      data: {
        code: generateItemCode('STEEL'),
        name: 'Steel Sheet 2mm',
        description: 'Cold rolled steel sheet, 2mm thickness',
        categoryId: rawMaterials.id,
        type: 'PRODUCT',
        unitOfMeasureId: kilogram.id,
        trackInventory: true,
        minStockLevel: 100,
        maxStockLevel: 1000,
        reorderPoint: 200,
        standardCost: 2.5,
        listPrice: 3.5,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        createdBy: adminUser.id
      }
    })
    items.push(steelSheet)

    const copperWire = await prisma.item.create({
      data: {
        code: generateItemCode('WIRE'),
        name: 'Copper Wire 2.5mm²',
        description: 'Electrical copper wire, 2.5mm² cross-section',
        categoryId: rawMaterials.id,
        type: 'PRODUCT',
        unitOfMeasureId: meter.id,
        trackInventory: true,
        minStockLevel: 500,
        maxStockLevel: 5000,
        reorderPoint: 1000,
        standardCost: 0.8,
        listPrice: 1.2,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        createdBy: adminUser.id
      }
    })
    items.push(copperWire)

    // Packaging materials
    const cardboardBox = await prisma.item.create({
      data: {
        code: generateItemCode('BOX'),
        name: 'Cardboard Box Medium',
        description: 'Medium size cardboard box (40x30x20 cm)',
        categoryId: packaging.id,
        type: 'PRODUCT',
        unitOfMeasureId: piece.id,
        trackInventory: true,
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 100,
        standardCost: 1.5,
        listPrice: 2.5,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        createdBy: adminUser.id
      }
    })
    items.push(cardboardBox)

    console.log(`✅ Created ${items.length} inventory items`)

    // 5. Create opening stock movements
    console.log('\n📊 Creating opening stock...')
    
    // Add opening stock for laptop
    await prisma.stockMovement.create({
      data: {
        movementNumber: generateMovementNumber(),
        itemId: laptop.id,
        movementType: MovementType.OPENING,
        movementDate: new Date(),
        quantity: 20,
        unitCost: 800,
        totalCost: 16000,
        unitOfMeasureId: laptop.unitOfMeasureId,
        notes: 'Opening stock balance',
        createdBy: adminUser.id
      }
    })

    // Add opening stock for monitor
    await prisma.stockMovement.create({
      data: {
        movementNumber: generateMovementNumber(),
        itemId: monitor.id,
        movementType: MovementType.OPENING,
        movementDate: new Date(),
        quantity: 35,
        unitCost: 150,
        totalCost: 5250,
        unitOfMeasureId: monitor.unitOfMeasureId,
        notes: 'Opening stock balance',
        createdBy: adminUser.id
      }
    })

    // Add opening stock for steel sheet
    await prisma.stockMovement.create({
      data: {
        movementNumber: generateMovementNumber(),
        itemId: steelSheet.id,
        movementType: MovementType.OPENING,
        movementDate: new Date(),
        quantity: 500,
        unitCost: 2.5,
        totalCost: 1250,
        unitOfMeasureId: steelSheet.unitOfMeasureId,
        notes: 'Opening stock balance',
        createdBy: adminUser.id
      }
    })

    // Add opening stock for copper wire
    await prisma.stockMovement.create({
      data: {
        movementNumber: generateMovementNumber(),
        itemId: copperWire.id,
        movementType: MovementType.OPENING,
        movementDate: new Date(),
        quantity: 2000,
        unitCost: 0.8,
        totalCost: 1600,
        unitOfMeasureId: copperWire.unitOfMeasureId,
        notes: 'Opening stock balance',
        createdBy: adminUser.id
      }
    })

    // Add opening stock for cardboard box
    await prisma.stockMovement.create({
      data: {
        movementNumber: generateMovementNumber(),
        itemId: cardboardBox.id,
        movementType: MovementType.OPENING,
        movementDate: new Date(),
        quantity: 200,
        unitCost: 1.5,
        totalCost: 300,
        unitOfMeasureId: cardboardBox.unitOfMeasureId,
        notes: 'Opening stock balance',
        createdBy: adminUser.id
      }
    })

    console.log('✅ Created opening stock movements')

    // Display summary
    console.log('\n📊 Demo Data Summary:')
    console.log('====================')
    console.log('1. Units of Measure: 4 units created (PCS, KG, M, BOX)')
    console.log('2. Categories: 3 categories (Electronics, Raw Materials, Packaging)')
    console.log('3. GL Accounts: Inventory and COGS accounts')
    console.log('4. Items: 5 items with different types')
    console.log('5. Opening Stock:')
    console.log('   - Business Laptop: 20 pcs @ $800')
    console.log('   - 24" LED Monitor: 35 pcs @ $150')
    console.log('   - Steel Sheet: 500 kg @ $2.50')
    console.log('   - Copper Wire: 2000 m @ $0.80')
    console.log('   - Cardboard Box: 200 pcs @ $1.50')
    
    console.log('\n✅ Inventory demo seeding completed successfully!')
    console.log('\nYou can now:')
    console.log('- View items at /inventory/items')
    console.log('- Record stock receipts at /inventory/stock-in')
    console.log('- Record stock issues at /inventory/stock-out')
    console.log('- Track all movements at /inventory/movements')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })