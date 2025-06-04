import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useRouter, useParams } from 'next/navigation'
import SalesOrderEditPage from '@/app/(auth)/sales-orders/[id]/edit/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('SalesOrderEditPage', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  }

  const mockSalesOrder = {
    id: 'so-1',
    orderNumber: 'SO-2024-001',
    salesCase: {
      id: 'sc-1',
      caseNumber: 'SC-2024-001',
      title: 'Software Development Project',
      customer: {
        id: 'cust-1',
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+1 555-123-4567',
        address: '123 Business St, City, State 12345'
      }
    },
    quotation: {
      id: 'quot-1',
      quotationNumber: 'QUOT-2024-001'
    },
    status: 'DRAFT',
    customerPO: 'PO-2024-001',
    requestedDate: '2024-02-15T00:00:00Z',
    promisedDate: '2024-02-20T00:00:00Z',
    paymentTerms: 'Net 30 days',
    shippingTerms: 'FOB Origin',
    shippingAddress: '456 Delivery Ave, City, State 12345',
    billingAddress: '123 Business St, City, State 12345',
    notes: 'Initial sales order notes',
    subtotal: 45000,
    discountAmount: 2250,
    taxAmount: 4275,
    totalAmount: 47025,
    items: [
      {
        id: 'soi-1',
        itemCode: 'ITM-001',
        description: 'Software Development Services',
        quantity: 40,
        unitPrice: 125,
        discount: 5,
        taxRate: 10,
        subtotal: 5000,
        discountAmount: 250,
        taxAmount: 475,
        totalAmount: 5225
      },
      {
        id: 'soi-2',
        itemCode: 'ITM-002',
        description: 'Consulting Services',
        quantity: 20,
        unitPrice: 200,
        discount: 0,
        taxRate: 10,
        subtotal: 4000,
        discountAmount: 0,
        taxAmount: 400,
        totalAmount: 4400
      }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useParams as jest.Mock).mockReturnValue({ id: 'so-1' })
  })

  it('should render loading state initially', () => {
    ;(fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )

    render(<SalesOrderEditPage />)
    
    expect(screen.getByText('Loading sales order...')).toBeInTheDocument()
  })

  it('should render edit form with pre-populated data', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      // Header
      expect(screen.getByText('Edit Sales Order SO-2024-001')).toBeInTheDocument()
      
      // Form fields
      expect(screen.getByDisplayValue('PO-2024-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Net 30 days')).toBeInTheDocument()
      expect(screen.getByDisplayValue('FOB Origin')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Initial sales order notes')).toBeInTheDocument()
      
      // Order items
      expect(screen.getByDisplayValue('Software Development Services')).toBeInTheDocument()
      expect(screen.getByDisplayValue('40')).toBeInTheDocument()
      expect(screen.getByDisplayValue('125')).toBeInTheDocument()
      
      expect(screen.getByDisplayValue('Consulting Services')).toBeInTheDocument()
      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
      expect(screen.getByDisplayValue('200')).toBeInTheDocument()
    })
  })

  it('should only allow editing for DRAFT and CONFIRMED orders', async () => {
    const processingOrder = { ...mockSalesOrder, status: 'PROCESSING' }
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => processingOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByText('Cannot edit order with status: PROCESSING')).toBeInTheDocument()
      expect(screen.getByText('Only DRAFT and CONFIRMED orders can be edited')).toBeInTheDocument()
    })
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('PO-2024-001')).toBeInTheDocument()
    })

    // Clear required field
    const customerPOInput = screen.getByLabelText('Customer PO')
    await user.clear(customerPOInput)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Customer PO is required')).toBeInTheDocument()
    })
  })

  it('should validate date fields', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Requested Date')).toBeInTheDocument()
    })

    // Set promised date before requested date
    const requestedDateInput = screen.getByLabelText('Requested Date')
    const promisedDateInput = screen.getByLabelText('Promised Date')

    await user.clear(requestedDateInput)
    await user.type(requestedDateInput, '2024-02-20')
    
    await user.clear(promisedDateInput)
    await user.type(promisedDateInput, '2024-02-15')

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Promised date cannot be before requested date')).toBeInTheDocument()
    })
  })

  it('should add new order item', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Software Development Services')).toHaveLength(1)
    })

    const addItemButton = screen.getByRole('button', { name: /add item/i })
    await user.click(addItemButton)

    await waitFor(() => {
      // Should have 3 items now (2 original + 1 new)
      const itemCodeInputs = screen.getAllByLabelText(/item code/i)
      expect(itemCodeInputs).toHaveLength(3)
      
      // New item should be empty
      const lastItemCode = itemCodeInputs[itemCodeInputs.length - 1]
      expect(lastItemCode).toHaveValue('')
    })
  })

  it('should remove order item', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove item/i })).toHaveLength(2)
    })

    const removeButtons = screen.getAllByRole('button', { name: /remove item/i })
    await user.click(removeButtons[0])

    await waitFor(() => {
      // Should have 1 item now
      expect(screen.getAllByRole('button', { name: /remove item/i })).toHaveLength(1)
      expect(screen.queryByDisplayValue('Software Development Services')).not.toBeInTheDocument()
      expect(screen.getByDisplayValue('Consulting Services')).toBeInTheDocument()
    })
  })

  it('should calculate totals automatically', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByText('$47,025.00')).toBeInTheDocument() // Total
    })

    // Change quantity of first item
    const quantityInput = screen.getAllByLabelText(/quantity/i)[0]
    await user.clear(quantityInput)
    await user.type(quantityInput, '50')

    await waitFor(() => {
      // Total should update (additional 10 * 125 * 0.95 * 1.1 = 1306.25)
      // New total: 47025 + 1306.25 = 48331.25
      expect(screen.getByText('$48,331.25')).toBeInTheDocument()
    })
  })

  it('should submit updated order data', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSalesOrder,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockSalesOrder, notes: 'Updated notes' }),
      })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Initial sales order notes')).toBeInTheDocument()
    })

    // Update notes
    const notesInput = screen.getByLabelText('Notes')
    await user.clear(notesInput)
    await user.type(notesInput, 'Updated notes')

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/sales-orders/so-1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: expect.stringContaining('Updated notes')
        })
      )
    })

    expect(mockRouter.push).toHaveBeenCalledWith('/sales-orders/so-1')
  })

  it('should handle submission errors', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSalesOrder,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Initial sales order notes')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to update sales order: Validation failed')).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSalesOrder,
      })
      .mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Initial sales order notes')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()
  })

  it('should cancel editing and navigate back', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Initial sales order notes')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockRouter.push).toHaveBeenCalledWith('/sales-orders/so-1')
  })

  it('should handle error state when order not found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByText('Sales order not found')).toBeInTheDocument()
    })
  })

  it('should prevent editing of non-editable fields for customer info', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSalesOrder,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Acme Corporation')).toBeInTheDocument()
    })

    // Customer fields should be read-only
    const customerNameInput = screen.getByDisplayValue('Acme Corporation')
    expect(customerNameInput).toHaveAttribute('readonly')
  })

  it('should validate at least one item is required', async () => {
    const user = userEvent.setup()
    
    const orderWithOneItem = {
      ...mockSalesOrder,
      items: [mockSalesOrder.items[0]]
    }
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => orderWithOneItem,
    })

    render(<SalesOrderEditPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove item/i })).toHaveLength(1)
    })

    // Try to remove the only item
    const removeButton = screen.getByRole('button', { name: /remove item/i })
    await user.click(removeButton)

    await waitFor(() => {
      expect(screen.getByText('At least one item is required')).toBeInTheDocument()
    })
  })
})