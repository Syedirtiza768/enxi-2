import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'

async function testSalesCaseProfitability() {
  console.log('🔍 Testing Sales Case Profitability Analysis (in AED)\n')
  
  const salesCaseService = new SalesCaseService()
  
  try {
    // Get company settings
    const companySettings = await prisma.companySettings.findFirst()
    const currency = companySettings?.defaultCurrency || 'AED'
    
    // Get a sample sales case
    const salesCase = await prisma.salesCase.findFirst({
      where: {
        status: { not: 'OPEN' }
      },
      include: {
        customer: true,
        quotations: true,
        salesOrders: true,
        expenses: true
      }
    })
    
    if (!salesCase) {
      console.log('❌ No closed sales cases found to test profitability')
      return
    }
    
    console.log(`📊 Testing Sales Case: ${salesCase.caseNumber} - ${salesCase.title}`)
    console.log(`   Customer: ${salesCase.customer.name}`)
    console.log(`   Status: ${salesCase.status}`)
    console.log(`   Estimated Value: ${currency} ${salesCase.estimatedValue.toFixed(2)}`)
    console.log(`   Actual Value: ${currency} ${salesCase.actualValue.toFixed(2)}`)
    console.log(`   Cost: ${currency} ${salesCase.cost.toFixed(2)}`)
    console.log(`   Profit Margin: ${salesCase.profitMargin.toFixed(2)}%\n`)
    
    // Get detailed summary
    console.log('📈 Getting detailed profitability summary...')
    const summary = await salesCaseService.getSalesCaseSummary(salesCase.id)
    
    console.log('\n💰 Revenue Analysis:')
    console.log(`   Total Quotations: ${summary.totalQuotations}`)
    console.log(`   Total Orders: ${summary.totalOrders}`)
    console.log(`   Total Invoiced: ${currency} ${summary.totalInvoiced.toFixed(2)}`)
    console.log(`   Total Paid: ${currency} ${summary.totalPaid.toFixed(2)}`)
    console.log(`   Revenue (for profit calc): ${currency} ${summary.revenue.toFixed(2)}`)
    
    console.log('\n💸 Cost Analysis:')
    console.log(`   Direct Expenses: ${currency} ${summary.totalExpenses.toFixed(2)}`)
    console.log(`   FIFO Product Cost: ${currency} ${summary.fifoCost.toFixed(2)}`)
    console.log(`   Total Cost: ${currency} ${(summary.totalExpenses + summary.fifoCost).toFixed(2)}`)
    
    console.log('\n📊 Profitability:')
    console.log(`   Estimated Profit: ${currency} ${summary.estimatedProfit.toFixed(2)}`)
    console.log(`   Actual Profit: ${currency} ${summary.actualProfit.toFixed(2)}`)
    console.log(`   Profit Margin: ${summary.profitMargin.toFixed(2)}%`)
    
    // Check expenses breakdown with currency
    if (salesCase.expenses.length > 0) {
      console.log('\n📝 Expense Breakdown:')
      const expensesByCategory = salesCase.expenses.reduce((acc, exp) => {
        if (exp.status === 'APPROVED' || exp.status === 'PAID') {
          if (!acc[exp.category]) {
            acc[exp.category] = { baseAmount: 0, originalAmount: 0, currency: exp.currency }
          }
          acc[exp.category].baseAmount += exp.baseAmount
          acc[exp.category].originalAmount += exp.amount
        }
        return acc
      }, {} as Record<string, { baseAmount: number, originalAmount: number, currency: string }>)
      
      Object.entries(expensesByCategory).forEach(([category, data]) => {
        console.log(`   ${category}: ${currency} ${data.baseAmount.toFixed(2)} (${data.originalAmount} ${data.currency})`)
      })
    }
    
    // Show conversion rate if expenses in foreign currency
    const foreignExpenses = salesCase.expenses.filter(e => e.currency !== currency)
    if (foreignExpenses.length > 0) {
      console.log('\n💱 Currency Conversions:')
      const uniqueCurrencies = [...new Set(foreignExpenses.map(e => e.currency))]
      for (const curr of uniqueCurrencies) {
        const rate = await prisma.exchangeRate.findFirst({
          where: {
            fromCurrency: curr,
            toCurrency: currency,
            isActive: true
          }
        })
        if (rate) {
          console.log(`   1 ${curr} = ${rate.rate} ${currency}`)
        }
      }
    }
    
    console.log('\n✅ Sales case profitability analysis test completed')
    
  } catch (error) {
    console.error('❌ Error testing profitability:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSalesCaseProfitability()