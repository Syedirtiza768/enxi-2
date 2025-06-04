import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'

export interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  rateDate: Date
  source: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateExchangeRateInput {
  fromCurrency: string
  toCurrency: string
  rate: number
  rateDate: Date
  source?: string
  createdBy: string
}

export interface CurrencyConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  rateDate: Date
  source: string
}

export class CurrencyService {
  private auditService: AuditService
  private baseCurrency: string = 'USD'

  // Common currency symbols for validation
  private supportedCurrencies = new Set([
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'NZD'
  ])

  constructor() {
    this.auditService = new AuditService()
  }

  /**
   * Get the current exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // If same currency, return 1.0
    if (fromCurrency === toCurrency) {
      return 1.0
    }

    // Validate currencies
    this.validateCurrency(fromCurrency)
    this.validateCurrency(toCurrency)

    // Try to find direct exchange rate
    let exchangeRate = await this.findExchangeRate(fromCurrency, toCurrency)
    
    if (exchangeRate) {
      return exchangeRate.rate
    }

    // Try inverse rate
    const inverseRate = await this.findExchangeRate(toCurrency, fromCurrency)
    if (inverseRate) {
      return 1 / inverseRate.rate
    }

    // Try via base currency (USD)
    if (fromCurrency !== this.baseCurrency && toCurrency !== this.baseCurrency) {
      const fromBaseRate = await this.findExchangeRate(fromCurrency, this.baseCurrency)
      const toBaseRate = await this.findExchangeRate(toCurrency, this.baseCurrency)
      
      if (fromBaseRate && toBaseRate) {
        return fromBaseRate.rate / toBaseRate.rate
      }

      // Try inverse base currency rates
      const baseFromRate = await this.findExchangeRate(this.baseCurrency, fromCurrency)
      const baseToRate = await this.findExchangeRate(this.baseCurrency, toCurrency)
      
      if (baseFromRate && baseToRate) {
        return baseToRate.rate / baseFromRate.rate
      }
    }

    throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversionResult> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency)
    const convertedAmount = amount * exchangeRate

    // Get the source of the exchange rate for audit trail
    const rateRecord = await this.findExchangeRate(fromCurrency, toCurrency) ||
                      await this.findExchangeRate(toCurrency, fromCurrency)

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate,
      rateDate: rateRecord?.rateDate || new Date(),
      source: rateRecord?.source || 'calculated'
    }
  }

  /**
   * Convert amount to base currency (USD)
   */
  async convertToBaseCurrency(amount: number, currency: string): Promise<CurrencyConversionResult> {
    return this.convertCurrency(amount, currency, this.baseCurrency)
  }

  /**
   * Convert amount from base currency to target currency
   */
  async convertFromBaseCurrency(amount: number, targetCurrency: string): Promise<CurrencyConversionResult> {
    return this.convertCurrency(amount, this.baseCurrency, targetCurrency)
  }

  /**
   * Create or update exchange rate
   */
  async setExchangeRate(data: CreateExchangeRateInput): Promise<ExchangeRate> {
    // Validate currencies
    this.validateCurrency(data.fromCurrency)
    this.validateCurrency(data.toCurrency)

    if (data.fromCurrency === data.toCurrency) {
      throw new Error('From and To currencies cannot be the same')
    }

    if (data.rate <= 0) {
      throw new Error('Exchange rate must be positive')
    }

    // Deactivate existing rates for this currency pair
    await prisma.exchangeRate.updateMany({
      where: {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        isActive: true
      },
      data: {
        isActive: false
      }
    })

    // Create new exchange rate
    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        rateDate: data.rateDate,
        source: data.source || 'manual',
        isActive: true,
        createdBy: data.createdBy
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: 'CREATE',
      entityType: 'ExchangeRate',
      entityId: exchangeRate.id,
      metadata: {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        rateDate: data.rateDate
      }
    })

    return exchangeRate as ExchangeRate
  }

  /**
   * Get all active exchange rates
   */
  async getActiveExchangeRates(): Promise<ExchangeRate[]> {
    const rates = await prisma.exchangeRate.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { fromCurrency: 'asc' },
        { toCurrency: 'asc' },
        { rateDate: 'desc' }
      ]
    })

    return rates as ExchangeRate[]
  }

  /**
   * Get exchange rate history for a currency pair
   */
  async getExchangeRateHistory(
    fromCurrency: string,
    toCurrency: string,
    limit: number = 30
  ): Promise<ExchangeRate[]> {
    const rates = await prisma.exchangeRate.findMany({
      where: {
        fromCurrency,
        toCurrency
      },
      orderBy: {
        rateDate: 'desc'
      },
      take: limit
    })

    return rates as ExchangeRate[]
  }

  /**
   * Bulk update exchange rates (useful for daily rate updates)
   */
  async bulkUpdateExchangeRates(
    rates: Array<{
      fromCurrency: string
      toCurrency: string
      rate: number
      rateDate: Date
      source?: string
    }>,
    createdBy: string
  ): Promise<ExchangeRate[]> {
    const results: ExchangeRate[] = []

    for (const rateData of rates) {
      try {
        const exchangeRate = await this.setExchangeRate({
          ...rateData,
          createdBy
        })
        results.push(exchangeRate)
      } catch (error) {
        console.error(`Failed to update rate ${rateData.fromCurrency}/${rateData.toCurrency}:`, error)
        // Continue with other rates
      }
    }

    return results
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Array.from(this.supportedCurrencies).sort()
  }

  /**
   * Add support for a new currency
   */
  addSupportedCurrency(currency: string): void {
    this.supportedCurrencies.add(currency.toUpperCase())
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return this.supportedCurrencies.has(currency.toUpperCase())
  }

  /**
   * Calculate foreign exchange gain/loss for a transaction
   */
  async calculateFXGainLoss(
    originalAmount: number,
    originalCurrency: string,
    originalExchangeRate: number,
    currentExchangeRate?: number
  ): Promise<{
    fxGainLoss: number
    isGain: boolean
    originalBaseAmount: number
    currentBaseAmount: number
  }> {
    const currentRate = currentExchangeRate || 
                       await this.getExchangeRate(originalCurrency, this.baseCurrency)

    const originalBaseAmount = originalAmount * originalExchangeRate
    const currentBaseAmount = originalAmount * currentRate
    const fxGainLoss = currentBaseAmount - originalBaseAmount

    return {
      fxGainLoss: Math.abs(fxGainLoss),
      isGain: fxGainLoss > 0,
      originalBaseAmount,
      currentBaseAmount
    }
  }

  // Private helper methods

  private async findExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        isActive: true
      },
      orderBy: {
        rateDate: 'desc'
      }
    })

    return rate as ExchangeRate | null
  }

  private validateCurrency(currency: string): void {
    if (!currency || currency.length !== 3) {
      throw new Error(`Invalid currency code: ${currency}. Must be a 3-letter ISO code.`)
    }

    if (!this.isCurrencySupported(currency)) {
      throw new Error(
        `Unsupported currency: ${currency}. ` +
        `Supported currencies: ${this.getSupportedCurrencies().join(', ')}`
      )
    }
  }
}