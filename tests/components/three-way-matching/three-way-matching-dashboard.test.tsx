import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThreeWayMatchingDashboard } from '@/components/three-way-matching/three-way-matching-dashboard'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: jest.fn()
}))

const mockApiClient = require('@/lib/api/client').apiClient

describe('ThreeWayMatchingDashboard', () => {
  const mockMatchingData = {
    summary: {
      totalTransactions: 100,
      fullyMatched: 85,
      partiallyMatched: 10,
      overMatched: 3,
      underMatched: 2,
      pendingReview: 5,
      fullyMatchedRate: 85.0,
      averageMatchingTime: 24.5
    },
    exceptions: [
      {
        id: '1',
        purchaseOrder: {
          poNumber: 'PO-001',
          supplier: { name: 'Test Supplier A' }
        },
        type: 'PRICE_VARIANCE',
        severity: 'HIGH',
        variance: 150.00,
        variancePercentage: 15.0,
        description: 'Unit price variance exceeds tolerance',
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        purchaseOrder: {
          poNumber: 'PO-002',
          supplier: { name: 'Test Supplier B' }
        },
        type: 'QUANTITY_OVER_MATCH',
        severity: 'MEDIUM',
        variance: 2,
        description: 'Invoiced quantity exceeds received quantity',
        createdAt: '2024-01-14T14:30:00Z'
      }
    ],
    trends: {
      matchingRateByMonth: [
        { month: '2024-01', rate: 87.5 },
        { month: '2024-02', rate: 85.0 }
      ],
      discrepancyTypeDistribution: [
        { type: 'PRICE_VARIANCE', count: 15, percentage: 60.0 },
        { type: 'QUANTITY_VARIANCE', count: 8, percentage: 32.0 },
        { type: 'MISSING_DOCUMENTS', count: 2, percentage: 8.0 }
      ]
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockApiClient.mockResolvedValue({
      ok: true,
      data: mockMatchingData
    })
  })

  test('should render dashboard with summary statistics', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Three-Way Matching Dashboard')).toBeInTheDocument()
    })

    // Check summary statistics
    expect(screen.getByText('100')).toBeInTheDocument() // Total transactions
    expect(screen.getByText('85')).toBeInTheDocument() // Fully matched
    expect(screen.getByText('85.0%')).toBeInTheDocument() // Matching rate
  })

  test('should display exceptions with severity indicators', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Check exception details
    expect(screen.getByText('Test Supplier A')).toBeInTheDocument()
    expect(screen.getByText('PRICE_VARIANCE')).toBeInTheDocument()
    expect(screen.getByText('$150.00 (15.0%)')).toBeInTheDocument()

    // Check severity badges
    const highSeverityBadge = screen.getByText('HIGH')
    expect(highSeverityBadge).toHaveClass('bg-red-100', 'text-red-800')

    const mediumSeverityBadge = screen.getByText('MEDIUM')
    expect(mediumSeverityBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  test('should filter exceptions by type', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Filter by price variance
    const typeFilter = screen.getByDisplayValue('All Types')
    fireEvent.change(typeFilter, { target: { value: 'PRICE_VARIANCE' } })

    // Should show only price variance exceptions
    expect(screen.getByText('PO-001')).toBeInTheDocument()
    expect(screen.queryByText('PO-002')).not.toBeInTheDocument()
  })

  test('should filter exceptions by severity', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Filter by high severity
    const severityFilter = screen.getByDisplayValue('All Severities')
    fireEvent.change(severityFilter, { target: { value: 'HIGH' } })

    // Should show only high severity exceptions
    expect(screen.getByText('PO-001')).toBeInTheDocument()
    expect(screen.queryByText('PO-002')).not.toBeInTheDocument()
  })

  test('should search exceptions by PO number or supplier', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Search by PO number
    const searchInput = screen.getByPlaceholderText(/search.*exceptions/i)
    fireEvent.change(searchInput, { target: { value: 'PO-001' } })

    expect(screen.getByText('PO-001')).toBeInTheDocument()
    expect(screen.queryByText('PO-002')).not.toBeInTheDocument()

    // Clear search and search by supplier
    fireEvent.change(searchInput, { target: { value: 'Supplier B' } })

    expect(screen.getByText('PO-002')).toBeInTheDocument()
    expect(screen.queryByText('PO-001')).not.toBeInTheDocument()
  })

  test('should navigate to detailed matching view', async () => {
    const mockPush = jest.fn()
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush })
    }))

    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Click on an exception to view details
    const viewButton = screen.getAllByText('View Details')[0]
    fireEvent.click(viewButton)

    expect(mockPush).toHaveBeenCalledWith('/three-way-matching/1')
  })

  test('should approve exception with confirmation', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Mock approval API call
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      data: { approved: true, matchingStatus: 'APPROVED_WITH_VARIANCE' }
    })

    // Click approve button
    const approveButton = screen.getAllByText('Approve')[0]
    fireEvent.click(approveButton)

    // Should show confirmation dialog
    expect(screen.getByText('Approve Matching Exception')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to approve this matching exception?')).toBeInTheDocument()

    // Confirm approval
    const confirmButton = screen.getByText('Confirm Approval')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith(
        '/api/three-way-matching/1/approve',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })

  test('should reject exception with reason', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Mock rejection API call
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      data: { rejected: true, matchingStatus: 'REJECTED' }
    })

    // Click reject button
    const rejectButton = screen.getAllByText('Reject')[0]
    fireEvent.click(rejectButton)

    // Should show rejection dialog
    expect(screen.getByText('Reject Matching Exception')).toBeInTheDocument()

    // Fill in rejection reason
    const reasonTextarea = screen.getByPlaceholderText('Enter rejection reason...')
    fireEvent.change(reasonTextarea, { 
      target: { value: 'Price variance too high, requires supplier confirmation' } 
    })

    // Confirm rejection
    const confirmButton = screen.getByText('Confirm Rejection')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith(
        '/api/three-way-matching/1/reject',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            rejectionReason: 'Price variance too high, requires supplier confirmation'
          })
        })
      )
    })
  })

  test('should export exceptions report', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Mock export API call
    const mockBlob = new Blob(['CSV data'], { type: 'text/csv' })
    mockApiClient.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    })

    // Mock URL.createObjectURL and click
    const mockCreateObjectURL = jest.fn().mockReturnValue('blob:url')
    global.URL.createObjectURL = mockCreateObjectURL
    
    const mockClick = jest.fn()
    const mockAnchor = { click: mockClick, href: '', download: '' }
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

    // Click export button
    const exportButton = screen.getByText('Export Report')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith(
        '/api/three-way-matching/export',
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(mockClick).toHaveBeenCalled()
  })

  test('should refresh data when refresh button is clicked', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument()
    })

    // Clear previous calls
    mockApiClient.mockClear()

    // Click refresh button
    const refreshButton = screen.getByLabelText('Refresh data')
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith(
        '/api/three-way-matching/dashboard',
        expect.objectContaining({
          method: 'GET'
        })
      )
    })
  })

  test('should handle loading and error states', async () => {
    // Test loading state
    mockApiClient.mockImplementation(() => new Promise(() => {})) // Never resolves
    render(<ThreeWayMatchingDashboard />)

    expect(screen.getByText('Loading matching data...')).toBeInTheDocument()

    // Test error state
    mockApiClient.mockRejectedValue(new Error('API Error'))
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error loading matching data')).toBeInTheDocument()
    })

    // Should show retry button
    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeInTheDocument()
  })

  test('should display trends and analytics', async () => {
    render(<ThreeWayMatchingDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Matching Trends')).toBeInTheDocument()
    })

    // Check trend data
    expect(screen.getByText('87.5%')).toBeInTheDocument() // Jan rate
    expect(screen.getByText('85.0%')).toBeInTheDocument() // Feb rate

    // Check discrepancy distribution
    expect(screen.getByText('PRICE_VARIANCE (60.0%)')).toBeInTheDocument()
    expect(screen.getByText('QUANTITY_VARIANCE (32.0%)')).toBeInTheDocument()
    expect(screen.getByText('MISSING_DOCUMENTS (8.0%)')).toBeInTheDocument()
  })
})