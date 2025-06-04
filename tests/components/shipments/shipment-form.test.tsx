import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShipmentForm } from '@/components/shipments/shipment-form'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

const mockSalesOrder = {
  id: 'order-1',
  orderNumber: 'SO-2025-00001',
  status: 'APPROVED',
  shippingAddress: '123 Main St, City, State 12345',
  salesCase: {
    customer: {
      name: 'Test Customer',
      email: 'test@customer.com',
    },
  },
  items: [
    {
      id: 'item-1',
      itemCode: 'PROD-001',
      description: 'Test Product 1',
      quantity: 10,
      quantityShipped: 0,
      item: {
        name: 'Test Product 1',
      },
    },
    {
      id: 'item-2',
      itemCode: 'PROD-002',
      description: 'Test Product 2',
      quantity: 5,
      quantityShipped: 2, // Partially shipped
      item: {
        name: 'Test Product 2',
      },
    },
  ],
}

describe('ShipmentForm', () => {
  const { apiClient } = require('@/lib/api/client')
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render form for creating shipment from order', async () => {
    apiClient.get.mockResolvedValue(mockSalesOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText('Create Shipment')).toBeInTheDocument()
    })

    expect(screen.getByText('SO-2025-00001')).toBeInTheDocument()
    expect(screen.getByText('Test Customer')).toBeInTheDocument()
    expect(screen.getByText('123 Main St, City, State 12345')).toBeInTheDocument()
  })

  it('should show available items for shipment', async () => {
    apiClient.get.mockResolvedValue(mockSalesOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText('PROD-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('PROD-002')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()

    // Should show remaining quantities
    expect(screen.getByText('10 remaining')).toBeInTheDocument() // 10 - 0
    expect(screen.getByText('3 remaining')).toBeInTheDocument() // 5 - 2
  })

  it('should allow selecting items and quantities', async () => {
    apiClient.get.mockResolvedValue(mockSalesOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText('PROD-001')).toBeInTheDocument()
    })

    // Select first item
    const checkbox1 = screen.getByLabelText('Select PROD-001')
    fireEvent.click(checkbox1)

    expect(checkbox1).toBeChecked()

    // Should show quantity input
    const quantityInput1 = screen.getByLabelText('Quantity for PROD-001')
    expect(quantityInput1).toBeInTheDocument()
    expect(quantityInput1).toHaveValue(10) // Default to remaining quantity

    // Change quantity
    fireEvent.change(quantityInput1, { target: { value: '5' } })
    expect(quantityInput1).toHaveValue(5)

    // Select second item
    const checkbox2 = screen.getByLabelText('Select PROD-002')
    fireEvent.click(checkbox2)

    const quantityInput2 = screen.getByLabelText('Quantity for PROD-002')
    expect(quantityInput2).toHaveValue(3) // Default to remaining quantity
  })

  it('should validate quantity inputs', async () => {
    apiClient.get.mockResolvedValue(mockSalesOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText('PROD-001')).toBeInTheDocument()
    })

    // Select item and enter invalid quantity
    const checkbox1 = screen.getByLabelText('Select PROD-001')
    fireEvent.click(checkbox1)

    const quantityInput1 = screen.getByLabelText('Quantity for PROD-001')
    fireEvent.change(quantityInput1, { target: { value: '15' } }) // More than available

    // Try to submit
    fireEvent.click(screen.getByText('Create Shipment'))

    await waitFor(() => {
      expect(screen.getByText(/cannot exceed remaining quantity/i)).toBeInTheDocument()
    })
  })

  it('should allow entering carrier and tracking information', async () => {
    apiClient.get.mockResolvedValue(mockSalesOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByLabelText(/carrier/i)).toBeInTheDocument()
    })

    const carrierInput = screen.getByLabelText(/carrier/i)
    const trackingInput = screen.getByLabelText(/tracking number/i)
    const methodInput = screen.getByLabelText(/shipping method/i)

    fireEvent.change(carrierInput, { target: { value: 'FedEx' } })
    fireEvent.change(trackingInput, { target: { value: 'TEST123456' } })
    fireEvent.change(methodInput, { target: { value: 'Ground' } })

    expect(carrierInput).toHaveValue('FedEx')
    expect(trackingInput).toHaveValue('TEST123456')
    expect(methodInput).toHaveValue('Ground')
  })

  it('should create shipment when form is submitted', async () => {
    apiClient.get.mockResolvedValue(mockSalesOrder)
    apiClient.post.mockResolvedValue({
      id: 'shipment-1',
      shipmentNumber: 'SHP-2025-00001',
      status: 'PREPARING',
    })

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText('PROD-001')).toBeInTheDocument()
    })

    // Select items
    fireEvent.click(screen.getByLabelText('Select PROD-001'))
    fireEvent.click(screen.getByLabelText('Select PROD-002'))

    // Set quantities
    const quantityInput1 = screen.getByLabelText('Quantity for PROD-001')
    const quantityInput2 = screen.getByLabelText('Quantity for PROD-002')
    fireEvent.change(quantityInput1, { target: { value: '5' } })
    fireEvent.change(quantityInput2, { target: { value: '3' } })

    // Set carrier info
    const carrierInput = screen.getByLabelText(/carrier/i)
    const trackingInput = screen.getByLabelText(/tracking number/i)
    fireEvent.change(carrierInput, { target: { value: 'FedEx' } })
    fireEvent.change(trackingInput, { target: { value: 'TEST123456' } })

    // Submit form
    fireEvent.click(screen.getByText('Create Shipment'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/shipments', {
        salesOrderId: 'order-1',
        items: [
          { salesOrderItemId: 'item-1', quantity: 5 },
          { salesOrderItemId: 'item-2', quantity: 3 },
        ],
        carrier: 'FedEx',
        trackingNumber: 'TEST123456',
        createdBy: expect.any(String),
      })
    })

    expect(mockOnSuccess).toHaveBeenCalledWith({
      id: 'shipment-1',
      shipmentNumber: 'SHP-2025-00001',
      status: 'PREPARING',
    })
  })

  it('should require at least one item to be selected', async () => {
    apiClient.get.mockResolvedValue(mockSalesOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText('Create Shipment')).toBeInTheDocument()
    })

    // Try to submit without selecting any items
    fireEvent.click(screen.getByText('Create Shipment'))

    await waitFor(() => {
      expect(screen.getByText(/select at least one item/i)).toBeInTheDocument()
    })
  })

  it('should handle order not found error', async () => {
    apiClient.get.mockRejectedValue(new Error('Order not found'))

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText(/error loading order/i)).toBeInTheDocument()
    })
  })

  it('should handle order not approved error', async () => {
    const pendingOrder = {
      ...mockSalesOrder,
      status: 'PENDING',
    }

    apiClient.get.mockResolvedValue(pendingOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText(/order must be approved/i)).toBeInTheDocument()
    })
  })

  it('should show no items available when all shipped', async () => {
    const fullyShippedOrder = {
      ...mockSalesOrder,
      items: [
        {
          ...mockSalesOrder.items[0],
          quantityShipped: 10, // Fully shipped
        },
        {
          ...mockSalesOrder.items[1],
          quantityShipped: 5, // Fully shipped
        },
      ],
    }

    apiClient.get.mockResolvedValue(fullyShippedOrder)

    render(<ShipmentForm salesOrderId="order-1" onSuccess={mockOnSuccess} />)

    await waitFor(() => {
      expect(screen.getByText(/no items available for shipment/i)).toBeInTheDocument()
    })
  })

  it('should show cancel button and handle cancellation', async () => {
    const mockOnCancel = jest.fn()
    apiClient.get.mockResolvedValue(mockSalesOrder)

    render(
      <ShipmentForm
        salesOrderId="order-1"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockOnCancel).toHaveBeenCalled()
  })
})