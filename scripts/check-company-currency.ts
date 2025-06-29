import { prisma } from '@/lib/db/prisma'

async function checkCompanyCurrency() {
  try {
    const companySettings = await prisma.companySettings.findFirst()
    
    if (companySettings) {
      console.log('Company Settings:')
      console.log(`  Name: ${companySettings.companyName}`)
      console.log(`  Default Currency: ${companySettings.defaultCurrency}`)
      console.log(`  Fiscal Year Start: ${companySettings.fiscalYearStart}`)
      console.log(`  Date Format: ${companySettings.dateFormat}`)
    } else {
      console.log('No company settings found')
    }
    
    // Check a few accounts to see their currency
    const accounts = await prisma.account.findMany({
      take: 5,
      select: {
        code: true,
        name: true,
        currency: true
      }
    })
    
    console.log('\nSample Account Currencies:')
    accounts.forEach(acc => {
      console.log(`  ${acc.code} - ${acc.name}: ${acc.currency}`)
    })
    
    // Check some recent expenses
    const expenses = await prisma.caseExpense.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        category: true,
        amount: true,
        currency: true,
        baseAmount: true,
        exchangeRate: true
      }
    })
    
    console.log('\nRecent Expense Currencies:')
    expenses.forEach(exp => {
      console.log(`  ${exp.category}: ${exp.amount} ${exp.currency} (Base: ${exp.baseAmount} @ ${exp.exchangeRate})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCompanyCurrency()