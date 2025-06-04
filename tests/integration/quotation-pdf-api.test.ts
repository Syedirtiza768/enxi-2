import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { GET } from '@/app/api/quotations/[id]/pdf/route'
import { QuotationService } from '@/lib/services/quotation.service'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { UserService } from '@/lib/services/user.service'
import { prisma } from '@/lib/db/prisma'
import jwt from 'jsonwebtoken'
import { authenticateUser } from '@/lib/auth/jwt'

// Mock NextRequest for testing
class MockNextRequest {
  url: string
  headers: Map<string, string>

  constructor(url: string, options?: { headers?: Record<string, string> }) {
    this.url = url
    this.headers = new Map()
    
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value)
      })
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null
  }
}

// Mock all NextRequest instances
const mockNextRequest = (url: string, options?: { headers?: Record<string, string> }) => {
  return new MockNextRequest(url, options) as any
}

// Mock @react-pdf/renderer
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
}))

// Mock authentication
jest.mock('@/lib/auth/jwt', () => ({
  authenticateUser: jest.fn(),
}))

describe('Quotation PDF API', () => {
  let quotationService: QuotationService
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let userService: UserService
  let testUser: any
  let testCustomer: any
  let testSalesCase: any
  let testQuotation: any
  let authToken: string

  beforeEach(async () => {
    // Initialize services
    quotationService = new QuotationService()
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    userService = new UserService()

    // Create test user
    testUser = await userService.createUser({
      username: 'pdftest',
      email: 'pdf@test.com',
      password: 'password123',
      role: 'USER'
    })

    // Generate auth token
    const jwtSecret = process.env.JWT_SECRET || 'test-secret'
    authToken = jwt.sign(
      { userId: testUser.id, username: testUser.username },
      jwtSecret,
      { expiresIn: '1h' }
    )

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
        },
        {
          itemCode: 'PDF-002',
          description: 'PDF Test Item 2',
          quantity: 3,
          unitPrice: 3500,
          discount: 5.0,
          taxRate: 8.5
        }
      ],
      createdBy: testUser.id
    })

    // Setup authentication mock to return valid user by default
    const mockAuth = authenticateUser as jest.MockedFunction<typeof authenticateUser>
    mockAuth.mockResolvedValue({
      id: testUser.id,
      username: testUser.username,
      email: testUser.email,
      role: testUser.role
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('GET /api/quotations/[id]/pdf', () => {
    it('should generate PDF for valid quotation', async () => {
      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${testQuotation.id}/pdf`,
        {
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request, { params: { id: testQuotation.id } })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/pdf')
      expect(response.headers.get('content-disposition')).toContain(
        `filename="${testQuotation.quotationNumber}.pdf"`
      )
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600')

      const buffer = await response.arrayBuffer()
      expect(buffer.byteLength).toBeGreaterThan(0)
    })

    it('should return 401 for unauthorized request', async () => {
      // Setup authentication mock to return null
      const mockAuth = authenticateUser as jest.MockedFunction<typeof authenticateUser>
      mockAuth.mockResolvedValueOnce(null)

      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${testQuotation.id}/pdf`
        // No authorization header
      )

      const response = await GET(request, { params: { id: testQuotation.id } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 for invalid token', async () => {
      // Setup authentication mock to return null for invalid token
      const mockAuth = authenticateUser as jest.MockedFunction<typeof authenticateUser>
      mockAuth.mockResolvedValueOnce(null)

      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${testQuotation.id}/pdf`,
        {
          headers: {
            authorization: 'Bearer invalid-token',
          },
        }
      )

      const response = await GET(request, { params: { id: testQuotation.id } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent quotation', async () => {
      const request = mockNextRequest(
        'http://localhost:3000/api/quotations/non-existent-id/pdf',
        {
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request, { params: { id: 'non-existent-id' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Quotation not found')
    })

    it('should handle PDF generation errors gracefully', async () => {
      // Mock renderToBuffer to throw an error
      const { renderToBuffer } = require('@react-pdf/renderer')
      renderToBuffer.mockRejectedValueOnce(new Error('PDF generation failed'))

      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${testQuotation.id}/pdf`,
        {
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request, { params: { id: testQuotation.id } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to generate PDF')

      // Restore mock
      renderToBuffer.mockResolvedValue(Buffer.from('mock-pdf-content'))
    })

    it('should generate PDF for quotation with different statuses', async () => {
      // Test with sent quotation
      await quotationService.sendQuotation(testQuotation.id, testUser.id)

      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${testQuotation.id}/pdf`,
        {
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request, { params: { id: testQuotation.id } })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/pdf')
    })

    it('should generate PDF for quotation with versioning', async () => {
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

      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${newVersion.id}/pdf`,
        {
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request, { params: { id: newVersion.id } })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-disposition')).toContain(
        `filename="${newVersion.quotationNumber}.pdf"`
      )
    })

    it('should include correct cache headers', async () => {
      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${testQuotation.id}/pdf`,
        {
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request, { params: { id: testQuotation.id } })

      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
      expect(response.headers.get('content-disposition')).toBe(
        `inline; filename="${testQuotation.quotationNumber}.pdf"`
      )
    })

    it('should handle quotation with minimal data', async () => {
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

      const request = mockNextRequest(
        `http://localhost:3000/api/quotations/${minimalQuotation.id}/pdf`,
        {
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      )

      const response = await GET(request, { params: { id: minimalQuotation.id } })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/pdf')
    })
  })
})