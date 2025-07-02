import { prisma } from '../lib/db/prisma'

async function listGLAccounts() {
  try {
    console.log('Fetching GL Accounts...\n')
    
    // Get inventory-related accounts
    const inventoryAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: '12' } },
          { code: { startsWith: '13' } },
          { code: { startsWith: '14' } },
          { name: { contains: 'inventory' } },
          { name: { contains: 'stock' } },
          { name: { contains: 'Inventory' } },
          { name: { contains: 'Stock' } }
        ],
        type: 'ASSET'
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' }
    })
    
    console.log('INVENTORY ACCOUNTS (Asset accounts for inventory):')
    inventoryAccounts.forEach(acc => {
      console.log(`  ${acc.code} - ${acc.name} (ID: ${acc.id})`)
    })
    
    // Get COGS accounts
    const cogsAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: '50' } },
          { code: { startsWith: '51' } },
          { name: { contains: 'cost of goods' } },
          { name: { contains: 'cogs' } },
          { name: { contains: 'Cost of Goods' } },
          { name: { contains: 'COGS' } }
        ],
        type: 'EXPENSE'
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' }
    })
    
    console.log('\n\nCOGS ACCOUNTS (Expense accounts for cost of goods sold):')
    cogsAccounts.forEach(acc => {
      console.log(`  ${acc.code} - ${acc.name} (ID: ${acc.id})`)
    })
    
    // Get sales accounts
    const salesAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: '40' } },
          { code: { startsWith: '41' } },
          { name: { contains: 'sales' } },
          { name: { contains: 'revenue' } },
          { name: { contains: 'Sales' } },
          { name: { contains: 'Revenue' } }
        ],
        type: 'INCOME'
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' }
    })
    
    console.log('\n\nSALES ACCOUNTS (Income accounts for sales):')
    salesAccounts.forEach(acc => {
      console.log(`  ${acc.code} - ${acc.name} (ID: ${acc.id})`)
    })
    
    console.log('\n\nSUMMARY:')
    console.log(`- Inventory Accounts: ${inventoryAccounts.length}`)
    console.log(`- COGS Accounts: ${cogsAccounts.length}`)
    console.log(`- Sales Accounts: ${salesAccounts.length}`)
    
  } catch (error: any) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

listGLAccounts()