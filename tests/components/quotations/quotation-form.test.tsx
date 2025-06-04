/**
 * TDD Test Suite for Quotation Form Component
 * Main form for creating/editing quotations with Line Item Editor integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { QuotationForm } from '@/components/quotations/quotation-form'
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

const mockSalesCases = [
  {
    id: 'sc1',
    caseNumber: 'SC-001',
    customer: {
      id: 'cust1',
      name: 'Acme Corp',
      email: 'contact@acme.com'
    },
    description: 'Website Development Project'
  }
]

const mockQuotation = {
  id: 'quote1',
  number: 'QT-001',
  salesCaseId: 'sc1',
  validUntil: '2024-03-01',
  terms: 'Net 30',
  notes: 'Please review and confirm',
  status: 'DRAFT' as const,
  total: 5000,
  lines: [
    {
      id: 'line1',
      description: 'Development Services',
      total: 5000,
      lineItems: [
        {
          id: 'item1',
          type: 'SERVICE' as const,
          description: 'Frontend Development',
          quantity: 40,
          unitPrice: 100,
          total: 4000
        }
      ]
    }
  ]
}

describe('Quotation Form Component - TDD Tests', () => {
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
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/sales-cases')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockSalesCases })
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

  describe('🔴 RED: Form Structure Tests', () => {
    it('should render quotation form with all required fields', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Create Quotation')).toBeInTheDocument()
      expect(screen.getByLabelText('Sales Case')).toBeInTheDocument()
      expect(screen.getByLabelText('Valid Until')).toBeInTheDocument()
      expect(screen.getByLabelText('Terms')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes')).toBeInTheDocument()
      expect(screen.getByText('Quotation Lines')).toBeInTheDocument()
    })

    it('should render in edit mode when quotation provided', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Edit Quotation')).toBeInTheDocument()
      expect(screen.getByDisplayValue('QT-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Net 30')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Please review and confirm')).toBeInTheDocument()
    })

    it('should display form action buttons', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Create Quotation')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save as Draft')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Sales Case Integration Tests', () => {
    it('should load and display sales cases in dropdown', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/sales-cases', {
          credentials: 'include'
        })
      })
      
      await waitFor(() => {
        const salesCaseSelect = screen.getByLabelText('Sales Case')
        expect(salesCaseSelect).toBeInTheDocument()
        expect(screen.getByText('SC-001 - Website Development Project')).toBeInTheDocument()
      })
    })

    it('should auto-populate customer info when sales case selected', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        const salesCaseSelect = screen.getByLabelText('Sales Case')
        fireEvent.change(salesCaseSelect, { target: { value: 'sc1' } })
      })
      
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('contact@acme.com')).toBeInTheDocument()
      })
    })

    it('should show validation error if no sales case selected', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Create Quotation')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Sales case is required')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Line Item Editor Integration Tests', () => {
    it('should integrate Line Item Editor component', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Quotation Lines')).toBeInTheDocument()
      expect(screen.getByText('Client View')).toBeInTheDocument()
      expect(screen.getByText('Internal View')).toBeInTheDocument()
      expect(screen.getByText('Add Line')).toBeInTheDocument()
    })

    it('should display existing quotation lines', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByDisplayValue('Development Services')).toBeInTheDocument()
      expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    })

    it('should update quotation total when lines change', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Should show current total
      expect(screen.getByText('Total: $5,000.00')).toBeInTheDocument()
      
      // Add a new line
      const addLineButton = screen.getByText('Add Line')
      fireEvent.click(addLineButton)
      
      // Total should update (though initially 0 for new line)
      expect(screen.getByText(/Total:/)).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Form Validation Tests', () => {
    it('should validate required fields on submit', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Create Quotation')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Sales case is required')).toBeInTheDocument()
      expect(screen.getByText('Valid until date is required')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate valid until date is in future', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const validUntilInput = screen.getByLabelText('Valid Until')
      fireEvent.change(validUntilInput, { target: { value: '2020-01-01' } })
      
      const submitButton = screen.getByText('Create Quotation')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Valid until date must be in the future')).toBeInTheDocument()
    })

    it('should validate that quotation has at least one line', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Fill required fields but no lines
      const salesCaseSelect = screen.getByLabelText('Sales Case')
      fireEvent.change(salesCaseSelect, { target: { value: 'sc1' } })
      
      const validUntilInput = screen.getByLabelText('Valid Until')
      fireEvent.change(validUntilInput, { target: { value: '2024-12-31' } })
      
      const submitButton = screen.getByText('Create Quotation')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('At least one quotation line is required')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Form Submission Tests', () => {
    it('should submit form with correct data structure', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Update Quotation')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          id: 'quote1',
          number: 'QT-001',
          salesCaseId: 'sc1',
          validUntil: '2024-03-01',
          terms: 'Net 30',
          notes: 'Please review and confirm',
          status: 'DRAFT',
          lines: expect.arrayContaining([
            expect.objectContaining({
              description: 'Development Services',
              total: 5000
            })
          ]),
          total: 5000
        })
      })
    })

    it('should handle save as draft action', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const draftButton = screen.getByText('Save as Draft')
      fireEvent.click(draftButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'DRAFT'
          })
        )
      })
    })

    it('should handle cancel action', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('🔴 RED: Auto-save and Draft Management Tests', () => {
    it('should auto-save form changes periodically', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          autoSave={true}
        />
      )
      
      // Change terms field
      const termsInput = screen.getByDisplayValue('Net 30')
      fireEvent.change(termsInput, { target: { value: 'Net 15' } })
      
      // Wait for auto-save (typically 2-3 seconds)
      await waitFor(() => {
        expect(screen.getByText('Auto-saved')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should show unsaved changes indicator', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const termsInput = screen.getByDisplayValue('Net 30')
      fireEvent.change(termsInput, { target: { value: 'Net 15' } })
      
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Quotation Preview Tests', () => {
    it('should show quotation preview in read-only mode', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="preview"
        />
      )
      
      expect(screen.getByText('Quotation Preview')).toBeInTheDocument()
      expect(screen.queryByText('Edit Quotation')).not.toBeInTheDocument()
      
      // Fields should be read-only
      const termsInput = screen.getByDisplayValue('Net 30')
      expect(termsInput).toHaveAttribute('readonly')
    })

    it('should show customer information in preview', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="preview"
        />
      )
      
      expect(screen.getByText('Customer Information')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('should allow switching from preview to edit mode', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="preview"
        />
      )
      
      const editButton = screen.getByText('Edit Quotation')
      fireEvent.click(editButton)
      
      expect(screen.getByText('Update Quotation')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Error Handling Tests', () => {
    it('should handle API errors when loading sales cases', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load sales cases/)).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching data', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Loading form data...')).toBeInTheDocument()
    })

    it('should handle form submission errors', async () => {
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'))
      const mockOnCancel = jest.fn()
      
      render(
        <QuotationForm 
          quotation={mockQuotation}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Update Quotation')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to save quotation/)).toBeInTheDocument()
      })
    })
  })
})