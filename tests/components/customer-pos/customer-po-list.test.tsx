import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import CustomerPOsPage from '@/app/(auth)/customer-pos/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('CustomerPOsPage', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('should render loading state initially', () => {
    ;(fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )

    render(<CustomerPOsPage />)
    
    expect(screen.getByText('Loading customer POs...')).toBeInTheDocument()
  })

  it('should render empty state when no POs exist', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<CustomerPOsPage />)

    await waitFor(() => {
      expect(screen.getByText('No customer POs')).toBeInTheDocument()
      expect(screen.getByText('Get started by recording a new customer PO')).toBeInTheDocument()
    })
  })

  it('should render list of customer POs', async () => {
    const mockPOs = [
      {
        id: '1',
        poNumber: 'PO-2024-001',
        customer: {
          id: 'cust-1',
          name: 'Acme Corp',
          email: 'contact@acme.com'
        },
        quotation: {
          id: 'quot-1',
          quotationNumber: 'QUOT-001'
        },
        salesCase: {
          id: 'sc-1',
          caseNumber: 'SC-2024-001',
          title: 'New Software Development'
        },
        poDate: '2024-01-15T00:00:00Z',
        poAmount: 50000,
        currency: 'USD',
        isAccepted: false,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        poNumber: 'PO-2024-002',
        customer: {
          id: 'cust-2',
          name: 'TechCorp',
          email: 'orders@techcorp.com'
        },
        quotation: {
          id: 'quot-2',
          quotationNumber: 'QUOT-002'
        },
        salesCase: {
          id: 'sc-2',
          caseNumber: 'SC-2024-002',
          title: 'Hardware Supply'
        },
        poDate: '2024-01-20T00:00:00Z',
        poAmount: 75000,
        currency: 'USD',
        isAccepted: true,
        acceptedAt: '2024-01-21T00:00:00Z',
        salesOrder: {
          id: 'so-1',
          orderNumber: 'SO-2024-001',
          status: 'PROCESSING'
        },
        createdAt: '2024-01-20T14:00:00Z'
      }
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPOs,
    })

    render(<CustomerPOsPage />)

    await waitFor(() => {
      // Check headers
      expect(screen.getByText('Customer Purchase Orders')).toBeInTheDocument()
      expect(screen.getByText('Manage customer POs and track order confirmations')).toBeInTheDocument()

      // Check first PO
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('QUOT-001')).toBeInTheDocument()
      expect(screen.getByText('$50,000.00')).toBeInTheDocument()
      
      // Check status badges (using a more specific selector)
      const statusBadges = screen.getAllByText('Pending')
      expect(statusBadges.length).toBeGreaterThan(0)

      // Check second PO
      expect(screen.getByText('PO-2024-002')).toBeInTheDocument()
      expect(screen.getByText('TechCorp')).toBeInTheDocument()
      expect(screen.getByText('$75,000.00')).toBeInTheDocument()
      expect(screen.getByText('Accepted')).toBeInTheDocument()
      expect(screen.getByText('SO-2024-001')).toBeInTheDocument()
    })
  })

  it('should display statistics correctly', async () => {
    const mockPOs = [
      { id: '1', poAmount: 50000, isAccepted: false },
      { id: '2', poAmount: 75000, isAccepted: true },
      { id: '3', poAmount: 25000, isAccepted: true },
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPOs,
    })

    render(<CustomerPOsPage />)

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument() // Total POs
      expect(screen.getByText('1')).toBeInTheDocument() // Pending
      expect(screen.getByText('2')).toBeInTheDocument() // Accepted
      expect(screen.getByText('$150,000.00')).toBeInTheDocument() // Total value
    })
  })

  it('should filter POs by status', async () => {
    const mockPOs = [
      { id: '1', poNumber: 'PO-001', isAccepted: false },
      { id: '2', poNumber: 'PO-002', isAccepted: true },
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPOs,
    })

    render(<CustomerPOsPage />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
      expect(screen.getByText('PO-002')).toBeInTheDocument()
    })

    // Filter by accepted
    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    fireEvent.change(statusFilter, { target: { value: 'accepted' } })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('isAccepted=true'),
        expect.any(Object)
      )
    })
  })

  it('should search POs', async () => {
    const mockPOs = [
      { id: '1', poNumber: 'PO-2024-001', customer: { name: 'Acme Corp' } },
      { id: '2', poNumber: 'PO-2024-002', customer: { name: 'TechCorp' } },
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPOs,
    })

    render(<CustomerPOsPage />)

    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument()
    })

    // Search
    const searchInput = screen.getByPlaceholderText('Search POs...')
    fireEvent.change(searchInput, { target: { value: 'Acme' } })

    // Should filter client-side
    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument()
      expect(screen.queryByText('PO-2024-002')).not.toBeInTheDocument()
    })
  })

  it('should navigate to PO detail page when row clicked', async () => {
    const mockPOs = [
      {
        id: '1',
        poNumber: 'PO-2024-001',
        customer: { name: 'Acme Corp' },
        poAmount: 50000,
        isAccepted: false
      }
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPOs,
    })

    render(<CustomerPOsPage />)

    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument()
    })

    // Click on row
    const row = screen.getByRole('row', { name: /PO-2024-001/i })
    fireEvent.click(row)

    expect(mockRouter.push).toHaveBeenCalledWith('/customer-pos/1')
  })

  it('should navigate to new PO page when button clicked', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<CustomerPOsPage />)

    await waitFor(() => {
      expect(screen.getByText('No customer POs')).toBeInTheDocument()
    })

    const newButton = screen.getByRole('button', { name: /new po/i })
    fireEvent.click(newButton)

    expect(mockRouter.push).toHaveBeenCalledWith('/customer-pos/new')
  })

  it('should handle error state', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<CustomerPOsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading customer POs')).toBeInTheDocument()
      expect(screen.getByText('Failed to load customer POs')).toBeInTheDocument()
    })
  })
})