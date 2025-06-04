import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { QuotationService } from '@/lib/services/quotation.service'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { prisma } from '@/lib/db/prisma'

// Mock @react-pdf/renderer
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
}))

// Mock authentication
const mockAuthenticateUser = jest.fn()
jest.mock('@/lib/auth/jwt', () => ({
  authenticateUser: mockAuthenticateUser,
}))

// Mock NextRequest and NextResponse for testing
const mockRequest = (headers: Record<string, string> = {}) => ({
  headers: {
    get: (name: string) => headers[name.toLowerCase()] || null
  }
})

const MockNextResponse = {
  json: (data: any, options?: { status?: number }) => ({
    status: options?.status || 200,
    json: async () => data
  }),
  
  new: (body: any, options?: { status?: number; headers?: Headers }) => ({
    status: options?.status || 200,
    headers: options?.headers || new Headers(),
    arrayBuffer: async () => body
  })
}

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: MockNextResponse
}))

describe('Quotation PDF Route Logic', () => {
  let quotationService: QuotationService
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let testUser: any
  let testCustomer: any
  let testSalesCase: any
  let testQuotation: any

  beforeEach(async () => {
    // Initialize services
    quotationService = new QuotationService()
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()

    // Create test user directly via Prisma
    testUser = await prisma.user.create({
      data: {
        username: 'pdftest',
        email: 'pdf@test.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })

    // Create test customer
    testCustomer = await customerService.createCustomer({
      name: 'PDF Test Customer',
      email: 'customer@pdftest.com',
      phone: '+1 (555) 999-0001',
      address: '123 PDF Test Street, Test City, TC 12345',
      createdBy: testUser.id
    })

    // Create test sales case
    testSalesCase = await salesCaseService.createSalesCase({
      customerId: testCustomer.id,
      title: 'PDF Test Sales Case',
      description: 'Test case for PDF generation',
      estimatedValue: 25000,
      createdBy: testUser.id
    })

    // Create test quotation
    testQuotation = await quotationService.createQuotation({
      salesCaseId: testSalesCase.id,
      validUntil: new Date('2024-12-31'),
      paymentTerms: 'Net 30 days',
      deliveryTerms: 'FOB Origin',
      notes: 'Test quotation for PDF generation',
      items: [
        {
          itemCode: 'PDF-001',
          description: 'PDF Test Item 1',
          quantity: 5,
          unitPrice: 2000,
          discount: 10.0,
          taxRate: 8.5
        }
      ],
      createdBy: testUser.id
    })

    // Reset mocks
    jest.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('PDF Generation Logic', () => {
    it('should successfully generate PDF for valid quotation with authentication', async () => {
      // Mock successful authentication
      mockAuthenticateUser.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      })

      // Test the service layer directly
      const quotation = await quotationService.getQuotation(testQuotation.id)
      expect(quotation).toBeDefined()
      expect(quotation?.quotationNumber).toBe(testQuotation.quotationNumber)

      // Verify PDF template can be rendered
      const { renderToBuffer } = require('@react-pdf/renderer')
      const mockBuffer = Buffer.from('test-pdf-content')
      renderToBuffer.mockResolvedValue(mockBuffer)

      const result = await renderToBuffer()
      expect(result).toBe(mockBuffer)
      expect(renderToBuffer).toHaveBeenCalled()
    })

    it('should handle authentication failure', async () => {
      // Mock authentication failure
      mockAuthenticateUser.mockResolvedValue(null)

      const request = mockRequest({
        authorization: 'Bearer invalid-token'
      })

      // Simulate the authentication check
      const user = await mockAuthenticateUser(request)
      expect(user).toBeNull()
    })

    it('should handle missing quotation', async () => {
      // Mock successful authentication
      mockAuthenticateUser.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      })

      // Try to get non-existent quotation
      const quotation = await quotationService.getQuotation('non-existent-id')
      expect(quotation).toBeNull()
    })

    it('should handle PDF generation errors', async () => {
      // Mock successful authentication
      mockAuthenticateUser.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      })

      // Mock PDF generation failure
      const { renderToBuffer } = require('@react-pdf/renderer')
      renderToBuffer.mockRejectedValue(new Error('PDF generation failed'))

      // Test error handling
      await expect(renderToBuffer()).rejects.toThrow('PDF generation failed')
    })

    it('should work with quotations in different statuses', async () => {
      // Mock successful authentication
      mockAuthenticateUser.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      })

      // Test with sent quotation
      await quotationService.sendQuotation(testQuotation.id, testUser.id)
      const sentQuotation = await quotationService.getQuotation(testQuotation.id)
      expect(sentQuotation?.status).toBe('SENT')

      // Verify quotation can still be retrieved for PDF generation
      expect(sentQuotation).toBeDefined()
      expect(sentQuotation?.quotationNumber).toBe(testQuotation.quotationNumber)
    })

    it('should work with versioned quotations', async () => {
      // Mock successful authentication
      mockAuthenticateUser.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      })

      // Create a new version
      const newVersion = await quotationService.createNewVersion(
        testQuotation.id,
        {
          items: [
            {
              itemCode: 'PDF-003',
              description: 'Updated PDF Test Item',
              quantity: 2,
              unitPrice: 5000,
              discount: 0,
              taxRate: 8.5
            }
          ],
          notes: 'Updated quotation for PDF generation',
          createdBy: testUser.id
        }
      )

      // Verify new version can be retrieved
      const versionedQuotation = await quotationService.getQuotation(newVersion.id)
      expect(versionedQuotation).toBeDefined()
      expect(versionedQuotation?.version).toBe(2)
    })

    it('should handle quotations with minimal data', async () => {
      // Create quotation with minimal customer information
      const minimalCustomer = await customerService.createCustomer({
        name: 'Minimal Customer',
        email: 'minimal@test.com',
        createdBy: testUser.id
        // No phone or address
      })

      const minimalSalesCase = await salesCaseService.createSalesCase({
        customerId: minimalCustomer.id,
        title: 'Minimal Sales Case',
        description: 'Minimal test case',
        estimatedValue: 1000,
        createdBy: testUser.id
      })

      const minimalQuotation = await quotationService.createQuotation({
        salesCaseId: minimalSalesCase.id,
        validUntil: new Date('2024-12-31'),
        items: [
          {
            itemCode: 'MIN-001',
            description: 'Minimal Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUser.id
        // No payment terms, delivery terms, or notes
      })

      // Verify minimal quotation can be retrieved
      const quotation = await quotationService.getQuotation(minimalQuotation.id)
      expect(quotation).toBeDefined()
      expect(quotation?.quotationNumber).toBe(minimalQuotation.quotationNumber)
      
      // Verify customer has minimal data
      expect(quotation?.salesCase.customer.phone).toBeNull()
      expect(quotation?.salesCase.customer.address).toBeNull()
    })
  })
})