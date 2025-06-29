import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'

async function testSalesCaseProfitability() {
  console.log('🔍 Testing Sales Case Profitability Analysis\n')
  
  const salesCaseService = new SalesCaseService()
  
  try {
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
    console.log(`   Estimated Value: $${salesCase.estimatedValue.toFixed(2)}`)
    console.log(`   Actual Value: $${salesCase.actualValue.toFixed(2)}`)
    console.log(`   Cost: $${salesCase.cost.toFixed(2)}`)
    console.log(`   Profit Margin: ${salesCase.profitMargin.toFixed(2)}%\n`)
    
    // Get detailed summary
    console.log('📈 Getting detailed profitability summary...')
    const summary = await salesCaseService.getSalesCaseSummary(salesCase.id)
    
    console.log('\n💰 Revenue Analysis:')
    console.log(`   Total Quotations: ${summary.totalQuotations}`)
    console.log(`   Total Orders: ${summary.totalOrders}`)
    console.log(`   Total Invoiced: $${summary.totalInvoiced.toFixed(2)}`)
    console.log(`   Total Paid: $${summary.totalPaid.toFixed(2)}`)
    console.log(`   Revenue (for profit calc): $${summary.revenue.toFixed(2)}`)
    
    console.log('\n💸 Cost Analysis:')
    console.log(`   Direct Expenses: $${summary.totalExpenses.toFixed(2)}`)
    console.log(`   FIFO Product Cost: $${summary.fifoCost.toFixed(2)}`)
    console.log(`   Total Cost: $${(summary.totalExpenses + summary.fifoCost).toFixed(2)}`)
    
    console.log('\n📊 Profitability:')
    console.log(`   Estimated Profit: $${summary.estimatedProfit.toFixed(2)}`)
    console.log(`   Actual Profit: $${summary.actualProfit.toFixed(2)}`)
    console.log(`   Profit Margin: ${summary.profitMargin.toFixed(2)}%`)
    
    // Check expenses breakdown
    if (salesCase.expenses.length > 0) {
      console.log('\n📝 Expense Breakdown:')
      const expensesByCategory = salesCase.expenses.reduce((acc, exp) => {
        if (exp.status === 'APPROVED' || exp.status === 'PAID') {
          acc[exp.category] = (acc[exp.category] || 0) + exp.baseAmount
        }
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(expensesByCategory).forEach(([category, amount]) => {
        console.log(`   ${category}: $${amount.toFixed(2)}`)
      })
    }
    
    // Test metrics endpoint
    console.log('\n📊 Testing Sales Case Metrics...')
    const metrics = await salesCaseService.getSalesCaseMetrics()
    
    console.log('\n📈 Overall Metrics:')
    console.log(`   Total Cases: ${metrics.totalCases}`)
    console.log(`   Open Cases: ${metrics.openCases}`)
    console.log(`   Won Cases: ${metrics.wonCases}`)
    console.log(`   Lost Cases: ${metrics.lostCases}`)
    console.log(`   Total Estimated Value: $${metrics.totalEstimatedValue.toFixed(2)}`)
    console.log(`   Total Actual Value: $${metrics.totalActualValue.toFixed(2)}`)
    console.log(`   Total Profit: $${metrics.totalProfit.toFixed(2)}`)
    console.log(`   Average Win Rate: ${metrics.averageWinRate.toFixed(2)}%`)
    console.log(`   Average Margin: ${metrics.averageMargin.toFixed(2)}%`)
    
    // Verify calculation logic
    console.log('\n🔍 Verifying Calculation Logic:')
    
    // Check profit calculation
    const calculatedProfit = salesCase.actualValue - salesCase.cost
    const expectedProfit = summary.actualProfit
    console.log(`   DB Profit (actualValue - cost): $${calculatedProfit.toFixed(2)}`)
    console.log(`   Summary Profit: $${expectedProfit.toFixed(2)}`)
    
    if (Math.abs(calculatedProfit - expectedProfit) > 0.01) {
      console.log(`   ⚠️  Profit calculation mismatch!`)
    } else {
      console.log(`   ✅ Profit calculation matches`)
    }
    
    // Check margin calculation
    const calculatedMargin = salesCase.actualValue > 0 ? 
      ((salesCase.actualValue - salesCase.cost) / salesCase.actualValue) * 100 : 0
    console.log(`   DB Margin: ${salesCase.profitMargin.toFixed(2)}%`)
    console.log(`   Calculated Margin: ${calculatedMargin.toFixed(2)}%`)
    console.log(`   Summary Margin: ${summary.profitMargin.toFixed(2)}%`)
    
    if (Math.abs(salesCase.profitMargin - calculatedMargin) > 0.01) {
      console.log(`   ⚠️  Margin calculation mismatch!`)
    } else {
      console.log(`   ✅ Margin calculation matches`)
    }
    
    console.log('\n✅ Sales case profitability analysis test completed')
    
  } catch (error) {
    console.error('❌ Error testing profitability:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSalesCaseProfitability()