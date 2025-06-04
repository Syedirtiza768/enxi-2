import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import CustomerPOForm from '@/components/customer-pos/customer-po-form'

// Mock file upload
const mockFile = new File(['PO content'], 'test-po.pdf', { type: 'application/pdf' })

describe('CustomerPOForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  }

  const sampleQuotation = {
    id: 'quot-1',
    quotationNumber: 'QUOT-001',
    salesCase: {
      id: 'sc-1',
      caseNumber: 'SC-2024-001',
      customer: {
        id: 'cust-1',
        name: 'Acme Corp',
        email: 'contact@acme.com'
      }
    },
    totalAmount: 50000,
    currency: 'USD'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render empty form when no quotation provided', () => {
    render(<CustomerPOForm {...defaultProps} />)
    
    expect(screen.getByText('Customer Purchase Order')).toBeInTheDocument()
    expect(screen.getByLabelText('PO Number')).toBeInTheDocument()
    expect(screen.getByLabelText('Customer')).toBeInTheDocument()
    expect(screen.getByLabelText('PO Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('PO Date')).toBeInTheDocument()
  })

  it('should pre-populate form when quotation provided', () => {
    render(<CustomerPOForm {...defaultProps} quotation={sampleQuotation} />)
    
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('QUOT-001')).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /record po/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('PO Number is required')).toBeInTheDocument()
      expect(screen.getByText('Customer is required')).toBeInTheDocument()
      expect(screen.getByText('PO Amount is required')).toBeInTheDocument()
      expect(screen.getByText('PO Date is required')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate PO number format', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} />)
    
    const poNumberInput = screen.getByLabelText('PO Number')
    await user.type(poNumberInput, 'invalid-po')
    
    const submitButton = screen.getByRole('button', { name: /record po/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('PO Number should be in format PO-YYYY-NNN')).toBeInTheDocument()
    })
  })

  it('should validate PO amount against quotation amount with tolerance', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} quotation={sampleQuotation} />)
    
    // Test exact match - should be valid
    const poAmountInput = screen.getByLabelText('PO Amount')
    await user.clear(poAmountInput)
    await user.type(poAmountInput, '50000')
    
    expect(screen.queryByText(/PO amount differs significantly/)).not.toBeInTheDocument()
    
    // Test within tolerance (5%) - should be valid
    await user.clear(poAmountInput)
    await user.type(poAmountInput, '52000') // 4% increase
    
    expect(screen.queryByText(/PO amount differs significantly/)).not.toBeInTheDocument()
    
    // Test outside tolerance - should show warning
    await user.clear(poAmountInput)
    await user.type(poAmountInput, '55000') // 10% increase
    
    await waitFor(() => {
      expect(screen.getByText(/PO amount differs significantly from quotation/)).toBeInTheDocument()
    })
  })

  it('should handle file upload', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} />)
    
    const fileInput = screen.getByLabelText('PO Attachment')
    
    await user.upload(fileInput, mockFile)
    
    await waitFor(() => {
      expect(screen.getByText('test-po.pdf')).toBeInTheDocument()
    })
  })

  it('should validate file type and size', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} />)
    
    // Test invalid file type
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    const fileInput = screen.getByLabelText('PO Attachment')
    
    await user.upload(fileInput, invalidFile)
    
    await waitFor(() => {
      expect(screen.getByText('Only PDF, DOC, DOCX, and image files are allowed')).toBeInTheDocument()
    })
    
    // Test large file
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
    
    await user.upload(fileInput, largeFile)
    
    await waitFor(() => {
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
    })
  })

  it('should auto-generate PO number when requested', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} />)
    
    const generateButton = screen.getByRole('button', { name: /auto-generate/i })
    await user.click(generateButton)
    
    await waitFor(() => {
      const poNumberInput = screen.getByLabelText('PO Number') as HTMLInputElement
      expect(poNumberInput.value).toMatch(/^PO-\d{4}-\d{3}$/)
    })
  })

  it('should set current date as default PO date', () => {
    render(<CustomerPOForm {...defaultProps} />)
    
    const today = new Date().toISOString().split('T')[0]
    const poDateInput = screen.getByLabelText('PO Date') as HTMLInputElement
    
    expect(poDateInput.value).toBe(today)
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} quotation={sampleQuotation} />)
    
    // Fill form
    await user.type(screen.getByLabelText('PO Number'), 'PO-2024-001')
    await user.type(screen.getByLabelText('Currency'), 'USD')
    await user.type(screen.getByLabelText('Notes'), 'Test PO notes')
    
    const submitButton = screen.getByRole('button', { name: /record po/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        poNumber: 'PO-2024-001',
        customerId: 'cust-1',
        quotationId: 'quot-1',
        poDate: expect.any(String),
        poAmount: 50000,
        currency: 'USD',
        notes: 'Test PO notes',
        attachmentUrl: undefined
      })
    })
  })

  it('should submit form with file attachment', async () => {
    const user = userEvent.setup()
    
    // Mock file upload API
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://example.com/uploaded-file.pdf' })
    })
    
    render(<CustomerPOForm {...defaultProps} quotation={sampleQuotation} />)
    
    // Fill form and upload file
    await user.type(screen.getByLabelText('PO Number'), 'PO-2024-001')
    await user.upload(screen.getByLabelText('PO Attachment'), mockFile)
    
    const submitButton = screen.getByRole('button', { name: /record po/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentUrl: 'https://example.com/uploaded-file.pdf'
        })
      )
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    
    // Mock slow submission
    const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)))
    render(<CustomerPOForm {...defaultProps} onSubmit={slowSubmit} quotation={sampleQuotation} />)
    
    await user.type(screen.getByLabelText('PO Number'), 'PO-2024-001')
    
    const submitButton = screen.getByRole('button', { name: /record po/i })
    await user.click(submitButton)
    
    expect(screen.getByText('Recording PO...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should handle submission errors', async () => {
    const user = userEvent.setup()
    
    const failingSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'))
    render(<CustomerPOForm {...defaultProps} onSubmit={failingSubmit} quotation={sampleQuotation} />)
    
    await user.type(screen.getByLabelText('PO Number'), 'PO-2024-001')
    
    const submitButton = screen.getByRole('button', { name: /record po/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to record PO: Submission failed')).toBeInTheDocument()
    })
  })

  it('should call onCancel when cancel button clicked', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should show quotation details when provided', () => {
    render(<CustomerPOForm {...defaultProps} quotation={sampleQuotation} />)
    
    expect(screen.getByText('From Quotation')).toBeInTheDocument()
    expect(screen.getByText('QUOT-001')).toBeInTheDocument()
    expect(screen.getByText('SC-2024-001')).toBeInTheDocument()
    expect(screen.getByText('$50,000.00')).toBeInTheDocument()
  })

  it('should allow editing pre-populated quotation data', async () => {
    const user = userEvent.setup()
    render(<CustomerPOForm {...defaultProps} quotation={sampleQuotation} />)
    
    // Modify the amount
    const poAmountInput = screen.getByLabelText('PO Amount')
    await user.clear(poAmountInput)
    await user.type(poAmountInput, '48000')
    
    expect(poAmountInput).toHaveValue(48000)
  })
})