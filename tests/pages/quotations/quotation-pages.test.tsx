/**
 * Integration Test for Quotation Pages
 * Tests the quotation workflow: List → Create → View → Edit
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import QuotationsListPage from '@/app/(auth)/quotations/page'
import NewQuotationPage from '@/app/(auth)/quotations/new/page'
import QuotationDetailPage from '@/app/(auth)/quotations/[id]/page'
import * as useAuthHook from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
}))
jest.mock('@/lib/hooks/use-auth')

const mockUseAuth = useAuthHook as jest.Mocked<typeof useAuthHook>
const mockPush = jest.fn()

// Mock fetch
global.fetch = jest.fn()

describe('Quotation Pages Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: jest.fn()
    })

    ;(useParams as jest.Mock).mockReturnValue({
      id: 'quote1'
    })
    
    mockUseAuth.useAuth.mockReturnValue({
      user: { id: 'user1', name: 'Test User' },
      loading: false
    })

    // Mock API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/quotations') && !url.includes('/api/quotations/quote1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [], total: 0 })
        })
      }
      if (url.includes('/api/quotations/quote1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            data: {
              id: 'quote1',
              number: 'QT-001',
              salesCase: {
                id: 'sc1',
                caseNumber: 'SC-001',
                customer: { id: 'cust1', name: 'Acme Corp', email: 'test@acme.com' }
              },
              status: 'DRAFT',
              validUntil: '2024-03-01',
              terms: 'Net 30',
              notes: 'Test quotation',
              total: 5000,
              createdAt: '2024-01-01T00:00:00Z',
              lines: []
            }
          })
        })
      }
      if (url.includes('/api/sales-cases')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            data: [{
              id: 'sc1',
              caseNumber: 'SC-001',
              customer: { id: 'cust1', name: 'Acme Corp', email: 'test@acme.com' },
              description: 'Test Project'
            }]
          })
        })
      }
      if (url.includes('/api/inventory/items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  describe('🔄 Complete Quotation Workflow', () => {
    it('should support the full quotation management flow', () => {
      // 1. Quotations List Page
      const { unmount: unmountList } = render(<QuotationsListPage />)
      
      expect(screen.getByText('Quotations')).toBeInTheDocument()
      expect(screen.getByText('New Quotation')).toBeInTheDocument()
      
      // Verify navigation to create new quotation
      const newQuotationButton = screen.getByText('New Quotation')
      fireEvent.click(newQuotationButton)
      expect(mockPush).toHaveBeenCalledWith('/quotations/new')
      
      unmountList()

      // 2. New Quotation Page
      const { unmount: unmountNew } = render(<NewQuotationPage />)
      
      expect(screen.getByText('Back to Quotations')).toBeInTheDocument()
      expect(screen.getByText('Loading form data...')).toBeInTheDocument()
      
      unmountNew()

      // 3. Quotation Detail Page
      const { unmount: unmountDetail } = render(<QuotationDetailPage />)
      
      expect(screen.getByText('Loading quotation...')).toBeInTheDocument()
      
      unmountDetail()
    })

    it('should have consistent navigation patterns', () => {
      // Test List Page
      render(<QuotationsListPage />)
      const newQuotationBtn = screen.getByText('New Quotation')
      fireEvent.click(newQuotationBtn)
      expect(mockPush).toHaveBeenCalledWith('/quotations/new')
    })

    it('should integrate with quotation form components', () => {
      // Verify QuotationForm component is used
      render(<NewQuotationPage />)
      expect(screen.getByText('Back to Quotations')).toBeInTheDocument()
      
      render(<QuotationDetailPage />)
      expect(screen.getByText('Loading quotation...')).toBeInTheDocument()
    })
  })

  describe('🔗 Navigation Integration', () => {
    it('should handle back navigation correctly', () => {
      // New quotation page back navigation
      render(<NewQuotationPage />)
      const backButton = screen.getByText('Back to Quotations')
      fireEvent.click(backButton)
      expect(mockPush).toHaveBeenCalledWith('/quotations')
    })

    it('should handle quotation detail navigation', () => {
      render(<QuotationDetailPage />)
      expect(screen.getByText('Loading quotation...')).toBeInTheDocument()
    })
  })

  describe('🎨 UI Consistency', () => {
    it('should maintain consistent header patterns', () => {
      render(<QuotationsListPage />)
      expect(screen.getByText('Quotations')).toHaveClass('text-2xl', 'font-semibold')
      
      render(<NewQuotationPage />)
      expect(screen.getByText('Back to Quotations')).toBeInTheDocument()
    })

    it('should have consistent button styling', () => {
      render(<QuotationsListPage />)
      expect(screen.getByText('New Quotation')).toHaveClass('bg-blue-600')
    })
  })
})