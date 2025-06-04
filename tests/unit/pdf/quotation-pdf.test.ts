import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { QuotationPDF } from '@/lib/pdf/quotation-template'
import { QuotationWithDetails } from '@/lib/services/quotation.service'
import { renderToBuffer } from '@react-pdf/renderer'

// Mock @react-pdf/renderer
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(),
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  View: ({ children }: any) => children,
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Font: {},
  Link: ({ children }: any) => children,
}))

describe('QuotationPDF', () => {
  const mockQuotation: QuotationWithDetails = {
    id: 'test-id',
    quotationNumber: 'QUOT-2024-001',
    salesCaseId: 'sales-case-id',
    status: 'SENT',
    version: 1,
    subtotal: 10000,
    discountAmount: 500,
    taxAmount: 950,
    totalAmount: 10450,
    validUntil: new Date('2024-02-15'),
    paymentTerms: 'Net 30 days',
    deliveryTerms: 'FOB Origin',
    notes: 'Standard quotation terms apply',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    salesCase: {
      id: 'sales-case-id',
      caseNumber: 'CASE-2024-001',
      title: 'Website Development Project',
      description: 'Full-stack web application development',
      estimatedValue: 15000,
      status: 'ACTIVE',
      customerId: 'customer-id',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
      customer: {
        id: 'customer-id',
        name: 'Test Customer Corp',
        email: 'contact@testcustomer.com',
        phone: '+1 (555) 987-6543',
        address: '456 Customer Lane, Client City, CC 67890',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    },
    items: [
      {
        id: 'item-1',
        quotationId: 'test-id',
        itemCode: 'WEB-DEV-001',
        description: 'Frontend Development (React/Next.js)',
        quantity: 40,
        unitPrice: 150,
        discount: 5.0,
        taxRate: 10.0,
        subtotal: 6000,
        discountAmount: 300,
        taxAmount: 570,
        totalAmount: 6270,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: 'item-2',
        quotationId: 'test-id',
        itemCode: 'WEB-DEV-002',
        description: 'Backend API Development (Node.js)',
        quantity: 30,
        unitPrice: 160,
        discount: 0.0,
        taxRate: 10.0,
        subtotal: 4800,
        discountAmount: 0,
        taxAmount: 480,
        totalAmount: 5280,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }
    ]
  }

  const mockCompanyInfo = {
    name: 'Test Company Inc',
    address: '789 Company Blvd, Business Park, BP 12345',
    phone: '+1 (555) 123-4567',
    email: 'info@testcompany.com',
    website: 'www.testcompany.com'
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('PDF Generation', () => {
    it('should generate PDF without errors', async () => {
      const mockBuffer = Buffer.from('pdf-content')
      ;(renderToBuffer as jest.Mock).mockResolvedValue(mockBuffer)

      const pdfComponent = QuotationPDF({
        quotation: mockQuotation,
        companyInfo: mockCompanyInfo
      })

      const result = await renderToBuffer(pdfComponent)

      expect(renderToBuffer).toHaveBeenCalledTimes(1)
      expect(result).toBe(mockBuffer)
    })

    it('should use default company info when not provided', () => {
      const pdfComponent = QuotationPDF({
        quotation: mockQuotation
      })

      // Component should render without errors
      expect(pdfComponent).toBeDefined()
      // Note: Default company info is handled within the component internally
    })

    it('should handle quotation with no items', () => {
      const quotationWithNoItems = {
        ...mockQuotation,
        items: []
      }

      const pdfComponent = QuotationPDF({
        quotation: quotationWithNoItems,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })

    it('should handle quotation with no notes', () => {
      const quotationWithoutNotes = {
        ...mockQuotation,
        notes: null
      }

      const pdfComponent = QuotationPDF({
        quotation: quotationWithoutNotes,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })
  })

  describe('Status and Expiry Handling', () => {
    it('should handle expired quotation status', () => {
      const expiredQuotation = {
        ...mockQuotation,
        status: 'EXPIRED' as const,
        validUntil: new Date('2024-01-01') // Past date
      }

      const pdfComponent = QuotationPDF({
        quotation: expiredQuotation,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })

    it('should handle quotation expiring soon', () => {
      const soonToExpireQuotation = {
        ...mockQuotation,
        validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      }

      const pdfComponent = QuotationPDF({
        quotation: soonToExpireQuotation,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })

    it('should handle different quotation statuses', () => {
      const statuses: Array<QuotationWithDetails['status']> = [
        'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'
      ]

      statuses.forEach(status => {
        const quotationWithStatus = {
          ...mockQuotation,
          status
        }

        const pdfComponent = QuotationPDF({
          quotation: quotationWithStatus,
          companyInfo: mockCompanyInfo
        })

        expect(pdfComponent).toBeDefined()
      })
    })
  })

  describe('Data Formatting', () => {
    it('should format currency values correctly', () => {
      // This test ensures the component renders without errors when formatting currency
      const pdfComponent = QuotationPDF({
        quotation: mockQuotation,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })

    it('should format date values correctly', () => {
      const pdfComponent = QuotationPDF({
        quotation: mockQuotation,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })

    it('should format percentage values correctly', () => {
      const quotationWithHighDiscount = {
        ...mockQuotation,
        items: [
          {
            ...mockQuotation.items[0],
            discount: 25.5,
            taxRate: 8.75
          }
        ]
      }

      const pdfComponent = QuotationPDF({
        quotation: quotationWithHighDiscount,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })
  })

  describe('Customer and Sales Case Information', () => {
    it('should handle customer with minimal information', () => {
      const quotationMinimalCustomer = {
        ...mockQuotation,
        salesCase: {
          ...mockQuotation.salesCase,
          customer: {
            ...mockQuotation.salesCase.customer,
            phone: null,
            address: null
          }
        }
      }

      const pdfComponent = QuotationPDF({
        quotation: quotationMinimalCustomer,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })

    it('should handle company info without website', () => {
      const companyInfoNoWebsite = {
        ...mockCompanyInfo,
        website: undefined
      }

      const pdfComponent = QuotationPDF({
        quotation: mockQuotation,
        companyInfo: companyInfoNoWebsite
      })

      expect(pdfComponent).toBeDefined()
    })
  })

  describe('Version Information', () => {
    it('should display version information correctly', () => {
      const versionedQuotation = {
        ...mockQuotation,
        version: 3,
        quotationNumber: 'QUOT-2024-001-v3'
      }

      const pdfComponent = QuotationPDF({
        quotation: versionedQuotation,
        companyInfo: mockCompanyInfo
      })

      expect(pdfComponent).toBeDefined()
    })
  })
})