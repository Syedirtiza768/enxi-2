#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'

async function testShipmentWorkflow() {
  console.log('Testing Shipment Workflow...\n')
  
  try {
    // 1. Create test data if needed
    console.log('1. Setting up test data...')
    
    // Find or create a user
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedpassword',
          name: 'Test User',
        }
      })
    }
    
    // Find or create a customer
    let customer = await prisma.customer.findFirst()
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          email: 'customer@example.com',
          phone: '123-456-7890',
          address: '123 Test St, Test City, TC 12345',
          createdBy: user.id,
        }
      })
    }
    
    // Find or create an item
    let item = await prisma.item.findFirst()
    if (!item) {
      const category = await prisma.category.findFirst() || await prisma.category.create({
        data: {
          code: 'TEST',
          name: 'Test Category',
          type: 'PRODUCT',
          createdBy: user.id,
        }
      })
      
      item = await prisma.item.create({
        data: {
          code: 'TEST-001',
          name: 'Test Product',
          description: 'Test product for shipment workflow',
          type: 'PRODUCT',
          categoryId: category.id,
          unitPrice: 100,
          quantityOnHand: 100,
          reorderLevel: 10,
          reorderQuantity: 50,
          createdBy: user.id,
        }
      })
    }
    
    // 2. Create an approved sales order
    console.log('\n2. Creating an approved sales order...')
    
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: `CASE-${Date.now()}`,
        title: 'Test Shipment Workflow Case',
        description: 'Testing shipment functionality',
        customerId: customer.id,
        estimatedValue: 500,
        status: 'WON',
        assignedTo: user.id,
        createdBy: user.id,
      }
    })
    
    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-${Date.now()}`,
        salesCaseId: salesCase.id,
        status: 'APPROVED',
        orderDate: new Date(),
        totalAmount: 500,
        subtotal: 500,
        shippingAddress: customer.address || '123 Test St',
        billingAddress: customer.address || '123 Test St',
        createdBy: user.id,
        approvedBy: user.id,
        approvedAt: new Date(),
        items: {
          create: {
            itemId: item.id,
            itemCode: item.code,
            description: item.description,
            quantity: 5,
            unitPrice: 100,
            subtotal: 500,
            totalAmount: 500,
          }
        }
      },
      include: {
        items: true,
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    
    console.log(`✓ Created sales order: ${salesOrder.orderNumber}`)
    console.log(`  - Status: ${salesOrder.status}`)
    console.log(`  - Customer: ${salesOrder.salesCase.customer.name}`)
    console.log(`  - Items: ${salesOrder.items.length}`)
    
    // 3. Create a shipment
    console.log('\n3. Creating a shipment...')
    
    const shipmentNumber = `SH-${Date.now()}`
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber,
        salesOrderId: salesOrder.id,
        status: 'PREPARING',
        shipToAddress: salesOrder.shippingAddress,
        carrier: 'FedEx',
        trackingNumber: `TRACK-${Date.now()}`,
        shippingMethod: 'Ground',
        createdBy: user.id,
        items: {
          create: salesOrder.items.map(item => ({
            salesOrderItemId: item.id,
            itemId: item.itemId,
            itemCode: item.itemCode,
            description: item.description,
            quantityShipped: item.quantity,
          }))
        }
      },
      include: {
        items: true,
        salesOrder: {
          include: {
            salesCase: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    })
    
    console.log(`✓ Created shipment: ${shipment.shipmentNumber}`)
    console.log(`  - Status: ${shipment.status}`)
    console.log(`  - Carrier: ${shipment.carrier}`)
    console.log(`  - Tracking: ${shipment.trackingNumber}`)
    console.log(`  - Items shipped: ${shipment.items.length}`)
    
    // 4. Confirm the shipment (mark as shipped)
    console.log('\n4. Confirming shipment...')
    
    // Update shipment status
    const confirmedShipment = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
        shippedBy: user.id,
      }
    })
    
    // Create stock movements for inventory deduction
    for (const item of shipment.items) {
      await prisma.stockMovement.create({
        data: {
          itemId: item.itemId,
          type: 'OUT',
          quantity: item.quantityShipped,
          reason: 'SALE',
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          createdBy: user.id,
          description: `Shipment ${shipment.shipmentNumber}`,
        }
      })
      
      // Update item quantity
      await prisma.item.update({
        where: { id: item.itemId },
        data: {
          quantityOnHand: {
            decrement: item.quantityShipped
          }
        }
      })
    }
    
    // Update sales order item shipped quantities
    for (const item of shipment.items) {
      await prisma.salesOrderItem.update({
        where: { id: item.salesOrderItemId },
        data: {
          quantityShipped: {
            increment: item.quantityShipped
          }
        }
      })
    }
    
    console.log(`✓ Shipment confirmed and marked as shipped`)
    console.log(`  - Inventory deducted`)
    console.log(`  - Sales order items updated`)
    
    // 5. Check final state
    console.log('\n5. Verifying final state...')
    
    const finalOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrder.id },
      include: {
        items: true
      }
    })
    
    const finalItem = await prisma.item.findUnique({
      where: { id: item.id }
    })
    
    console.log(`\n✓ Sales Order ${salesOrder.orderNumber}:`)
    finalOrder?.items.forEach(item => {
      console.log(`  - ${item.itemCode}: ${item.quantityShipped}/${item.quantity} shipped`)
    })
    
    console.log(`\n✓ Inventory for ${item.code}:`)
    console.log(`  - Initial quantity: 100`)
    console.log(`  - Current quantity: ${finalItem?.quantityOnHand}`)
    console.log(`  - Quantity shipped: ${5}`)
    
    // 6. List all shipments
    console.log('\n6. Listing all shipments...')
    
    const allShipments = await prisma.shipment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        salesOrder: {
          include: {
            salesCase: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    })
    
    console.log(`\nTotal shipments: ${allShipments.length}`)
    allShipments.forEach(sh => {
      console.log(`  - ${sh.shipmentNumber} (${sh.status}) - Order: ${sh.salesOrder.orderNumber}`)
    })
    
    console.log('\n✅ Shipment workflow test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error in shipment workflow test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testShipmentWorkflow()