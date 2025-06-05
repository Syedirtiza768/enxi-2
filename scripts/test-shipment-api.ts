#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'

async function testShipmentAPI() {
  console.warn('Testing Shipment API...\n')
  
  try {
    // Get an approved sales order
    const approvedOrder = await prisma.salesOrder.findFirst({
      where: { status: 'APPROVED' },
      include: {
        items: true,
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    
    if (!approvedOrder) {
      console.warn('No approved sales orders found. Creating test data...')
      
      // Create test data
      const user = await prisma.user.findFirst()
      if (!user) {
        console.error('No users found. Please seed the database first.')
        return
      }
      
      const customer = await prisma.customer.findFirst()
      if (!customer) {
        console.error('No customers found. Please seed the database first.')
        return
      }
      
      const item = await prisma.item.findFirst()
      if (!item) {
        console.error('No items found. Please seed the database first.')
        return
      }
      
      // Create a sales case
      const caseNumber = `CASE-TEST-${Date.now()}`
      const salesCase = await prisma.salesCase.create({
        data: {
          caseNumber,
          title: 'Test Sales Case for Shipment',
          description: 'Testing shipment functionality',
          customerId: customer.id,
          estimatedValue: 1000,
          status: 'WON',
          assignedTo: user.id,
          createdBy: user.id,
        }
      })
      
      // Create an approved sales order
      const newOrder = await prisma.salesOrder.create({
        data: {
          orderNumber: `SO-TEST-${Date.now()}`,
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
              quantity: 10,
              unitPrice: 50,
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
      
      console.warn(`✓ Created test sales order: ${newOrder.orderNumber}`)
    } else {
      console.warn(`✓ Found approved order: ${approvedOrder.orderNumber}`)
      
      // Check if it has shippable items
      const shippableItems = approvedOrder.items.filter(item => 
        item.quantity > item.quantityShipped
      )
      
      console.warn(`  - Total items: ${approvedOrder.items.length}`)
      console.warn(`  - Shippable items: ${shippableItems.length}`)
      console.warn(`  - Customer: ${approvedOrder.salesCase.customer.name}`)
      console.warn(`  - Shipping Address: ${approvedOrder.shippingAddress}`)
    }
    
    // Test fetching shipments
    const shipments = await prisma.shipment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
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
    
    console.warn(`\n✓ Found ${shipments.length} shipments in database`)
    
    if (shipments.length > 0) {
      console.warn('\nRecent shipments:')
      shipments.forEach(shipment => {
        console.warn(`  - ${shipment.shipmentNumber} (${shipment.status})`)
        console.warn(`    Order: ${shipment.salesOrder.orderNumber}`)
        console.warn(`    Items: ${shipment.items.length}`)
      })
    }
    
    console.warn('\n✅ Shipment API test completed!')
    
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

testShipmentAPI()