import { PrismaClient } from "@prisma/client"
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'
import { MovementType } from '@/lib/types/shared-enums'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('🧪 Testing Stock Movement GL Integration...\n')

  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found')
    }

    // Get an item with GL accounts
    const item = await prisma.item.findFirst({
      where: {
        trackInventory: true,
        inventoryAccountId: { not: null },
        cogsAccountId: { not: null }
      },
      include: {
        inventoryAccount: true,
        cogsAccount: true
      }
    })

    if (!item) {
      throw new Error('No item found with GL accounts configured')
    }

    console.log(`📦 Using item: ${item.code} - ${item.name}`)
    console.log(`  - Inventory Account: ${item.inventoryAccount?.code} ${item.inventoryAccount?.name}`)
    console.log(`  - COGS Account: ${item.cogsAccount?.code} ${item.cogsAccount?.name}`)

    // Create stock movement service
    const stockMovementService = new StockMovementService()

    // Test 1: Stock In
    console.log('\n📥 Creating STOCK IN movement...')
    const stockIn = await stockMovementService.createStockMovement({
      itemId: item.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date(),
      quantity: 10,
      unitCost: 100,
      notes: 'Test stock in with GL integration',
      createdBy: adminUser.id
    })

    console.log(`✅ Created stock movement: ${stockIn.movementNumber}`)
    console.log(`  - Quantity: ${stockIn.quantity}`)
    console.log(`  - Unit Cost: ${stockIn.unitCost}`)
    console.log(`  - Total Cost: ${stockIn.totalCost}`)

    // Check for journal entry
    if (stockIn.journalEntryId) {
      const journalEntry = await prisma.journalEntry.findUnique({
        where: { id: stockIn.journalEntryId },
        include: {
          lines: {
            include: {
              account: true
            }
          }
        }
      })

      if (journalEntry) {
        console.log(`\n📖 Journal Entry Created: ${journalEntry.entryNumber}`)
        console.log(`  - Status: ${journalEntry.status}`)
        console.log(`  - Description: ${journalEntry.description}`)
        console.log('  - Lines:')
        
        journalEntry.lines.forEach(line => {
          console.log(`    ${line.account.code} ${line.account.name}:`)
          console.log(`      Debit: $${line.debitAmount.toFixed(2)}, Credit: $${line.creditAmount.toFixed(2)}`)
        })
      }
    } else {
      console.log('❌ No journal entry created for stock in')
    }

    // Test 2: Stock Out
    console.log('\n📤 Creating STOCK OUT movement...')
    const stockOut = await stockMovementService.createStockMovement({
      itemId: item.id,
      movementType: MovementType.STOCK_OUT,
      movementDate: new Date(),
      quantity: 5,
      notes: 'Test stock out with GL integration',
      createdBy: adminUser.id
    })

    console.log(`✅ Created stock movement: ${stockOut.movementNumber}`)
    console.log(`  - Quantity: ${stockOut.quantity}`)
    console.log(`  - Unit Cost: ${stockOut.unitCost}`)
    console.log(`  - Total Cost: ${stockOut.totalCost}`)

    // Check for journal entry
    if (stockOut.journalEntryId) {
      const journalEntry = await prisma.journalEntry.findUnique({
        where: { id: stockOut.journalEntryId },
        include: {
          lines: {
            include: {
              account: true
            }
          }
        }
      })

      if (journalEntry) {
        console.log(`\n📖 Journal Entry Created: ${journalEntry.entryNumber}`)
        console.log(`  - Status: ${journalEntry.status}`)
        console.log(`  - Description: ${journalEntry.description}`)
        console.log('  - Lines:')
        
        journalEntry.lines.forEach(line => {
          console.log(`    ${line.account.code} ${line.account.name}:`)
          console.log(`      Debit: $${line.debitAmount.toFixed(2)}, Credit: $${line.creditAmount.toFixed(2)}`)
        })
      }
    } else {
      console.log('❌ No journal entry created for stock out')
    }

    // Summary
    console.log('\n📊 Summary:')
    const recentMovements = await prisma.stockMovement.findMany({
      where: {
        createdBy: adminUser.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      include: {
        journalEntry: true
      }
    })

    console.log(`Total movements created: ${recentMovements.length}`)
    console.log(`Movements with GL entries: ${recentMovements.filter(m => m.journalEntryId).length}`)
    console.log(`Movements without GL entries: ${recentMovements.filter(m => !m.journalEntryId).length}`)

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })