import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useRouter, useParams } from 'next/navigation'
import SalesOrderDetailPage from '@/app/(auth)/sales-orders/[id]/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Sales Order Status Transitions', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const baseSalesOrder = {
    id: 'so-1',
    orderNumber: 'SO-2024-001',
    salesCase: {
      id: 'sc-1',
      caseNumber: 'SC-2024-001',
      title: 'Software Development Project',
      customer: {
        id: 'cust-1',
        name: 'Acme Corporation',
        email: 'contact@acme.com'
      }
    },
    customerPO: 'PO-2024-001',
    totalAmount: 50000,
    items: [
      {
        id: 'soi-1',
        itemCode: 'ITM-001',
        description: 'Software Development',
        quantity: 40,
        unitPrice: 125,
        totalAmount: 5000
      }
    ],
    createdAt: '2024-01-15T10:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useParams as jest.Mock).mockReturnValue({ id: 'so-1' })
    window.confirm = jest.fn()
    window.alert = jest.fn()
  })

  describe('DRAFT Status', () => {
    it('should show approve button for DRAFT orders', async () => {
      const draftOrder = { ...baseSalesOrder, status: 'DRAFT' }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => draftOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve order/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument()
      })
    })

    it('should approve DRAFT order', async () => {
      const user = userEvent.setup()
      const draftOrder = { ...baseSalesOrder, status: 'DRAFT' }
      const confirmedOrder = { ...baseSalesOrder, status: 'CONFIRMED' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => draftOrder,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedOrder,
        })

      ;(window.confirm as jest.Mock).mockReturnValue(true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve order/i })).toBeInTheDocument()
      })

      const approveButton = screen.getByRole('button', { name: /approve order/i })
      await user.click(approveButton)

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to approve this sales order?'
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/sales-orders/so-1/approve',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include'
          })
        )
      })
    })

    it('should not approve when confirmation cancelled', async () => {
      const user = userEvent.setup()
      const draftOrder = { ...baseSalesOrder, status: 'DRAFT' }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => draftOrder,
      })

      ;(window.confirm as jest.Mock).mockReturnValue(false)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve order/i })).toBeInTheDocument()
      })

      const approveButton = screen.getByRole('button', { name: /approve order/i })
      await user.click(approveButton)

      expect(window.confirm).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledTimes(1) // Only initial fetch
    })
  })

  describe('CONFIRMED Status', () => {
    it('should show process and create invoice buttons for CONFIRMED orders', async () => {
      const confirmedOrder = { ...baseSalesOrder, status: 'CONFIRMED' }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => confirmedOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start processing/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      })
    })

    it('should start processing CONFIRMED order', async () => {
      const user = userEvent.setup()
      const confirmedOrder = { ...baseSalesOrder, status: 'CONFIRMED' }
      const processingOrder = { ...baseSalesOrder, status: 'PROCESSING' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedOrder,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => processingOrder,
        })

      ;(window.confirm as jest.Mock).mockReturnValue(true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start processing/i })).toBeInTheDocument()
      })

      const processButton = screen.getByRole('button', { name: /start processing/i })
      await user.click(processButton)

      expect(window.confirm).toHaveBeenCalledWith(
        'Start processing this order? This will begin fulfillment.'
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/sales-orders/so-1/process',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include'
          })
        )
      })
    })
  })

  describe('PROCESSING Status', () => {
    it('should show ship and create invoice buttons for PROCESSING orders', async () => {
      const processingOrder = { ...baseSalesOrder, status: 'PROCESSING' }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => processingOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as shipped/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      })
    })

    it('should mark PROCESSING order as shipped', async () => {
      const user = userEvent.setup()
      const processingOrder = { ...baseSalesOrder, status: 'PROCESSING' }
      const shippedOrder = { ...baseSalesOrder, status: 'SHIPPED' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => processingOrder,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => shippedOrder,
        })

      ;(window.confirm as jest.Mock).mockReturnValue(true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as shipped/i })).toBeInTheDocument()
      })

      const shipButton = screen.getByRole('button', { name: /mark as shipped/i })
      await user.click(shipButton)

      expect(window.confirm).toHaveBeenCalledWith(
        'Mark this order as shipped? This will update the delivery status.'
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/sales-orders/so-1/ship',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include'
          })
        )
      })
    })

    it('should show tracking information input when shipping', async () => {
      const user = userEvent.setup()
      const processingOrder = { ...baseSalesOrder, status: 'PROCESSING' }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => processingOrder,
      })

      // Mock prompt for tracking number
      window.prompt = jest.fn().mockReturnValue('TRK123456789')

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as shipped/i })).toBeInTheDocument()
      })

      const shipButton = screen.getByRole('button', { name: /mark as shipped/i })
      await user.click(shipButton)

      expect(window.prompt).toHaveBeenCalledWith(
        'Enter tracking number (optional):'
      )
    })
  })

  describe('SHIPPED Status', () => {
    it('should show deliver button for SHIPPED orders', async () => {
      const shippedOrder = { 
        ...baseSalesOrder, 
        status: 'SHIPPED',
        trackingNumber: 'TRK123456789',
        shippedAt: '2024-01-20T10:00:00Z'
      }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => shippedOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as delivered/i })).toBeInTheDocument()
        expect(screen.getByText('TRK123456789')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      })
    })

    it('should mark SHIPPED order as delivered', async () => {
      const user = userEvent.setup()
      const shippedOrder = { ...baseSalesOrder, status: 'SHIPPED' }
      const deliveredOrder = { ...baseSalesOrder, status: 'DELIVERED' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => shippedOrder,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => deliveredOrder,
        })

      ;(window.confirm as jest.Mock).mockReturnValue(true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as delivered/i })).toBeInTheDocument()
      })

      const deliverButton = screen.getByRole('button', { name: /mark as delivered/i })
      await user.click(deliverButton)

      expect(window.confirm).toHaveBeenCalledWith(
        'Mark this order as delivered? This will complete the order.'
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/sales-orders/so-1/deliver',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include'
          })
        )
      })
    })
  })

  describe('DELIVERED Status', () => {
    it('should show read-only view for DELIVERED orders', async () => {
      const deliveredOrder = { 
        ...baseSalesOrder, 
        status: 'DELIVERED',
        deliveredAt: '2024-01-25T15:00:00Z'
      }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => deliveredOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Delivered')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /process/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /ship/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('CANCELLED Status', () => {
    it('should show cancellation details for CANCELLED orders', async () => {
      const cancelledOrder = { 
        ...baseSalesOrder, 
        status: 'CANCELLED',
        cancelledAt: '2024-01-18T12:00:00Z',
        cancelReason: 'Customer requested cancellation'
      }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => cancelledOrder,
      })

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Cancelled')).toBeInTheDocument()
        expect(screen.getByText('Customer requested cancellation')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Invoice Creation', () => {
    it('should create invoice from order', async () => {
      const user = userEvent.setup()
      const confirmedOrder = { ...baseSalesOrder, status: 'CONFIRMED' }
      const mockInvoice = { id: 'inv-1', invoiceNumber: 'INV-2024-001' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedOrder,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInvoice,
        })

      ;(window.confirm as jest.Mock).mockReturnValue(true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
      })

      const invoiceButton = screen.getByRole('button', { name: /create invoice/i })
      await user.click(invoiceButton)

      expect(window.confirm).toHaveBeenCalledWith(
        'Create an invoice from this sales order?'
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/sales-orders/so-1/create-invoice',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include'
          })
        )
      })

      expect(window.alert).toHaveBeenCalledWith(
        'Invoice INV-2024-001 has been created!'
      )
      expect(mockRouter.push).toHaveBeenCalledWith('/invoices/inv-1')
    })

    it('should handle invoice creation errors', async () => {
      const user = userEvent.setup()
      const confirmedOrder = { ...baseSalesOrder, status: 'CONFIRMED' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedOrder,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Invoice already exists for this order' }),
        })

      ;(window.confirm as jest.Mock).mockReturnValue(true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
      })

      const invoiceButton = screen.getByRole('button', { name: /create invoice/i })
      await user.click(invoiceButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Failed to create invoice: Invoice already exists for this order'
        )
      })
    })
  })

  describe('Order Cancellation', () => {
    it('should cancel order with reason', async () => {
      const user = userEvent.setup()
      const draftOrder = { ...baseSalesOrder, status: 'DRAFT' }
      const cancelledOrder = { ...baseSalesOrder, status: 'CANCELLED' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => draftOrder,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => cancelledOrder,
        })

      window.prompt = jest.fn().mockReturnValue('Customer requested cancellation')

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel order/i })
      await user.click(cancelButton)

      expect(window.prompt).toHaveBeenCalledWith(
        'Please provide a reason for cancelling this order:'
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/sales-orders/so-1/cancel',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reason: 'Customer requested cancellation' })
          })
        )
      })
    })

    it('should not cancel when no reason provided', async () => {
      const user = userEvent.setup()
      const draftOrder = { ...baseSalesOrder, status: 'DRAFT' }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => draftOrder,
      })

      window.prompt = jest.fn().mockReturnValue('')

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel order/i })
      await user.click(cancelButton)

      expect(window.prompt).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledTimes(1) // Only initial fetch
    })
  })

  describe('Loading States', () => {
    it('should show loading state during status transitions', async () => {
      const user = userEvent.setup()
      const draftOrder = { ...baseSalesOrder, status: 'DRAFT' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => draftOrder,
        })
        .mockImplementationOnce(() => new Promise(() => {})) // Never resolves

      ;(window.confirm as jest.Mock).mockReturnValue(true)

      render(<SalesOrderDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve order/i })).toBeInTheDocument()
      })

      const approveButton = screen.getByRole('button', { name: /approve order/i })
      await user.click(approveButton)

      expect(screen.getByText('Approving...')).toBeInTheDocument()
      expect(approveButton).toBeDisabled()
    })
  })
})