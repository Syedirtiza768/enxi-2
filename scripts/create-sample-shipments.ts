import { prisma } from '@/lib/db/prisma'

async function createSampleShipments() {
  try {
    console.log('Creating sample shipments...')
    
    // Get an approved sales order with items that have itemId
    const approvedOrder = await prisma.salesOrder.findFirst({
      where: { 
        status: 'APPROVED',
        items: {
          some: {
            itemId: { not: null },
            itemType: 'PRODUCT',
            isLineHeader: false
          }
        }
      },
      include: {
        items: true,
        salesCase: {
          include: { customer: true }
        }
      }
    })
    
    if (!approvedOrder) {
      console.log('No approved orders found to create shipments')
      return
    }
    
    console.log(`Found approved order: ${approvedOrder.orderNumber}`)
    console.log(`  - Customer: ${approvedOrder.salesCase?.customer?.name}`)
    console.log(`  - Items: ${approvedOrder.items.length}`)
    
    // Check if there are valid items to ship
    const validItems = approvedOrder.items.filter(item => !item.isLineHeader && item.itemType === 'PRODUCT' && item.itemId)
    console.log(`  - Valid items to ship: ${validItems.length}`)
    
    if (validItems.length === 0) {
      console.log('No valid items to ship in this order')
      return
    }
    
    // Generate shipment number
    const shipmentCount = await prisma.shipment.count()
    const shipmentNumber = `SHIP-${new Date().getFullYear()}-${String(shipmentCount + 1).padStart(5, '0')}`
    
    // Create a shipment
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber,
        salesOrderId: approvedOrder.id,
        status: 'PREPARING',
        shipmentDate: new Date(),
        carrier: 'DHL Express',
        trackingNumber: `DHL${Date.now()}`,
        shippingMethod: 'Express Delivery',
        shippingCost: 25.00,
        shipToAddress: approvedOrder.salesCase?.customer?.address || '123 Main St, Dubai, UAE',
        shipFromAddress: 'Warehouse A, Industrial Area, Dubai, UAE',
        notes: 'Sample shipment for testing',
        createdBy: 'system',
        items: {
          create: validItems.map(item => ({
            salesOrderItemId: item.id,
            itemId: item.itemId!,
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.quantity,
            quantityShipped: item.quantity,
            trackingDetails: 'In warehouse'
          }))
        }
      },
      include: {
        items: true,
        salesOrder: {
          include: {
            salesCase: {
              include: { customer: true }
            }
          }
        }
      }
    })
    
    console.log(`✅ Created shipment: ${shipment.shipmentNumber}`)
    console.log(`  - Status: ${shipment.status}`)
    console.log(`  - Items: ${shipment.items.length}`)
    console.log(`  - Customer: ${shipment.salesOrder?.salesCase?.customer?.name}`)
    
    // Create another shipment with different status
    const shipment2Number = `SHIP-${new Date().getFullYear()}-${String(shipmentCount + 2).padStart(5, '0')}`
    
    const shipment2 = await prisma.shipment.create({
      data: {
        shipmentNumber: shipment2Number,
        salesOrderId: approvedOrder.id,
        status: 'SHIPPED',
        shipmentDate: new Date(),
        shippedAt: new Date(),
        carrier: 'FedEx',
        trackingNumber: `FDX${Date.now()}`,
        shippingMethod: 'Standard Delivery',
        shippingCost: 15.00,
        shipToAddress: approvedOrder.salesCase?.customer?.address || '456 Business Ave, Abu Dhabi, UAE',
        shipFromAddress: 'Warehouse B, Logistics City, Dubai, UAE',
        notes: 'Another sample shipment',
        createdBy: 'system',
        shippedBy: 'warehouse_user',
        items: {
          create: validItems
            .slice(0, Math.min(2, validItems.length)) // Partial shipment, max 2 items
            .map(item => ({
              salesOrderItemId: item.id,
              itemId: item.itemId!,
              itemCode: item.itemCode,
              description: item.description,
              quantity: Math.floor(item.quantity / 2), // Half quantity
              quantityShipped: Math.floor(item.quantity / 2), // Half quantity
              trackingDetails: 'Shipped via FedEx'
            }))
        }
      }
    })
    
    console.log(`✅ Created shipment: ${shipment2.shipmentNumber}`)
    console.log(`  - Status: ${shipment2.status}`)
    console.log(`  - Partial shipment`)
    
    console.log('\n✅ Sample shipments created successfully!')
    
  } catch (error) {
    console.error('Error creating sample shipments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleShipments()