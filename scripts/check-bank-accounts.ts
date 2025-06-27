import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBankAccounts() {
  try {
    console.log('🔍 Checking bank and cash accounts...\n')
    
    // Check for specific account codes
    const accountCodes = ['1100', '1110', '1200']
    
    for (const code of accountCodes) {
      const account = await prisma.account.findFirst({
        where: { code }
      })
      
      if (account) {
        console.log(`✅ Account ${code}: ${account.name}`)
      } else {
        console.log(`❌ Account ${code}: NOT FOUND`)
      }
    }
    
    console.log('\n📋 All accounts in the 1000-1999 range:')
    const allAccounts = await prisma.account.findMany({
      where: {
        code: {
          gte: '1000',
          lt: '2000'
        }
      },
      orderBy: { code: 'asc' }
    })
    
    allAccounts.forEach(account => {
      console.log(`  ${account.code} - ${account.name}`)
    })
    
    // Check customer-specific accounts
    console.log('\n👥 Customer-specific accounts:')
    const customers = await prisma.customer.findMany({
      include: {
        receivableAccount: true,
        revenueAccount: true
      },
      take: 5
    })
    
    customers.forEach(customer => {
      console.log(`\nCustomer: ${customer.name}`)
      console.log(`  Receivable Account: ${customer.receivableAccount?.code || 'NOT SET'} - ${customer.receivableAccount?.name || 'N/A'}`)
      console.log(`  Revenue Account: ${customer.revenueAccount?.code || 'NOT SET'} - ${customer.revenueAccount?.name || 'N/A'}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBankAccounts()