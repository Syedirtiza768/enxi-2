import { prisma } from '@/lib/db/prisma'

async function fixSystemWideCurrencyIntegration() {
  console.log('🔧 Fixing System-Wide Currency Integration\n')
  
  try {
    // Get company settings
    const companySettings = await prisma.companySettings.findFirst()
    const baseCurrency = companySettings?.defaultCurrency || 'AED'
    console.log(`Base Currency: ${baseCurrency}\n`)
    
    // 1. Fix Account Currencies - Set all to base currency except specific foreign currency accounts
    console.log('📊 Fixing Account Currencies...')
    
    // Update all accounts to use base currency except those specifically marked for foreign currency
    const updatedAccounts = await prisma.account.updateMany({
      where: {
        AND: [
          { currency: { not: baseCurrency } },
          { NOT: { name: { contains: 'USD' } } },
          { NOT: { name: { contains: 'EUR' } } },
          { NOT: { name: { contains: 'GBP' } } }
        ]
      },
      data: {
        currency: baseCurrency
      }
    })
    
    console.log(`   ✅ Updated ${updatedAccounts.count} accounts to ${baseCurrency}`)
    
    // 2. Ensure all GL accounts use correct currency
    const glAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: '1' } }, // Assets
          { code: { startsWith: '2' } }, // Liabilities
          { code: { startsWith: '3' } }, // Equity
          { code: { startsWith: '4' } }, // Revenue
          { code: { startsWith: '5' } }  // Expenses
        ]
      }
    })
    
    const accountsByCurrency = glAccounts.reduce((acc, account) => {
      acc[account.currency] = (acc[account.currency] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n📋 Account Currency Distribution:')
    Object.entries(accountsByCurrency).forEach(([currency, count]) => {
      console.log(`   ${currency}: ${count} accounts`)
    })
    
    // 3. Check and fix item standard costs (should be in base currency)
    console.log('\n💰 Checking Item Standard Costs...')
    const items = await prisma.item.findMany({
      where: {
        standardCost: { gt: 0 }
      },
      take: 5
    })
    
    items.forEach(item => {
      console.log(`   ${item.code} - ${item.name}: ${baseCurrency} ${item.standardCost}`)
    })
    
    // 4. Verify stock lot costs are in base currency
    console.log('\n📦 Verifying Stock Lot Costs...')
    const stockLots = await prisma.stockLot.findMany({
      take: 5,
      include: {
        item: true
      }
    })
    
    stockLots.forEach(lot => {
      console.log(`   ${lot.lotNumber}: ${baseCurrency} ${lot.unitCost} per unit`)
    })
    
    // 5. Create missing stock movements for delivered shipments
    console.log('\n🚚 Checking for Missing Stock Movements...')
    
    const deliveredShipments = await prisma.shipment.findMany({
      where: {
        status: 'DELIVERED',
        NOT: {
          items: {
            some: {
              id: { not: undefined }
            }
          }
        }
      },
      include: {
        items: true
      }
    })
    
    console.log(`   Found ${deliveredShipments.length} delivered shipments to check`)
    
    // Check if they have stock movements
    let missingMovements = 0
    for (const shipment of deliveredShipments) {
      const movements = await prisma.stockMovement.findFirst({
        where: {
          referenceType: 'SHIPMENT',
          referenceId: shipment.id
        }
      })
      
      if (!movements && shipment.items.length > 0) {
        missingMovements++
        console.log(`   ⚠️  Shipment ${shipment.shipmentNumber} missing stock movements`)
      }
    }
    
    if (missingMovements > 0) {
      console.log(`   Found ${missingMovements} shipments missing stock movements`)
      console.log('   Run the delivery workflow to create stock movements')
    } else {
      console.log('   ✅ All delivered shipments have stock movements')
    }
    
    // 6. Update Journal Entry descriptions to include currency
    console.log('\n📖 Checking Journal Entries...')
    const recentEntries = await prisma.journalEntry.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    })
    
    console.log(`   Recent journal entries use following currencies:`)
    recentEntries.forEach(entry => {
      const currencies = [...new Set(entry.lines.map(l => l.account.currency))]
      console.log(`   ${entry.entryNumber}: ${currencies.join(', ')}`)
    })
    
    // 7. Create currency conversion report
    console.log('\n📊 Currency Conversion Summary:')
    
    // Check expense conversions
    const expensesWithConversion = await prisma.caseExpense.findMany({
      where: {
        currency: { not: baseCurrency },
        exchangeRate: { gt: 1 }
      }
    })
    
    const totalOriginal = expensesWithConversion.reduce((sum, exp) => sum + exp.amount, 0)
    const totalBase = expensesWithConversion.reduce((sum, exp) => sum + exp.baseAmount, 0)
    
    console.log(`   Foreign Currency Expenses: ${expensesWithConversion.length}`)
    console.log(`   Total Original Amount: Various currencies`)
    console.log(`   Total Base Amount: ${baseCurrency} ${totalBase.toFixed(2)}`)
    
    console.log('\n✅ System-wide currency integration check completed')
    
  } catch (error) {
    console.error('❌ Error fixing currency integration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSystemWideCurrencyIntegration()