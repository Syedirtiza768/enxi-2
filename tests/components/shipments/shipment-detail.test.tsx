import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShipmentDetail } from '@/components/shipments/shipment-detail'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}))

const mockShipment = {
  id: 'shipment-1',
  shipmentNumber: 'SHP-2025-00001',
  status: 'PREPARING',
  carrier: 'FedEx',
  trackingNumber: 'TEST123456',
  shippingMethod: 'Ground',
  shipToAddress: '123 Main St, City, State 12345',
  createdAt: '2025-06-03T10:00:00Z',
  shippedAt: null,
  deliveredAt: null,
  salesOrder: {
    id: 'order-1',
    orderNumber: 'SO-2025-00001',
    salesCase: {
      customer: {
        name: 'Test Customer',
        email: 'test@customer.com',
        phone: '123-456-7890',
      },
    },
  },
  items: [
    {
      id: 'item-1',
      itemCode: 'PROD-001',
      description: 'Test Product 1',
      quantityShipped: 5,
      item: {
        name: 'Test Product 1',
        unitPrice: 100.00,
      },
    },
    {
      id: 'item-2',
      itemCode: 'PROD-002',
      description: 'Test Product 2',
      quantityShipped: 3,
      item: {
        name: 'Test Product 2',
        unitPrice: 150.00,
      },
    },
  ],
}

describe('ShipmentDetail', () => {
  const { apiClient } = require('@/lib/api/client')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render shipment details', async () => {
    apiClient.get.mockResolvedValue(mockShipment)

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('SHP-2025-00001')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Customer')).toBeInTheDocument()
    expect(screen.getByText('SO-2025-00001')).toBeInTheDocument()
    expect(screen.getByText('FedEx')).toBeInTheDocument()
    expect(screen.getByText('TEST123456')).toBeInTheDocument()
    expect(screen.getByText('123 Main St, City, State 12345')).toBeInTheDocument()
  })

  it('should show shipment items', async () => {
    apiClient.get.mockResolvedValue(mockShipment)

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('PROD-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('PROD-002')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // quantity
    expect(screen.getByText('3')).toBeInTheDocument() // quantity
  })

  it('should show confirm shipment button for PREPARING status', async () => {
    apiClient.get.mockResolvedValue(mockShipment)

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Confirm Shipment')).toBeInTheDocument()
    })

    expect(screen.getByText('Cancel Shipment')).toBeInTheDocument()
    expect(screen.getByText('Edit Tracking')).toBeInTheDocument()
  })

  it('should show deliver button for SHIPPED status', async () => {
    const shippedShipment = {
      ...mockShipment,
      status: 'SHIPPED',
      shippedAt: '2025-06-03T12:00:00Z',
    }

    apiClient.get.mockResolvedValue(shippedShipment)

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Mark as Delivered')).toBeInTheDocument()
    })

    expect(screen.queryByText('Confirm Shipment')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancel Shipment')).not.toBeInTheDocument()
  })

  it('should not show action buttons for DELIVERED status', async () => {
    const deliveredShipment = {
      ...mockShipment,
      status: 'DELIVERED',
      shippedAt: '2025-06-03T12:00:00Z',
      deliveredAt: '2025-06-04T14:30:00Z',
    }

    apiClient.get.mockResolvedValue(deliveredShipment)

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('SHP-2025-00001')).toBeInTheDocument()
    })

    expect(screen.queryByText('Confirm Shipment')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark as Delivered')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancel Shipment')).not.toBeInTheDocument()
  })

  it('should confirm shipment when confirm button clicked', async () => {
    apiClient.get.mockResolvedValue(mockShipment)
    apiClient.post.mockResolvedValue({
      ...mockShipment,
      status: 'SHIPPED',
      shippedAt: '2025-06-03T12:00:00Z',
    })

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Confirm Shipment')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Confirm Shipment'))

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to confirm/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/shipments/shipment-1/confirm',
        expect.objectContaining({
          shippedBy: expect.any(String),
        })
      )
    })
  })

  it('should mark as delivered when deliver button clicked', async () => {
    const shippedShipment = {
      ...mockShipment,
      status: 'SHIPPED',
      shippedAt: '2025-06-03T12:00:00Z',
    }

    apiClient.get.mockResolvedValue(shippedShipment)
    apiClient.post.mockResolvedValue({
      ...shippedShipment,
      status: 'DELIVERED',
      deliveredAt: '2025-06-04T14:30:00Z',
    })

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Mark as Delivered')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Mark as Delivered'))

    // Should show delivery dialog
    await waitFor(() => {
      expect(screen.getByText(/mark shipment as delivered/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Mark as Delivered'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/shipments/shipment-1/deliver',
        expect.objectContaining({
          deliveredBy: expect.any(String),
        })
      )
    })
  })

  it('should cancel shipment when cancel button clicked', async () => {
    apiClient.get.mockResolvedValue(mockShipment)
    apiClient.post.mockResolvedValue({
      ...mockShipment,
      status: 'CANCELLED',
    })

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Cancel Shipment')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel Shipment'))

    // Should show cancellation dialog
    await waitFor(() => {
      expect(screen.getByText(/cancel this shipment/i)).toBeInTheDocument()
    })

    // Fill in cancellation reason
    const reasonInput = screen.getByLabelText(/reason/i)
    fireEvent.change(reasonInput, { target: { value: 'Customer requested' } })

    fireEvent.click(screen.getByText('Cancel Shipment'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/shipments/shipment-1/cancel',
        expect.objectContaining({
          cancelledBy: expect.any(String),
          reason: 'Customer requested',
        })
      )
    })
  })

  it('should update tracking information', async () => {
    apiClient.get.mockResolvedValue(mockShipment)
    apiClient.put.mockResolvedValue({
      ...mockShipment,
      carrier: 'UPS',
      trackingNumber: 'UPS123456',
    })

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Edit Tracking')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Edit Tracking'))

    // Should show tracking edit dialog
    await waitFor(() => {
      expect(screen.getByLabelText(/carrier/i)).toBeInTheDocument()
    })

    // Update carrier and tracking number
    const carrierInput = screen.getByLabelText(/carrier/i)
    const trackingInput = screen.getByLabelText(/tracking number/i)

    fireEvent.change(carrierInput, { target: { value: 'UPS' } })
    fireEvent.change(trackingInput, { target: { value: 'UPS123456' } })

    fireEvent.click(screen.getByText('Update Tracking'))

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/shipments/shipment-1',
        expect.objectContaining({
          carrier: 'UPS',
          trackingNumber: 'UPS123456',
        })
      )
    })
  })

  it('should show status timeline', async () => {
    const shippedShipment = {
      ...mockShipment,
      status: 'SHIPPED',
      shippedAt: '2025-06-03T12:00:00Z',
    }

    apiClient.get.mockResolvedValue(shippedShipment)

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Status Timeline')).toBeInTheDocument()
    })

    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'))

    render(<ShipmentDetail shipmentId="shipment-1" />)

    await waitFor(() => {
      expect(screen.getByText(/error loading shipment/i)).toBeInTheDocument()
    })
  })
})