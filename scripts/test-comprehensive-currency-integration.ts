import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { ShipmentService } from '@/lib/services/shipment.service'
import { SalesWorkflowService } from '@/lib/services/sales-workflow.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'

async function testComprehensiveCurrencyIntegration() {
  console.log('🌍 Testing Comprehensive Currency Integration (Base: AED)\n')
  
  const salesCaseService = new SalesCaseService()
  const shipmentService = new ShipmentService()
  const workflowService = new SalesWorkflowService()
  const journalService = new JournalEntryService()
  
  try {
    // Get company settings
    const companySettings = await prisma.companySettings.findFirst()
    const baseCurrency = companySettings?.defaultCurrency || 'AED'
    console.log(`✅ Company Base Currency: ${baseCurrency}\n`)
    
    // Get a test user
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ No users found')
      return
    }
    
    // 1. Check Stock Lots and Their Currency
    console.log('📦 STOCK LOTS CURRENCY CHECK:')
    const stockLots = await prisma.stockLot.findMany({
      take: 5,
      include: {
        item: true
      }
    })
    
    stockLots.forEach(lot => {
      console.log(`   ${lot.lotNumber}: ${lot.item.name}`)
      console.log(`   Unit Cost: ${lot.unitCost} (Should be in ${baseCurrency})`)
      console.log(`   Total Cost: ${lot.totalCost}`)
      console.log('   ---')
    })
    
    // 2. Check Stock Movements and Their Currency
    console.log('\n📊 STOCK MOVEMENTS CURRENCY CHECK:')
    const movements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        item: true
      }
    })
    
    if (movements.length === 0) {
      console.log('   No stock movements found')
    } else {
      movements.forEach(mov => {
        console.log(`   ${mov.movementNumber}: ${mov.movementType}`)
        console.log(`   Item: ${mov.item.name}`)
        console.log(`   Unit Cost: ${mov.unitCost} ${baseCurrency}`)
        console.log(`   Total Cost: ${mov.totalCost} ${baseCurrency}`)
        console.log('   ---')
      })
    }
    
    // 3. Check Account Currencies
    console.log('\n💰 ACCOUNT CURRENCIES:')
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: '1' } }, // Assets
          { code: { startsWith: '4' } }, // Revenue
          { code: { startsWith: '5' } }  // Expenses
        ]
      },
      take: 10
    })
    
    const currencyGroups = accounts.reduce((acc, account) => {
      acc[account.currency] = (acc[account.currency] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(currencyGroups).forEach(([currency, count]) => {
      console.log(`   ${currency}: ${count} accounts`)
    })
    
    // 4. Check Journal Entries for Currency Handling
    console.log('\n📖 JOURNAL ENTRIES CURRENCY CHECK:')
    const journalEntries = await prisma.journalEntry.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    })
    
    journalEntries.forEach(entry => {
      console.log(`   ${entry.entryNumber}: ${entry.description}`)
      entry.lines.forEach(line => {
        console.log(`     ${line.account.code} - ${line.account.name}: ${line.debit ? 'Dr' : 'Cr'} ${line.amount} ${line.account.currency}`)
      })
      console.log('   ---')
    })
    
    // 5. Check Sales Case with Full Currency Flow
    console.log('\n🔄 TESTING COMPLETE SALES FLOW WITH CURRENCY:')
    
    // Find a sales case with shipments
    const salesCase = await prisma.salesCase.findFirst({
      where: {
        status: 'WON',
        salesOrders: {
          some: {
            shipments: {
              some: {
                status: 'DELIVERED'
              }
            }
          }
        }
      },
      include: {
        customer: true,
        salesOrders: {
          include: {
            shipments: {
              include: {
                items: true
              }
            }
          }
        },
        expenses: true
      }
    })
    
    if (salesCase) {
      console.log(`\n📊 Sales Case: ${salesCase.caseNumber}`)
      console.log(`   Customer: ${salesCase.customer.name} (Currency: ${salesCase.customer.currency})`)
      
      // Check delivered items cost
      for (const order of salesCase.salesOrders) {
        for (const shipment of order.shipments) {
          if (shipment.status === 'DELIVERED') {
            console.log(`\n   📦 Shipment: ${shipment.shipmentNumber}`)
            
            // Check if stock movements were created
            const stockMovements = await prisma.stockMovement.findMany({
              where: {
                referenceType: 'SHIPMENT',
                referenceId: shipment.id
              }
            })
            
            if (stockMovements.length > 0) {
              console.log(`   ✅ Stock movements created: ${stockMovements.length}`)
              stockMovements.forEach(mov => {
                console.log(`      ${mov.item}: ${Math.abs(mov.quantity)} @ ${mov.unitCost} ${baseCurrency} = ${mov.totalCost} ${baseCurrency}`)
              })
            } else {
              console.log(`   ⚠️  No stock movements found for this shipment`)
            }
          }
        }
      }
      
      // Check expenses with currency
      if (salesCase.expenses.length > 0) {
        console.log(`\n   💸 Expenses:`)
        salesCase.expenses.forEach(exp => {
          console.log(`      ${exp.category}: ${exp.amount} ${exp.currency} = ${exp.baseAmount} ${baseCurrency} @ ${exp.exchangeRate}`)
        })
      }
      
      // Get profitability summary
      const summary = await salesCaseService.getSalesCaseSummary(salesCase.id)
      console.log(`\n   📈 Profitability Summary:`)
      console.log(`      Revenue: ${baseCurrency} ${summary.revenue.toFixed(2)}`)
      console.log(`      FIFO Cost: ${baseCurrency} ${summary.fifoCost.toFixed(2)}`)
      console.log(`      Expenses: ${baseCurrency} ${summary.totalExpenses.toFixed(2)}`)
      console.log(`      Profit: ${baseCurrency} ${summary.actualProfit.toFixed(2)}`)
      console.log(`      Margin: ${summary.profitMargin.toFixed(2)}%`)
    }
    
    // 6. Check Audit Trail for Currency
    console.log('\n🔍 AUDIT TRAIL CURRENCY CHECK:')
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: { in: ['CaseExpense', 'JournalEntry', 'StockMovement'] }
      },
      take: 5,
      orderBy: { timestamp: 'desc' }
    })
    
    auditLogs.forEach(log => {
      console.log(`   ${log.action} on ${log.entityType}`)
      if (log.afterData && typeof log.afterData === 'object') {
        const data = log.afterData as any
        if (data.amount !== undefined) {
          console.log(`     Amount: ${data.amount} ${data.currency || baseCurrency}`)
        }
        if (data.baseAmount !== undefined) {
          console.log(`     Base Amount: ${data.baseAmount} ${baseCurrency}`)
        }
        if (data.totalCost !== undefined) {
          console.log(`     Total Cost: ${data.totalCost} ${baseCurrency}`)
        }
      }
      console.log('   ---')
    })
    
    // 7. Create a test transaction to verify currency flow
    console.log('\n🧪 CREATING TEST TRANSACTION:')
    
    // Create a test expense in USD
    const testExpense = await salesCaseService.createExpense({
      salesCaseId: salesCase?.id || '',
      expenseDate: new Date(),
      category: 'Test Currency',
      description: 'Testing currency conversion',
      amount: 1000,
      currency: 'USD',
      vendor: 'Test Vendor',
      createdBy: user.id
    })
    
    console.log(`   Created expense: ${testExpense.amount} ${testExpense.currency}`)
    console.log(`   Base amount: ${testExpense.baseAmount} ${baseCurrency}`)
    console.log(`   Exchange rate: ${testExpense.exchangeRate}`)
    
    // Check if GL entry uses correct currency
    if (testExpense.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: testExpense.accountId }
      })
      console.log(`   GL Account: ${account?.code} - ${account?.name} (${account?.currency})`)
    }
    
    // Clean up test expense
    await prisma.caseExpense.delete({ where: { id: testExpense.id } })
    
    console.log('\n✅ Comprehensive currency integration test completed')
    
  } catch (error) {
    console.error('❌ Error testing currency integration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testComprehensiveCurrencyIntegration()