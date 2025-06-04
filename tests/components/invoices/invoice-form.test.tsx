/**
 * TDD Test Suite for Invoice Form Component
 * Main form for creating/editing invoices with line items and financial calculations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/invoice-form'
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

const mockCustomers = [
  {
    id: 'cust1',
    name: 'Acme Corp',
    email: 'billing@acme.com',
    address: '123 Main St, City, ST 12345'
  }
]

const mockSalesOrders = [
  {
    id: 'so1',
    orderNumber: 'SO-001',
    customerId: 'cust1',
    customer: { name: 'Acme Corp' },
    status: 'APPROVED',
    total: 5000
  }
]

const mockInventoryItems = [
  {
    id: 'item1',
    itemCode: 'ITM-001',
    description: 'Software Development',
    unitPrice: 100
  }
]

const mockInvoice = {
  id: 'inv1',
  invoiceNumber: 'INV2025000001',
  customerId: 'cust1',
  salesOrderId: 'so1',
  type: 'SALES' as const,
  status: 'DRAFT' as const,
  invoiceDate: '2025-01-01',
  dueDate: '2025-01-31',
  paymentTerms: 'Net 30',
  billingAddress: '123 Main St, City, ST 12345',
  notes: 'Test invoice notes',
  subtotal: 5000,
  taxAmount: 500,
  discountAmount: 0,
  totalAmount: 5500,
  paidAmount: 0,
  balanceAmount: 5500,
  items: [
    {
      id: 'item1',
      itemCode: 'ITM-001',
      description: 'Software Development',
      quantity: 50,
      unitPrice: 100,
      discount: 0,
      taxRate: 10,
      subtotal: 5000,
      discountAmount: 0,
      taxAmount: 500,
      totalAmount: 5500
    }
  ]
}

describe('Invoice Form Component - TDD Tests', () => {
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
      if (url.includes('/api/customers')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockCustomers })
        })
      }
      if (url.includes('/api/sales-orders')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockSalesOrders })
        })
      }
      if (url.includes('/api/inventory/items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockInventoryItems })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  describe('🔴 RED: Form Structure Tests', () => {
    it('should render invoice form with all required fields', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Create Invoice')).toBeInTheDocument()
      expect(screen.getByLabelText('Customer')).toBeInTheDocument()
      expect(screen.getByLabelText('Invoice Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Payment Terms')).toBeInTheDocument()
      expect(screen.getByLabelText('Invoice Type')).toBeInTheDocument()
      expect(screen.getByText('Invoice Items')).toBeInTheDocument()
    })

    it('should render in edit mode when invoice provided', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Edit Invoice')).toBeInTheDocument()
      expect(screen.getByDisplayValue('INV2025000001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Net 30')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test invoice notes')).toBeInTheDocument()
    })

    it('should display form action buttons', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Create Invoice')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save as Draft')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Customer Integration Tests', () => {
    it('should load and display customers in dropdown', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/customers', {
          credentials: 'include'
        })
      })
      
      await waitFor(() => {
        const customerSelect = screen.getByLabelText('Customer')
        expect(customerSelect).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      })
    })

    it('should auto-populate billing address when customer selected', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        const customerSelect = screen.getByLabelText('Customer')
        fireEvent.change(customerSelect, { target: { value: 'cust1' } })
      })
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('123 Main St, City, ST 12345')).toBeInTheDocument()
      })
    })

    it('should show validation error if no customer selected', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Create Invoice')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Customer is required')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Sales Order Integration Tests', () => {
    it('should show sales order selection option', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByLabelText('Sales Order (Optional)')).toBeInTheDocument()
    })

    it('should populate items from selected sales order', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        const salesOrderSelect = screen.getByLabelText('Sales Order (Optional)')
        fireEvent.change(salesOrderSelect, { target: { value: 'so1' } })
      })
      
      // Should populate customer and items from sales order
      await waitFor(() => {
        expect(screen.getByDisplayValue('cust1')).toBeInTheDocument()
      })
    })

    it('should show create from sales order button', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          fromSalesOrder="so1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Create Invoice from Sales Order')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Invoice Items Management Tests', () => {
    it('should display invoice items section', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Invoice Items')).toBeInTheDocument()
      expect(screen.getByText('Add Item')).toBeInTheDocument()
    })

    it('should display existing invoice items', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByDisplayValue('ITM-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Software Development')).toBeInTheDocument()
      expect(screen.getByDisplayValue('50')).toBeInTheDocument() // quantity
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // unit price
    })

    it('should add new invoice item', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const addItemButton = screen.getByText('Add Item')
      fireEvent.click(addItemButton)
      
      // Should add a new empty item row
      expect(screen.getByLabelText('Item Code')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument()
      expect(screen.getByLabelText('Unit Price')).toBeInTheDocument()
    })

    it('should calculate line item totals automatically', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Should show calculated totals
      expect(screen.getByText('$5,000.00')).toBeInTheDocument() // Subtotal
      expect(screen.getByText('$500.00')).toBeInTheDocument() // Tax amount
      expect(screen.getByText('$5,500.00')).toBeInTheDocument() // Total
    })

    it('should handle item removal', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const removeButton = screen.getByLabelText('Remove item')
      fireEvent.click(removeButton)
      
      // Item should be removed
      expect(screen.queryByDisplayValue('ITM-001')).not.toBeInTheDocument()
    })
  })

  describe('🔴 RED: Financial Calculations Tests', () => {
    it('should calculate invoice totals correctly', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Should display financial summary
      expect(screen.getByText('Subtotal')).toBeInTheDocument()
      expect(screen.getByText('Tax Amount')).toBeInTheDocument()
      expect(screen.getByText('Discount')).toBeInTheDocument()
      expect(screen.getByText('Total Amount')).toBeInTheDocument()
    })

    it('should recalculate totals when items change', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Change quantity
      const quantityInput = screen.getByDisplayValue('50')
      fireEvent.change(quantityInput, { target: { value: '60' } })
      
      // Should recalculate totals
      expect(screen.getByText('$6,000.00')).toBeInTheDocument() // New subtotal
    })

    it('should handle discount calculations', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Add discount
      const discountInput = screen.getByLabelText('Discount (%)')
      fireEvent.change(discountInput, { target: { value: '10' } })
      
      // Should apply discount to calculations
      expect(screen.getByText('$4,500.00')).toBeInTheDocument() // Discounted subtotal
    })

    it('should handle tax calculations', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Tax should be calculated on items
      expect(screen.getByDisplayValue('10')).toBeInTheDocument() // Tax rate
    })
  })

  describe('🔴 RED: Form Validation Tests', () => {
    it('should validate required fields on submit', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Create Invoice')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Customer is required')).toBeInTheDocument()
      expect(screen.getByText('Invoice date is required')).toBeInTheDocument()
      expect(screen.getByText('Due date is required')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate due date is after invoice date', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const invoiceDateInput = screen.getByLabelText('Invoice Date')
      const dueDateInput = screen.getByLabelText('Due Date')
      
      fireEvent.change(invoiceDateInput, { target: { value: '2025-02-01' } })
      fireEvent.change(dueDateInput, { target: { value: '2025-01-01' } })
      
      const submitButton = screen.getByText('Create Invoice')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Due date must be after invoice date')).toBeInTheDocument()
    })

    it('should validate that invoice has at least one item', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Fill required fields but no items
      const customerSelect = screen.getByLabelText('Customer')
      fireEvent.change(customerSelect, { target: { value: 'cust1' } })
      
      const invoiceDateInput = screen.getByLabelText('Invoice Date')
      fireEvent.change(invoiceDateInput, { target: { value: '2025-01-01' } })
      
      const dueDateInput = screen.getByLabelText('Due Date')
      fireEvent.change(dueDateInput, { target: { value: '2025-01-31' } })
      
      const submitButton = screen.getByText('Create Invoice')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('At least one invoice item is required')).toBeInTheDocument()
    })

    it('should validate item fields', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      // Add item but leave fields empty
      const addItemButton = screen.getByText('Add Item')
      fireEvent.click(addItemButton)
      
      const submitButton = screen.getByText('Create Invoice')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Description is required for all items')).toBeInTheDocument()
      expect(screen.getByText('Quantity must be greater than 0')).toBeInTheDocument()
      expect(screen.getByText('Unit price must be greater than 0')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Form Submission Tests', () => {
    it('should submit form with correct data structure', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Update Invoice')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          id: 'inv1',
          invoiceNumber: 'INV2025000001',
          customerId: 'cust1',
          salesOrderId: 'so1',
          type: 'SALES',
          status: 'SENT',
          invoiceDate: '2025-01-01',
          dueDate: '2025-01-31',
          paymentTerms: 'Net 30',
          billingAddress: '123 Main St, City, ST 12345',
          notes: 'Test invoice notes',
          items: expect.arrayContaining([
            expect.objectContaining({
              itemCode: 'ITM-001',
              description: 'Software Development',
              quantity: 50,
              unitPrice: 100
            })
          ]),
          subtotal: 5000,
          taxAmount: 500,
          totalAmount: 5500
        })
      })
    })

    it('should handle save as draft action', async () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={mockInvoice}
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
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('🔴 RED: Invoice Types Tests', () => {
    it('should support different invoice types', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const typeSelect = screen.getByLabelText('Invoice Type')
      expect(screen.getByText('Sales Invoice')).toBeInTheDocument()
      expect(screen.getByText('Credit Note')).toBeInTheDocument()
      expect(screen.getByText('Debit Note')).toBeInTheDocument()
      expect(screen.getByText('Proforma Invoice')).toBeInTheDocument()
    })

    it('should adjust form behavior for credit notes', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          invoice={{...mockInvoice, type: 'CREDIT_NOTE'}}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Edit Credit Note')).toBeInTheDocument()
      // Credit notes should show negative amounts
      expect(screen.getByText('-$5,500.00')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Error Handling Tests', () => {
    it('should handle API errors when loading reference data', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load form data/)).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching data', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <InvoiceForm 
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
        <InvoiceForm 
          invoice={mockInvoice}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )
      
      const submitButton = screen.getByText('Update Invoice')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to save invoice/)).toBeInTheDocument()
      })
    })
  })
})