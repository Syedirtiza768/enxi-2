import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerLedger } from '@/components/payments/customer-ledger'

// Mock the Select component for this test
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="">All types</option>
      <option value="invoice">Invoices</option>
      <option value="payment">Payments</option>
      <option value="credit_note">Credit Notes</option>
    </select>
  ),
  SelectTrigger: ({ children, id }: any) => null, // Don't render to avoid nesting
  SelectValue: ({ placeholder }: any) => null, // Don't render to avoid nesting
  SelectContent: ({ children }: any) => null, // Don't render to avoid nesting
  SelectItem: ({ children, value }: any) => null, // Don't render to avoid nesting
}))

// Mock the PaymentForm component
jest.mock('@/components/payments/payment-form', () => ({
  PaymentForm: ({ onSuccess, onCancel }: any) => (
    <div>
      <h3>Payment Form</h3>
      <button onClick={onSuccess}>Success</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

const mockCustomerData = {
  id: 'customer-1',
  name: 'Test Customer',
  email: 'test@customer.com',
  creditLimit: 5000,
  currentBalance: 1250.50,
}

const mockTransactions = [
  {
    id: 'inv-1',
    type: 'invoice',
    date: '2024-05-15',
    reference: 'INV-2024-001',
    description: 'Software License',
    debit: 1000.00,
    credit: 0,
    balance: 1000.00,
  },
  {
    id: 'pay-1',
    type: 'payment',
    date: '2024-05-20',
    reference: 'PAY-001',
    description: 'Payment received',
    debit: 0,
    credit: 500.00,
    balance: 500.00,
  },
  {
    id: 'inv-2',
    type: 'invoice',
    date: '2024-05-25',
    reference: 'INV-2024-002',
    description: 'Consulting Services',
    debit: 750.50,
    credit: 0,
    balance: 1250.50,
  },
]

const defaultProps = {
  customerId: 'customer-1',
}

describe('CustomerLedger Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { apiClient } = require('@/lib/api/client')
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/customers/customer-1/transactions')) {
        return Promise.resolve({ data: mockTransactions })
      }
      if (url.includes('/customers/customer-1')) {
        return Promise.resolve({ data: mockCustomerData })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  describe('Rendering', () => {
    it('should render customer ledger with customer info', async () => {
      render(<CustomerLedger {...defaultProps} />)

      expect(screen.getByText('Customer Ledger')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument()
        expect(screen.getByText('test@customer.com')).toBeInTheDocument()
        expect(screen.getAllByText('$1,250.50')).toHaveLength(2) // Current balance appears in summary and transactions
        expect(screen.getByText('$5,000.00')).toBeInTheDocument() // Credit limit
      })
    })

    it('should render transaction history table', async () => {
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByText('Date')).toBeInTheDocument()
        expect(screen.getByText('Reference')).toBeInTheDocument()
        expect(screen.getByText('Description')).toBeInTheDocument()
        expect(screen.getByText('Debit')).toBeInTheDocument()
        expect(screen.getByText('Credit')).toBeInTheDocument()
        expect(screen.getByText('Balance')).toBeInTheDocument()
      })
    })

    it('should display transaction rows', async () => {
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument()
        expect(screen.getByText('Software License')).toBeInTheDocument()
        expect(screen.getByText('PAY-001')).toBeInTheDocument()
        expect(screen.getByText('Payment received')).toBeInTheDocument()
        expect(screen.getByText('INV-2024-002')).toBeInTheDocument()
        expect(screen.getByText('Consulting Services')).toBeInTheDocument()
      })
    })

    it('should show credit availability', async () => {
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        // Credit limit - current balance = available credit
        expect(screen.getByText('$3,749.50')).toBeInTheDocument() // 5000 - 1250.50
      })
    })
  })

  describe('Data Loading', () => {
    it('should handle loading states', async () => {
      render(<CustomerLedger {...defaultProps} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      const { apiClient } = require('@/lib/api/client')
      apiClient.get.mockRejectedValue(new Error('Network error'))

      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument()
      })
    })
  })

  describe('Filtering and Sorting', () => {
    it('should provide date range filter', async () => {
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/from date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/to date/i)).toBeInTheDocument()
      })
    })

    it('should allow filtering by transaction type', async () => {
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Transaction Type')).toBeInTheDocument()
        expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
      })
    })

    it('should sort transactions by date by default', async () => {
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // Skip header row, check data rows - dates formatted as "May 25, 2024"
        expect(rows[1]).toHaveTextContent('May 25, 2024') // Most recent first
        expect(rows[2]).toHaveTextContent('May 20, 2024')
        expect(rows[3]).toHaveTextContent('May 15, 2024')
      })
    })
  })

  describe('Actions', () => {
    it('should provide record payment button', async () => {
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument()
      })
    })

    it('should show payment form when record payment is clicked', async () => {
      const user = userEvent.setup()
      render(<CustomerLedger {...defaultProps} />)

      await waitFor(() => {
        const recordButton = screen.getByRole('button', { name: /record payment/i })
        expect(recordButton).toBeInTheDocument()
      })

      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)

      expect(screen.getByText('Record New Payment')).toBeInTheDocument()
    })
  })
})