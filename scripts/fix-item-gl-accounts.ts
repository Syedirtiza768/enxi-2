import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('🔧 Fixing Item GL Account Assignments...\n')

  try {
    // Get the correct accounts
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1300' } // Inventory account
    })

    const cogsAccount = await prisma.account.findFirst({
      where: { code: '5100' } // Cost of Goods Sold
    })

    const salesAccount = await prisma.account.findFirst({
      where: { code: '4000' } // Sales Revenue - Products
    })

    if (!inventoryAccount || !cogsAccount) {
      throw new Error('Required GL accounts not found')
    }

    console.log('📊 Using GL Accounts:')
    console.log(`  - Inventory: ${inventoryAccount.code} ${inventoryAccount.name}`)
    console.log(`  - COGS: ${cogsAccount.code} ${cogsAccount.name}`)
    console.log(`  - Sales: ${salesAccount?.code} ${salesAccount?.name || 'Not found'}`)

    // Update all items that track inventory
    const result = await prisma.item.updateMany({
      where: {
        trackInventory: true
      },
      data: {
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount?.id
      }
    })

    console.log(`\n✅ Updated ${result.count} items with correct GL accounts`)

    // Verify the update
    const sampleItem = await prisma.item.findFirst({
      where: { code: 'MP-1000' },
      include: {
        inventoryAccount: true,
        cogsAccount: true,
        salesAccount: true
      }
    })

    if (sampleItem) {
      console.log('\n📦 Sample Item Verification (MP-1000):')
      console.log(`  - Inventory Account: ${sampleItem.inventoryAccount?.code} ${sampleItem.inventoryAccount?.name}`)
      console.log(`  - COGS Account: ${sampleItem.cogsAccount?.code} ${sampleItem.cogsAccount?.name}`)
      console.log(`  - Sales Account: ${sampleItem.salesAccount?.code || 'N/A'} ${sampleItem.salesAccount?.name || 'N/A'}`)
    }

    console.log('\n✅ GL account fix completed successfully!')

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