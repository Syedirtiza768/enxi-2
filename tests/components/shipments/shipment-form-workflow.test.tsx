import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { ShipmentForm } from '@/components/shipments/shipment-form'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('@/lib/api/client')
jest.mock('@/lib/hooks/use-auth')

const mockApiClient = apiClient as any
const mockUseAuth = useAuth as any

const mockApprovedOrder = {
  id: 'order-123',
  orderNumber: 'SO-2024-001',
  status: 'APPROVED',
  shippingAddress: '123 Shipping St, Test City, TC 12345',
  salesCase: {
    customer: {
      name: 'Test Customer',
      email: 'customer@example.com'
    }
  },
  items: [
    {
      id: 'item-1',
      itemCode: 'PROD001',
      description: 'Test Product 1',
      quantity: 10,
      quantityShipped: 0,
      item: {
        name: 'Test Product 1'
      }
    },
    {
      id: 'item-2',
      itemCode: 'PROD002',
      description: 'Test Product 2',
      quantity: 5,
      quantityShipped: 2,
      item: {
        name: 'Test Product 2'
      }
    }
  ]
}

const mockPendingOrder = {
  ...mockApprovedOrder,
  status: 'PENDING'
}

const mockFullyShippedOrder = {
  ...mockApprovedOrder,
  items: [
    {
      id: 'item-1',
      itemCode: 'PROD001',
      description: 'Test Product 1',
      quantity: 10,
      quantityShipped: 10,
      item: {
        name: 'Test Product 1'
      }
    }
  ]
}

describe('ShipmentForm Workflow Tests', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'user@example.com' }
    })
  })

  describe('Order Status Validation', () => {
    test('should show error for PENDING orders', async () => {
      mockApiClient.mockResolvedValueOnce(mockPendingOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Order must be approved or in processing status before creating shipment')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    })

    test('should allow shipment creation for APPROVED orders', async () => {
      mockApiClient.mockResolvedValueOnce(mockApprovedOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('SO-2024-001')).toBeInTheDocument()
        expect(screen.getByText('Test Customer')).toBeInTheDocument()
        expect(screen.getByText('APPROVED')).toBeInTheDocument()
      })

      expect(screen.queryByText('Order must be approved')).not.toBeInTheDocument()
    })

    test('should allow shipment creation for PROCESSING orders', async () => {
      const processingOrder = { ...mockApprovedOrder, status: 'PROCESSING' }
      mockApiClient.mockResolvedValueOnce(processingOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROCESSING')).toBeInTheDocument()
      })

      expect(screen.queryByText('Order must be approved')).not.toBeInTheDocument()
    })
  })

  describe('Item Selection and Quantity Management', () => {
    test('should display shippable items correctly', async () => {
      mockApiClient.mockResolvedValueOnce(mockApprovedOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        // First item - fully available
        expect(screen.getByText('PROD001')).toBeInTheDocument()
        expect(screen.getByText('10', { selector: 'td' })).toBeInTheDocument() // ordered
        expect(screen.getByText('0', { selector: 'td' })).toBeInTheDocument() // shipped
        expect(screen.getByText('10')).toBeInTheDocument() // remaining

        // Second item - partially shipped
        expect(screen.getByText('PROD002')).toBeInTheDocument()
        expect(screen.getByText('5', { selector: 'td' })).toBeInTheDocument() // ordered
        expect(screen.getByText('2', { selector: 'td' })).toBeInTheDocument() // shipped
        expect(screen.getByText('3')).toBeInTheDocument() // remaining
      })
    })

    test('should handle item selection', async () => {
      mockApiClient.mockResolvedValueOnce(mockApprovedOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROD001')).toBeInTheDocument()
      })

      // Select first item
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      // Should show quantity input
      const quantityInput = screen.getByDisplayValue('10')
      expect(quantityInput).toBeInTheDocument()
    })

    test('should validate quantity limits', async () => {
      mockApiClient.mockResolvedValueOnce(mockApprovedOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROD001')).toBeInTheDocument()
      })

      // Select first item
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      // Try to enter quantity more than available
      const quantityInput = screen.getByDisplayValue('10')
      await user.clear(quantityInput)
      await user.type(quantityInput, '15')

      await waitFor(() => {
        expect(screen.getByText('Cannot exceed remaining quantity (10)')).toBeInTheDocument()
      })
    })

    test('should show message when no items are available', async () => {
      mockApiClient.mockResolvedValueOnce(mockFullyShippedOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('No items available for shipment')).toBeInTheDocument()
        expect(screen.getByText('All items in this order have already been shipped.')).toBeInTheDocument()
      })
    })
  })

  describe('Shipment Creation', () => {
    test('should create shipment with selected items', async () => {
      mockApiClient
        .mockResolvedValueOnce(mockApprovedOrder) // Initial load
        .mockResolvedValueOnce({ id: 'shipment-123' }) // Create shipment

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROD001')).toBeInTheDocument()
      })

      // Select first item
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      // Fill shipping information
      await user.type(screen.getByPlaceholderText('FedEx, UPS, DHL, etc.'), 'FedEx')
      await user.type(screen.getByPlaceholderText('Enter tracking number'), 'FDX123456')
      await user.type(screen.getByPlaceholderText('Ground, Express, Overnight, etc.'), 'Ground')

      // Create shipment
      const createButton = screen.getByRole('button', { name: /create shipment/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockApiClient).toHaveBeenCalledWith('/api/shipments', {
          method: 'POST',
          body: JSON.stringify({
            salesOrderId: 'order-123',
            items: [
              {
                salesOrderItemId: 'item-1',
                quantity: 10
              }
            ],
            carrier: 'FedEx',
            trackingNumber: 'FDX123456',
            shippingMethod: 'Ground',
            createdBy: 'user-123'
          })
        })
      })

      expect(mockOnSuccess).toHaveBeenCalledWith({ id: 'shipment-123' })
    })

    test('should handle partial shipments', async () => {
      mockApiClient
        .mockResolvedValueOnce(mockApprovedOrder)
        .mockResolvedValueOnce({ id: 'shipment-123' })

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROD001')).toBeInTheDocument()
      })

      // Select first item
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      // Change quantity to partial
      const quantityInput = screen.getByDisplayValue('10')
      await user.clear(quantityInput)
      await user.type(quantityInput, '5')

      // Create shipment
      const createButton = screen.getByRole('button', { name: /create shipment/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockApiClient).toHaveBeenCalledWith('/api/shipments', {
          method: 'POST',
          body: expect.stringContaining('"quantity":5')
        })
      })
    })

    test('should require at least one item to be selected', async () => {
      mockApiClient.mockResolvedValueOnce(mockApprovedOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROD001')).toBeInTheDocument()
      })

      // Try to create without selecting items
      const createButton = screen.getByRole('button', { name: /create shipment/i })
      expect(createButton).toBeDisabled()
    })

    test('should show validation error when no items selected', async () => {
      mockApiClient.mockResolvedValueOnce(mockApprovedOrder)

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROD001')).toBeInTheDocument()
      })

      // Select and then deselect an item
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)
      await user.click(firstCheckbox)

      // Button should be disabled
      const createButton = screen.getByRole('button', { name: /create shipment/i })
      expect(createButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockApiClient
        .mockResolvedValueOnce(mockApprovedOrder)
        .mockRejectedValueOnce(new Error('Network error'))

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('PROD001')).toBeInTheDocument()
      })

      // Select item and try to create
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      const createButton = screen.getByRole('button', { name: /create shipment/i })
      await user.click(createButton)

      // Should not call success callback
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    test('should handle order not found', async () => {
      mockApiClient.mockRejectedValueOnce(new Error('Order not found'))

      render(
        <ShipmentForm
          salesOrderId="order-123"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Error loading order. Please try again.')).toBeInTheDocument()
      })
    })
  })
})