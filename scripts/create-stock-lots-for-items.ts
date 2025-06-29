import { prisma } from '@/lib/db/prisma'

async function createStockLotsForItems() {
  console.log('📦 Creating Stock Lots for Items\n')
  
  try {
    const user = await prisma.user.findFirst()
    if (!user) throw new Error('No user found')
    
    // Get company settings
    const companySettings = await prisma.companySettings.findFirst()
    const baseCurrency = companySettings?.defaultCurrency || 'AED'
    console.log(`Base Currency: ${baseCurrency}\n`)
    
    // Get items that don't have stock lots
    const itemsWithoutLots = await prisma.item.findMany({
      where: {
        trackInventory: true,
        isSaleable: true,
        standardCost: { gt: 0 }
      }
    })
    
    console.log(`Found ${itemsWithoutLots.length} items to check for stock lots\n`)
    
    let lotsCreated = 0
    
    for (const item of itemsWithoutLots) {
      // Check if item already has stock lots
      const existingLots = await prisma.stockLot.count({
        where: { itemId: item.id }
      })
      
      if (existingLots === 0) {
        // Create a stock lot with initial quantity
        const lot = await prisma.stockLot.create({
          data: {
            lotNumber: `${item.code}-${Date.now()}`,
            itemId: item.id,
            receivedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            supplierName: 'Initial Stock',
            receivedQty: 100,
            availableQty: 100,
            reservedQty: 0,
            unitCost: item.standardCost, // Use standard cost in AED
            totalCost: item.standardCost * 100,
            isActive: true,
            createdBy: user.id
          }
        })
        
        console.log(`✅ Created lot for ${item.name}: 100 units @ ${item.standardCost} ${baseCurrency}`)
        lotsCreated++
        
        // Create stock-in movement for audit trail
        await prisma.stockMovement.create({
          data: {
            movementNumber: `SIN-${Date.now()}`,
            itemId: item.id,
            stockLotId: lot.id,
            movementType: 'STOCK_IN',
            movementDate: lot.receivedDate,
            quantity: 100,
            unitCost: item.standardCost,
            totalCost: item.standardCost * 100,
            unitOfMeasureId: item.unitOfMeasureId,
            referenceType: 'INITIAL',
            referenceNumber: lot.lotNumber,
            notes: 'Initial stock lot creation',
            createdBy: user.id
          }
        })
      }
    }
    
    console.log(`\n✅ Created ${lotsCreated} new stock lots`)
    
    // Now fix existing stock movements with 0 cost
    console.log('\n🔧 Fixing Stock Movements with 0 Cost...')
    
    const zeroMovements = await prisma.stockMovement.findMany({
      where: {
        unitCost: 0,
        movementType: { in: ['SALE', 'STOCK_OUT'] }
      },
      include: {
        item: true
      }
    })
    
    console.log(`Found ${zeroMovements.length} movements with 0 cost\n`)
    
    for (const movement of zeroMovements) {
      // Get FIFO cost for this item at the movement date
      const lots = await prisma.stockLot.findMany({
        where: {
          itemId: movement.itemId,
          receivedDate: { lte: movement.movementDate }
        },
        orderBy: {
          receivedDate: 'asc'
        }
      })
      
      if (lots.length > 0) {
        // Use the first lot's cost (FIFO)
        const unitCost = lots[0].unitCost
        const totalCost = Math.abs(movement.quantity) * unitCost
        
        await prisma.stockMovement.update({
          where: { id: movement.id },
          data: {
            unitCost,
            totalCost
          }
        })
        
        console.log(`✅ Updated ${movement.item.name}: ${Math.abs(movement.quantity)} @ ${unitCost} = ${totalCost} ${baseCurrency}`)
      } else {
        // Use standard cost if no lots available
        const unitCost = movement.item.standardCost
        const totalCost = Math.abs(movement.quantity) * unitCost
        
        if (unitCost > 0) {
          await prisma.stockMovement.update({
            where: { id: movement.id },
            data: {
              unitCost,
              totalCost
            }
          })
          
          console.log(`✅ Updated ${movement.item.name} (std cost): ${Math.abs(movement.quantity)} @ ${unitCost} = ${totalCost} ${baseCurrency}`)
        }
      }
    }
    
    console.log('\n✅ Stock lots and movements fixed successfully')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createStockLotsForItems()