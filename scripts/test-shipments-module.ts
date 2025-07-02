import { prisma } from '@/lib/db/prisma'
import { ShipmentService } from '@/lib/services/shipment.service'

async function testShipmentsModule() {
  try {
    console.log('🚚 SHIPMENTS MODULE AUDIT\n')
    
    // 1. Check existing shipments
    console.log('1. EXISTING SHIPMENTS:')
    const shipments = await prisma.shipment.findMany({
      include: {
        salesOrder: {
          include: {
            salesCase: {
              include: { customer: true }
            }
          }
        },
        items: true
      }
    })
    
    console.log(`Total shipments: ${shipments.length}`)
    if (shipments.length > 0) {
      shipments.forEach(shipment => {
        console.log(`\n- Shipment ${shipment.shipmentNumber}:`)
        console.log(`  Status: ${shipment.status}`)
        console.log(`  Order: ${shipment.salesOrder?.orderNumber || 'N/A'}`)
        console.log(`  Customer: ${shipment.salesOrder?.salesCase?.customer?.name || 'N/A'}`)
        console.log(`  Items: ${shipment.items.length}`)
        console.log(`  Created: ${shipment.createdAt.toLocaleDateString()}`)
      })
    }
    
    // 2. Check approved sales orders that can be shipped
    console.log('\n\n2. SHIPPABLE SALES ORDERS:')
    const shippableOrders = await prisma.salesOrder.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        salesCase: {
          include: { customer: true }
        },
        shipments: true,
        items: true
      }
    })
    
    console.log(`Orders ready to ship: ${shippableOrders.length}`)
    shippableOrders.forEach(order => {
      console.log(`\n- Order ${order.orderNumber}:`)
      console.log(`  Customer: ${order.salesCase?.customer?.name}`)
      console.log(`  Total: $${order.totalAmount}`)
      console.log(`  Items: ${order.items.length}`)
      console.log(`  Existing shipments: ${order.shipments.length}`)
    })
    
    // 3. Test shipment creation if there's an approved order
    if (shippableOrders.length > 0) {
      const testOrder = shippableOrders[0]
      console.log(`\n\n3. TESTING SHIPMENT CREATION FOR ORDER ${testOrder.orderNumber}:`)
      
      const shipmentService = new ShipmentService()
      
      try {
        // Prepare shipment data
        const shipmentData = {
          salesOrderId: testOrder.id,
          items: testOrder.items
            .filter(item => !item.isLineHeader && item.itemType === 'PRODUCT')
            .map(item => ({
              salesOrderItemId: item.id,
              quantity: item.quantity
            })),
          carrier: 'DHL',
          trackingNumber: `TEST-${Date.now()}`,
          shippingMethod: 'Standard',
          shipToAddress: testOrder.salesCase?.customer?.address || 'Test Address',
          notes: 'Test shipment created via audit script',
          createdBy: 'system'
        }
        
        console.log('Creating test shipment...')
        const newShipment = await shipmentService.createShipmentFromOrder(shipmentData)
        console.log('✅ Shipment created successfully:', newShipment.shipmentNumber)
        
        // Test shipment confirmation (this deducts inventory)
        console.log('\nTesting shipment confirmation...')
        const confirmedShipment = await shipmentService.confirmShipment(
          newShipment.id,
          'system'
        )
        console.log('✅ Shipment confirmed and inventory deducted')
        
      } catch (error) {
        console.error('❌ Error creating/confirming shipment:', error)
      }
    }
    
    // 4. Check API endpoints
    console.log('\n\n4. TESTING API ENDPOINTS:')
    
    // Test GET /api/shipments
    try {
      const response = await fetch('http://localhost:3000/api/shipments?page=1&limit=10')
      console.log(`GET /api/shipments: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`  Returned ${data.data?.length || 0} shipments`)
      }
    } catch (error) {
      console.error('❌ Error testing shipments API:', error)
    }
    
    // 5. Check shipment statuses
    console.log('\n\n5. SHIPMENT STATUS DISTRIBUTION:')
    const statusCounts = await prisma.shipment.groupBy({
      by: ['status'],
      _count: true
    })
    
    statusCounts.forEach(stat => {
      console.log(`- ${stat.status}: ${stat._count} shipments`)
    })
    
    // 6. Check for integration issues
    console.log('\n\n6. INTEGRATION CHECKS:')
    
    // Check for orphaned shipments
    const orphanedShipments = await prisma.shipment.findMany({
      where: {
        OR: [
          { salesOrderId: null },
          { salesOrder: null }
        ]
      }
    })
    console.log(`Orphaned shipments (no order): ${orphanedShipments.length}`)
    
    // Check for shipments without items
    const emptyShipments = await prisma.shipment.findMany({
      where: {
        items: {
          none: {}
        }
      }
    })
    console.log(`Empty shipments (no items): ${emptyShipments.length}`)
    
    // Check inventory movements
    const recentMovements = await prisma.stockMovement.findMany({
      where: {
        movementType: 'STOCK_OUT',
        reference: {
          startsWith: 'SHIP-'
        }
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    })
    console.log(`Recent shipment-related stock movements: ${recentMovements.length}`)
    
    console.log('\n\n✅ SHIPMENTS MODULE AUDIT COMPLETE')
    
  } catch (error) {
    console.error('Error during shipments audit:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testShipmentsModule()