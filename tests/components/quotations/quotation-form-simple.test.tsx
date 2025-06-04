/**
 * Simple verification test for Quotation Form - basic display
 */

import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { QuotationForm } from '@/components/quotations/quotation-form'
import * as useAuthHook from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))
jest.mock('@/lib/hooks/use-auth')

const mockUseAuth = useAuthHook as jest.Mocked<typeof useAuthHook>

// Mock fetch with immediate resolution
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: [
    {
      id: 'sc1',
      caseNumber: 'SC-001',
      customer: { id: 'cust1', name: 'Acme Corp', email: 'test@acme.com' },
      description: 'Test Project'
    }
  ] })
})

describe('Quotation Form - Simple Display Test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      refresh: jest.fn()
    })
    
    mockUseAuth.useAuth.mockReturnValue({
      user: { id: 'user1', name: 'Test User' },
      loading: false
    })
  })

  it('🟢 should render form after loading', async () => {
    const mockOnSubmit = jest.fn()
    const mockOnCancel = jest.fn()
    
    render(
      <QuotationForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    
    // Should show loading initially
    expect(screen.getByText('Loading form data...')).toBeInTheDocument()
    
    // Should show form after loading
    await waitFor(() => {
      expect(screen.getByText('Create Quotation')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByLabelText('Sales Case')).toBeInTheDocument()
    expect(screen.getByLabelText('Valid Until')).toBeInTheDocument()
  })

  it('🟢 should load with existing quotation data', async () => {
    const mockQuotation = {
      id: 'quote1',
      number: 'QT-001',
      salesCaseId: 'sc1',
      validUntil: '2024-03-01',
      terms: 'Net 30',
      notes: 'Test notes',
      status: 'DRAFT' as const,
      total: 1000,
      lines: []
    }
    
    const mockOnSubmit = jest.fn()
    const mockOnCancel = jest.fn()
    
    render(
      <QuotationForm 
        quotation={mockQuotation}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    
    await waitFor(() => {
      expect(screen.getByText('Edit Quotation')).toBeInTheDocument()
    })
    
    expect(screen.getByDisplayValue('QT-001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Net 30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
  })
})