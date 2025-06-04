/**
 * Simplified TDD Test for Quotations List Page - Basic functionality
 */

import { render, screen, fireEvent } from '@testing-library/react'
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

describe('Quotations List Page - Basic Tests', () => {
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

  it('🟢 should render page header and basic elements', () => {
    render(<QuotationsPage />)
    
    expect(screen.getByText('Quotations')).toBeInTheDocument()
    expect(screen.getByText('New Quotation')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search quotations...')).toBeInTheDocument()
  })

  it('🟢 should have all required filter elements', () => {
    render(<QuotationsPage />)
    
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
    expect(screen.getByLabelText('Sales Case')).toBeInTheDocument()
    expect(screen.getByLabelText('Date Range')).toBeInTheDocument()
  })

  it('🟢 should display statistics cards', () => {
    render(<QuotationsPage />)
    
    expect(screen.getByText('Total Quotations')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getAllByText('Accepted')[0]).toBeInTheDocument() // Use first occurrence (statistics)
    expect(screen.getByText('Total Value')).toBeInTheDocument()
  })

  it('🟢 should have quick actions section', () => {
    render(<QuotationsPage />)
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Create from Template')).toBeInTheDocument()
    expect(screen.getByText('Export All')).toBeInTheDocument()
  })

  it('🟢 should handle navigation to new quotation', () => {
    render(<QuotationsPage />)
    
    const newQuotationButton = screen.getByText('New Quotation')
    fireEvent.click(newQuotationButton)
    
    expect(mockPush).toHaveBeenCalledWith('/quotations/new')
  })

  it('🟢 should show recent activity section', () => {
    render(<QuotationsPage />)
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })
})