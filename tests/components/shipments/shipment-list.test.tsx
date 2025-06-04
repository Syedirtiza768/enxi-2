import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShipmentList } from '@/components/shipments/shipment-list'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

const mockShipments = [
  {
    id: 'shipment-1',
    shipmentNumber: 'SHP-2025-00001',
    status: 'PREPARING',
    carrier: 'FedEx',
    trackingNumber: 'TEST123456',
    createdAt: '2025-06-03T10:00:00Z',
    salesOrder: {
      orderNumber: 'SO-2025-00001',
      salesCase: {
        customer: {
          name: 'Test Customer',
        },
      },
    },
    items: [
      {
        id: 'item-1',
        itemCode: 'PROD-001',
        description: 'Test Product',
        quantityShipped: 5,
      },
    ],
  },
  {
    id: 'shipment-2',
    shipmentNumber: 'SHP-2025-00002',
    status: 'SHIPPED',
    carrier: 'UPS',
    trackingNumber: 'UPS789123',
    createdAt: '2025-06-02T15:30:00Z',
    shippedAt: '2025-06-03T09:00:00Z',
    salesOrder: {
      orderNumber: 'SO-2025-00002',
      salesCase: {
        customer: {
          name: 'Another Customer',
        },
      },
    },
    items: [
      {
        id: 'item-2',
        itemCode: 'PROD-002',
        description: 'Another Product',
        quantityShipped: 3,
      },
    ],
  },
]

describe('ShipmentList', () => {
  const { apiClient } = require('@/lib/api/client')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render shipment list with data', async () => {
    apiClient.get.mockResolvedValue({
      data: mockShipments,
      total: 2,
      page: 1,
      limit: 10,
    })

    render(<ShipmentList />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('SHP-2025-00001')).toBeInTheDocument()
    })

    expect(screen.getByText('SHP-2025-00002')).toBeInTheDocument()
    expect(screen.getByText('Test Customer')).toBeInTheDocument()
    expect(screen.getByText('Another Customer')).toBeInTheDocument()
    expect(screen.getByText('FedEx')).toBeInTheDocument()
    expect(screen.getByText('UPS')).toBeInTheDocument()
  })

  it('should show status badges with correct colors', async () => {
    apiClient.get.mockResolvedValue({
      data: mockShipments,
      total: 2,
      page: 1,
      limit: 10,
    })

    render(<ShipmentList />)

    await waitFor(() => {
      expect(screen.getByText('PREPARING')).toBeInTheDocument()
    })

    expect(screen.getByText('SHIPPED')).toBeInTheDocument()
  })

  it('should filter by status', async () => {
    apiClient.get.mockResolvedValue({
      data: [mockShipments[1]], // Only shipped shipment
      total: 1,
      page: 1,
      limit: 10,
    })

    render(<ShipmentList />)

    // Find and click status filter
    const statusFilter = screen.getByLabelText(/status/i)
    fireEvent.change(statusFilter, { target: { value: 'SHIPPED' } })

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/shipments', {
        params: expect.objectContaining({
          status: 'SHIPPED',
        }),
      })
    })
  })

  it('should navigate to shipment detail on click', async () => {
    apiClient.get.mockResolvedValue({
      data: mockShipments,
      total: 2,
      page: 1,
      limit: 10,
    })

    const mockPush = jest.fn()
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush }),
    }))

    render(<ShipmentList />)

    await waitFor(() => {
      expect(screen.getByText('SHP-2025-00001')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('SHP-2025-00001'))

    expect(mockPush).toHaveBeenCalledWith('/shipments/shipment-1')
  })

  it('should handle pagination', async () => {
    apiClient.get.mockResolvedValue({
      data: mockShipments,
      total: 25,
      page: 1,
      limit: 10,
    })

    render(<ShipmentList />)

    await waitFor(() => {
      expect(screen.getByText('SHP-2025-00001')).toBeInTheDocument()
    })

    // Should show pagination controls
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()

    // Click next page
    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/shipments', {
        params: expect.objectContaining({
          page: 2,
        }),
      })
    })
  })

  it('should show loading state', () => {
    apiClient.get.mockReturnValue(new Promise(() => {})) // Never resolves

    render(<ShipmentList />)

    expect(screen.getByText('Loading shipments...')).toBeInTheDocument()
  })

  it('should show empty state when no shipments', async () => {
    apiClient.get.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    })

    render(<ShipmentList />)

    await waitFor(() => {
      expect(screen.getByText('No shipments found')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'))

    render(<ShipmentList />)

    await waitFor(() => {
      expect(screen.getByText(/error loading shipments/i)).toBeInTheDocument()
    })
  })

  it('should show create shipment button', async () => {
    apiClient.get.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    })

    render(<ShipmentList />)

    await waitFor(() => {
      expect(screen.getByText('Create Shipment')).toBeInTheDocument()
    })
  })
})