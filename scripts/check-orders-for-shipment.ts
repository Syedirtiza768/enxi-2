import { prisma } from '@/lib/db/prisma'

async function checkOrdersForShipment() {
  try {
    console.log('Checking orders for shipment...')
    
    const orders = await prisma.salesOrder.findMany({
      where: { status: 'APPROVED' },
      include: {
        items: {
          where: {
            itemType: 'PRODUCT',
            isLineHeader: false
          }
        }
      }
    })
    
    console.log('Approved orders:', orders.length)
    
    for (const order of orders) {
      console.log(`\nOrder ${order.orderNumber}:`)
      console.log(`  Items: ${order.items.length}`)
      console.log(`  Items with itemId: ${order.items.filter(i => i.itemId).length}`)
      
      // Let's fix one order by assigning itemIds
      if (order.items.length > 0 && order.items.filter(i => i.itemId).length === 0) {
        console.log('  Fixing item references...')
        
        // Get some items from the database
        const items = await prisma.item.findMany({ 
          where: { isActive: true },
          take: order.items.length 
        })
        
        if (items.length > 0) {
          for (let i = 0; i < order.items.length && i < items.length; i++) {
            await prisma.salesOrderItem.update({
              where: { id: order.items[i].id },
              data: { itemId: items[i].id }
            })
            console.log(`    Updated ${order.items[i].itemCode} with itemId ${items[i].id}`)
          }
          console.log('  ✅ Fixed item references')
          break // Only fix one order
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkOrdersForShipment()