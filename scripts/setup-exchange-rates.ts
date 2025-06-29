import { prisma } from '@/lib/db/prisma'

async function setupExchangeRates() {
  console.log('💱 Setting up exchange rates\n')
  
  try {
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ No users found')
      return
    }
    
    // Standard exchange rate: 1 USD = 3.67 AED
    const exchangeRates = [
      { from: 'USD', to: 'AED', rate: 3.67 },
      { from: 'AED', to: 'USD', rate: 0.2725 }, // 1/3.67
      { from: 'EUR', to: 'AED', rate: 4.00 },
      { from: 'AED', to: 'EUR', rate: 0.25 },
      { from: 'GBP', to: 'AED', rate: 4.65 },
      { from: 'AED', to: 'GBP', rate: 0.215 }
    ]
    
    for (const rateData of exchangeRates) {
      // Check if rate already exists
      const existing = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrency: rateData.from,
          toCurrency: rateData.to,
          isActive: true
        }
      })
      
      if (existing) {
        console.log(`✓ Exchange rate ${rateData.from} → ${rateData.to} already exists: ${existing.rate}`)
      } else {
        const rate = await prisma.exchangeRate.create({
          data: {
            fromCurrency: rateData.from,
            toCurrency: rateData.to,
            rate: rateData.rate,
            rateDate: new Date(),
            source: 'manual',
            isActive: true,
            createdBy: user.id
          }
        })
        console.log(`✅ Created exchange rate ${rate.fromCurrency} → ${rate.toCurrency}: ${rate.rate}`)
      }
    }
    
    console.log('\n✅ Exchange rates setup completed')
    
  } catch (error) {
    console.error('❌ Error setting up exchange rates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupExchangeRates()