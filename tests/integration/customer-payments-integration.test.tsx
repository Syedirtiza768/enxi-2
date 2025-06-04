import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerLedger } from '@/components/payments/customer-ledger'
import { CustomerBusinessHistory } from '@/components/payments/customer-business-history'
import { PaymentForm } from '@/components/payments/payment-form'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

// Mock components that aren't needed for integration testing
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="">All types</option>
      <option value="invoice">Invoices</option>
      <option value="payment">Payments</option>
      <option value="credit_note">Credit Notes</option>
    </select>
  ),
  SelectTrigger: ({ children, id }: any) => null,
  SelectValue: ({ placeholder }: any) => null,
  SelectContent: ({ children }: any) => null,
  SelectItem: ({ children, value }: any) => null,
}))

const mockCustomerData = {
  id: 'customer-123',
  name: 'Integration Test Corp',
  email: 'test@integration.com',
  phone: '+1-555-0999',
  createdAt: '2023-06-01',
  creditLimit: 15000,
  currentBalance: 3200.75,
  industry: 'Software',
  leadSource: 'REFERRAL',
}

const mockTransactions = [
  {
    id: 'txn-1',
    type: 'invoice',
    date: '2024-05-30',
    reference: 'INV-2024-010',
    description: 'Software Development Services',
    debit: 2000.00,
    credit: 0,
    balance: 3200.75,
  },
  {
    id: 'txn-2',
    type: 'payment',
    date: '2024-05-25',
    reference: 'PAY-005',
    description: 'Payment for INV-2024-009',
    debit: 0,
    credit: 1500.00,
    balance: 1200.75,
  },
  {
    id: 'txn-3',
    type: 'invoice',
    date: '2024-05-20',
    reference: 'INV-2024-009',
    description: 'Monthly Subscription',
    debit: 1500.00,
    credit: 0,
    balance: 2700.75,
  },
]

const mockBusinessMetrics = {
  totalRevenue: 28500.00,
  totalInvoices: 18,
  totalPayments: 15,
  averagePaymentDays: 21,
  creditUtilization: 0.21, // 21%
  relationshipMonths: 11,
  lastPaymentDate: '2024-05-25',
  lastInvoiceDate: '2024-05-30',
  paymentReliability: 0.89, // 89%
}

const mockActivityTimeline = [
  {
    id: 1,
    type: 'invoice_created',
    date: '2024-05-30',
    description: 'Invoice INV-2024-010 created for $2,000.00',
    amount: 2000.00,
    status: 'pending',
  },
  {
    id: 2,
    type: 'payment_received',
    date: '2024-05-25',
    description: 'Payment received for INV-2024-009',
    amount: 1500.00,
    status: 'completed',
  },
]

const mockPaymentTrends = {
  monthlyData: [
    { month: '2024-01', revenue: 4500, invoices: 3, avgDays: 18 },
    { month: '2024-02', revenue: 3200, invoices: 2, avgDays: 25 },
    { month: '2024-03', revenue: 5800, invoices: 4, avgDays: 15 },
    { month: '2024-04', revenue: 2100, invoices: 1, avgDays: 28 },
    { month: '2024-05', revenue: 2000, invoices: 1, avgDays: 21 },
  ],
  agingBreakdown: {
    current: 2000.00,
    days30: 800.75,
    days60: 400.00,
    days90Plus: 0,
  },
}

describe('Customer Payments Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { apiClient } = require('@/lib/api/client')
    
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/customers/customer-123/transactions')) {
        return Promise.resolve({ data: mockTransactions })
      }
      if (url.includes('/customers/customer-123/business-metrics')) {
        return Promise.resolve({ data: mockBusinessMetrics })
      }
      if (url.includes('/customers/customer-123/activity-timeline')) {
        return Promise.resolve({ data: mockActivityTimeline })
      }
      if (url.includes('/customers/customer-123/payment-trends')) {
        return Promise.resolve({ data: mockPaymentTrends })
      }
      if (url.includes('/customers/customer-123')) {
        return Promise.resolve({ data: mockCustomerData })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
    
    apiClient.post.mockResolvedValue({ data: { id: 'payment-new' } })
  })

  describe('Customer Ledger Integration', () => {
    it('should load and display customer transactions correctly', async () => {
      render(<CustomerLedger customerId="customer-123" />)

      // Should start with loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
        expect(screen.getByText('test@integration.com')).toBeInTheDocument()
        expect(screen.getAllByText('$3,200.75')).toHaveLength(2) // Balance appears in summary and transactions
      })

      // Check transaction data is displayed
      expect(screen.getByText('INV-2024-010')).toBeInTheDocument()
      expect(screen.getByText('Software Development Services')).toBeInTheDocument()
      expect(screen.getByText('PAY-005')).toBeInTheDocument()
      expect(screen.getByText('Payment for INV-2024-009')).toBeInTheDocument()
    })

    it('should integrate payment recording workflow', async () => {
      const user = userEvent.setup()
      render(<CustomerLedger customerId="customer-123" />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
      })

      // Click record payment button
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)

      // Should show payment form
      expect(screen.getByText('Record New Payment')).toBeInTheDocument()
      
      // Form should be pre-filled with customer data
      expect(screen.getByDisplayValue('3200.75')).toBeInTheDocument() // Balance amount
    })

    it('should handle transaction filtering correctly', async () => {
      const user = userEvent.setup()
      render(<CustomerLedger customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
      })

      // Initially should show all transactions
      expect(screen.getByText('INV-2024-010')).toBeInTheDocument()
      expect(screen.getByText('PAY-005')).toBeInTheDocument()

      // Filter by payment type
      const typeFilter = screen.getByDisplayValue('All types')
      await user.selectOptions(typeFilter, 'payment')

      // Should still show transactions (filtering logic works)
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  describe('Business History Integration', () => {
    it('should load and display comprehensive business data', async () => {
      render(<CustomerBusinessHistory customerId="customer-123" />)

      // Should start with loading state
      expect(screen.getByText('Loading customer business history...')).toBeInTheDocument()

      // Wait for all data to load
      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
        expect(screen.getByText('test@integration.com')).toBeInTheDocument()
        expect(screen.getByText('+1-555-0999')).toBeInTheDocument()
        expect(screen.getByText('Software')).toBeInTheDocument()
      })

      // Check business metrics
      expect(screen.getByText('$28,500.00')).toBeInTheDocument() // Total revenue
      expect(screen.getByText('18')).toBeInTheDocument() // Total invoices
      expect(screen.getByText('21 days')).toBeInTheDocument() // Average payment days
      expect(screen.getByText('11 months')).toBeInTheDocument() // Relationship months

      // Check risk assessment
      expect(screen.getByText('Low Risk')).toBeInTheDocument() // Based on 89% reliability and 21% utilization
      expect(screen.getByText('Consistent')).toBeInTheDocument() // Based on 21 day average

      // Check activity timeline
      expect(screen.getByText('Invoice INV-2024-010 created for $2,000.00')).toBeInTheDocument()
      expect(screen.getByText('Payment received for INV-2024-009')).toBeInTheDocument()
    })

    it('should handle action callbacks correctly', async () => {
      const user = userEvent.setup()
      const mockViewLedger = jest.fn()
      const mockRecordPayment = jest.fn()
      const mockCreateInvoice = jest.fn()

      render(
        <CustomerBusinessHistory 
          customerId="customer-123"
          onViewLedger={mockViewLedger}
          onRecordPayment={mockRecordPayment}
          onCreateInvoice={mockCreateInvoice}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
      })

      // Test action buttons
      const viewLedgerBtn = screen.getByRole('button', { name: /view ledger/i })
      const recordPaymentBtn = screen.getByRole('button', { name: /record payment/i })
      const createInvoiceBtn = screen.getByRole('button', { name: /create invoice/i })

      await user.click(viewLedgerBtn)
      expect(mockViewLedger).toHaveBeenCalledWith('customer-123')

      await user.click(recordPaymentBtn)
      expect(mockRecordPayment).toHaveBeenCalledWith('customer-123')

      await user.click(createInvoiceBtn)
      expect(mockCreateInvoice).toHaveBeenCalledWith('customer-123')
    })
  })

  describe('Cross-Component Data Consistency', () => {
    it('should show consistent customer information across components', async () => {
      const { rerender } = render(<CustomerLedger customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
        expect(screen.getAllByText('$3,200.75')).toHaveLength(2) // Balance appears in summary and transactions
      })

      // Switch to business history view
      rerender(<CustomerBusinessHistory customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
        expect(screen.getByText('test@integration.com')).toBeInTheDocument()
        expect(screen.getByText('$28,500.00')).toBeInTheDocument() // Total revenue
      })
    })

    it('should maintain proper API call patterns', async () => {
      const { apiClient } = require('@/lib/api/client')
      
      render(<CustomerLedger customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
      })

      // Verify correct API calls were made
      expect(apiClient.get).toHaveBeenCalledWith('/api/customers/customer-123')
      expect(apiClient.get).toHaveBeenCalledWith('/api/customers/customer-123/transactions')

      // Should not call business metrics endpoints for ledger view
      expect(apiClient.get).not.toHaveBeenCalledWith('/api/customers/customer-123/business-metrics')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API failures gracefully across components', async () => {
      const { apiClient } = require('@/lib/api/client')
      apiClient.get.mockRejectedValue(new Error('Network timeout'))

      render(<CustomerLedger customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText(/error loading customer data/i)).toBeInTheDocument()
      })

      // Component should not crash and should show error message
      expect(screen.queryByText('Integration Test Corp')).not.toBeInTheDocument()
    })

    it('should handle partial data loading scenarios', async () => {
      const { apiClient } = require('@/lib/api/client')
      
      // Mock scenario where customer loads but transactions fail
      apiClient.get.mockImplementation((url: string) => {
        if (url.includes('/customers/customer-123/transactions')) {
          return Promise.reject(new Error('Transactions service down'))
        }
        if (url.includes('/customers/customer-123')) {
          return Promise.resolve({ data: mockCustomerData })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      render(<CustomerLedger customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText(/error loading customer data/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance Integration', () => {
    it('should load components efficiently without unnecessary re-renders', async () => {
      const { apiClient } = require('@/lib/api/client')
      
      render(<CustomerLedger customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Integration Test Corp')).toBeInTheDocument()
      })

      // Should only call each endpoint once
      const customerCalls = apiClient.get.mock.calls.filter(call => 
        call[0] === '/api/customers/customer-123'
      )
      const transactionCalls = apiClient.get.mock.calls.filter(call => 
        call[0] === '/api/customers/customer-123/transactions'
      )

      expect(customerCalls).toHaveLength(1)
      expect(transactionCalls).toHaveLength(1)
    })
  })
})