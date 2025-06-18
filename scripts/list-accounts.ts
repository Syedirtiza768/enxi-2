import { prisma } from '../lib/db/prisma'

async function listAccounts() {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        type: { in: ['ASSET', 'EXPENSE'] }
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true
      }
    })
    
    console.log('Available accounts:')
    console.log('\nASSET accounts:')
    accounts.filter(a => a.type === 'ASSET').forEach(account => {
      console.log(`- ${account.code}: ${account.name} (${account.id})`)
    })
    
    console.log('\nEXPENSE accounts:')
    accounts.filter(a => a.type === 'EXPENSE').forEach(account => {
      console.log(`- ${account.code}: ${account.name} (${account.id})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAccounts()