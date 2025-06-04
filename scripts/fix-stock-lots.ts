import { PrismaClient, MovementType } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing stock lots for opening movements...\n')
  
  // Get all OPENING movements without stock lots
  const openingMovements = await prisma.stockMovement.findMany({
    where: {
      movementType: MovementType.OPENING,
      stockLotId: null
    },
    include: {
      item: true
    }
  })
  
  console.log(`Found ${openingMovements.length} opening movements without stock lots`)
  
  for (const movement of openingMovements) {
    console.log(`\nProcessing ${movement.item.name}...`)
    
    // Create stock lot for the opening movement
    const stockLot = await prisma.stockLot.create({
      data: {
        lotNumber: `OPEN-${movement.item.code}-${Date.now()}`,
        itemId: movement.itemId,
        receivedDate: movement.movementDate,
        receivedQty: Math.abs(movement.quantity),
        availableQty: Math.abs(movement.quantity),
        reservedQty: 0,
        unitCost: movement.unitCost,
        totalCost: movement.totalCost,
        isActive: true,
        createdBy: movement.createdBy
      }
    })
    
    // Update the movement to link to the stock lot
    await prisma.stockMovement.update({
      where: { id: movement.id },
      data: { stockLotId: stockLot.id }
    })
    
    console.log(`✅ Created stock lot ${stockLot.lotNumber} with ${stockLot.availableQty} units`)
  }
  
  // Verify the fix
  console.log('\n📊 Verification:')
  const items = await prisma.item.findMany({
    where: { trackInventory: true },
    include: {
      _count: {
        select: {
          stockLots: true
        }
      }
    }
  })
  
  for (const item of items) {
    const stockLots = await prisma.stockLot.findMany({
      where: { itemId: item.id, isActive: true }
    })
    const totalStock = stockLots.reduce((sum, lot) => sum + lot.availableQty, 0)
    console.log(`- ${item.name}: ${item._count.stockLots} lots, Total stock: ${totalStock}`)
  }
  
  console.log('\n✅ Stock lots fixed successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())