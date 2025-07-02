import { prisma } from '@/lib/db/prisma'

async function checkAccount1010() {
  try {
    // Check if account 1010 exists
    const account1010 = await prisma.account.findFirst({
      where: { code: '1010' }
    })

    if (account1010) {
      console.log('✅ Account 1010 found:')
      console.log(JSON.stringify(account1010, null, 2))
    } else {
      console.log('❌ Account 1010 not found')
      
      // List all accounts
      console.log('\n📊 All accounts in database:')
      const allAccounts = await prisma.account.findMany({
        select: { code: true, name: true },
        orderBy: { code: 'asc' }
      })
      
      allAccounts.forEach(acc => {
        console.log(`  ${acc.code} - ${acc.name}`)
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAccount1010()