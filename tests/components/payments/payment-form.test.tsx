import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentForm } from '@/components/payments/payment-form'

// Mock Radix Select for easier testing
jest.mock('@/components/ui/select', () => {
  const React = require('react')
  return {
    Select: ({ children, onValueChange, value }: any) => {
      React.useEffect(() => {
        // Add a global method to trigger value change from tests
        ;(window as any).mockSelectValueChange = (newValue: string) => {
          onValueChange?.(newValue)
        }
      }, [onValueChange])
      
      return (
        <div data-testid="select-root">
          <input
            type="hidden"
            value={value}
            data-testid="select-value"
            data-onvaluechange="true"
          />
          {children}
        </div>
      )
    },
    SelectTrigger: ({ children, id, className }: any) => (
      <button id={id} className={className} role="combobox" aria-expanded="false">
        {children}
      </button>
    ),
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <div role="listbox">{children}</div>,
    SelectItem: ({ children, value }: any) => (
      <div role="option" data-value={value}>
        {children}
      </div>
    ),
  }
})

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const mockOnSuccess = jest.fn()
const mockOnCancel = jest.fn()

const defaultProps = {
  invoiceId: 'test-invoice-id',
  customerId: 'test-customer-id',
  invoiceNumber: 'INV-2024-001',
  customerName: 'Test Customer',
  totalAmount: 1000,
  balanceAmount: 750,
  onSuccess: mockOnSuccess,
  onCancel: mockOnCancel,
}

describe('PaymentForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render payment form with all required fields', () => {
      render(<PaymentForm {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Record Payment' })).toBeInTheDocument()
      expect(screen.getByText('INV-2024-001')).toBeInTheDocument()
      expect(screen.getByText('Test Customer')).toBeInTheDocument()
      expect(screen.getByText('$750.00')).toBeInTheDocument()
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/payment date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/reference/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('should show payment method options', () => {
      render(<PaymentForm {...defaultProps} />)

      const paymentMethodTrigger = screen.getByRole('combobox')
      expect(paymentMethodTrigger).toBeInTheDocument()
      
      // Check that select options are rendered
      expect(screen.getByRole('option', { name: 'Bank Transfer' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Check' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Cash' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Credit Card' })).toBeInTheDocument()
    })

    it('should have today as default payment date', () => {
      render(<PaymentForm {...defaultProps} />)

      const paymentDateInput = screen.getByLabelText(/payment date/i) as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]
      expect(paymentDateInput.value).toBe(today)
    })

    it('should pre-fill amount with full balance', () => {
      render(<PaymentForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement
      expect(amountInput.value).toBe('750')
    })
  })

  describe('Form Validation', () => {
    it('should validate required amount field', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      
      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      expect(screen.getByText('Amount is required')).toBeInTheDocument()
    })

    it('should validate amount is positive', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '0')
      
      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      expect(screen.getByText('Amount must be positive')).toBeInTheDocument()
    })

    it('should validate amount does not exceed balance', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '1000')
      
      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      expect(screen.getByText('Amount cannot exceed balance')).toBeInTheDocument()
    })

    it('should validate payment method is selected', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      expect(screen.getByText('Payment method is required')).toBeInTheDocument()
    })

    it('should validate payment date is provided', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const dateInput = screen.getByLabelText(/payment date/i)
      await user.clear(dateInput)
      
      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      expect(screen.getByText('Payment date is required')).toBeInTheDocument()
    })

    it('should not allow future dates for payment', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const dateInput = screen.getByLabelText(/payment date/i)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      
      await user.clear(dateInput)
      await user.type(dateInput, futureDate.toISOString().split('T')[0])
      
      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      expect(screen.getByText('Payment date cannot be in the future')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should submit valid payment data', async () => {
      const user = userEvent.setup()
      const { apiClient } = require('@/lib/api/client')
      apiClient.post.mockResolvedValue({ data: { id: 'payment-123' } })

      render(<PaymentForm {...defaultProps} />)

      // Fill out the form
      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '500')

      // Simulate selecting Bank Transfer
      await act(async () => {
        ;(window as any).mockSelectValueChange('BANK_TRANSFER')
      })

      const referenceInput = screen.getByLabelText(/reference/i)
      await user.type(referenceInput, 'Wire-12345')

      const notesInput = screen.getByLabelText(/notes/i)
      await user.type(notesInput, 'Partial payment')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/invoices/test-invoice-id/payments',
          {
            amount: 500,
            paymentMethod: 'BANK_TRANSFER',
            paymentDate: new Date().toISOString().split('T')[0],
            reference: 'Wire-12345',
            notes: 'Partial payment',
          }
        )
      })

      expect(mockOnSuccess).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      const { apiClient } = require('@/lib/api/client')
      apiClient.post.mockRejectedValue(new Error('Payment failed'))

      render(<PaymentForm {...defaultProps} />)

      // Fill required fields
      await act(async () => {
        ;(window as any).mockSelectValueChange('BANK_TRANSFER')
      })

      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to record payment. Please try again.')).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      const { apiClient } = require('@/lib/api/client')
      apiClient.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<PaymentForm {...defaultProps} />)

      await act(async () => {
        ;(window as any).mockSelectValueChange('BANK_TRANSFER')
      })

      const submitButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(submitButton)

      expect(screen.getByText('Recording Payment...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should update amount input and calculate remaining balance', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '250')

      expect(screen.getByText(/remaining balance: \$500\.00/i)).toBeInTheDocument()
    })

    it('should show quick amount buttons', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /25%/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /50%/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /75%/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /100%/i })).toBeInTheDocument()

      // Test 50% button
      const fiftyPercentButton = screen.getByRole('button', { name: /50%/i })
      await user.click(fiftyPercentButton)

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement
      expect(amountInput.value).toBe('375')
    })

    it('should auto-generate reference based on payment method', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      await act(async () => {
        ;(window as any).mockSelectValueChange('CHECK')
      })

      const referenceInput = screen.getByLabelText(/reference/i) as HTMLInputElement
      expect(referenceInput.placeholder).toContain('Check')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PaymentForm {...defaultProps} />)

      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByLabelText(/amount/i)).toHaveAttribute('aria-describedby')
      expect(screen.getByText(/balance: \$750\.00/i)).toHaveAttribute('id')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      amountInput.focus()

      await user.tab()
      expect(screen.getByRole('combobox')).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/payment date/i)).toHaveFocus()
    })
  })
})