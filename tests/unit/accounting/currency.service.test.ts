import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CurrencyService } from '@/lib/services/accounting/currency.service'
import { prisma } from '@/lib/db/prisma'

describe('Currency Service', () => {
  jest.setTimeout(30000) // 30 second timeout for DB operations
  let service: CurrencyService
  let testUserId: string

  beforeEach(async () => {
    service = new CurrencyService()
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'currencytest',
        email: 'currency@test.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.auditLog.deleteMany()
    await prisma.exchangeRate.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Exchange Rate Management', () => {
    it('should create exchange rate', async () => {
      const rateData = {
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.1,
        rateDate: new Date('2024-01-15'),
        source: 'manual',
        createdBy: testUserId
      }

      const exchangeRate = await service.setExchangeRate(rateData)

      expect(exchangeRate).toBeDefined()
      expect(exchangeRate.fromCurrency).toBe('EUR')
      expect(exchangeRate.toCurrency).toBe('USD')
      expect(exchangeRate.rate).toBe(1.1)
      expect(exchangeRate.isActive).toBe(true)
    })

    it('should deactivate old rates when creating new ones', async () => {
      // Create first rate
      await service.setExchangeRate({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.1,
        rateDate: new Date('2024-01-15'),
        createdBy: testUserId
      })

      // Create second rate (should deactivate first)
      await service.setExchangeRate({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.12,
        rateDate: new Date('2024-01-16'),
        createdBy: testUserId
      })

      const activeRates = await service.getActiveExchangeRates()
      const eurUsdRates = activeRates.filter(r => r.fromCurrency === 'EUR' && r.toCurrency === 'USD')
      
      expect(eurUsdRates).toHaveLength(1)
      expect(eurUsdRates[0].rate).toBe(1.12)
    })

    it('should validate currency codes', async () => {
      await expect(service.setExchangeRate({
        fromCurrency: 'INVALID',
        toCurrency: 'USD',
        rate: 1.1,
        rateDate: new Date(),
        createdBy: testUserId
      })).rejects.toThrow('Unsupported currency: INVALID')
    })

    it('should prevent same currency exchange rates', async () => {
      await expect(service.setExchangeRate({
        fromCurrency: 'USD',
        toCurrency: 'USD',
        rate: 1.0,
        rateDate: new Date(),
        createdBy: testUserId
      })).rejects.toThrow('From and To currencies cannot be the same')
    })

    it('should prevent negative exchange rates', async () => {
      await expect(service.setExchangeRate({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: -1.1,
        rateDate: new Date(),
        createdBy: testUserId
      })).rejects.toThrow('Exchange rate must be positive')
    })
  })

  describe('Exchange Rate Retrieval', () => {
    beforeEach(async () => {
      // Set up test exchange rates
      await service.setExchangeRate({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.1,
        rateDate: new Date('2024-01-15'),
        createdBy: testUserId
      })

      await service.setExchangeRate({
        fromCurrency: 'GBP',
        toCurrency: 'USD',
        rate: 1.25,
        rateDate: new Date('2024-01-15'),
        createdBy: testUserId
      })
    })

    it('should return 1.0 for same currency', async () => {
      const rate = await service.getExchangeRate('USD', 'USD')
      expect(rate).toBe(1.0)
    })

    it('should get direct exchange rate', async () => {
      const rate = await service.getExchangeRate('EUR', 'USD')
      expect(rate).toBe(1.1)
    })

    it('should get inverse exchange rate', async () => {
      const rate = await service.getExchangeRate('USD', 'EUR')
      expect(rate).toBeCloseTo(1 / 1.1, 5)
    })

    it('should calculate cross rates via USD', async () => {
      const rate = await service.getExchangeRate('EUR', 'GBP')
      // EUR -> USD: 1.1, USD -> GBP: 1/1.25 = 0.8
      // EUR -> GBP: 1.1 * 0.8 = 0.88
      expect(rate).toBeCloseTo(1.1 / 1.25, 5)
    })

    it('should throw error for unavailable rates', async () => {
      await expect(service.getExchangeRate('JPY', 'CAD'))
        .rejects.toThrow('Exchange rate not found for JPY to CAD')
    })
  })

  describe('Currency Conversion', () => {
    beforeEach(async () => {
      await service.setExchangeRate({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.1,
        rateDate: new Date('2024-01-15'),
        createdBy: testUserId
      })
    })

    it('should convert currency amounts', async () => {
      const result = await service.convertCurrency(100, 'EUR', 'USD')

      expect(result.originalAmount).toBe(100)
      expect(result.originalCurrency).toBe('EUR')
      expect(result.convertedAmount).toBe(110)
      expect(result.targetCurrency).toBe('USD')
      expect(result.exchangeRate).toBe(1.1)
    })

    it('should convert to base currency', async () => {
      const result = await service.convertToBaseCurrency(100, 'EUR')

      expect(result.originalAmount).toBe(100)
      expect(result.originalCurrency).toBe('EUR')
      expect(result.convertedAmount).toBe(110)
      expect(result.targetCurrency).toBe('USD')
    })

    it('should convert from base currency', async () => {
      const result = await service.convertFromBaseCurrency(110, 'EUR')

      expect(result.originalAmount).toBe(110)
      expect(result.originalCurrency).toBe('USD')
      expect(result.convertedAmount).toBeCloseTo(100, 2)
      expect(result.targetCurrency).toBe('EUR')
    })
  })

  describe('FX Gain/Loss Calculation', () => {
    it('should calculate FX gain', async () => {
      const result = await service.calculateFXGainLoss(
        1000,  // Original amount
        'EUR', // Original currency
        1.1,   // Original exchange rate
        1.15   // Current exchange rate
      )

      expect(result.isGain).toBe(true)
      expect(result.fxGainLoss).toBeCloseTo(50, 2) // (1.15 - 1.1) * 1000
      expect(result.originalBaseAmount).toBe(1100) // 1000 * 1.1
      expect(result.currentBaseAmount).toBe(1150)  // 1000 * 1.15
    })

    it('should calculate FX loss', async () => {
      const result = await service.calculateFXGainLoss(
        1000,  // Original amount
        'EUR', // Original currency
        1.1,   // Original exchange rate
        1.05   // Current exchange rate (loss)
      )

      expect(result.isGain).toBe(false)
      expect(result.fxGainLoss).toBeCloseTo(50, 2) // |1.05 - 1.1| * 1000
      expect(result.originalBaseAmount).toBe(1100) // 1000 * 1.1
      expect(result.currentBaseAmount).toBe(1050)  // 1000 * 1.05
    })
  })

  describe('Bulk Operations', () => {
    it('should bulk update exchange rates', async () => {
      const rates = [
        {
          fromCurrency: 'EUR',
          toCurrency: 'USD',
          rate: 1.1,
          rateDate: new Date('2024-01-15')
        },
        {
          fromCurrency: 'GBP',
          toCurrency: 'USD',
          rate: 1.25,
          rateDate: new Date('2024-01-15')
        },
        {
          fromCurrency: 'CAD',
          toCurrency: 'USD',
          rate: 0.75,
          rateDate: new Date('2024-01-15')
        }
      ]

      const results = await service.bulkUpdateExchangeRates(rates, testUserId)

      expect(results).toHaveLength(3)
      expect(results.every(r => r.isActive)).toBe(true)

      const activeRates = await service.getActiveExchangeRates()
      expect(activeRates).toHaveLength(3)
    })

    it('should continue with valid rates even if some fail', async () => {
      const rates = [
        {
          fromCurrency: 'EUR',
          toCurrency: 'USD',
          rate: 1.1,
          rateDate: new Date('2024-01-15')
        },
        {
          fromCurrency: 'INVALID',
          toCurrency: 'USD',
          rate: 1.25,
          rateDate: new Date('2024-01-15')
        },
        {
          fromCurrency: 'CAD',
          toCurrency: 'USD',
          rate: 0.75,
          rateDate: new Date('2024-01-15')
        }
      ]

      const results = await service.bulkUpdateExchangeRates(rates, testUserId)

      expect(results).toHaveLength(2) // Only EUR and CAD should succeed
      expect(results.some(r => r.fromCurrency === 'EUR')).toBe(true)
      expect(results.some(r => r.fromCurrency === 'CAD')).toBe(true)
    })
  })

  describe('Currency Support', () => {
    it('should return supported currencies', () => {
      const currencies = service.getSupportedCurrencies()
      
      expect(currencies).toContain('USD')
      expect(currencies).toContain('EUR')
      expect(currencies).toContain('GBP')
      expect(Array.isArray(currencies)).toBe(true)
      expect(currencies.length).toBeGreaterThan(0)
    })

    it('should check if currency is supported', () => {
      expect(service.isCurrencySupported('USD')).toBe(true)
      expect(service.isCurrencySupported('EUR')).toBe(true)
      expect(service.isCurrencySupported('INVALID')).toBe(false)
    })

    it('should add new supported currency', () => {
      service.addSupportedCurrency('BTC')
      expect(service.isCurrencySupported('BTC')).toBe(true)
    })
  })

  describe('Exchange Rate History', () => {
    beforeEach(async () => {
      // Create historical rates
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03']
      const rates = [1.08, 1.09, 1.1]

      for (let i = 0; i < dates.length; i++) {
        await service.setExchangeRate({
          fromCurrency: 'EUR',
          toCurrency: 'USD',
          rate: rates[i],
          rateDate: new Date(dates[i]),
          createdBy: testUserId
        })
      }
    })

    it('should get exchange rate history', async () => {
      const history = await service.getExchangeRateHistory('EUR', 'USD', 10)

      expect(history).toHaveLength(3)
      expect(history[0].rate).toBe(1.1) // Most recent first
      expect(history[1].rate).toBe(1.09)
      expect(history[2].rate).toBe(1.08)
    })

    it('should limit history results', async () => {
      const history = await service.getExchangeRateHistory('EUR', 'USD', 2)

      expect(history).toHaveLength(2)
      expect(history[0].rate).toBe(1.1) // Most recent first
      expect(history[1].rate).toBe(1.09)
    })
  })
})