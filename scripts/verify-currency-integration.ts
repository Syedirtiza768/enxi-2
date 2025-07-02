import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'

async function verifyCurrencyIntegration() {
  console.log('🔍 Verifying Currency Integration in Existing Data\n')
  
  const salesCaseService = new SalesCaseService()
  
  try {
    // Get company settings
    const companySettings = await prisma.companySettings.findFirst()
    const baseCurrency = companySettings?.defaultCurrency || 'AED'
    console.log(`✅ Base Currency: ${baseCurrency}\n`)
    
    // 1. Find a complete sales case with all data
    const salesCase = await prisma.salesCase.findFirst({
      where: {
        AND: [
          { status: 'WON' },
          { expenses: { some: {} } },
          {
            salesOrders: {
              some: {
                shipments: {
                  some: { status: 'DELIVERED' }
                }
              }
            }
          }
        ]
      },
      include: {
        customer: true,
        expenses: true,
        salesOrders: {
          include: {
            shipments: {
              include: {
                items: {
                  include: {
                    item: true
                  }
                }
              }
            },
            invoices: true
          }
        }
      }
    })
    
    if (!salesCase) {
      console.log('❌ No complete sales case found with expenses and deliveries')
      return
    }
    
    console.log(`📊 Analyzing Sales Case: ${salesCase.caseNumber}`)
    console.log(`   Customer: ${salesCase.customer.name} (${salesCase.customer.currency})\n`)
    
    // 2. Check Expenses
    console.log('💸 EXPENSES ANALYSIS:')
    let totalExpensesBase = 0
    const expensesByCurrency: Record<string, number> = {}
    
    salesCase.expenses.forEach(exp => {
      if (!expensesByCurrency[exp.currency]) {
        expensesByCurrency[exp.currency] = 0
      }
      expensesByCurrency[exp.currency] += exp.amount
      totalExpensesBase += exp.baseAmount
      
      console.log(`   ${exp.category}: ${exp.amount} ${exp.currency} = ${exp.baseAmount} ${baseCurrency} @ ${exp.exchangeRate}`)
    })
    
    console.log(`\n   Total Expenses: ${baseCurrency} ${totalExpensesBase.toFixed(2)}`)
    console.log('   By Currency:')
    Object.entries(expensesByCurrency).forEach(([currency, amount]) => {
      console.log(`     ${currency}: ${amount}`)
    })
    
    // 3. Check Stock Movements
    console.log('\n📦 STOCK MOVEMENTS ANALYSIS:')
    let totalFIFOCost = 0
    
    for (const order of salesCase.salesOrders) {
      for (const shipment of order.shipments) {
        if (shipment.status === 'DELIVERED') {
          console.log(`\n   Shipment: ${shipment.shipmentNumber}`)
          
          // Get stock movements
          const movements = await prisma.stockMovement.findMany({
            where: {
              referenceType: 'SHIPMENT',
              referenceId: shipment.id
            },
            include: { item: true }
          })
          
          if (movements.length > 0) {
            movements.forEach(mov => {
              console.log(`     ${mov.item.name}: ${Math.abs(mov.quantity)} @ ${mov.unitCost} = ${mov.totalCost} ${baseCurrency}`)
              totalFIFOCost += mov.totalCost
            })
          } else {
            console.log('     ⚠️  No stock movements found')
          }
        }
      }
    }
    
    console.log(`\n   Total FIFO Cost: ${baseCurrency} ${totalFIFOCost.toFixed(2)}`)
    
    // 4. Check GL Entries
    console.log('\n📖 GL ENTRIES ANALYSIS:')
    
    // Get GL entries for this sales case
    const glEntries = await prisma.journalEntry.findMany({
      where: {
        OR: [
          { referenceType: 'SALES_CASE', referenceId: salesCase.id },
          { 
            referenceType: 'SALES_ORDER',
            referenceId: { in: salesCase.salesOrders.map(o => o.id) }
          }
        ]
      },
      include: {
        lines: {
          include: { account: true }
        }
      }
    })
    
    if (glEntries.length > 0) {
      glEntries.forEach(entry => {
        console.log(`\n   ${entry.entryNumber}: ${entry.description}`)
        
        const currencies = [...new Set(entry.lines.map(l => l.account.currency))]
        console.log(`   Currencies used: ${currencies.join(', ')}`)
        
        entry.lines.forEach(line => {
          const dr = line.debit ? `Dr ${line.debit}` : ''
          const cr = line.credit ? `Cr ${line.credit}` : ''
          console.log(`     ${line.account.code} (${line.account.currency}): ${dr}${cr}`)
        })
      })
    } else {
      console.log('   No GL entries found for this sales case')
    }
    
    // 5. Calculate Profitability
    console.log('\n📈 PROFITABILITY ANALYSIS:')
    
    const summary = await salesCaseService.getSalesCaseSummary(salesCase.id)
    
    console.log(`   Revenue: ${baseCurrency} ${summary.revenue.toFixed(2)}`)
    console.log(`   FIFO Cost: ${baseCurrency} ${summary.fifoCost.toFixed(2)}`)
    console.log(`   Direct Expenses: ${baseCurrency} ${summary.totalExpenses.toFixed(2)}`)
    console.log(`   Total Cost: ${baseCurrency} ${(summary.fifoCost + summary.totalExpenses).toFixed(2)}`)
    console.log(`   Profit: ${baseCurrency} ${summary.actualProfit.toFixed(2)}`)
    console.log(`   Margin: ${summary.profitMargin.toFixed(2)}%`)
    
    // 6. Verify Currency Consistency
    console.log('\n✅ CURRENCY CONSISTENCY CHECK:')
    
    const issues = []
    
    // Check if all amounts are properly converted
    if (Math.abs(totalExpensesBase - summary.totalExpenses) > 0.01) {
      issues.push(`Expense total mismatch: DB=${totalExpensesBase}, Summary=${summary.totalExpenses}`)
    }
    
    if (Math.abs(totalFIFOCost - summary.fifoCost) > 0.01) {
      issues.push(`FIFO cost mismatch: Calculated=${totalFIFOCost}, Summary=${summary.fifoCost}`)
    }
    
    // Check GL account currencies
    const nonBaseAccounts = await prisma.account.count({
      where: {
        currency: { not: baseCurrency },
        NOT: {
          OR: [
            { name: { contains: 'USD' } },
            { name: { contains: 'EUR' } },
            { name: { contains: 'GBP' } }
          ]
        }
      }
    })
    
    if (nonBaseAccounts > 0) {
      issues.push(`${nonBaseAccounts} GL accounts not in base currency`)
    }
    
    if (issues.length === 0) {
      console.log('   ✅ All currency conversions are consistent')
    } else {
      console.log('   ⚠️  Issues found:')
      issues.forEach(issue => console.log(`     - ${issue}`))
    }
    
    console.log('\n✅ Currency integration verification completed')
    
  } catch (error) {
    console.error('❌ Error verifying currency integration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyCurrencyIntegration()