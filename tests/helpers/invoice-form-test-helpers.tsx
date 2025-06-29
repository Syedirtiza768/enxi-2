import React from 'react'
import { render, waitFor, screen, act, RenderOptions } from '@testing-library/react'
import { InvoiceForm } from '@/components/invoices/invoice-form'

interface RenderInvoiceFormOptions extends RenderOptions {
  onSubmit?: jest.Mock
  onCancel?: jest.Mock
  invoice?: any
  fromSalesOrder?: string
  fromQuotation?: string
}

/**
 * Render InvoiceForm with proper async handling and wait for loading to complete
 */
export async function renderInvoiceForm(options: RenderInvoiceFormOptions = {}) {
  const {
    onSubmit = jest.fn(),
    onCancel = jest.fn(),
    invoice,
    fromSalesOrder,
    fromQuotation,
    ...renderOptions
  } = options

  let result: any

  await act(async () => {
    result = render(
      <InvoiceForm
        invoice={invoice}
        onSubmit={onSubmit}
        onCancel={onCancel}
        fromSalesOrder={fromSalesOrder}
        fromQuotation={fromQuotation}
      />,
      renderOptions
    )
  })

  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByText(/loading form data/i)).not.toBeInTheDocument()
  }, { timeout: 5000 })

  return {
    ...result,
    onSubmit,
    onCancel,
  }
}

/**
 * Mock data for tests
 */
export const mockCustomers = [
  {
    id: 'cust1',
    name: 'Acme Corp',
    email: 'billing@acme.com',
    address: '123 Main St, City, ST 12345'
  }
]

export const mockSalesOrders = [
  {
    id: 'so1',
    orderNumber: 'SO-001',
    customerId: 'cust1',
    customer: { name: 'Acme Corp' },
    status: 'APPROVED',
    total: 5000
  }
]

export const mockInventoryItems = [
  {
    id: 'item1',
    itemCode: 'ITM-001',
    description: 'Software Development',
    unitPrice: 100
  }
]

export const mockInvoice = {
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

/**
 * Setup API mocks with proper response format
 */
export function setupInvoiceFormMocks() {
  const { apiClient } = require('@/lib/api/client')
  
  apiClient.mockImplementation((url: string) => {
    if (url.includes('/api/customers')) {
      return Promise.resolve({
        ok: true,
        data: mockCustomers
      })
    }
    if (url.includes('/api/sales-orders')) {
      return Promise.resolve({
        ok: true,
        data: mockSalesOrders
      })
    }
    if (url.includes('/api/inventory/items')) {
      return Promise.resolve({
        ok: true,
        data: mockInventoryItems
      })
    }
    if (url.includes('/api/quotations/')) {
      return Promise.resolve({
        ok: true,
        data: {
          id: 'quote1',
          customerId: 'cust1',
          items: mockInvoice.items
        }
      })
    }
    return Promise.resolve({ ok: true, data: [] })
  })
}