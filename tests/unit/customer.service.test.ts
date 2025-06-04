import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CustomerService } from '@/lib/services/customer.service'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { AccountType, LeadStatus } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

describe('Customer Service', () => {
  let service: CustomerService
  let coaService: ChartOfAccountsService
  let testUserId: string
  let testLeadId: string

  beforeEach(async () => {
    service = new CustomerService()
    coaService = new ChartOfAccountsService()
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create a test lead for conversion tests
    const testLead = await prisma.lead.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        company: 'Test Company',
        phone: '+1234567890',
        jobTitle: 'CEO',
        source: 'WEBSITE',
        status: LeadStatus.QUALIFIED,
        createdBy: testUserId
      }
    })
    testLeadId = testLead.id
  })

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.auditLog.deleteMany()
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.account.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Customer Creation', () => {
    it('should create a new customer with AR account', async () => {
      const customerData = {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '+1234567890',
        industry: 'Technology',
        website: 'https://testcustomer.com',
        address: '123 Test St',
        taxId: 'TAX123',
        currency: 'USD',
        creditLimit: 10000,
        paymentTerms: 30,
        createdBy: testUserId
      }

      const customer = await service.createCustomer(customerData)

      expect(customer).toBeDefined()
      expect(customer.customerNumber).toMatch(/^CUST-\d{4}$/)
      expect(customer.name).toBe('Test Customer')
      expect(customer.email).toBe('customer@test.com')
      expect(customer.creditLimit).toBe(10000)
      expect(customer.account).toBeDefined()
      expect(customer.account?.type).toBe(AccountType.ASSET)
      expect(customer.account?.code).toMatch(/^1200-CUST-\d{4}$/)
    })

    it('should prevent duplicate email addresses', async () => {
      const customerData = {
        name: 'Test Customer',
        email: 'duplicate@test.com',
        createdBy: testUserId
      }

      await service.createCustomer(customerData)
      
      await expect(service.createCustomer(customerData))
        .rejects.toThrow('Customer with this email already exists')
    })

    it('should generate sequential customer numbers', async () => {
      const customer1 = await service.createCustomer({
        name: 'Customer 1',
        email: 'customer1@test.com',
        createdBy: testUserId
      })

      const customer2 = await service.createCustomer({
        name: 'Customer 2',
        email: 'customer2@test.com',
        createdBy: testUserId
      })

      expect(customer1.customerNumber).toBe('CUST-0001')
      expect(customer2.customerNumber).toBe('CUST-0002')
    })
  })

  describe('Customer Updates', () => {
    let customerId: string

    beforeEach(async () => {
      const customer = await service.createCustomer({
        name: 'Update Test Customer',
        email: 'update@test.com',
        creditLimit: 5000,
        createdBy: testUserId
      })
      customerId = customer.id
    })

    it('should update customer details', async () => {
      const updates = {
        name: 'Updated Customer Name',
        phone: '+9876543210',
        creditLimit: 15000
      }

      const updatedCustomer = await service.updateCustomer(customerId, updates, testUserId)

      expect(updatedCustomer.name).toBe('Updated Customer Name')
      expect(updatedCustomer.phone).toBe('+9876543210')
      expect(updatedCustomer.creditLimit).toBe(15000)
    })

    it('should prevent email update to existing email', async () => {
      await service.createCustomer({
        name: 'Another Customer',
        email: 'existing@test.com',
        createdBy: testUserId
      })

      await expect(
        service.updateCustomer(customerId, { email: 'existing@test.com' }, testUserId)
      ).rejects.toThrow('Customer with this email already exists')
    })
  })

  describe('Lead to Customer Conversion', () => {
    it('should convert lead to customer', async () => {
      const additionalData = {
        address: '456 Business Ave',
        taxId: 'TAX456',
        creditLimit: 20000,
        paymentTerms: 45
      }

      const customer = await service.convertLeadToCustomer(
        testLeadId,
        additionalData,
        testUserId
      )

      expect(customer).toBeDefined()
      expect(customer.name).toBe('Test Company')
      expect(customer.email).toBe('john.doe@company.com')
      expect(customer.leadId).toBe(testLeadId)
      expect(customer.creditLimit).toBe(20000)
      expect(customer.lead).toBeDefined()

      // Check lead status was updated
      const lead = await prisma.lead.findUnique({ where: { id: testLeadId } })
      expect(lead?.status).toBe(LeadStatus.CONVERTED)
    })

    it('should prevent converting already converted lead', async () => {
      await service.convertLeadToCustomer(testLeadId, {}, testUserId)

      await expect(
        service.convertLeadToCustomer(testLeadId, {}, testUserId)
      ).rejects.toThrow('Lead has already been converted')
    })

    it('should handle non-existent lead', async () => {
      await expect(
        service.convertLeadToCustomer('non-existent-id', {}, testUserId)
      ).rejects.toThrow('Lead not found')
    })
  })

  describe('Credit Management', () => {
    let customerId: string

    beforeEach(async () => {
      const customer = await service.createCustomer({
        name: 'Credit Test Customer',
        email: 'credit@test.com',
        creditLimit: 10000,
        createdBy: testUserId
      })
      customerId = customer.id
    })

    it('should perform credit check', async () => {
      const creditCheck = await service.performCreditCheck(customerId)

      expect(creditCheck).toBeDefined()
      expect(creditCheck.customerId).toBe(customerId)
      expect(creditCheck.creditLimit).toBe(10000)
      expect(creditCheck.usedCredit).toBe(0)
      expect(creditCheck.availableCredit).toBe(10000)
      expect(creditCheck.isWithinLimit).toBe(true)
    })

    it('should update credit limit', async () => {
      const updatedCustomer = await service.updateCreditLimit(
        customerId,
        25000,
        testUserId
      )

      expect(updatedCustomer.creditLimit).toBe(25000)
    })

    it('should prevent reducing credit limit below used credit', async () => {
      // Simulate used credit by updating account balance
      const customer = await service.getCustomer(customerId)
      if (customer?.accountId) {
        await coaService.updateBalance(customer.accountId, 8000, 'debit')
      }

      await expect(
        service.updateCreditLimit(customerId, 5000, testUserId)
      ).rejects.toThrow('Cannot set credit limit below current used credit')
    })
  })

  describe('Customer Queries', () => {
    beforeEach(async () => {
      // Create multiple customers for testing
      await service.createCustomer({
        name: 'Alpha Corp',
        email: 'alpha@test.com',
        currency: 'USD',
        createdBy: testUserId
      })

      await service.createCustomer({
        name: 'Beta Industries',
        email: 'beta@test.com',
        currency: 'EUR',
        createdBy: testUserId
      })

      await service.createCustomer({
        name: 'Gamma Solutions',
        email: 'gamma@test.com',
        currency: 'USD',
        createdBy: testUserId
      })
    })

    it('should get all customers', async () => {
      const customers = await service.getAllCustomers()
      expect(customers).toHaveLength(3)
    })

    it('should filter customers by search term', async () => {
      const customers = await service.getAllCustomers({ search: 'Beta' })
      expect(customers).toHaveLength(1)
      expect(customers[0].name).toBe('Beta Industries')
    })

    it('should filter customers by currency', async () => {
      const customers = await service.getAllCustomers({ currency: 'EUR' })
      expect(customers).toHaveLength(1)
      expect(customers[0].currency).toBe('EUR')
    })

    it('should paginate results', async () => {
      const page1 = await service.getAllCustomers({ limit: 2, offset: 0 })
      const page2 = await service.getAllCustomers({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(1)
    })
  })

  describe('Customer Balance', () => {
    it('should get customer balance information', async () => {
      const customer = await service.createCustomer({
        name: 'Balance Test Customer',
        email: 'balance@test.com',
        creditLimit: 15000,
        createdBy: testUserId
      })

      const balanceInfo = await service.getCustomerBalance(customer.id)

      expect(balanceInfo).toBeDefined()
      expect(balanceInfo.customer.id).toBe(customer.id)
      expect(balanceInfo.accountBalance).toBe(0)
      expect(balanceInfo.creditStatus.creditLimit).toBe(15000)
      expect(balanceInfo.creditStatus.availableCredit).toBe(15000)
    })
  })
})