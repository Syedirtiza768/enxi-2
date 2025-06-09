import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

// Mock NextRequest and NextResponse for API testing
const mockRequest = (body?: any, searchParams?: Record<string, string>) => ({
  json: async () => body || {},
  nextUrl: {
    searchParams: new URLSearchParams(searchParams || {})
  }
}) as any

const mockResponse = () => {
  const response = {
    status: 200,
    data: {} as any,
    json: (data: any) => {
      response.data = data
      return response
    }
  }
  return response as any
}

// Import API handlers
import { GET, POST } from '@/app/api/supplier-payments/route'
import { GET as GetPayment, PUT as UpdatePayment } from '@/app/api/supplier-payments/[id]/route'

describe('Supplier Payments API', () => {
  let testSupplier: any
  let testSupplierInvoice: any
  let testAccount: any
  let testBankAccount: any
  let testUser: any
  let testPayment: any

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        username: 'paymentapitest',
        email: 'paymentapi@test.com',
        password: 'hashedpassword',
        role: 'ACCOUNTANT'
      }
    })

    // Create test accounts
    testBankAccount = await prisma.account.create({
      data: {
        code: 'BANK002',
        name: 'Test Bank Account 2',
        type: 'ASSET',
        createdBy: testUser.id
      }
    })

    testAccount = await prisma.account.create({
      data: {
        code: 'AP002',
        name: 'Test AP Account 2',
        type: 'LIABILITY',
        createdBy: testUser.id
      }
    })

    // Create test supplier
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'API Test Supplier',
        code: 'API-SUPP',
        supplierNumber: 'API-001',
        email: 'apisupplier@test.com',
        currency: 'USD',
        apAccountId: testAccount.id,
        createdBy: testUser.id
      }
    })

    // Create test supplier invoice
    testSupplierInvoice = await prisma.supplierInvoice.create({
      data: {
        invoiceNumber: 'API-INV-001',
        supplierId: testSupplier.id,
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        status: 'APPROVED',
        currency: 'USD',
        subtotal: 800.00,
        taxAmount: 80.00,
        totalAmount: 880.00,
        createdBy: testUser.id
      }
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.supplierPayment.deleteMany({ where: { supplierId: testSupplier.id } })
    await prisma.supplierInvoice.deleteMany({ where: { supplierId: testSupplier.id } })
    await prisma.supplier.deleteMany({ where: { id: testSupplier.id } })
    await prisma.account.deleteMany({ where: { id: { in: [testAccount.id, testBankAccount.id] } } })
    await prisma.user.deleteMany({ where: { id: testUser.id } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Reset invoice to unpaid state
    await prisma.supplierInvoice.update({
      where: { id: testSupplierInvoice.id },
      data: {
        paidAmount: 0,
        balanceAmount: 880.00,
        status: 'APPROVED'
      }
    })
    
    // Clear any existing payments
    await prisma.supplierPayment.deleteMany({ 
      where: { supplierInvoiceId: testSupplierInvoice.id } 
    })
  })

  describe('GET /api/supplier-payments', () => {
    test('should get all supplier payments successfully', async () => {
      // Create a test payment first
      testPayment = await prisma.supplierPayment.create({
        data: {
          paymentNumber: 'SPY-API-001',
          supplierId: testSupplier.id,
          supplierInvoiceId: testSupplierInvoice.id,
          amount: 400.00,
          paymentDate: new Date('2024-01-15'),
          paymentMethod: 'BANK_TRANSFER',
          currency: 'USD',
          baseAmount: 400.00,
          createdBy: testUser.id
        }
      })

      const request = mockRequest(null, {})
      
      // Mock JWT verification
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await GET(request)
      const data = response.data

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
    })

    test('should filter payments by supplier', async () => {
      const request = mockRequest(null, { supplierId: testSupplier.id })
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await GET(request)
      const data = response.data

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      // All returned payments should be for the test supplier
      data.data.forEach((payment: any) => {
        expect(payment.supplierId).toBe(testSupplier.id)
      })
    })

    test('should filter payments by payment method', async () => {
      const request = mockRequest(null, { paymentMethod: 'BANK_TRANSFER' })
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await GET(request)
      const data = response.data

      expect(response.status).toBe(200)
      if (data.data.length > 0) {
        data.data.forEach((payment: any) => {
          expect(payment.paymentMethod).toBe('BANK_TRANSFER')
        })
      }
    })

    test('should return 401 for unauthorized access', async () => {
      const request = mockRequest()
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce(null)

      const response = await GET(request)
      
      expect(response.status).toBe(401)
      expect(response.data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/supplier-payments', () => {
    test('should create a new supplier payment successfully', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 440.00,
        paymentDate: '2024-01-15',
        paymentMethod: 'BANK_TRANSFER',
        reference: 'API-WIRE-001',
        notes: 'API test payment',
        currency: 'USD',
        bankAccountId: testBankAccount.id
      }

      const request = mockRequest(paymentData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await POST(request)
      const data = response.data

      expect(response.status).toBe(201)
      expect(data.data).toBeDefined()
      expect(data.data.paymentNumber).toMatch(/^SPY-\d+$/)
      expect(data.data.amount).toBe(440.00)
      expect(data.data.reference).toBe('API-WIRE-001')
      expect(data.data.supplier.name).toBe('API Test Supplier')
    })

    test('should create payment without invoice (prepayment)', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        amount: 200.00,
        paymentDate: '2024-01-10',
        paymentMethod: 'CHECK',
        reference: 'CHK-PREP-001',
        notes: 'Prepayment via API',
        currency: 'USD',
        bankAccountId: testBankAccount.id
      }

      const request = mockRequest(paymentData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await POST(request)
      const data = response.data

      expect(response.status).toBe(201)
      expect(data.data).toBeDefined()
      expect(data.data.supplierInvoiceId).toBeNull()
      expect(data.data.amount).toBe(200.00)
    })

    test('should return 400 for missing required fields', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        // Missing amount, paymentMethod, bankAccountId
        paymentDate: '2024-01-15'
      }

      const request = mockRequest(paymentData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      expect(response.data.error).toContain('required')
    })

    test('should return 400 for invalid amount', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        amount: -100.00, // Negative amount
        paymentDate: '2024-01-15',
        paymentMethod: 'BANK_TRANSFER',
        currency: 'USD',
        bankAccountId: testBankAccount.id
      }

      const request = mockRequest(paymentData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      expect(response.data.error).toContain('positive')
    })

    test('should return 400 for payment exceeding invoice balance', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 1000.00, // Exceeds invoice total of 880
        paymentDate: '2024-01-15',
        paymentMethod: 'BANK_TRANSFER',
        currency: 'USD',
        bankAccountId: testBankAccount.id
      }

      const request = mockRequest(paymentData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      expect(response.data.error).toContain('exceeds')
    })

    test('should return 404 for non-existent supplier', async () => {
      const paymentData = {
        supplierId: 'non-existent-id',
        amount: 100.00,
        paymentDate: '2024-01-15',
        paymentMethod: 'BANK_TRANSFER',
        currency: 'USD',
        bankAccountId: testBankAccount.id
      }

      const request = mockRequest(paymentData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await POST(request)
      
      expect(response.status).toBe(404)
      expect(response.data.error).toContain('not found')
    })

    test('should return 401 for unauthorized access', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        amount: 100.00,
        paymentMethod: 'BANK_TRANSFER'
      }

      const request = mockRequest(paymentData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce(null)

      const response = await POST(request)
      
      expect(response.status).toBe(401)
      expect(response.data.error).toBe('Unauthorized')
    })
  })

  describe('GET /api/supplier-payments/[id]', () => {
    test('should get specific payment details successfully', async () => {
      // Create a test payment
      const createdPayment = await prisma.supplierPayment.create({
        data: {
          paymentNumber: 'SPY-GET-001',
          supplierId: testSupplier.id,
          supplierInvoiceId: testSupplierInvoice.id,
          amount: 300.00,
          paymentDate: new Date('2024-01-15'),
          paymentMethod: 'CHECK',
          reference: 'CHK-001',
          notes: 'Test get payment',
          currency: 'USD',
          baseAmount: 300.00,
          createdBy: testUser.id
        }
      })

      const request = mockRequest()
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await GetPayment(request, { params: { id: createdPayment.id } })
      const data = response.data

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.id).toBe(createdPayment.id)
      expect(data.data.amount).toBe(300.00)
      expect(data.data.reference).toBe('CHK-001')
      expect(data.data.notes).toBe('Test get payment')
    })

    test('should return 404 for non-existent payment', async () => {
      const request = mockRequest()
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await GetPayment(request, { params: { id: 'non-existent-id' } })
      
      expect(response.status).toBe(404)
      expect(response.data.error).toContain('not found')
    })

    test('should return 401 for unauthorized access', async () => {
      const request = mockRequest()
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce(null)

      const response = await GetPayment(request, { params: { id: 'some-id' } })
      
      expect(response.status).toBe(401)
      expect(response.data.error).toBe('Unauthorized')
    })
  })

  describe('PUT /api/supplier-payments/[id]', () => {
    test('should update payment successfully', async () => {
      // Create a test payment
      const createdPayment = await prisma.supplierPayment.create({
        data: {
          paymentNumber: 'SPY-UPD-001',
          supplierId: testSupplier.id,
          amount: 200.00,
          paymentDate: new Date('2024-01-15'),
          paymentMethod: 'BANK_TRANSFER',
          currency: 'USD',
          baseAmount: 200.00,
          createdBy: testUser.id
        }
      })

      const updateData = {
        reference: 'UPDATED-REF-001',
        notes: 'Updated payment notes',
        paymentMethod: 'CHECK'
      }

      const request = mockRequest(updateData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await UpdatePayment(request, { params: { id: createdPayment.id } })
      const data = response.data

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.reference).toBe('UPDATED-REF-001')
      expect(data.data.notes).toBe('Updated payment notes')
      expect(data.data.paymentMethod).toBe('CHECK')
    })

    test('should return 404 for non-existent payment', async () => {
      const updateData = { notes: 'Updated notes' }
      const request = mockRequest(updateData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await UpdatePayment(request, { params: { id: 'non-existent-id' } })
      
      expect(response.status).toBe(404)
      expect(response.data.error).toContain('not found')
    })

    test('should return 400 when trying to update amount (should not be allowed)', async () => {
      const createdPayment = await prisma.supplierPayment.create({
        data: {
          paymentNumber: 'SPY-UPD-002',
          supplierId: testSupplier.id,
          amount: 150.00,
          paymentDate: new Date(),
          paymentMethod: 'BANK_TRANSFER',
          currency: 'USD',
          baseAmount: 150.00,
          createdBy: testUser.id
        }
      })

      const updateData = {
        amount: 300.00 // Should not be allowed to change amount
      }

      const request = mockRequest(updateData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce({ id: testUser.id, role: 'ACCOUNTANT' })

      const response = await UpdatePayment(request, { params: { id: createdPayment.id } })
      
      expect(response.status).toBe(400)
      expect(response.data.error).toContain('amount cannot be modified')
    })

    test('should return 401 for unauthorized access', async () => {
      const updateData = { notes: 'Unauthorized update' }
      const request = mockRequest(updateData)
      
      jest.spyOn(require('@/lib/auth/server-auth'), 'verifyJWTFromRequest')
        .mockResolvedValueOnce(null)

      const response = await UpdatePayment(request, { params: { id: 'some-id' } })
      
      expect(response.status).toBe(401)
      expect(response.data.error).toBe('Unauthorized')
    })
  })
})