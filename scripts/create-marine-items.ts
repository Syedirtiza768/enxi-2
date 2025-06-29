import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

const MARINE_ITEMS = [
  // Engine Parts
  { name: 'Marine Diesel Engine - CAT 3512C', category: 'Engines', price: 450000, type: 'PRODUCT' },
  { name: 'Turbocharger Assembly', category: 'Engine Parts', price: 25000, type: 'PRODUCT' },
  { name: 'Fuel Injection Pump', category: 'Engine Parts', price: 8500, type: 'PRODUCT' },
  { name: 'Cylinder Head Complete', category: 'Engine Parts', price: 15000, type: 'PRODUCT' },
  { name: 'Crankshaft Assembly', category: 'Engine Parts', price: 35000, type: 'PRODUCT' },
  
  // Maintenance Services
  { name: 'Engine Overhaul Service', category: 'Services', price: 75000, type: 'SERVICE' },
  { name: 'Annual Maintenance Contract', category: 'Services', price: 120000, type: 'SERVICE' },
  { name: 'Emergency Repair Service', category: 'Services', price: 15000, type: 'SERVICE' },
  { name: 'Oil Analysis Service', category: 'Services', price: 1500, type: 'SERVICE' },
  
  // Spare Parts
  { name: 'Oil Filter Set', category: 'Consumables', price: 450, type: 'PRODUCT' },
  { name: 'Air Filter Element', category: 'Consumables', price: 350, type: 'PRODUCT' },
  { name: 'Coolant Additive Package', category: 'Consumables', price: 250, type: 'PRODUCT' },
  { name: 'Gasket Kit Complete', category: 'Spare Parts', price: 2500, type: 'PRODUCT' },
  { name: 'Bearing Set', category: 'Spare Parts', price: 5500, type: 'PRODUCT' },
  { name: 'Piston Ring Set', category: 'Spare Parts', price: 3500, type: 'PRODUCT' },
]

async function createMarineItems() {
  console.log('🔧 Creating marine items and services...')
  
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
    const createdBy = admin?.id || 'system'
    
    // Get required accounts
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { name: 'Inventory' },
          { name: 'Cost of Goods Sold' },
          { name: 'Sales Revenue' }
        ]
      }
    })
    
    const inventoryAccount = accounts.find(a => a.name === 'Inventory')
    const cogsAccount = accounts.find(a => a.name === 'Cost of Goods Sold')
    const salesAccount = accounts.find(a => a.name === 'Sales Revenue')
    
    if (!inventoryAccount || !cogsAccount || !salesAccount) {
      throw new Error('Required accounts not found')
    }
    
    // Get or create units
    let pcsUnit = await prisma.unitOfMeasure.findFirst({ where: { code: 'PCS' } })
    if (!pcsUnit) {
      pcsUnit = await prisma.unitOfMeasure.create({
        data: { code: 'PCS', name: 'Pieces', symbol: 'pcs', isBaseUnit: true, createdBy }
      })
    }
    
    let hrUnit = await prisma.unitOfMeasure.findFirst({ where: { code: 'HR' } })
    if (!hrUnit) {
      hrUnit = await prisma.unitOfMeasure.create({
        data: { code: 'HR', name: 'Hour', symbol: 'hr', isBaseUnit: true, createdBy }
      })
    }
    
    // Get or create categories
    const categoryMap: Record<string, string> = {}
    const categories = ['Engines', 'Engine Parts', 'Services', 'Consumables', 'Spare Parts']
    
    for (const categoryName of categories) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName }
      })
      
      if (!category) {
        category = await prisma.category.create({
          data: {
            code: categoryName.toUpperCase().replace(/\s+/g, '_'),
            name: categoryName,
            description: `${categoryName} for marine engines`,
            createdBy
          }
        })
      }
      
      categoryMap[categoryName] = category.id
    }
    
    // Create items
    let itemCount = 0
    for (const [index, itemData] of MARINE_ITEMS.entries()) {
      const code = `MAR-${itemData.category.substring(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
      
      const existing = await prisma.item.findUnique({
        where: { code }
      })
      
      if (!existing) {
        await prisma.item.create({
          data: {
            code,
            name: itemData.name,
            description: `Professional grade ${itemData.name.toLowerCase()} for marine engines`,
            type: itemData.type,
            categoryId: categoryMap[itemData.category],
            unitOfMeasureId: itemData.type === 'SERVICE' ? hrUnit.id : pcsUnit.id,
            standardCost: itemData.price * 0.6,
            listPrice: itemData.price,
            inventoryAccountId: inventoryAccount.id,
            cogsAccountId: cogsAccount.id,
            salesAccountId: salesAccount.id,
            trackInventory: itemData.type === 'PRODUCT',
            isActive: true,
            createdBy
          }
        })
        itemCount++
        console.log(`   ✅ Created: ${code} - ${itemData.name}`)
      }
    }
    
    console.log(`\n✅ Created ${itemCount} marine items`)
    
    // Show all items
    const allItems = await prisma.item.findMany({
      where: { code: { startsWith: 'MAR-' } },
      select: { code: true, name: true, listPrice: true, type: true }
    })
    
    console.log('\n📊 Marine items in database:')
    allItems.forEach(item => {
      console.log(`   ${item.code}: ${item.name} - AED ${item.listPrice.toLocaleString()} (${item.type})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMarineItems().catch(console.error)