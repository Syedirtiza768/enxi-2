import { PrismaClient } from '@prisma/client'
import { TRANSACTION_ACCOUNTS } from '@/lib/constants/default-accounts'

const prisma = new PrismaClient()

async function verifyRequiredAccounts() {
  try {
    console.log('🔍 Verifying required accounts for transactions...\n')

    const requiredAccounts = [
      // Sales Invoice accounts
      { code: TRANSACTION_ACCOUNTS.SALES_INVOICE.receivable, name: 'Accounts Receivable' },
      { code: TRANSACTION_ACCOUNTS.SALES_INVOICE.revenue, name: 'Sales Revenue' },
      { code: TRANSACTION_ACCOUNTS.SALES_INVOICE.tax, name: 'Sales Tax Payable' },
      { code: TRANSACTION_ACCOUNTS.SALES_INVOICE.discount, name: 'Sales Discounts' },
      
      // Customer Payment accounts
      { code: TRANSACTION_ACCOUNTS.CUSTOMER_PAYMENT.cash, name: 'Cash on Hand' },
      { code: TRANSACTION_ACCOUNTS.CUSTOMER_PAYMENT.bank, name: 'Bank Account' },
      
      // Supplier Invoice accounts
      { code: TRANSACTION_ACCOUNTS.SUPPLIER_INVOICE.payable, name: 'Accounts Payable' },
      { code: TRANSACTION_ACCOUNTS.SUPPLIER_INVOICE.expense, name: 'General Expense' },
      
      // Inventory accounts
      { code: TRANSACTION_ACCOUNTS.INVENTORY.asset, name: 'Inventory' },
      { code: TRANSACTION_ACCOUNTS.INVENTORY.cogs, name: 'Cost of Goods Sold' },
      { code: TRANSACTION_ACCOUNTS.INVENTORY.adjustment, name: 'Inventory Adjustments' },
    ]

    console.log('Required accounts for system operations:')
    console.log('=' .repeat(60))

    let missingAccounts = []
    
    for (const required of requiredAccounts) {
      const account = await prisma.account.findUnique({
        where: { code: required.code }
      })
      
      if (account) {
        console.log(`✅ [${required.code}] ${required.name}`)
        console.log(`   Found: ${account.name} (${account.type})`)
      } else {
        console.log(`❌ [${required.code}] ${required.name}`)
        console.log(`   NOT FOUND - This account is required!`)
        missingAccounts.push(required)
      }
      console.log()
    }

    if (missingAccounts.length > 0) {
      console.log('⚠️  Missing Accounts Summary:')
      console.log('=' .repeat(60))
      missingAccounts.forEach(acc => {
        console.log(`- [${acc.code}] ${acc.name}`)
      })
      console.log('\nPlease run the chart of accounts setup script to create these accounts.')
    } else {
      console.log('✅ All required accounts are present!')
    }

    // Check for duplicate account codes
    console.log('\n🔍 Checking for duplicate account codes...')
    const duplicates = await prisma.$queryRaw`
      SELECT code, COUNT(*) as count 
      FROM Account 
      GROUP BY code 
      HAVING COUNT(*) > 1
    ` as Array<{ code: string; count: number }>

    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate account codes:')
      duplicates.forEach(dup => {
        console.log(`- Code ${dup.code} appears ${dup.count} times`)
      })
    } else {
      console.log('✅ No duplicate account codes found')
    }

  } catch (error) {
    console.error('❌ Error verifying accounts:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
verifyRequiredAccounts()