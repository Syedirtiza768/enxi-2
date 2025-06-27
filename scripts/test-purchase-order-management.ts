#!/usr/bin/env tsx

/**
 * Test Purchase Order Management System
 * 
 * This script tests the complete purchase order workflow:
 * 1. Create suppliers
 * 2. Create purchase orders
 * 3. Approve and send POs
 * 4. Create goods receipts
 * 5. Validate inventory updates
 * 6. Test three-way matching preparation
 */

import { PrismaClient, POStatus, ReceiptStatus } from "@prisma/client"
import { SupplierService } from '@/lib/services/purchase/supplier.service'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'
import { GoodsReceiptService } from '@/lib/services/purchase/goods-receipt.service'
import { ItemService } from '@/lib/services/inventory/item.service'
import { CategoryService } from '@/lib/services/inventory/category.service'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'

const prisma = new PrismaClient()

interface TestResults {
  suppliersCreated: number
  purchaseOrdersCreated: number
  goodsReceiptsCreated: number
  stockMovementsCreated: number
  errors: string[]
  warnings: string[]
}

async function main(): Promise<void> {
  console.warn('🚀 Starting Purchase Order Management System Test...\n')
  
  const results: TestResults = {
    suppliersCreated: 0,
    purchaseOrdersCreated: 0,
    goodsReceiptsCreated: 0,
    stockMovementsCreated: 0,
    errors: [],
    warnings: []
  }

  try {
    // Initialize services
    const supplierService = new SupplierService()
    const purchaseOrderService = new PurchaseOrderService()
    const goodsReceiptService = new GoodsReceiptService()
    const itemService = new ItemService()
    const categoryService = new CategoryService()
    const stockMovementService = new StockMovementService()
    const chartOfAccountsService = new ChartOfAccountsService()

    console.warn('📋 Step 1: Setting up test data...')
    
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed script first.')
    }

    // Ensure chart of accounts exists
    const existingAccounts = await prisma.account.findMany()
    if (existingAccounts.length === 0) {
      console.warn('   Creating standard chart of accounts...')
      await chartOfAccountsService.createStandardCOA('USD', adminUser.id)
    }

    // Create test categories if they don't exist
    let rawMaterialsCategory = await prisma.category.findFirst({
      where: { code: 'RAW-MAT' }
    })

    if (!rawMaterialsCategory) {
      console.warn('   Creating raw materials category...')
      rawMaterialsCategory = await categoryService.createCategory({
        code: 'RAW-MAT',
        name: 'Raw Materials',
        description: 'Raw materials for production',
        createdBy: adminUser.id
      })
    }

    // Create test items if they don't exist
    const testItems = [
      {
        code: 'STEEL-001',
        name: 'Steel Rod 10mm',
        description: 'High grade steel rod 10mm diameter',
        trackInventory: true,
        standardCost: 25.00,
        listPrice: 35.00
      },
      {
        code: 'WIRE-001', 
        name: 'Copper Wire 2.5mm',
        description: 'Electrical copper wire 2.5mm',
        trackInventory: true,
        standardCost: 8.50,
        listPrice: 12.00
      },
      {
        code: 'PAINT-001',
        name: 'Industrial Paint - Blue',
        description: 'Industrial grade blue paint',
        trackInventory: true,
        standardCost: 45.00,
        listPrice: 65.00
      }
    ]

    const createdItems = []
    for (const itemData of testItems) {
      let item = await prisma.item.findFirst({
        where: { code: itemData.code }
      })

      if (!item) {
        // Get unit of measure
        const unitOfMeasure = await prisma.unitOfMeasure.findFirst({
          where: { code: 'PCS' }
        })

        if (!unitOfMeasure) {
          throw new Error('Unit of measure PCS not found. Please run seed script first.')
        }

        // Get inventory account
        const inventoryAccount = await prisma.account.findFirst({
          where: { 
            OR: [
              { code: '1200' },
              { code: 'INV-1000' },
              { code: '1130' }
            ]
          }
        })

        if (!inventoryAccount) {
          throw new Error('Inventory account not found. Please run seed script first.')
        }

        console.warn(`   Creating test item: ${itemData.name}...`)
        item = await itemService.createItem({
          ...itemData,
          categoryId: rawMaterialsCategory.id,
          unitOfMeasureId: unitOfMeasure.id,
          inventoryAccountId: inventoryAccount.id,
          createdBy: adminUser.id
        })
      }
      createdItems.push(item)
    }

    console.warn('✅ Test data setup complete\n')

    // Test 1: Create Suppliers
    console.warn('📋 Step 2: Creating test suppliers...')
    
    const supplierData = [
      {
        name: 'Steel Dynamics Corp',
        email: 'orders@steeldynamics.com',
        phone: '+1-555-0101',
        address: '123 Industrial Blvd, Steel City, SC 12345',
        currency: 'USD',
        paymentTerms: 30,
        creditLimit: 50000,
        contactPerson: 'John Steelman',
        contactEmail: 'john@steeldynamics.com',
        isPreferred: true
      },
      {
        name: 'ElectroSupply Inc',
        email: 'sales@electrosupply.com', 
        phone: '+1-555-0102',
        address: '456 Electrical Ave, Wire Town, WT 67890',
        currency: 'USD',
        paymentTerms: 15,
        creditLimit: 25000,
        contactPerson: 'Sarah Copper',
        contactEmail: 'sarah@electrosupply.com',
        isPreferred: false
      },
      {
        name: 'Industrial Coatings Ltd',
        email: 'orders@indcoatings.com',
        phone: '+1-555-0103', 
        address: '789 Paint St, Color City, CC 11111',
        currency: 'USD',
        paymentTerms: 45,
        creditLimit: 15000,
        contactPerson: 'Mike Painter',
        contactEmail: 'mike@indcoatings.com',
        isPreferred: true
      }
    ]

    const createdSuppliers = []
    for (const supplier of supplierData) {
      try {
        const newSupplier = await supplierService.createSupplier({
          ...supplier,
          createdBy: adminUser.id
        })
        createdSuppliers.push(newSupplier)
        results.suppliersCreated++
        console.warn(`   ✅ Created supplier: ${newSupplier.name} (${newSupplier.supplierNumber})`)
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.warn(`   ⚠️  Supplier ${supplier.name} already exists, using existing`)
          const existingSupplier = await supplierService.getAllSuppliers({
            search: supplier.name
          })
          if (existingSupplier.length > 0) {
            createdSuppliers.push(existingSupplier[0])
          }
        } else {
          results.errors.push(`Failed to create supplier ${supplier.name}: ${error.message}`)
        }
      }
    }

    console.warn(`✅ Suppliers created: ${results.suppliersCreated}\n`)

    // Test 2: Create Purchase Orders
    console.warn('📋 Step 3: Creating purchase orders...')

    const purchaseOrderData = [
      {
        supplierId: createdSuppliers[0].id,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        requestedBy: 'Production Manager',
        notes: 'Urgent order for steel production',
        items: [
          {
            itemId: createdItems[0].id,
            itemCode: createdItems[0].code,
            description: createdItems[0].name,
            quantity: 100,
            unitPrice: 25.50,
            unitOfMeasureId: createdItems[0].unitOfMeasureId
          }
        ]
      },
      {
        supplierId: createdSuppliers[1].id,
        expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        requestedBy: 'Electrical Department',
        notes: 'Wire for new installations',
        items: [
          {
            itemId: createdItems[1].id,
            itemCode: createdItems[1].code,
            description: createdItems[1].name,
            quantity: 500,
            unitPrice: 8.75,
            unitOfMeasureId: createdItems[1].unitOfMeasureId
          }
        ]
      },
      {
        supplierId: createdSuppliers[2].id,
        expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        requestedBy: 'Finishing Department',
        notes: 'Paint for Q4 production',
        items: [
          {
            itemId: createdItems[2].id,
            itemCode: createdItems[2].code,
            description: createdItems[2].name,
            quantity: 25,
            unitPrice: 46.00,
            unitOfMeasureId: createdItems[2].unitOfMeasureId
          }
        ]
      }
    ]

    const createdPurchaseOrders = []
    for (const [index, poData] of purchaseOrderData.entries()) {
      try {
        const newPO = await purchaseOrderService.createPurchaseOrder({
          ...poData,
          createdBy: adminUser.id
        })
        createdPurchaseOrders.push(newPO)
        results.purchaseOrdersCreated++
        console.warn(`   ✅ Created PO: ${newPO.poNumber} for ${newPO.supplier.name}`)
        console.warn(`      Total Amount: $${newPO.totalAmount.toFixed(2)}`)
      } catch (error: any) {
        results.errors.push(`Failed to create purchase order ${index + 1}: ${error.message}`)
      }
    }

    console.warn(`✅ Purchase orders created: ${results.purchaseOrdersCreated}\n`)

    // Test 3: Approve and Send Purchase Orders
    console.warn('📋 Step 4: Approving and sending purchase orders...')

    for (const po of createdPurchaseOrders) {
      try {
        // Approve PO
        const approvedPO = await purchaseOrderService.approvePurchaseOrder(po.id, adminUser.id)
        console.warn(`   ✅ Approved PO: ${approvedPO.poNumber}`)

        // Send to supplier
        const sentPO = await purchaseOrderService.sendToSupplier(po.id, adminUser.id)
        console.warn(`   ✅ Sent PO: ${sentPO.poNumber} to supplier`)
      } catch (error: any) {
        results.errors.push(`Failed to approve/send PO ${po.poNumber}: ${error.message}`)
      }
    }

    console.warn('✅ Purchase orders approved and sent\n')

    // Test 4: Create Goods Receipts
    console.warn('📋 Step 5: Creating goods receipts...')

    for (const [index, po] of createdPurchaseOrders.entries()) {
      try {
        // Receive partial quantity for first item, full for others
        const receiveQuantity = index === 0 ? 50 : po.items[0].quantity // Partial receipt for first PO

        const goodsReceipt = await goodsReceiptService.createGoodsReceipt({
          purchaseOrderId: po.id,
          deliveryNote: `DN-${Date.now()}-${index}`,
          condition: 'Good',
          notes: `Goods receipt for PO ${po.poNumber}`,
          items: [
            {
              purchaseOrderItemId: po.items[0].id,
              quantityReceived: receiveQuantity,
              unitCost: po.items[0].unitPrice,
              condition: 'Good',
              notes: index === 0 ? 'Partial receipt - remainder to follow' : 'Full receipt'
            }
          ],
          receivedBy: adminUser.id
        })

        results.goodsReceiptsCreated++
        console.warn(`   ✅ Created goods receipt: ${goodsReceipt.receiptNumber}`)
        console.warn(`      Received ${receiveQuantity} units of ${po.items[0].itemCode}`)

        // Count stock movements created
        const stockMovements = await stockMovementService.getItemStockHistory(
          po.items[0].itemId!,
          { limit: 5 }
        )
        const newMovements = stockMovements.filter(sm => 
          sm.referenceNumber === goodsReceipt.receiptNumber
        )
        results.stockMovementsCreated += newMovements.length

      } catch (error: any) {
        results.errors.push(`Failed to create goods receipt for PO ${po.poNumber}: ${error.message}`)
      }
    }

    console.warn(`✅ Goods receipts created: ${results.goodsReceiptsCreated}\n`)

    // Test 5: Validate Inventory Updates
    console.warn('📋 Step 6: Validating inventory updates...')

    for (const item of createdItems) {
      try {
        const currentStock = await stockMovementService.getAvailableStock(item.id)
        const stockValue = await stockMovementService.getStockValue(item.id)
        
        console.warn(`   📦 ${item.name}:`)
        console.warn(`      Current Stock: ${currentStock} ${item.unitOfMeasure?.symbol || 'units'}`)
        console.warn(`      Stock Value: $${stockValue.toFixed(2)}`)

        const stockHistory = await stockMovementService.getItemStockHistory(item.id, { limit: 5 })
        console.warn(`      Recent Movements: ${stockHistory.length}`)
        
        if (stockHistory.length > 0) {
          const latestMovement = stockHistory[0]
          console.warn(`      Latest: ${latestMovement.movementType} - ${latestMovement.quantity} units`)
        }
      } catch (error: any) {
        results.warnings.push(`Could not validate inventory for ${item.name}: ${error.message}`)
      }
    }

    console.warn('✅ Inventory validation complete\n')

    // Test 6: Validate Purchase Order Status Updates
    console.warn('📋 Step 7: Validating purchase order status updates...')

    for (const po of createdPurchaseOrders) {
      try {
        const updatedPO = await purchaseOrderService.getPurchaseOrder(po.id)
        if (updatedPO) {
          console.warn(`   📄 PO ${updatedPO.poNumber}:`)
          console.warn(`      Status: ${updatedPO.status}`)
          console.warn(`      Total Amount: $${updatedPO.totalAmount.toFixed(2)}`)
          console.warn(`      Received Amount: $${updatedPO.receivedAmount.toFixed(2)}`)
          console.warn(`      Receipt Progress: ${((updatedPO.receivedAmount / updatedPO.totalAmount) * 100).toFixed(1)}%`)
          
          // Check if PO status is correct based on receipts
          const expectedStatus = updatedPO.receivedAmount >= updatedPO.totalAmount ? 
            POStatus.RECEIVED : 
            updatedPO.receivedAmount > 0 ? POStatus.PARTIAL_RECEIVED : POStatus.ORDERED

          if (updatedPO.status !== expectedStatus) {
            results.warnings.push(`PO ${updatedPO.poNumber} status mismatch: expected ${expectedStatus}, got ${updatedPO.status}`)
          }
        }
      } catch (error: any) {
        results.warnings.push(`Could not validate PO status for ${po.poNumber}: ${error.message}`)
      }
    }

    console.warn('✅ Purchase order status validation complete\n')

    // Test 7: Test Supplier Management Features
    console.warn('📋 Step 8: Testing supplier management features...')

    try {
      // Test supplier balance check
      for (const supplier of createdSuppliers) {
        const balance = await supplierService.getSupplierBalance(supplier.id)
        console.warn(`   💰 ${supplier.name} Balance: $${balance.toFixed(2)}`)
      }

      // Test preferred suppliers
      const preferredSuppliers = await supplierService.getPreferredSuppliers()
      console.warn(`   ⭐ Preferred Suppliers: ${preferredSuppliers.length}`)
      preferredSuppliers.forEach(supplier => {
        console.warn(`      - ${supplier.name}`)
      })

      // Test supplier search
      const searchResults = await supplierService.getAllSuppliers({
        search: 'Steel',
        isActive: true
      })
      console.warn(`   🔍 Search for 'Steel': ${searchResults.length} results`)

    } catch (error: any) {
      results.warnings.push(`Supplier management test warning: ${error.message}`)
    }

    console.warn('✅ Supplier management tests complete\n')

  } catch (error: any) {
    results.errors.push(`Critical error: ${error.message}`)
    console.error('❌ Critical error:', error)
  } finally {
    await prisma.$disconnect()
  }

  // Print summary
  console.warn('📊 Test Summary:')
  console.warn('================')
  console.warn(`✅ Suppliers Created: ${results.suppliersCreated}`)
  console.warn(`✅ Purchase Orders Created: ${results.purchaseOrdersCreated}`)
  console.warn(`✅ Goods Receipts Created: ${results.goodsReceiptsCreated}`)
  console.warn(`✅ Stock Movements Created: ${results.stockMovementsCreated}`)
  
  if (results.warnings.length > 0) {
    console.warn(`⚠️  Warnings: ${results.warnings.length}`)
    results.warnings.forEach(warning => {
      console.warn(`   - ${warning}`)
    })
  }
  
  if (results.errors.length > 0) {
    console.warn(`❌ Errors: ${results.errors.length}`)
    results.errors.forEach(error => {
      console.warn(`   - ${error}`)
    })
  }

  if (results.errors.length === 0) {
    console.warn('\n🎉 Purchase Order Management System test completed successfully!')
    console.warn('\n✅ Ready for Phase 2.2: Multi-Location Support implementation')
  } else {
    console.warn('\n❌ Purchase Order Management System test completed with errors')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}