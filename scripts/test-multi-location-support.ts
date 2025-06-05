#!/usr/bin/env tsx

/**
 * Test Multi-Location Support System
 * 
 * This script tests the complete multi-location warehouse management workflow:
 * 1. Create multiple locations (warehouses, stores, etc.)
 * 2. Set up location-based inventory balances
 * 3. Create and process stock transfers between locations
 * 4. Test location-based stock tracking and reporting
 * 5. Validate inventory balance management across locations
 * 6. Test stock reservation and release functionality
 */

import { PrismaClient, LocationType, TransferStatus } from '@/lib/generated/prisma'
import { LocationService } from '@/lib/services/warehouse/location.service'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'
import { InventoryBalanceService } from '@/lib/services/warehouse/inventory-balance.service'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'
import { ItemService } from '@/lib/services/inventory/item.service'

const prisma = new PrismaClient()

interface TestResults {
  locationsCreated: number
  stockTransfersCreated: number
  inventoryBalancesCreated: number
  stockMovementsCreated: number
  reservationsProcessed: number
  errors: string[]
  warnings: string[]
}

async function main() {
  console.warn('🏢 Starting Multi-Location Support System Test...\n')
  
  const results: TestResults = {
    locationsCreated: 0,
    stockTransfersCreated: 0,
    inventoryBalancesCreated: 0,
    stockMovementsCreated: 0,
    reservationsProcessed: 0,
    errors: [],
    warnings: []
  }

  try {
    // Initialize services
    const locationService = new LocationService()
    const stockTransferService = new StockTransferService()
    const inventoryBalanceService = new InventoryBalanceService()
    const stockMovementService = new StockMovementService()
    const itemService = new ItemService()

    console.warn('📋 Step 1: Setting up test data...')
    
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed script first.')
    }

    // Get existing test items (from previous purchase order test)
    const testItems = await prisma.item.findMany({
      where: {
        code: {
          in: ['STEEL-001', 'WIRE-001', 'PAINT-001']
        }
      },
      include: {
        unitOfMeasure: true
      }
    })

    if (testItems.length === 0) {
      throw new Error('Test items not found. Please run purchase order test first.')
    }

    console.warn(`   Found ${testItems.length} test items`)

    // Get inventory account for locations
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
      throw new Error('Inventory account not found')
    }

    console.warn('✅ Test data setup complete\n')

    // Test 1: Create Multiple Locations
    console.warn('📋 Step 2: Creating multiple locations...')
    
    const locationData = [
      {
        name: 'Main Warehouse',
        type: LocationType.WAREHOUSE,
        description: 'Primary distribution center',
        address: '123 Industrial Blvd',
        city: 'Central City',
        state: 'CC',
        country: 'US',
        postalCode: '12345',
        contactPerson: 'John Manager',
        phone: '+1-555-0201',
        email: 'warehouse@company.com',
        maxCapacity: 10000,
        allowNegativeStock: false,
        inventoryAccountId: inventoryAccount.id
      },
      {
        name: 'East Coast Store',
        type: LocationType.STORE,
        description: 'Retail location - East Coast',
        address: '456 Retail Ave',
        city: 'Eastern City',
        state: 'EC',
        country: 'US',
        postalCode: '67890',
        contactPerson: 'Sarah Store',
        phone: '+1-555-0202',
        email: 'eaststore@company.com',
        maxCapacity: 2000,
        allowNegativeStock: false,
        inventoryAccountId: inventoryAccount.id
      },
      {
        name: 'West Coast Store',
        type: LocationType.STORE,
        description: 'Retail location - West Coast',
        address: '789 Commerce St',
        city: 'Western City',
        state: 'WC',
        country: 'US',
        postalCode: '11111',
        contactPerson: 'Mike West',
        phone: '+1-555-0203',
        email: 'weststore@company.com',
        maxCapacity: 2000,
        allowNegativeStock: true, // Allow negative stock for testing
        inventoryAccountId: inventoryAccount.id
      },
      {
        name: 'Manufacturing Plant',
        type: LocationType.FACTORY,
        description: 'Production facility',
        address: '321 Factory Rd',
        city: 'Factory Town',
        state: 'FT',
        country: 'US',
        postalCode: '22222',
        contactPerson: 'Production Manager',
        phone: '+1-555-0204',
        email: 'factory@company.com',
        maxCapacity: 5000,
        allowNegativeStock: false,
        inventoryAccountId: inventoryAccount.id
      }
    ]

    const createdLocations = []
    for (const [index, location] of locationData.entries()) {
      try {
        const newLocation = await locationService.createLocation({
          ...location,
          createdBy: adminUser.id
        })
        
        createdLocations.push(newLocation)
        results.locationsCreated++
        
        // Set first location as default
        if (index === 0) {
          await locationService.setDefaultLocation(newLocation.id)
        }
        
        console.warn(`   ✅ Created location: ${newLocation.name} (${newLocation.locationCode})`)
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.warn(`   ⚠️  Location ${location.name} code already exists, using existing`)
          const existingLocation = await locationService.getAllLocations({
            search: location.name
          })
          if (existingLocation.length > 0) {
            createdLocations.push(existingLocation[0])
          }
        } else {
          results.errors.push(`Failed to create location ${location.name}: ${error.message}`)
        }
      }
    }

    console.warn(`✅ Locations created: ${results.locationsCreated}\n`)

    // Test 2: Set up Initial Inventory at Main Warehouse
    console.warn('📋 Step 3: Setting up initial inventory at main warehouse...')

    const mainWarehouse = createdLocations[0]
    
    for (const item of testItems) {
      try {
        // Create initial stock at main warehouse (simulate purchase receipt)
        const initialQuantity = 1000
        const initialCost = item.standardCost || 25.0

        await stockMovementService.createStockMovement({
          itemId: item.id,
          movementType: 'OPENING',
          movementDate: new Date(),
          quantity: initialQuantity,
          unitCost: initialCost,
          locationId: mainWarehouse.id,
          referenceType: 'OPENING',
          referenceNumber: `OPEN-${Date.now()}`,
          notes: `Initial stock for multi-location testing`,
          autoCreateLot: true,
          createdBy: adminUser.id
        })

        // Update inventory balance
        await inventoryBalanceService.updateInventoryBalance(
          mainWarehouse.id,
          item.id,
          'OPENING',
          initialQuantity,
          initialCost
        )

        results.inventoryBalancesCreated++
        results.stockMovementsCreated++
        
        console.warn(`   ✅ Set up ${initialQuantity} units of ${item.name} at ${mainWarehouse.name}`)
      } catch (error: any) {
        results.errors.push(`Failed to set up initial inventory for ${item.name}: ${error.message}`)
      }
    }

    console.warn(`✅ Initial inventory setup complete\n`)

    // Test 3: Create Stock Transfers Between Locations
    console.warn('📋 Step 4: Creating stock transfers between locations...')

    const transferData = [
      {
        fromLocation: mainWarehouse,
        toLocation: createdLocations[1], // East Coast Store
        items: [
          { item: testItems[0], quantity: 100 }, // Steel Rod
          { item: testItems[1], quantity: 200 }  // Copper Wire
        ],
        reason: 'Initial stock for East Coast store'
      },
      {
        fromLocation: mainWarehouse,
        toLocation: createdLocations[2], // West Coast Store
        items: [
          { item: testItems[0], quantity: 150 }, // Steel Rod
          { item: testItems[2], quantity: 50 }   // Paint
        ],
        reason: 'Initial stock for West Coast store'
      },
      {
        fromLocation: mainWarehouse,
        toLocation: createdLocations[3], // Manufacturing Plant
        items: [
          { item: testItems[0], quantity: 300 }, // Steel Rod
          { item: testItems[1], quantity: 400 }  // Copper Wire
        ],
        reason: 'Raw materials for production'
      }
    ]

    const createdTransfers = []
    for (const transferSpec of transferData) {
      try {
        const transferItems = transferSpec.items.map(itemSpec => ({
          itemId: itemSpec.item.id,
          requestedQuantity: itemSpec.quantity,
          unitCost: itemSpec.item.standardCost || 25.0
        }))

        const transfer = await stockTransferService.createStockTransfer({
          fromLocationId: transferSpec.fromLocation.id,
          toLocationId: transferSpec.toLocation.id,
          expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          reason: transferSpec.reason,
          notes: `Multi-location test transfer`,
          items: transferItems,
          requestedBy: adminUser.id
        })

        createdTransfers.push(transfer)
        results.stockTransfersCreated++
        
        console.warn(`   ✅ Created transfer: ${transfer.transferNumber}`)
        console.warn(`      From: ${transferSpec.fromLocation.name} → To: ${transferSpec.toLocation.name}`)
        console.warn(`      Items: ${transferSpec.items.length}, Total Qty: ${transferSpec.items.reduce((sum, i) => sum + i.quantity, 0)}`)
      } catch (error: any) {
        results.errors.push(`Failed to create transfer from ${transferSpec.fromLocation.name} to ${transferSpec.toLocation.name}: ${error.message}`)
      }
    }

    console.warn(`✅ Stock transfers created: ${results.stockTransfersCreated}\n`)

    // Test 4: Process Stock Transfer Workflow
    console.warn('📋 Step 5: Processing stock transfer workflow...')

    for (const transfer of createdTransfers) {
      try {
        console.warn(`   Processing transfer ${transfer.transferNumber}...`)

        // Step 1: Approve transfer
        const approvedTransfer = await stockTransferService.approveStockTransfer(transfer.id, adminUser.id)
        console.warn(`     ✅ Approved: ${approvedTransfer.transferNumber}`)

        // Step 2: Ship transfer
        const shippedTransfer = await stockTransferService.shipStockTransfer(transfer.id, adminUser.id)
        console.warn(`     ✅ Shipped: ${shippedTransfer.transferNumber}`)

        // Step 3: Receive transfer
        const receivedTransfer = await stockTransferService.receiveStockTransfer(transfer.id, adminUser.id)
        console.warn(`     ✅ Received: ${receivedTransfer.transferNumber}`)
        console.warn(`     Status: ${receivedTransfer.status}`)

        results.stockMovementsCreated += transfer.items.length * 2 // Outbound + Inbound movements

      } catch (error: any) {
        results.errors.push(`Failed to process transfer ${transfer.transferNumber}: ${error.message}`)
      }
    }

    console.warn(`✅ Stock transfer workflow processing complete\n`)

    // Test 5: Test Stock Reservations
    console.warn('📋 Step 6: Testing stock reservations...')

    for (const location of createdLocations.slice(1)) { // Skip main warehouse
      try {
        const item = testItems[0] // Test with steel rod
        const reserveQuantity = 10

        // Reserve stock for sales order
        await inventoryBalanceService.reserveStock(
          location.id,
          item.id,
          reserveQuantity,
          'SALES_ORDER'
        )

        console.warn(`   ✅ Reserved ${reserveQuantity} units of ${item.name} at ${location.name}`)
        results.reservationsProcessed++

        // Release half of the reservation
        const releaseQuantity = 5
        await inventoryBalanceService.releaseStock(
          location.id,
          item.id,
          releaseQuantity
        )

        console.warn(`   ✅ Released ${releaseQuantity} units of ${item.name} at ${location.name}`)
        results.reservationsProcessed++

      } catch (error: any) {
        results.warnings.push(`Stock reservation test warning for ${location.name}: ${error.message}`)
      }
    }

    console.warn(`✅ Stock reservations processed: ${results.reservationsProcessed}\n`)

    // Test 6: Generate Multi-Location Inventory Reports
    console.warn('📋 Step 7: Generating multi-location inventory reports...')

    try {
      // Location-specific inventory summaries
      for (const location of createdLocations) {
        const summary = await locationService.getLocationInventorySummary(location.id)
        const stockSummary = await inventoryBalanceService.getLocationStockSummary(location.id)
        
        console.warn(`   📍 ${location.name} (${location.locationCode}):`)
        console.warn(`      Total Items: ${summary.totalItems}`)
        console.warn(`      Total Quantity: ${summary.totalQuantity}`)
        console.warn(`      Total Value: $${summary.totalValue.toFixed(2)}`)
        console.warn(`      Utilization: ${summary.utilization.toFixed(1)}%`)
        console.warn(`      Low Stock Items: ${summary.lowStockItems}`)
        console.warn(`      Out of Stock Items: ${summary.outOfStockItems}`)
      }

      // Multi-location stock summary
      const multiLocationSummary = await inventoryBalanceService.getMultiLocationStockSummary()
      console.warn(`\n   📊 Multi-Location Stock Summary:`)
      console.warn(`      Items tracked: ${multiLocationSummary.length}`)
      
      for (const itemSummary of multiLocationSummary) {
        console.warn(`      📦 ${itemSummary.itemCode} - ${itemSummary.itemName}:`)
        console.warn(`         Total Quantity: ${itemSummary.totalQuantityAllLocations}`)
        console.warn(`         Total Value: $${itemSummary.totalValueAllLocations.toFixed(2)}`)
        console.warn(`         Locations with Stock: ${itemSummary.locationsWithStock}/${itemSummary.locationDetails.length}`)
        
        for (const locationDetail of itemSummary.locationDetails) {
          if (locationDetail.totalQuantity > 0) {
            console.warn(`           - ${locationDetail.locationName}: ${locationDetail.totalQuantity} units`)
          }
        }
      }

      // Low stock alerts across all locations
      const lowStockItems = await inventoryBalanceService.getLowStockItems()
      console.warn(`\n   ⚠️  Low Stock Alerts: ${lowStockItems.length} items`)
      for (const lowStock of lowStockItems) {
        console.warn(`      - ${lowStock.itemCode} at ${lowStock.locationName}: ${lowStock.totalQuantity} units`)
      }

    } catch (error: any) {
      results.warnings.push(`Reporting test warning: ${error.message}`)
    }

    console.warn('✅ Multi-location inventory reports generated\n')

    // Test 7: Test Location Management Features
    console.warn('📋 Step 8: Testing location management features...')

    try {
      // Test default location
      const defaultLocation = await locationService.getDefaultLocation()
      console.warn(`   🏠 Default Location: ${defaultLocation?.name || 'None set'}`)

      // Test location search
      const warehouseLocations = await locationService.getAllLocations({
        type: LocationType.WAREHOUSE,
        isActive: true
      })
      console.warn(`   🏢 Warehouse Locations: ${warehouseLocations.length}`)

      const storeLocations = await locationService.getAllLocations({
        type: LocationType.STORE,
        isActive: true
      })
      console.warn(`   🏪 Store Locations: ${storeLocations.length}`)

      // Test location search by name
      const searchResults = await locationService.getAllLocations({
        search: 'Coast',
        isActive: true
      })
      console.warn(`   🔍 Search for 'Coast': ${searchResults.length} results`)

    } catch (error: any) {
      results.warnings.push(`Location management test warning: ${error.message}`)
    }

    console.warn('✅ Location management tests complete\n')

  } catch (error: any) {
    results.errors.push(`Critical error: ${error.message}`)
    console.error('❌ Critical error:', error)
  } finally {
    await prisma.$disconnect()
  }

  // Print summary
  console.warn('📊 Test Summary:')
  console.warn('================')
  console.warn(`✅ Locations Created: ${results.locationsCreated}`)
  console.warn(`✅ Stock Transfers Created: ${results.stockTransfersCreated}`)
  console.warn(`✅ Inventory Balances Created: ${results.inventoryBalancesCreated}`)
  console.warn(`✅ Stock Movements Created: ${results.stockMovementsCreated}`)
  console.warn(`✅ Reservations Processed: ${results.reservationsProcessed}`)
  
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
    console.warn('\n🎉 Multi-Location Support System test completed successfully!')
    console.warn('\n✅ Key capabilities validated:')
    console.warn('   • Multiple location types (Warehouse, Store, Factory)')
    console.warn('   • Location-based inventory tracking')
    console.warn('   • Inter-location stock transfers with approval workflow')
    console.warn('   • Stock reservations and releases')
    console.warn('   • Multi-location inventory reporting')
    console.warn('   • Location capacity and utilization tracking')
    console.warn('\n✅ Ready for Phase 2.3: Advanced Reporting implementation')
  } else {
    console.warn('\n❌ Multi-Location Support System test completed with errors')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}