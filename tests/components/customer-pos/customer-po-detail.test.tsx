import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useRouter, useParams } from 'next/navigation'
import CustomerPODetailPage from '@/app/(auth)/customer-pos/[id]/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('CustomerPODetailPage', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockPO = {
    id: 'po-1',
    poNumber: 'PO-2024-001',
    customer: {
      id: 'cust-1',
      name: 'Acme Corporation',
      email: 'contact@acme.com'
    },
    quotation: {
      id: 'quot-1',
      quotationNumber: 'QUOT-2024-001'
    },
    salesCase: {
      id: 'sc-1',
      caseNumber: 'SC-2024-001',
      title: 'Software Development Project'
    },
    poDate: '2024-01-15T00:00:00Z',
    poAmount: 50000,
    currency: 'USD',
    isAccepted: false,
    attachmentUrl: 'https://example.com/po-file.pdf',
    notes: 'Initial PO for software development',
    createdAt: '2024-01-15T10:00:00Z',
    salesOrder: null
  }

  const mockAcceptedPO = {
    ...mockPO,
    id: 'po-2',
    poNumber: 'PO-2024-002',
    isAccepted: true,
    acceptedAt: '2024-01-16T14:00:00Z',
    acceptedBy: 'user-1',
    salesOrder: {
      id: 'so-1',
      orderNumber: 'SO-2024-001',
      status: 'PROCESSING'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useParams as jest.Mock).mockReturnValue({ id: 'po-1' })
  })

  it('should render loading state initially', () => {
    ;(fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )

    render(<CustomerPODetailPage />)
    
    expect(screen.getByText('Loading customer PO...')).toBeInTheDocument()
  })

  it('should render PO details for pending PO', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      // Header
      expect(screen.getByText('Customer PO PO-2024-001')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      
      // Customer info
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
      expect(screen.getByText('contact@acme.com')).toBeInTheDocument()
      
      // PO details
      expect(screen.getByText('$50,000.00')).toBeInTheDocument()
      expect(screen.getByText('QUOT-2024-001')).toBeInTheDocument()
      expect(screen.getByText('SC-2024-001')).toBeInTheDocument()
      expect(screen.getByText('Software Development Project')).toBeInTheDocument()
      
      // Notes
      expect(screen.getByText('Initial PO for software development')).toBeInTheDocument()
      
      // Attachment
      expect(screen.getByText('Download PO File')).toBeInTheDocument()
    })
  })

  it('should render PO details for accepted PO with sales order', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAcceptedPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Accepted')).toBeInTheDocument()
      expect(screen.getByText('SO-2024-001')).toBeInTheDocument()
      expect(screen.getByText('PROCESSING')).toBeInTheDocument()
      expect(screen.getByText('Accepted on 1/16/2024')).toBeInTheDocument()
    })
  })

  it('should show accept button for pending PO', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept po/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })
  })

  it('should not show accept button for accepted PO', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAcceptedPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /accept po/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })
  })

  it('should handle PO acceptance', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPO,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customerPO: mockAcceptedPO,
          salesOrder: mockAcceptedPO.salesOrder
        }),
      })

    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true)

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept po/i })).toBeInTheDocument()
    })

    const acceptButton = screen.getByRole('button', { name: /accept po/i })
    await user.click(acceptButton)

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to accept this PO? This will create a sales order.'
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/customer-pos/po-1/accept',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      )
    })
  })

  it('should show success message and navigate after acceptance', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPO,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customerPO: mockAcceptedPO,
          salesOrder: mockAcceptedPO.salesOrder
        }),
      })

    window.confirm = jest.fn().mockReturnValue(true)
    window.alert = jest.fn()

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept po/i })).toBeInTheDocument()
    })

    const acceptButton = screen.getByRole('button', { name: /accept po/i })
    await user.click(acceptButton)

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'PO accepted successfully! Sales Order SO-2024-001 has been created.'
      )
      expect(mockRouter.push).toHaveBeenCalledWith('/sales-orders/so-1')
    })
  })

  it('should handle acceptance without sales order creation', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPO,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customerPO: { ...mockAcceptedPO, salesOrder: null }
        }),
      })

    window.confirm = jest.fn().mockReturnValue(true)
    window.alert = jest.fn()

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept po/i })).toBeInTheDocument()
    })

    const acceptButton = screen.getByRole('button', { name: /accept po/i })
    await user.click(acceptButton)

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('PO accepted successfully!')
    })
  })

  it('should handle acceptance error', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPO,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'PO already accepted' }),
      })

    window.confirm = jest.fn().mockReturnValue(true)
    window.alert = jest.fn()

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept po/i })).toBeInTheDocument()
    })

    const acceptButton = screen.getByRole('button', { name: /accept po/i })
    await user.click(acceptButton)

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to accept PO: PO already accepted')
    })
  })

  it('should not accept PO when confirmation cancelled', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    window.confirm = jest.fn().mockReturnValue(false)

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept po/i })).toBeInTheDocument()
    })

    const acceptButton = screen.getByRole('button', { name: /accept po/i })
    await user.click(acceptButton)

    expect(window.confirm).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1) // Only initial fetch
  })

  it('should navigate to edit page when edit button clicked', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)

    expect(mockRouter.push).toHaveBeenCalledWith('/customer-pos/po-1/edit')
  })

  it('should navigate back to PO list', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Back to Customer POs')).toBeInTheDocument()
    })

    const backLink = screen.getByText('Back to Customer POs')
    await user.click(backLink)

    expect(mockRouter.push).toHaveBeenCalledWith('/customer-pos')
  })

  it('should navigate to related quotation', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByText('QUOT-2024-001')).toBeInTheDocument()
    })

    const quotationLink = screen.getByText('QUOT-2024-001')
    await user.click(quotationLink)

    expect(mockRouter.push).toHaveBeenCalledWith('/quotations/quot-1')
  })

  it('should navigate to related sales case', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByText('SC-2024-001')).toBeInTheDocument()
    })

    const salesCaseLink = screen.getByText('SC-2024-001')
    await user.click(salesCaseLink)

    expect(mockRouter.push).toHaveBeenCalledWith('/sales-cases/sc-1')
  })

  it('should handle error state', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Customer PO not found')).toBeInTheDocument()
      expect(screen.getByText('Failed to load customer PO')).toBeInTheDocument()
    })
  })

  it('should handle not found state', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Customer PO not found')).toBeInTheDocument()
    })
  })

  it('should show loading state during acceptance', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPO,
      })
      .mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    window.confirm = jest.fn().mockReturnValue(true)

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept po/i })).toBeInTheDocument()
    })

    const acceptButton = screen.getByRole('button', { name: /accept po/i })
    await user.click(acceptButton)

    expect(screen.getByText('Accepting...')).toBeInTheDocument()
    expect(acceptButton).toBeDisabled()
  })

  it('should open attachment in new tab', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPO,
    })

    // Mock window.open
    window.open = jest.fn()

    render(<CustomerPODetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Download PO File')).toBeInTheDocument()
    })

    const downloadLink = screen.getByText('Download PO File')
    await user.click(downloadLink)

    expect(window.open).toHaveBeenCalledWith('https://example.com/po-file.pdf', '_blank')
  })
})