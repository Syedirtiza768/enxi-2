import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerForm } from '@/components/customers/customer-form'
import { apiClient } from '@/lib/api/client'

// Mock the API client
jest.mock('@/lib/api/client')
const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('CustomerForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders customer form with all fields', () => {
    render(<CustomerForm />)
    
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tax id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/credit limit/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment terms/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<CustomerForm />)
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create customer/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('populates form with lead data when converting lead', () => {
    const leadData = {
      id: 'lead-123',
      name: 'Test Company',
      email: 'test@company.com',
      phone: '+1234567890',
      company: 'Test Co'
    }
    
    render(<CustomerForm leadData={leadData} />)
    
    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@company.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument()
    expect(screen.getByText(/convert lead to customer/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = jest.fn()
    
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      data: {
        data: {
          id: 'customer-123',
          name: 'Test Company'
        }
      },
      status: 201
    })
    
    render(<CustomerForm onSuccess={mockOnSuccess} />)
    
    // Fill in the form
    await user.type(screen.getByLabelText(/company name/i), 'Test Company')
    await user.type(screen.getByLabelText(/email/i), 'test@company.com')
    await user.type(screen.getByLabelText(/phone/i), '+1234567890')
    await user.type(screen.getByLabelText(/website/i), 'https://test.com')
    await user.type(screen.getByLabelText(/credit limit/i), '10000')
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create customer/i }))
    
    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Company',
          email: 'test@company.com',
          phone: '+1234567890',
          website: 'https://test.com',
          industry: '',
          address: '',
          taxId: '',
          currency: 'USD',
          creditLimit: 10000,
          paymentTerms: 30,
          leadId: undefined
        })
      })
      expect(mockOnSuccess).toHaveBeenCalledWith({
        data: {
          id: 'customer-123',
          name: 'Test Company'
        }
      })
    })
  })

  it('displays API error messages', async () => {
    const user = userEvent.setup()
    
    mockApiClient.mockResolvedValueOnce({
      ok: false,
      error: 'Email already exists',
      status: 400
    })
    
    render(<CustomerForm />)
    
    // Fill minimum required fields
    await user.type(screen.getByLabelText(/company name/i), 'Test Company')
    await user.type(screen.getByLabelText(/email/i), 'existing@company.com')
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create customer/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    
    // Mock a slow API response
    mockApiClient.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        data: { data: { id: 'customer-123' } },
        status: 201
      }), 1000))
    )
    
    render(<CustomerForm />)
    
    await user.type(screen.getByLabelText(/company name/i), 'Test Company')
    await user.type(screen.getByLabelText(/email/i), 'test@company.com')
    
    const submitButton = screen.getByRole('button', { name: /create customer/i })
    await user.click(submitButton)
    
    // Check that form is disabled
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/creating/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company name/i)).toBeDisabled()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnCancel = jest.fn()
    
    render(<CustomerForm onCancel={mockOnCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('validates URL format for website field', async () => {
    const user = userEvent.setup()
    render(<CustomerForm />)
    
    await user.type(screen.getByLabelText(/company name/i), 'Test Company')
    await user.type(screen.getByLabelText(/email/i), 'test@company.com')
    await user.type(screen.getByLabelText(/website/i), 'not-a-url')
    
    await user.click(screen.getByRole('button', { name: /create customer/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid url/i)).toBeInTheDocument()
    })
  })
})