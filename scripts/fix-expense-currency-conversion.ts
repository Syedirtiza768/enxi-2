import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'

async function fixExpenseCurrencyConversion() {
  console.log('💱 Fixing expense currency conversions\n')
  
  try {
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ No users found')
      return
    }
    
    // Get company settings
    const companySettings = await prisma.companySettings.findFirst()
    const baseCurrency = companySettings?.defaultCurrency || 'AED'
    console.log(`Base Currency: ${baseCurrency}\n`)
    
    // Get all expenses in non-base currency
    const expenses = await prisma.caseExpense.findMany({
      where: {
        currency: { not: baseCurrency }
      }
    })
    
    console.log(`Found ${expenses.length} expenses in non-base currency\n`)
    
    for (const expense of expenses) {
      // Get exchange rate
      const rate = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrency: expense.currency,
          toCurrency: baseCurrency,
          isActive: true
        },
        orderBy: { rateDate: 'desc' }
      })
      
      if (rate) {
        const newBaseAmount = expense.amount * rate.rate
        
        await prisma.caseExpense.update({
          where: { id: expense.id },
          data: {
            baseAmount: newBaseAmount,
            exchangeRate: rate.rate
          }
        })
        
        console.log(`✅ Updated ${expense.category}: ${expense.amount} ${expense.currency} = ${newBaseAmount.toFixed(2)} ${baseCurrency} (Rate: ${rate.rate})`)
      } else {
        console.log(`⚠️  No rate found for ${expense.currency} to ${baseCurrency}`)
      }
    }
    
    // Recalculate all sales case costs
    console.log('\n📊 Recalculating sales case costs...')
    
    const salesCaseService = new SalesCaseService()
    const affectedCases = await prisma.salesCase.findMany({
      where: {
        id: {
          in: [...new Set(expenses.map(e => e.salesCaseId))]
        }
      }
    })
    
    for (const salesCase of affectedCases) {
      await salesCaseService.updateSalesCase(
        salesCase.id,
        { actualValue: salesCase.actualValue }, // Trigger recalculation
        user.id
      )
      
      const updated = await salesCaseService.getSalesCase(salesCase.id)
      if (updated) {
        console.log(`✅ ${updated.caseNumber}: Cost=${updated.cost.toFixed(2)} ${baseCurrency}`)
      }
    }
    
    console.log('\n✅ Currency conversion fix completed')
    
  } catch (error) {
    console.error('❌ Error fixing currency conversions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixExpenseCurrencyConversion()