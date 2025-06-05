import { NextRequest, NextResponse } from 'next/server'
import { CurrencyService } from '@/lib/services/accounting/currency.service'
import { z } from 'zod'

const createExchangeRateSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
  rateDate: z.string().datetime(),
  source: z.string().optional()
})

const bulkUpdateSchema = z.object({
  rates: z.array(z.object({
    fromCurrency: z.string().length(3),
    toCurrency: z.string().length(3),
    rate: z.number().positive(),
    rateDate: z.string().datetime(),
    source: z.string().optional()
  }))
})

const convertCurrencySchema = z.object({
  amount: z.number(),
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3)
})

export async function GET(_request: NextRequest) {
  try {
    const currencyService = new CurrencyService()
    const { searchParams } = new URL(request.url)
    
    const action = searchParams.get('action')
    
    switch (action) {
      case 'rates':
        const rates = await currencyService.getActiveExchangeRates()
        return NextResponse.json(rates)
        
      case 'history':
        const fromCurrency = searchParams.get('fromCurrency')
        const toCurrency = searchParams.get('toCurrency')
        const limit = parseInt(searchParams.get('limit') || '30')
        
        if (!fromCurrency || !toCurrency) {
          return NextResponse.json(
            { error: 'fromCurrency and toCurrency are required for history' },
            { status: 400 }
          )
        }
        
        const history = await currencyService.getExchangeRateHistory(
          fromCurrency,
          toCurrency,
          limit
        )
        return NextResponse.json(history)
        
      case 'currencies':
        const currencies = currencyService.getSupportedCurrencies()
        return NextResponse.json(currencies)
        
      case 'rate':
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        
        if (!from || !to) {
          return NextResponse.json(
            { error: 'from and to currencies are required' },
            { status: 400 }
          )
        }
        
        const rate = await currencyService.getExchangeRate(from, to)
        return NextResponse.json({ rate, fromCurrency: from, toCurrency: to })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: rates, history, currencies, or rate' },
          { status: 400 }
        )
    }
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    // TODO: Add authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const currencyService = new CurrencyService()
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'convert':
        const conversionData = convertCurrencySchema.parse(body)
        const result = await currencyService.convertCurrency(
          conversionData.amount,
          conversionData.fromCurrency,
          conversionData.toCurrency
        )
        return NextResponse.json(result)
        
      case 'bulk':
        const bulkData = bulkUpdateSchema.parse(body)
        const bulkResults = await currencyService.bulkUpdateExchangeRates(
          bulkData.rates.map(rate => ({
            ...rate,
            rateDate: new Date(rate.rateDate)
          })),
          userId
        )
        return NextResponse.json({
          message: `Updated ${bulkResults.length} exchange rates`,
          rates: bulkResults
        })
        
      default:
        // Single rate creation
        const rateData = createExchangeRateSchema.parse(body)
        const exchangeRate = await currencyService.setExchangeRate({
          ...rateData,
          rateDate: new Date(rateData.rateDate),
          createdBy: userId
        })
        return NextResponse.json(exchangeRate, { status: 201 })
    }
} catch (error) {
    console.error('Error managing exchange rates:', error)
    return NextResponse.json(
      { error: 'Failed to manage exchange rates' },
      { status: 500 }
    )
}
}