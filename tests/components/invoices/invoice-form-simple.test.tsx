/**
 * Simple verification test for Invoice Form - basic display
 */

import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/invoice-form'
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
      id: 'cust1',
      name: 'Acme Corp',
      email: 'billing@acme.com',
      address: '123 Main St'
    }
  ] })
})

describe('Invoice Form - Simple Display Test', () => {
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
      <InvoiceForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    
    // Should show loading initially
    expect(screen.getByText('Loading form data...')).toBeInTheDocument()
    
    // Should show form after loading
    await waitFor(() => {
      expect(screen.getByText('Create Invoice')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByLabelText('Customer')).toBeInTheDocument()
    expect(screen.getByLabelText('Invoice Date')).toBeInTheDocument()
  })

  it('🟢 should load with existing invoice data', async () => {
    const mockInvoice = {
      id: 'inv1',
      invoiceNumber: 'INV2025000001',
      customerId: 'cust1',
      type: 'SALES' as const,
      status: 'DRAFT' as const,
      invoiceDate: '2025-01-01',
      dueDate: '2025-01-31',
      paymentTerms: 'Net 30',
      billingAddress: '123 Main St',
      notes: 'Test notes',
      subtotal: 1000,
      taxAmount: 100,
      discountAmount: 0,
      totalAmount: 1100,
      paidAmount: 0,
      balanceAmount: 1100,
      items: []
    }
    
    const mockOnSubmit = jest.fn()
    const mockOnCancel = jest.fn()
    
    render(
      <InvoiceForm 
        invoice={mockInvoice}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    
    await waitFor(() => {
      expect(screen.getByText('Edit Invoice')).toBeInTheDocument()
    })
    
    expect(screen.getByDisplayValue('INV2025000001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Net 30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
  })
})