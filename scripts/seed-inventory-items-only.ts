import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function generateItemCode(prefix: string): string {
  const random = Math.floor(Math.random() * 10000)
  return `${prefix}-${random.toString().padStart(4, '0')}`
}

async function main(): Promise<void> {
  console.warn('🌱 Starting inventory items seeding...')

  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' }
        ]
      }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed-admin.ts first.')
    }

    console.warn('✅ Found admin user:', adminUser.email)

    // Get existing units of measure
    const piece = await prisma.unitOfMeasure.findFirst({
      where: { code: 'PCS' }
    })
    const kilogram = await prisma.unitOfMeasure.findFirst({
      where: { code: 'KG' }
    })
    const meter = await prisma.unitOfMeasure.findFirst({
      where: { code: 'M' }
    })

    if (!piece || !kilogram || !meter) {
      throw new Error('Required units of measure not found')
    }

    // Create categories
    console.warn('\n📁 Creating categories...')
    
    const electronics = await prisma.category.upsert({
      where: { code: 'ELEC' },
      update: {},
      create: {
        code: 'ELEC',
        name: 'Electronics',
        description: 'Electronic components and devices',
        createdBy: adminUser.id
      }
    })

    const rawMaterials = await prisma.category.upsert({
      where: { code: 'RAW' },
      update: {},
      create: {
        code: 'RAW',
        name: 'Raw Materials',
        description: 'Raw materials for production',
        createdBy: adminUser.id
      }
    })

    const packaging = await prisma.category.upsert({
      where: { code: 'PACK' },
      update: {},
      create: {
        code: 'PACK',
        name: 'Packaging',
        description: 'Packaging materials',
        createdBy: adminUser.id
      }
    })

    console.warn('✅ Created categories')

    // Get GL accounts (create if they don't exist)
    let inventoryAccount = await prisma.account.findFirst({
      where: { code: 'INV-1000' }
    })
    
    if (!inventoryAccount) {
      inventoryAccount = await prisma.account.create({
        data: {
          code: 'INV-1000',
          name: 'Inventory - General',
          type: 'ASSET',
          currency: 'USD',
          createdBy: adminUser.id
        }
      })
    }

    let cogsAccount = await prisma.account.findFirst({
      where: { code: 'COGS-5000' }
    })
    
    if (!cogsAccount) {
      cogsAccount = await prisma.account.create({
        data: {
          code: 'COGS-5000',
          name: 'Cost of Goods Sold',
          type: 'EXPENSE',
          currency: 'USD',
          createdBy: adminUser.id
        }
      })
    }

    // Create inventory items
    console.warn('\n📦 Creating inventory items...')
    
    const items = []

    // Check if any items already exist
    const existingItemsCount = await prisma.item.count()
    if (existingItemsCount > 0) {
      console.warn(`⚠️  Found ${existingItemsCount} existing items. Skipping item creation to avoid duplicates.`)
      console.warn('✅ Inventory items seeding completed (items already exist)!')
      return
    }

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

    console.warn(`✅ Created ${items.length} inventory items`)

    // Display summary
    console.warn('\n📊 Seeding Summary:')
    console.warn('====================')
    console.warn('Categories: 3 created (Electronics, Raw Materials, Packaging)')
    console.warn('Items: 5 created')
    console.warn('  - Business Laptop')
    console.warn('  - 24" LED Monitor')
    console.warn('  - Steel Sheet 2mm')
    console.warn('  - Copper Wire 2.5mm²')
    console.warn('  - Cardboard Box Medium')
    
    console.warn('\n✅ Inventory items seeding completed successfully!')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })