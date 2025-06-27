import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addMissingAccounts() {
  try {
    console.log('🔧 Adding missing accounts...\n')

    // Add General Expense account
    const generalExpenseAccount = await prisma.account.findUnique({
      where: { code: '7250' }
    })

    if (!generalExpenseAccount) {
      console.log('Creating General Expense account...')
      
      // Find parent account (Operating Expenses)
      const parentAccount = await prisma.account.findFirst({
        where: { 
          OR: [
            { code: '7200' }, // Other Operating Expenses
            { code: '7000' }, // Administrative Expenses
            { code: '6000' }, // Operating Expenses
            { name: 'Operating Expenses' }
          ]
        }
      })

      await prisma.account.create({
        data: {
          code: '7250',
          name: 'General Expense',
          type: 'EXPENSE',
          description: 'Miscellaneous expenses',
          isSystemAccount: true,
          currency: 'USD',
          balance: 0,
          status: 'ACTIVE',
          parentId: parentAccount?.id,
          createdBy: 'system'
        }
      })
      
      console.log('✅ Created General Expense account [7250]')
    } else {
      console.log('✅ General Expense account already exists')
    }

    // Verify all required accounts now exist
    const requiredCodes = ['1200', '4100', '2200', '4300', '1100', '1110', '2100', '7250', '1300', '5100', '5200']
    const missingAccounts = []
    
    console.log('\nVerifying all required accounts:')
    for (const code of requiredCodes) {
      const account = await prisma.account.findUnique({
        where: { code }
      })
      if (account) {
        console.log(`✅ [${code}] ${account.name}`)
      } else {
        console.log(`❌ [${code}] Missing`)
        missingAccounts.push(code)
      }
    }

    if (missingAccounts.length === 0) {
      console.log('\n✅ All required accounts are now present!')
    } else {
      console.log('\n⚠️  Still missing accounts:', missingAccounts.join(', '))
    }

  } catch (error) {
    console.error('❌ Error adding accounts:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addMissingAccounts()