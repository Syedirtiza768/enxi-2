import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.warn('🔍 Checking inventory data...\n')
  
  // Check units of measure first
  const units = await prisma.unitOfMeasure.findMany()
  console.warn(`Total units of measure: ${units.length}`)
  if (units.length > 0) {
    console.warn('Units of measure:')
    for (const unit of units) {
      console.warn(`- ${unit.name} (${unit.code}): ${unit.symbol}`)
    }
  }
  
  // Check items
  const items = await prisma.item.findMany({
    include: {
      category: true,
      unitOfMeasure: true,
      _count: {
        select: {
          stockLots: true,
          stockMovements: true
        }
      }
    }
  })
  
  console.warn(`Total items: ${items.length}`)
  if (items.length > 0) {
    console.warn('Items:')
    for (const item of items) {
      console.warn(`- ${item.name} (${item.code})`)
      console.warn(`  Category: ${item.category.name}`)
      console.warn(`  UoM: ${item.unitOfMeasure.name}`)
      console.warn(`  Stock movements: ${item._count.stockMovements}`)
      console.warn(`  Stock lots: ${item._count.stockLots}`)
      console.warn(`  Track inventory: ${item.trackInventory}`)
      console.warn(`  Current cost: $${item.standardCost}`)
      console.warn(`  List price: $${item.listPrice}`)
      console.warn('')
    }
  }
  
  // Check stock lots
  const lots = await prisma.stockLot.findMany({
    include: {
      item: true
    }
  })
  console.warn(`Total stock lots: ${lots.length}`)
  
  if (lots.length > 0) {
    console.warn('\nStock lots:')
    for (const lot of lots) {
      console.warn(`- Lot ${lot.lotNumber} for ${lot.item.name}`)
      console.warn(`  Available: ${lot.availableQty} @ $${lot.unitCost}`)
      console.warn(`  Total value: $${lot.totalCost}`)
    }
  }
  
  // Check stock movements
  const movements = await prisma.stockMovement.count()
  console.warn(`\nTotal stock movements: ${movements}`)
  
  // Check categories
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          items: true,
          children: true
        }
      }
    }
  })
  console.warn(`\nTotal categories: ${categories.length}`)
  if (categories.length > 0) {
    console.warn('Categories:')
    for (const cat of categories) {
      console.warn(`- ${cat.name} (${cat.code}): ${cat._count.items} items, ${cat._count.children} children`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())