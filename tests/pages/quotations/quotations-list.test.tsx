/**
 * TDD Test Suite for Quotations List Page
 * Testing the main quotations list functionality - core sales workflow
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import QuotationsPage from '@/app/(auth)/quotations/page'
import * as useAuthHook from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))
jest.mock('@/lib/hooks/use-auth')

const mockUseAuth = useAuthHook as jest.Mocked<typeof useAuthHook>
const mockPush = jest.fn()

// Mock fetch
global.fetch = jest.fn()

describe('Quotations List Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: jest.fn()
    })
    
    mockUseAuth.useAuth.mockReturnValue({
      user: { id: 'user1', name: 'Test User' },
      loading: false
    })

    // Mock API responses
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/api/quotations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'quote1',
                  number: 'QT-001',
                  salesCase: {
                    id: 'sc1',
                    caseNumber: 'SC-001',
                    customer: { id: 'cust1', name: 'Acme Corp' }
                  },
                  status: 'DRAFT',
                  validUntil: '2024-02-01',
                  total: 5000,
                  createdAt: '2024-01-01T00:00:00Z',
                  lines: [
                    {
                      id: 'line1',
                      description: 'Software Development Services',
                      total: 5000,
                      lineItems: [
                        {
                          id: 'item1',
                          type: 'SERVICE',
                          description: 'Frontend Development',
                          quantity: 40,
                          unitPrice: 100,
                          total: 4000
                        }
                      ]
                    }
                  ]
                }
              ],
              total: 1,
              page: 1,
              limit: 20
            })
          })
        }
        
        // Mock sales cases for filter dropdown
        if (url.includes('/api/sales-cases')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { id: 'sc1', caseNumber: 'SC-001', customer: { name: 'Acme Corp' } }
              ]
            })
          })
        }
        
        return Promise.reject(new Error('Unknown API endpoint'))
      })
  })

  describe('🔴 RED: Basic page structure tests', () => {
    it('should render quotations page with header and create button', () => {
      render(<QuotationsPage />)
      
      expect(screen.getByText('Quotations')).toBeInTheDocument()
      expect(screen.getByText('New Quotation')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search quotations...')).toBeInTheDocument()
    })

    it('should display loading state initially', () => {
      render(<QuotationsPage />)
      
      expect(screen.getByText('Loading quotations...')).toBeInTheDocument()
    })

    it('should have filters for status, sales case, and date range', () => {
      render(<QuotationsPage />)
      
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
      expect(screen.getByLabelText('Sales Case')).toBeInTheDocument()
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument()
    })

    it('should navigate to new quotation page when create button clicked', () => {
      render(<QuotationsPage />)
      
      const createButton = screen.getByText('New Quotation')
      fireEvent.click(createButton)
      
      expect(mockPush).toHaveBeenCalledWith('/quotations/new')
    })
  })

  describe('🔴 RED: Quotations data display tests', () => {
    it('should fetch and display quotations from API', async () => {
      render(<QuotationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('QT-001')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('SC-001')).toBeInTheDocument()
        expect(screen.getByText('Draft')).toBeInTheDocument()
        expect(screen.getByText('$5,000.00')).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/quotations'),
        expect.objectContaining({
          credentials: 'include'
        })
      )
    })

    it('should display quotation status badges with correct colors', async () => {
      render(<QuotationsPage />)
      
      await waitFor(() => {
        const draftBadge = screen.getByText('Draft')
        expect(draftBadge).toHaveClass('bg-gray-100', 'text-gray-800')
      })
    })

    it('should show validity dates and expired status', async () => {
      // Mock expired quotation
      ;(global.fetch as jest.Mock).mockImplementationOnce((url) => {
        if (url.includes('/api/quotations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'quote2',
                  number: 'QT-002',
                  status: 'SENT',
                  validUntil: '2023-12-01', // Expired
                  total: 1000,
                  salesCase: {
                    customer: { name: 'Test Corp' }
                  }
                }
              ]
            })
          })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      render(<QuotationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument()
      })
    })

    it('should handle search functionality', async () => {
      render(<QuotationsPage />)
      
      const searchInput = screen.getByPlaceholderText('Search quotations...')
      fireEvent.change(searchInput, { target: { value: 'QT-001' } })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=QT-001'),
          expect.any(Object)
        )
      })
    })
  })

  describe('🔴 RED: Quotation actions tests', () => {
    it('should navigate to quotation detail when row clicked', async () => {
      render(<QuotationsPage />)
      
      await waitFor(() => {
        const quotationRow = screen.getByText('QT-001').closest('tr')
        fireEvent.click(quotationRow!)
      })
      
      expect(mockPush).toHaveBeenCalledWith('/quotations/quote1')
    })

    it('should show action buttons on hover', async () => {
      render(<QuotationsPage />)
      
      await waitFor(() => {
        const quotationRow = screen.getByText('QT-001').closest('tr')
        fireEvent.mouseEnter(quotationRow!)
        
        expect(screen.getByLabelText('View quotation')).toBeInTheDocument()
        expect(screen.getByLabelText('Edit quotation')).toBeInTheDocument()
        expect(screen.getByLabelText('Send quotation')).toBeInTheDocument()
      })
    })

    it('should handle bulk operations on selected quotations', async () => {
      render(<QuotationsPage />)
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select quotation/i })
        fireEvent.click(checkbox)
      })
      
      expect(screen.getByText('1 quotation selected')).toBeInTheDocument()
      expect(screen.getByText('Export Selected')).toBeInTheDocument()
      expect(screen.getByText('Send Selected')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Statistics and dashboard tests', () => {
    it('should display quotation statistics cards', async () => {
      render(<QuotationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Quotations')).toBeInTheDocument()
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('Accepted')).toBeInTheDocument()
        expect(screen.getByText('Total Value')).toBeInTheDocument()
      })
    })

    it('should show recent activity and quick actions', () => {
      render(<QuotationsPage />)
      
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Create from Template')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Advanced filtering tests', () => {
    it('should filter by quotation status', async () => {
      render(<QuotationsPage />)
      
      const statusFilter = screen.getByLabelText('Status')
      fireEvent.change(statusFilter, { target: { value: 'SENT' } })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=SENT'),
          expect.any(Object)
        )
      })
    })

    it('should filter by sales case', async () => {
      render(<QuotationsPage />)
      
      const salesCaseFilter = screen.getByLabelText('Sales Case')
      fireEvent.change(salesCaseFilter, { target: { value: 'sc1' } })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('salesCaseId=sc1'),
          expect.any(Object)
        )
      })
    })

    it('should handle date range filtering', async () => {
      render(<QuotationsPage />)
      
      const dateFilter = screen.getByLabelText('Date Range')
      fireEvent.change(dateFilter, { target: { value: 'this-month' } })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('dateRange=this-month'),
          expect.any(Object)
        )
      })
    })
  })

  describe('🔴 RED: Error handling and edge cases', () => {
    it('should display error state when API fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      render(<QuotationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load quotations/i)).toBeInTheDocument()
      })
    })

    it('should handle empty state when no quotations exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], total: 0 })
      })
      
      render(<QuotationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('No quotations found')).toBeInTheDocument()
        expect(screen.getByText('Create your first quotation to get started')).toBeInTheDocument()
      })
    })

    it('should show pagination when quotations exceed page limit', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          data: new Array(20).fill(null).map((_, i) => ({
            id: `quote${i}`,
            number: `QT-${String(i).padStart(3, '0')}`,
            status: 'DRAFT',
            total: 1000,
            salesCase: { customer: { name: 'Test Corp' } }
          })),
          total: 45,
          page: 1,
          limit: 20
        })
      })
      
      render(<QuotationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })
  })
})

describe('Quotations List Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: jest.fn()
    })
    
    mockUseAuth.useAuth.mockReturnValue({
      user: { id: 'user1', name: 'Test User' },
      loading: false
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 })
    })
  })

  it('should work end-to-end: load quotations, search, filter, and navigate', async () => {
    render(<QuotationsPage />)
    
    // 1. Initial load
    await waitFor(() => {
      expect(screen.getByText('Quotations')).toBeInTheDocument()
    })
    
    // 2. Search
    const searchInput = screen.getByPlaceholderText('Search quotations...')
    fireEvent.change(searchInput, { target: { value: 'QT-001' } })
    
    // 3. Filter by status
    const statusFilter = screen.getByLabelText('Status')
    fireEvent.change(statusFilter, { target: { value: 'SENT' } })
    
    // 4. Navigate to create new
    const createButton = screen.getByText('New Quotation')
    fireEvent.click(createButton)
    
    expect(mockPush).toHaveBeenCalledWith('/quotations/new')
  })
})