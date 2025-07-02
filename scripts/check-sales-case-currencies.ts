import { prisma } from '@/lib/db/prisma'

async function checkSalesCaseCurrencies() {
  try {
    // Check sales cases and their related entities
    const salesCases = await prisma.salesCase.findMany({
      where: {
        status: { not: 'OPEN' }
      },
      take: 5,
      include: {
        customer: true,
        quotations: {
          take: 1,
          select: {
            totalAmount: true
          }
        },
        salesOrders: {
          take: 1,
          select: {
            totalAmount: true
          }
        }
      }
    })
    
    console.log('Sales Case Currency Analysis:\n')
    
    for (const sc of salesCases) {
      console.log(`📊 ${sc.caseNumber} - ${sc.title}`)
      console.log(`   Customer: ${sc.customer.name} (Currency: ${sc.customer.currency})`)
      console.log(`   Actual Value: ${sc.actualValue}`)
      
      if (sc.quotations.length > 0) {
        console.log(`   Quotation Amount: ${sc.quotations[0].totalAmount}`)
      }
      
      if (sc.salesOrders.length > 0) {
        console.log(`   Sales Order Amount: ${sc.salesOrders[0].totalAmount}`)
      }
      
      console.log('---')
    }
    
    // Check current exchange rates
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        isActive: true,
        OR: [
          { fromCurrency: 'USD', toCurrency: 'AED' },
          { fromCurrency: 'AED', toCurrency: 'USD' }
        ]
      },
      orderBy: { rateDate: 'desc' },
      take: 2
    })
    
    console.log('\nActive Exchange Rates:')
    exchangeRates.forEach(rate => {
      console.log(`  ${rate.fromCurrency} → ${rate.toCurrency}: ${rate.rate} (Date: ${rate.rateDate.toISOString().split('T')[0]})`)
    })
    
    // If no USD to AED rate exists, suggest the standard rate
    const usdToAed = exchangeRates.find(r => r.fromCurrency === 'USD' && r.toCurrency === 'AED')
    if (!usdToAed) {
      console.log('\n⚠️  No USD to AED exchange rate found!')
      console.log('   Standard rate: 1 USD = 3.67 AED')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSalesCaseCurrencies()