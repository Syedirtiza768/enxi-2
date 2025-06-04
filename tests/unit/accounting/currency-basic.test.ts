import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CurrencyService } from '@/lib/services/accounting/currency.service'
import { prisma } from '@/lib/db/prisma'

describe('Currency Service - Basic Tests', () => {
  jest.setTimeout(30000)
  let service: CurrencyService
  let testUserId: string

  beforeEach(async () => {
    service = new CurrencyService()
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'currencytest-basic',
        email: 'currency-basic@test.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up test data in correct order to avoid foreign key constraints
    try {
      await prisma.auditLog.deleteMany({
        where: {
          userId: testUserId
        }
      })
      await prisma.exchangeRate.deleteMany({
        where: {
          createdBy: testUserId
        }
      })
      await prisma.user.deleteMany({
        where: {
          id: testUserId
        }
      })
    } catch (error) {
      console.error('Cleanup error:', error)
      // Continue with global cleanup if needed
      await prisma.auditLog.deleteMany()
      await prisma.exchangeRate.deleteMany()
      await prisma.user.deleteMany()
    }
  })

  describe('Basic Currency Operations', () => {
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

    it('should return 1.0 for same currency exchange rate', async () => {
      const rate = await service.getExchangeRate('USD', 'USD')
      expect(rate).toBe(1.0)
    })

    it('should calculate FX gain correctly', async () => {
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

    it('should add new supported currency', () => {
      service.addSupportedCurrency('BTC')
      expect(service.isCurrencySupported('BTC')).toBe(true)
    })
  })

  describe('Exchange Rate Creation', () => {
    it('should create exchange rate successfully', async () => {
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
  })
})