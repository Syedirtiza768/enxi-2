import { PrismaClient, AccountType } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.warn('🏦 Setting up GL accounts for inventory...\n')

  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed-admin.ts first.')
    }

    // Create GL accounts for inventory
    const accounts = [
      // Asset accounts - Inventory
      {
        code: '1200',
        name: 'Inventory - Raw Materials',
        type: AccountType.ASSET,
        description: 'Raw materials inventory',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '1210',
        name: 'Inventory - Work in Progress',
        type: AccountType.ASSET,
        description: 'Work in progress inventory',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '1220',
        name: 'Inventory - Finished Goods',
        type: AccountType.ASSET,
        description: 'Finished goods inventory',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '1230',
        name: 'Inventory - Packaging Materials',
        type: AccountType.ASSET,
        description: 'Packaging materials inventory',
        currency: 'USD',
        createdBy: adminUser.id
      },
      
      // Income accounts - Sales Revenue
      {
        code: '4000',
        name: 'Sales Revenue - Products',
        type: AccountType.INCOME,
        description: 'Revenue from product sales',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '4010',
        name: 'Sales Revenue - Services',
        type: AccountType.INCOME,
        description: 'Revenue from service sales',
        currency: 'USD',
        createdBy: adminUser.id
      },
      
      // Expense accounts - COGS
      {
        code: '5000',
        name: 'COGS - Products',
        type: AccountType.EXPENSE,
        description: 'Cost of goods sold for products',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '5010',
        name: 'COGS - Raw Materials',
        type: AccountType.EXPENSE,
        description: 'Cost of raw materials consumed',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '5020',
        name: 'COGS - Services',
        type: AccountType.EXPENSE,
        description: 'Cost of services delivered',
        currency: 'USD',
        createdBy: adminUser.id
      },
      
      // Expense accounts - Inventory adjustments
      {
        code: '5900',
        name: 'Inventory Adjustments',
        type: AccountType.EXPENSE,
        description: 'Inventory adjustment account',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '5910',
        name: 'Inventory Write-offs',
        type: AccountType.EXPENSE,
        description: 'Inventory write-off expense',
        currency: 'USD',
        createdBy: adminUser.id
      },
      {
        code: '5920',
        name: 'Inventory Shrinkage',
        type: AccountType.EXPENSE,
        description: 'Inventory shrinkage and loss',
        currency: 'USD',
        createdBy: adminUser.id
      }
    ]

    console.warn('Creating GL accounts...')
    
    for (const account of accounts) {
      // Check if account already exists
      const existing = await prisma.account.findUnique({
        where: { code: account.code }
      })
      
      if (existing) {
        console.warn(`✓ Account ${account.code} - ${account.name} already exists`)
      } else {
        await prisma.account.create({ data: account })
        console.warn(`✅ Created account ${account.code} - ${account.name}`)
      }
    }

    // Now update categories with default GL accounts
    console.warn('\n📁 Updating categories with default GL accounts...')
    
    // Get the accounts we'll use as defaults
    const electronicsInventory = await prisma.account.findUnique({ where: { code: '1220' } }) // Finished goods
    const rawMaterialsInventory = await prisma.account.findUnique({ where: { code: '1200' } })
    const packagingInventory = await prisma.account.findUnique({ where: { code: '1230' } })
    
    const productsCOGS = await prisma.account.findUnique({ where: { code: '5000' } })
    const rawMaterialsCOGS = await prisma.account.findUnique({ where: { code: '5010' } })
    
    const productRevenue = await prisma.account.findUnique({ where: { code: '4000' } })

    // Update categories
    const categories = await prisma.category.findMany()
    
    for (const category of categories) {
      let inventoryAccountId = electronicsInventory?.id
      let cogsAccountId = productsCOGS?.id
      let salesAccountId = productRevenue?.id
      
      // Set specific accounts based on category
      if (category.code === 'RAW') {
        inventoryAccountId = rawMaterialsInventory?.id
        cogsAccountId = rawMaterialsCOGS?.id
      } else if (category.code === 'PACK') {
        inventoryAccountId = packagingInventory?.id
      }
      
      // Update items in this category with default GL accounts if they don't have them
      const itemsToUpdate = await prisma.item.findMany({
        where: {
          categoryId: category.id,
          OR: [
            { inventoryAccountId: null },
            { cogsAccountId: null },
            { salesAccountId: null }
          ]
        }
      })
      
      console.warn(`\nCategory ${category.name}:`)
      console.warn(`- Default Inventory Account: ${inventoryAccountId ? accounts.find(a => a.code === (category.code === 'RAW' ? '1200' : category.code === 'PACK' ? '1230' : '1220'))?.name : 'None'}`)
      console.warn(`- Default COGS Account: ${cogsAccountId ? accounts.find(a => a.code === (category.code === 'RAW' ? '5010' : '5000'))?.name : 'None'}`)
      console.warn(`- Default Sales Account: ${salesAccountId ? productRevenue?.name : 'None'}`)
      
      if (itemsToUpdate.length > 0) {
        console.warn(`- Updating ${itemsToUpdate.length} items...`)
        
        for (const item of itemsToUpdate) {
          await prisma.item.update({
            where: { id: item.id },
            data: {
              inventoryAccountId: item.inventoryAccountId || inventoryAccountId,
              cogsAccountId: item.cogsAccountId || cogsAccountId,
              salesAccountId: item.salesAccountId || salesAccountId
            }
          })
        }
        console.warn(`✅ Updated ${itemsToUpdate.length} items with default GL accounts`)
      } else {
        console.warn('- All items already have GL accounts')
      }
    }

    console.warn('\n✅ GL account setup completed successfully!')
    
    // Display summary
    console.warn('\n📊 GL Account Structure:')
    console.warn('\nInventory Accounts (Asset):')
    console.warn('- 1200: Raw Materials')
    console.warn('- 1210: Work in Progress')
    console.warn('- 1220: Finished Goods (Electronics)')
    console.warn('- 1230: Packaging Materials')
    console.warn('\nSales Revenue Accounts (Income):')
    console.warn('- 4000: Product Sales')
    console.warn('- 4010: Service Sales')
    console.warn('\nCost Accounts (Expense):')
    console.warn('- 5000: COGS - Products')
    console.warn('- 5010: COGS - Raw Materials')
    console.warn('- 5020: COGS - Services')
    console.warn('- 5900: Inventory Adjustments')
    console.warn('- 5910: Inventory Write-offs')
    console.warn('- 5920: Inventory Shrinkage')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })