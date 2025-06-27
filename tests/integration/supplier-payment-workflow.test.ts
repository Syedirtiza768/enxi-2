import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { PrismaClient } from "@prisma/client"
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'

const prisma = new PrismaClient()
let supplierPaymentService: SupplierPaymentService

describe('Supplier Payment Workflow Integration', () => {
  let testSupplier: any
  let testSupplierInvoice: any
  let testAccount: any
  let testBankAccount: any
  let testUser: any

  beforeAll(async () => {
    supplierPaymentService = new SupplierPaymentService()
    
    // Create test user
    testUser = await prisma.user.create({
      data: {
        username: 'paymenttest',
        email: 'paymenttest@test.com',
        password: 'hashedpassword',
        role: 'ACCOUNTANT'
      }
    })

    // Create test bank account
    testBankAccount = await prisma.account.create({
      data: {
        code: 'BANK001',
        name: 'Test Bank Account',
        type: 'ASSET',
        createdBy: testUser.id
      }
    })

    // Create test AP account  
    testAccount = await prisma.account.create({
      data: {
        code: 'AP001',
        name: 'Test Accounts Payable',
        type: 'LIABILITY',
        createdBy: testUser.id
      }
    })

    // Create test supplier
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Test Payment Supplier',
        supplierNumber: 'SUP-PAY-001',
        email: 'supplier@test.com',
        currency: 'USD',
        paymentTerms: 30,
        accountId: testAccount.id,
        createdBy: testUser.id
      }
    })

    // Create test supplier invoice
    testSupplierInvoice = await prisma.supplierInvoice.create({
      data: {
        invoiceNumber: 'INV-PAY-001',
        supplierId: testSupplier.id,
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        status: 'APPROVED',
        matchingStatus: 'FULLY_MATCHED',
        currency: 'USD',
        subtotal: 1000.00,
        taxAmount: 100.00,
        totalAmount: 1100.00,
        createdBy: testUser.id
      }
    })
  })

  afterAll(async () => {
    // Clean up test data with defensive checks
    if (testSupplier?.id) {
      await prisma.supplierPayment.deleteMany({ where: { supplierId: testSupplier.id } })
      await prisma.supplierInvoice.deleteMany({ where: { supplierId: testSupplier.id } })
      await prisma.supplier.deleteMany({ where: { id: testSupplier.id } })
    }
    
    const accountIds = []
    if (testAccount?.id) accountIds.push(testAccount.id)
    if (testBankAccount?.id) accountIds.push(testBankAccount.id)
    if (accountIds.length > 0) {
      await prisma.account.deleteMany({ where: { id: { in: accountIds } } })
    }
    
    if (testUser?.id) {
      await prisma.user.deleteMany({ where: { id: testUser.id } })
    }
    
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Reset invoice to unpaid state
    await prisma.supplierInvoice.update({
      where: { id: testSupplierInvoice.id },
      data: {
        paidAmount: 0,
        balanceAmount: 1100.00,
        status: 'APPROVED'
      }
    })
    
    // Clear any existing payments
    await prisma.supplierPayment.deleteMany({ 
      where: { supplierInvoiceId: testSupplierInvoice.id } 
    })
  })

  describe('Payment Creation', () => {
    test('should create a supplier payment successfully', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 500.00,
        paymentDate: new Date('2024-01-15'),
        paymentMethod: 'BANK_TRANSFER' as const,
        reference: 'WIRE123456',
        notes: 'Partial payment for invoice',
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment = await supplierPaymentService.createSupplierPayment(paymentData)

      expect(payment).toBeDefined()
      expect(payment.paymentNumber).toMatch(/^SPY-\d+$/)
      expect(payment.amount).toBe(500.00)
      expect(payment.supplier.name).toBe('Test Payment Supplier')
      expect(payment.supplierInvoice?.invoiceNumber).toBe('INV-PAY-001')
      expect(payment.journalEntryId).toBeDefined()

      // Verify payment was applied to invoice
      const updatedInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: testSupplierInvoice.id }
      })
      expect(updatedInvoice?.paidAmount).toBe(500.00)
      expect(updatedInvoice?.balanceAmount).toBe(600.00)
      expect(updatedInvoice?.status).toBe('APPROVED') // Still approved, not fully paid
    })

    test('should create payment without specific invoice (prepayment)', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        amount: 200.00,
        paymentDate: new Date('2024-01-10'),
        paymentMethod: 'CHECK' as const,
        reference: 'CHK001',
        notes: 'Prepayment',
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment = await supplierPaymentService.createSupplierPayment(paymentData)

      expect(payment).toBeDefined()
      expect(payment.supplierInvoiceId).toBeNull()
      expect(payment.amount).toBe(200.00)
      expect(payment.journalEntryId).toBeDefined()

      // Verify GL posting for prepayment
      const journalEntry = await prisma.journalEntry.findUnique({
        where: { id: payment.journalEntryId! },
        include: { lines: { include: { account: true } } }
      })

      expect(journalEntry?.lines).toHaveLength(2)
      
      // Find debit to AP (reduces liability) and credit to bank
      const apLine = journalEntry?.lines.find(line => line.account.type === 'LIABILITY')
      const bankLine = journalEntry?.lines.find(line => line.account.type === 'ASSET')
      
      expect(apLine?.debitAmount).toBe(200.00)
      expect(bankLine?.creditAmount).toBe(200.00)
    })

    test('should fully pay an invoice and update status', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 1100.00, // Full amount
        paymentDate: new Date('2024-01-15'),
        paymentMethod: 'BANK_TRANSFER' as const,
        reference: 'WIRE789',
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment = await supplierPaymentService.createSupplierPayment(paymentData)

      expect(payment.amount).toBe(1100.00)

      // Verify invoice is fully paid
      const updatedInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: testSupplierInvoice.id }
      })
      expect(updatedInvoice?.paidAmount).toBe(1100.00)
      expect(updatedInvoice?.balanceAmount).toBe(0.00)
      expect(updatedInvoice?.status).toBe('PAID')
    })

    test('should create multiple partial payments', async () => {
      // First payment
      const payment1Data = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 400.00,
        paymentDate: new Date('2024-01-10'),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment1 = await supplierPaymentService.createSupplierPayment(payment1Data)
      expect(payment1.amount).toBe(400.00)

      // Second payment
      const payment2Data = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 700.00,
        paymentDate: new Date('2024-01-20'),
        paymentMethod: 'CHECK' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment2 = await supplierPaymentService.createSupplierPayment(payment2Data)
      expect(payment2.amount).toBe(700.00)

      // Verify total payments applied
      const updatedInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: testSupplierInvoice.id }
      })
      expect(updatedInvoice?.paidAmount).toBe(1100.00)
      expect(updatedInvoice?.balanceAmount).toBe(0.00)
      expect(updatedInvoice?.status).toBe('PAID')
    })
  })

  describe('Payment Validation', () => {
    test('should reject payment exceeding invoice balance', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 1200.00, // Exceeds invoice total
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      await expect(
        supplierPaymentService.createSupplierPayment(paymentData)
      ).rejects.toThrow('Payment amount exceeds remaining invoice balance')
    })

    test('should reject negative payment amount', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        amount: -100.00,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      await expect(
        supplierPaymentService.createSupplierPayment(paymentData)
      ).rejects.toThrow('Payment amount must be positive')
    })

    test('should reject payment to non-existent supplier', async () => {
      const paymentData = {
        supplierId: 'non-existent-id',
        amount: 100.00,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      await expect(
        supplierPaymentService.createSupplierPayment(paymentData)
      ).rejects.toThrow('Supplier not found')
    })

    test('should reject payment to inactive supplier', async () => {
      // Make supplier inactive
      await prisma.supplier.update({
        where: { id: testSupplier.id },
        data: { isActive: false }
      })

      const paymentData = {
        supplierId: testSupplier.id,
        amount: 100.00,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      await expect(
        supplierPaymentService.createSupplierPayment(paymentData)
      ).rejects.toThrow('Cannot create payment for inactive supplier')

      // Restore supplier
      await prisma.supplier.update({
        where: { id: testSupplier.id },
        data: { isActive: true }
      })
    })
  })

  describe('GL Integration', () => {
    test('should create correct journal entries for payment', async () => {
      const paymentData = {
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 500.00,
        paymentDate: new Date('2024-01-15'),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment = await supplierPaymentService.createSupplierPayment(paymentData)

      // Verify journal entry was created
      const journalEntry = await prisma.journalEntry.findUnique({
        where: { id: payment.journalEntryId! },
        include: { lines: { include: { account: true } } }
      })

      expect(journalEntry).toBeDefined()
      expect(journalEntry?.reference).toContain(payment.paymentNumber)
      expect(journalEntry?.status).toBe('POSTED')
      expect(journalEntry?.lines).toHaveLength(2)

      // Find the journal lines
      const apLine = journalEntry?.lines.find(line => line.account.type === 'LIABILITY')
      const bankLine = journalEntry?.lines.find(line => line.account.type === 'ASSET')

      // Verify debits and credits
      expect(apLine?.debitAmount).toBe(500.00) // Debit AP (reduces liability)
      expect(apLine?.creditAmount).toBe(0)
      expect(bankLine?.creditAmount).toBe(500.00) // Credit Bank (reduces asset)
      expect(bankLine?.debitAmount).toBe(0)

      // Verify balancing
      const totalDebits = journalEntry?.lines.reduce((sum, line) => sum + line.debitAmount, 0)
      const totalCredits = journalEntry?.lines.reduce((sum, line) => sum + line.creditAmount, 0)
      expect(totalDebits).toBe(totalCredits)
    })

    test('should handle multi-currency payments with exchange rates', async () => {
      // Create EUR supplier
      const eurSupplier = await prisma.supplier.create({
        data: {
          name: 'EUR Test Supplier',
          code: 'EUR-SUPP',
          supplierNumber: 'EUR-001',
          currency: 'EUR',
          accountId: testAccount.id,
          createdBy: testUser.id
        }
      })

      const eurInvoice = await prisma.supplierInvoice.create({
        data: {
          invoiceNumber: 'EUR-INV-001',
          supplierId: eurSupplier.id,
          invoiceDate: new Date('2024-01-01'),
          dueDate: new Date('2024-01-31'),
          status: 'APPROVED',
          currency: 'EUR',
          subtotal: 1000.00,
          taxAmount: 200.00,
          totalAmount: 1200.00,
          createdBy: testUser.id
        }
      })

      const paymentData = {
        supplierId: eurSupplier.id,
        supplierInvoiceId: eurInvoice.id,
        amount: 1200.00,
        paymentDate: new Date('2024-01-15'),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'EUR',
        exchangeRate: 1.1, // 1 EUR = 1.1 USD
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment = await supplierPaymentService.createSupplierPayment(paymentData)

      expect(payment.currency).toBe('EUR')
      expect(payment.amount).toBe(1200.00)
      expect(payment.exchangeRate).toBe(1.1)
      expect(payment.baseAmount).toBe(1320.00) // 1200 * 1.1

      // Cleanup
      await prisma.supplierPayment.deleteMany({ where: { supplierId: eurSupplier.id } })
      await prisma.supplierInvoice.deleteMany({ where: { supplierId: eurSupplier.id } })
      await prisma.supplier.deleteMany({ where: { id: eurSupplier.id } })
    })
  })

  describe('Payment Retrieval', () => {
    test('should get all supplier payments with filtering', async () => {
      // Create test payments
      const payment1Data = {
        supplierId: testSupplier.id,
        amount: 300.00,
        paymentDate: new Date('2024-01-10'),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      const payment2Data = {
        supplierId: testSupplier.id,
        amount: 400.00,
        paymentDate: new Date('2024-01-20'),
        paymentMethod: 'CHECK' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      }

      await supplierPaymentService.createSupplierPayment(payment1Data)
      await supplierPaymentService.createSupplierPayment(payment2Data)

      // Test getting all payments
      const allPayments = await supplierPaymentService.getAllSupplierPayments({})
      expect(allPayments.length).toBeGreaterThanOrEqual(2)

      // Test filtering by supplier
      const supplierPayments = await supplierPaymentService.getAllSupplierPayments({
        supplierId: testSupplier.id
      })
      expect(supplierPayments.length).toBe(2)

      // Test filtering by payment method
      const bankTransfers = await supplierPaymentService.getAllSupplierPayments({
        paymentMethod: 'BANK_TRANSFER'
      })
      expect(bankTransfers.length).toBeGreaterThanOrEqual(1)

      // Test date range filtering
      const paymentsInRange = await supplierPaymentService.getAllSupplierPayments({
        dateFrom: new Date('2024-01-15'),
        dateTo: new Date('2024-01-25')
      })
      expect(paymentsInRange.length).toBeGreaterThanOrEqual(1)
    })

    test('should get payments by supplier', async () => {
      const payment = await supplierPaymentService.createSupplierPayment({
        supplierId: testSupplier.id,
        amount: 250.00,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      })

      const supplierPayments = await supplierPaymentService.getPaymentsBySupplier(
        testSupplier.id
      )

      expect(supplierPayments.length).toBeGreaterThanOrEqual(1)
      expect(supplierPayments.some(p => p.id === payment.id)).toBe(true)
    })

    test('should get specific payment details', async () => {
      const createdPayment = await supplierPaymentService.createSupplierPayment({
        supplierId: testSupplier.id,
        amount: 150.00,
        paymentDate: new Date(),
        paymentMethod: 'CHECK' as const,
        reference: 'CHK123',
        notes: 'Test payment',
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      })

      const retrievedPayment = await supplierPaymentService.getSupplierPayment(
        createdPayment.id
      )

      expect(retrievedPayment).toBeDefined()
      expect(retrievedPayment?.id).toBe(createdPayment.id)
      expect(retrievedPayment?.amount).toBe(150.00)
      expect(retrievedPayment?.reference).toBe('CHK123')
      expect(retrievedPayment?.notes).toBe('Test payment')
      expect(retrievedPayment?.supplier).toBeDefined()
      expect(retrievedPayment?.journalEntry).toBeDefined()
    })
  })

  describe('Supplier Balance Calculation', () => {
    test('should calculate supplier balance correctly', async () => {
      // Reset any existing data
      await prisma.supplierPayment.deleteMany({ where: { supplierId: testSupplier.id } })
      await prisma.supplierInvoice.update({
        where: { id: testSupplierInvoice.id },
        data: { paidAmount: 0, balanceAmount: 1100.00 }
      })

      // Initial balance should be the invoice amount
      let balance = await supplierPaymentService.getSupplierBalance(testSupplier.id)
      expect(balance.totalOutstanding).toBe(1100.00)
      expect(balance.totalPaid).toBe(0.00)
      expect(balance.openInvoices).toBe(1)

      // Make a partial payment
      await supplierPaymentService.createSupplierPayment({
        supplierId: testSupplier.id,
        supplierInvoiceId: testSupplierInvoice.id,
        amount: 600.00,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testBankAccount.id,
        createdBy: testUser.id
      })

      // Check updated balance
      balance = await supplierPaymentService.getSupplierBalance(testSupplier.id)
      expect(balance.totalOutstanding).toBe(500.00)
      expect(balance.totalPaid).toBe(600.00)
      expect(balance.openInvoices).toBe(1) // Still open since not fully paid
    })
  })
})