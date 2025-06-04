import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerBusinessHistory } from '@/components/payments/customer-business-history'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

const mockCustomerData = {
  id: 'customer-1',
  name: 'Tech Solutions Inc.',
  email: 'contact@techsolutions.com',
  phone: '+1-555-0123',
  createdAt: '2023-01-15',
  creditLimit: 10000,
  currentBalance: 2500.75,
  industry: 'Technology',
  leadSource: 'REFERRAL',
}

const mockBusinessMetrics = {
  totalRevenue: 45000.00,
  totalInvoices: 24,
  totalPayments: 20,
  averagePaymentDays: 18,
  creditUtilization: 0.25, // 25%
  relationshipMonths: 16,
  lastPaymentDate: '2024-05-20',
  lastInvoiceDate: '2024-05-25',
  paymentReliability: 0.85, // 85%
}

const mockActivityTimeline = [
  {
    id: 1,
    type: 'invoice_created',
    date: '2024-05-25',
    description: 'Invoice INV-2024-002 created for $750.50',
    amount: 750.50,
    status: 'pending',
  },
  {
    id: 2,
    type: 'payment_received',
    date: '2024-05-20',
    description: 'Payment received for INV-2024-001',
    amount: 1000.00,
    status: 'completed',
  },
  {
    id: 3,
    type: 'credit_limit_updated',
    date: '2024-05-15',
    description: 'Credit limit increased to $10,000',
    amount: 10000.00,
    status: 'completed',
  },
  {
    id: 4,
    type: 'customer_created',
    date: '2023-01-15',
    description: 'Customer account created',
    amount: null,
    status: 'completed',
  },
]

const mockPaymentTrends = {
  monthlyData: [
    { month: '2024-01', revenue: 3500, invoices: 2, avgDays: 15 },
    { month: '2024-02', revenue: 2800, invoices: 2, avgDays: 22 },
    { month: '2024-03', revenue: 4200, invoices: 3, avgDays: 12 },
    { month: '2024-04', revenue: 3100, invoices: 2, avgDays: 25 },
    { month: '2024-05', revenue: 1750, invoices: 1, avgDays: 18 },
  ],
  agingBreakdown: {
    current: 1250.50,
    days30: 500.25,
    days60: 750.00,
    days90Plus: 0,
  },
}

const defaultProps = {
  customerId: 'customer-1',
}

describe('CustomerBusinessHistory Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { apiClient } = require('@/lib/api/client')
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/customers/customer-1/business-metrics')) {
        return Promise.resolve({ data: mockBusinessMetrics })
      }
      if (url.includes('/customers/customer-1/activity-timeline')) {
        return Promise.resolve({ data: mockActivityTimeline })
      }
      if (url.includes('/customers/customer-1/payment-trends')) {
        return Promise.resolve({ data: mockPaymentTrends })
      }
      if (url.includes('/customers/customer-1')) {
        return Promise.resolve({ data: mockCustomerData })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  describe('Customer Overview', () => {
    it('should display customer information and key metrics', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tech Solutions Inc.')).toBeInTheDocument()
        expect(screen.getByText('contact@techsolutions.com')).toBeInTheDocument()
        expect(screen.getByText('+1-555-0123')).toBeInTheDocument()
        expect(screen.getByText('Technology')).toBeInTheDocument()
      })
    })

    it('should show business relationship metrics', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('$45,000.00')).toBeInTheDocument() // Total revenue
        expect(screen.getByText('24')).toBeInTheDocument() // Total invoices
        expect(screen.getByText('18 days')).toBeInTheDocument() // Average payment days
        expect(screen.getByText('16 months')).toBeInTheDocument() // Relationship duration
      })
    })

    it('should display credit utilization and payment reliability', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument() // Credit utilization
        expect(screen.getByText('85%')).toBeInTheDocument() // Payment reliability
      })
    })
  })

  describe('Activity Timeline', () => {
    it('should render activity timeline with events', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument()
        expect(screen.getByText('Invoice INV-2024-002 created for $750.50')).toBeInTheDocument()
        expect(screen.getByText('Payment received for INV-2024-001')).toBeInTheDocument()
        expect(screen.getByText('Credit limit increased to $10,000')).toBeInTheDocument()
        expect(screen.getByText('Customer account created')).toBeInTheDocument()
      })
    })

    it('should show activity types with appropriate styling', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        const invoiceActivity = screen.getByText('Invoice Created')
        const paymentActivity = screen.getByText('Payment Received')
        const creditActivity = screen.getByText('Credit Updated')
        
        expect(invoiceActivity).toBeInTheDocument()
        expect(paymentActivity).toBeInTheDocument()
        expect(creditActivity).toBeInTheDocument()
      })
    })

    it('should format dates and amounts properly', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('May 25, 2024')).toBeInTheDocument()
        expect(screen.getByText('May 20, 2024')).toBeInTheDocument()
        expect(screen.getByText('$750.50')).toBeInTheDocument()
        expect(screen.getByText('$1,000.00')).toBeInTheDocument()
      })
    })
  })

  describe('Payment Trends', () => {
    it('should display monthly revenue chart', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Revenue Trends')).toBeInTheDocument()
        expect(screen.getByText('Monthly Performance')).toBeInTheDocument()
      })
    })

    it('should show aging breakdown', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Aging Analysis')).toBeInTheDocument()
        expect(screen.getByText('Current')).toBeInTheDocument()
        expect(screen.getByText('1-30 Days')).toBeInTheDocument()
        expect(screen.getByText('31-60 Days')).toBeInTheDocument()
        expect(screen.getByText('60+ Days')).toBeInTheDocument()
      })
    })

    it('should display aging amounts', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('$1,250.50')).toBeInTheDocument() // Current
        expect(screen.getByText('$500.25')).toBeInTheDocument() // 1-30 days
        expect(screen.getByText('$750.00')).toBeInTheDocument() // 31-60 days
      })
    })
  })

  describe('Risk Assessment', () => {
    it('should show credit risk indicators', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
        expect(screen.getByText('Low Risk')).toBeInTheDocument() // Based on 85% reliability and 25% utilization
      })
    })

    it('should display payment pattern analysis', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Payment Pattern')).toBeInTheDocument()
        expect(screen.getByText('Consistent')).toBeInTheDocument() // Based on avg 18 days
      })
    })
  })

  describe('Actions', () => {
    it('should provide action buttons', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view ledger/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
      })
    })

    it('should handle view ledger action', async () => {
      const user = userEvent.setup()
      const mockOnViewLedger = jest.fn()
      
      render(<CustomerBusinessHistory {...defaultProps} onViewLedger={mockOnViewLedger} />)

      await waitFor(() => {
        const viewLedgerButton = screen.getByRole('button', { name: /view ledger/i })
        expect(viewLedgerButton).toBeInTheDocument()
      })

      const viewLedgerButton = screen.getByRole('button', { name: /view ledger/i })
      await user.click(viewLedgerButton)

      expect(mockOnViewLedger).toHaveBeenCalledWith('customer-1')
    })
  })

  describe('Data Loading', () => {
    it('should handle loading states', async () => {
      render(<CustomerBusinessHistory {...defaultProps} />)

      expect(screen.getByText('Loading customer business history...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading customer business history...')).not.toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      const { apiClient } = require('@/lib/api/client')
      apiClient.get.mockRejectedValue(new Error('Network error'))

      render(<CustomerBusinessHistory {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/error loading customer data/i)).toBeInTheDocument()
      })
    })
  })
})