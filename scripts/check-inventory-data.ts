import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking inventory data...\n')
  
  // Check units of measure first
  const units = await prisma.unitOfMeasure.findMany()
  console.log(`Total units of measure: ${units.length}`)
  if (units.length > 0) {
    console.log('Units of measure:')
    for (const unit of units) {
      console.log(`- ${unit.name} (${unit.code}): ${unit.symbol}`)
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
  
  console.log(`Total items: ${items.length}`)
  if (items.length > 0) {
    console.log('Items:')
    for (const item of items) {
      console.log(`- ${item.name} (${item.code})`)
      console.log(`  Category: ${item.category.name}`)
      console.log(`  UoM: ${item.unitOfMeasure.name}`)
      console.log(`  Stock movements: ${item._count.stockMovements}`)
      console.log(`  Stock lots: ${item._count.stockLots}`)
      console.log(`  Track inventory: ${item.trackInventory}`)
      console.log(`  Current cost: $${item.standardCost}`)
      console.log(`  List price: $${item.listPrice}`)
      console.log('')
    }
  }
  
  // Check stock lots
  const lots = await prisma.stockLot.findMany({
    include: {
      item: true
    }
  })
  console.log(`Total stock lots: ${lots.length}`)
  
  if (lots.length > 0) {
    console.log('\nStock lots:')
    for (const lot of lots) {
      console.log(`- Lot ${lot.lotNumber} for ${lot.item.name}`)
      console.log(`  Available: ${lot.availableQty} @ $${lot.unitCost}`)
      console.log(`  Total value: $${lot.totalCost}`)
    }
  }
  
  // Check stock movements
  const movements = await prisma.stockMovement.count()
  console.log(`\nTotal stock movements: ${movements}`)
  
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
  console.log(`\nTotal categories: ${categories.length}`)
  if (categories.length > 0) {
    console.log('Categories:')
    for (const cat of categories) {
      console.log(`- ${cat.name} (${cat.code}): ${cat._count.items} items, ${cat._count.children} children`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())