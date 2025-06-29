import { prisma } from '@/lib/db/prisma'

async function debugStockMovementsFIFO() {
  console.log('🔍 Debugging Stock Movements and FIFO Costs\n')
  
  try {
    // 1. Check if we have stock lots with costs
    console.log('📦 STOCK LOTS CHECK:')
    const stockLots = await prisma.stockLot.findMany({
      where: {
        availableQty: { gt: 0 }
      },
      include: {
        item: true
      },
      take: 10
    })
    
    if (stockLots.length === 0) {
      console.log('   ❌ No stock lots with available quantity found')
    } else {
      stockLots.forEach(lot => {
        console.log(`   ${lot.lotNumber}:`)
        console.log(`     Item: ${lot.item.name}`)
        console.log(`     Available: ${lot.availableQty}`)
        console.log(`     Unit Cost: ${lot.unitCost} AED`)
        console.log(`     Total Cost: ${lot.totalCost} AED`)
        console.log('   ---')
      })
    }
    
    // 2. Check a delivered shipment and its items
    console.log('\n🚚 DELIVERED SHIPMENT CHECK:')
    const shipment = await prisma.shipment.findFirst({
      where: {
        status: 'DELIVERED'
      },
      include: {
        items: {
          include: {
            item: true
          }
        },
        salesOrder: true
      }
    })
    
    if (shipment) {
      console.log(`   Shipment: ${shipment.shipmentNumber}`)
      console.log(`   Sales Order: ${shipment.salesOrder?.orderNumber}`)
      console.log(`   Items:`)
      
      for (const shipItem of shipment.items) {
        console.log(`     ${shipItem.item.name}: ${shipItem.quantity} units`)
        
        // Check if stock lot exists for this item
        const itemLots = await prisma.stockLot.findMany({
          where: {
            itemId: shipItem.itemId,
            availableQty: { gt: 0 }
          },
          orderBy: {
            receivedDate: 'asc' // FIFO order
          }
        })
        
        if (itemLots.length > 0) {
          console.log(`       Available lots: ${itemLots.length}`)
          console.log(`       First lot cost: ${itemLots[0].unitCost} AED`)
        } else {
          console.log(`       ⚠️  No available stock lots for this item`)
        }
      }
      
      // Check stock movements for this shipment
      console.log(`\n   Stock Movements for this shipment:`)
      const movements = await prisma.stockMovement.findMany({
        where: {
          referenceType: 'SHIPMENT',
          referenceId: shipment.id
        },
        include: {
          item: true
        }
      })
      
      if (movements.length === 0) {
        console.log('     ❌ No stock movements found')
      } else {
        movements.forEach(mov => {
          console.log(`     ${mov.item.name}: ${mov.quantity} @ ${mov.unitCost} = ${mov.totalCost} AED`)
        })
      }
    }
    
    // 3. Check if items have standard costs
    console.log('\n💰 ITEM STANDARD COSTS CHECK:')
    const items = await prisma.item.findMany({
      where: {
        id: {
          in: shipment?.items.map(i => i.itemId) || []
        }
      }
    })
    
    items.forEach(item => {
      console.log(`   ${item.code} - ${item.name}:`)
      console.log(`     Standard Cost: ${item.standardCost} AED`)
      console.log(`     List Price: ${item.listPrice} AED`)
    })
    
    // 4. Test FIFO calculation manually
    console.log('\n🧮 MANUAL FIFO CALCULATION TEST:')
    
    if (shipment && shipment.items.length > 0) {
      const testItem = shipment.items[0]
      console.log(`   Testing FIFO for: ${testItem.item.name}`)
      console.log(`   Quantity needed: ${testItem.quantity}`)
      
      // Get available lots in FIFO order
      const lots = await prisma.stockLot.findMany({
        where: {
          itemId: testItem.itemId
        },
        orderBy: {
          receivedDate: 'asc'
        }
      })
      
      let remainingQty = testItem.quantity
      let totalCost = 0
      
      console.log(`\n   FIFO Calculation:`)
      for (const lot of lots) {
        if (remainingQty <= 0) break
        
        const availableInLot = lot.availableQty
        const qtyFromLot = Math.min(remainingQty, availableInLot)
        
        if (qtyFromLot > 0) {
          const costFromLot = qtyFromLot * lot.unitCost
          totalCost += costFromLot
          
          console.log(`     From ${lot.lotNumber}: ${qtyFromLot} @ ${lot.unitCost} = ${costFromLot} AED`)
          
          remainingQty -= qtyFromLot
        }
      }
      
      if (remainingQty > 0) {
        console.log(`     ⚠️  Not enough stock! Need ${remainingQty} more units`)
        
        // Use standard cost for remaining
        const item = testItem.item
        const remainingCost = remainingQty * item.standardCost
        totalCost += remainingCost
        console.log(`     Using standard cost: ${remainingQty} @ ${item.standardCost} = ${remainingCost} AED`)
      }
      
      console.log(`\n   Total FIFO Cost: ${totalCost} AED`)
      console.log(`   Unit Cost: ${testItem.quantity > 0 ? (totalCost / testItem.quantity).toFixed(2) : 0} AED`)
    }
    
    console.log('\n✅ Debug completed')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugStockMovementsFIFO()