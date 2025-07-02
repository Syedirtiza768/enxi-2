import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { useRouter, useParams } from 'next/navigation'
import SalesOrderDetailPage from '@/app/(auth)/sales-orders/[id]/page'
import { useCurrency } from '@/lib/contexts/currency-context'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// Mock currency context
jest.mock('@/lib/contexts/currency-context', () => ({
  useCurrency: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockOrder = {
  id: 'order-123',
  orderNumber: 'SO-2024-001',
  status: 'APPROVED',
  customerPO: 'PO-12345',
  requestedDate: '2024-01-15',
  promisedDate: '2024-01-20',
  shippingAddress: '123 Shipping St',
  subtotal: 1000,
  taxAmount: 50,
  totalAmount: 1050,
  createdAt: '2024-01-10',
  salesCase: {
    id: 'case-123',
    caseNumber: 'SC-2024-001',
    title: 'Test Sales Case',
    customer: {
      id: 'customer-123',
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '123-456-7890'
    }
  },
  items: [
    {
      id: 'item-123',
      itemCode: 'PROD001',
      description: 'Test Product',
      quantity: 10,
      unitPrice: 100,
      quantityShipped: 0,
      subtotal: 1000,
      taxAmount: 50,
      totalAmount: 1050
    }
  ]
}

describe('Sales Order Detail Page', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
    ;(useParams as any).mockReturnValue({
      id: 'order-123',
    })
    ;(useCurrency as any).mockReturnValue({
      formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
    })
  })

  describe('Order Display', () => {
    test('should display order details correctly', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sales Order SO-2024-001')).toBeInTheDocument()
        expect(screen.getByText('Test Customer')).toBeInTheDocument()
        expect(screen.getByText('customer@example.com')).toBeInTheDocument()
        expect(screen.getByText('PO-12345')).toBeInTheDocument()
      })
    })

    test('should display approved status badge', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument()
      })
    })
  })

  describe('Action Buttons for Approved Orders', () => {
    test('should show Create Shipment button for approved orders', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        const createShipmentButton = screen.getByRole('button', { name: /create shipment/i })
        expect(createShipmentButton).toBeInTheDocument()
      })
    })

    test('should navigate to shipment creation with correct order ID', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        const createShipmentButton = screen.getByRole('button', { name: /create shipment/i })
        fireEvent.click(createShipmentButton)
      })

      expect(mockPush).toHaveBeenCalledWith('/shipments/new?orderId=order-123')
    })

    test('should show Start Processing button for approved orders', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        const startProcessingButton = screen.getByRole('button', { name: /start processing/i })
        expect(startProcessingButton).toBeInTheDocument()
      })
    })

    test('should show Edit button for approved orders', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i })
        expect(editButtons.length).toBeGreaterThan(0)
      })
    })

    test('should handle Start Processing action', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrder,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockOrder, status: 'PROCESSING' }),
        })

      // Mock window.confirm
      window.confirm = jest.fn(() => true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        const startProcessingButton = screen.getByRole('button', { name: /start processing/i })
        fireEvent.click(startProcessingButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/sales-orders/order-123/process',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          })
        )
      })
    })
  })

  describe('Edit Page Access Control', () => {
    test('should navigate to edit page when clicking Edit button', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i })
        fireEvent.click(editButtons[0])
      })

      expect(mockPush).toHaveBeenCalledWith('/sales-orders/order-123/edit')
    })
  })

  describe('Order Status Restrictions', () => {
    test('should not show approve button for already approved orders', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        const approveButton = screen.queryByRole('button', { name: /approve order/i })
        expect(approveButton).not.toBeInTheDocument()
      })
    })

    test('should show appropriate buttons for PENDING orders', async () => {
      const pendingOrder = { ...mockOrder, status: 'PENDING' }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => pendingOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve order/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /create shipment/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /start processing/i })).not.toBeInTheDocument()
      })
    })

    test('should show Create Shipment for PROCESSING orders', async () => {
      const processingOrder = { ...mockOrder, status: 'PROCESSING' }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => processingOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create shipment/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /start processing/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('should display error when order fails to load', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load sales order/i)).toBeInTheDocument()
      })
    })

    test('should handle 404 not found', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Order not found' }),
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/sales order not found/i)).toBeInTheDocument()
      })
    })
  })
})