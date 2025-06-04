'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, Package, FileText, CheckCircle, XCircle, 
  Truck, Edit, Calendar, MapPin, CreditCard, Send, Clock
} from 'lucide-react'

interface SalesOrderItem {
  id: string
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface SalesOrder {
  id: string
  orderNumber: string
  salesCase: {
    id: string
    caseNumber: string
    title: string
    customer: {
      id: string
      name: string
      email: string
      phone?: string
      address?: string
    }
  }
  quotation?: {
    id: string
    quotationNumber: string
  } | null
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'INVOICED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  customerPO?: string
  requestedDate?: string
  promisedDate?: string
  paymentTerms?: string
  shippingTerms?: string
  shippingAddress?: string
  billingAddress?: string
  notes?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  items: SalesOrderItem[]
  trackingNumber?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  cancelReason?: string
  createdAt: string
  updatedAt: string
}

export default function SalesOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch sales order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/sales-orders/${orderId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to load sales order')
        }

        const data = await response.json()
        setOrder(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales order')
        console.error('Error fetching sales order:', err)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this sales order?')) {
      return
    }

    try {
      setActionLoading('approve')
      const response = await fetch(`/api/sales-orders/${orderId}/approve`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to approve sales order')
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      alert('Sales order has been approved!')
    } catch (error) {
      console.error('Error approving sales order:', error)
      alert('Failed to approve sales order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleStartProcessing = async () => {
    if (!confirm('Start processing this order? This will begin fulfillment.')) {
      return
    }

    try {
      setActionLoading('process')
      const response = await fetch(`/api/sales-orders/${orderId}/process`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to start processing')
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      alert('Order processing has started!')
    } catch (error) {
      console.error('Error starting processing:', error)
      alert('Failed to start processing')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkShipped = async () => {
    if (!confirm('Mark this order as shipped? This will update the delivery status.')) {
      return
    }

    const trackingNumber = prompt('Enter tracking number (optional):')

    try {
      setActionLoading('ship')
      const response = await fetch(`/api/sales-orders/${orderId}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ trackingNumber: trackingNumber || undefined }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as shipped')
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      alert('Order has been marked as shipped!')
    } catch (error) {
      console.error('Error marking as shipped:', error)
      alert('Failed to mark as shipped')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkDelivered = async () => {
    if (!confirm('Mark this order as delivered? This will complete the order.')) {
      return
    }

    try {
      setActionLoading('deliver')
      const response = await fetch(`/api/sales-orders/${orderId}/deliver`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to mark as delivered')
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      alert('Order has been marked as delivered!')
    } catch (error) {
      console.error('Error marking as delivered:', error)
      alert('Failed to mark as delivered')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancelling this order:')
    if (!reason) {
      return
    }

    try {
      setActionLoading('cancel')
      const response = await fetch(`/api/sales-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel sales order')
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      alert('Sales order has been cancelled.')
    } catch (error) {
      console.error('Error cancelling sales order:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel sales order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateInvoice = async () => {
    if (!confirm('Create an invoice from this sales order?')) {
      return
    }

    try {
      setActionLoading('invoice')
      const response = await fetch(`/api/sales-orders/${orderId}/create-invoice`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to create invoice')
      }

      const invoice = await response.json()
      alert(`Invoice ${invoice.invoiceNumber} has been created!`)
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Failed to create invoice')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (status: SalesOrder['status']) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-5 w-5" />
      case 'APPROVED': return <CheckCircle className="h-5 w-5" />
      case 'PROCESSING': return <Package className="h-5 w-5" />
      case 'SHIPPED': return <Truck className="h-5 w-5" />
      case 'DELIVERED': return <CheckCircle className="h-5 w-5" />
      case 'INVOICED': return <FileText className="h-5 w-5" />
      case 'COMPLETED': return <CheckCircle className="h-5 w-5" />
      case 'CANCELLED': return <XCircle className="h-5 w-5" />
      case 'ON_HOLD': return <Clock className="h-5 w-5" />
      default: return <Package className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: SalesOrder['status']) => {
    const statusConfig = {
      PENDING: { text: 'Pending', className: 'bg-gray-100 text-gray-800' },
      APPROVED: { text: 'Approved', className: 'bg-blue-100 text-blue-800' },
      PROCESSING: { text: 'Processing', className: 'bg-yellow-100 text-yellow-800' },
      SHIPPED: { text: 'Shipped', className: 'bg-purple-100 text-purple-800' },
      DELIVERED: { text: 'Delivered', className: 'bg-green-100 text-green-800' },
      INVOICED: { text: 'Invoiced', className: 'bg-indigo-100 text-indigo-800' },
      COMPLETED: { text: 'Completed', className: 'bg-green-100 text-green-800' },
      CANCELLED: { text: 'Cancelled', className: 'bg-red-100 text-red-800' },
      ON_HOLD: { text: 'On Hold', className: 'bg-orange-100 text-orange-800' }
    }

    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
        {getStatusIcon(status)}
        {config.text}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading sales order...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <Package className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Sales order not found'}
        </h3>
        <button
          onClick={() => router.push('/sales-orders')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sales Orders
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <button
              onClick={() => router.push('/sales-orders')}
              className="flex items-center hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Sales Orders
            </button>
            <span>/</span>
            <span className="text-gray-900">{order.orderNumber}</span>
          </div>

          {/* Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Sales Order {order.orderNumber}
            </h1>
            {getStatusBadge(order.status)}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            <span>Created on {formatDate(order.createdAt)}</span>
            {order.quotation && (
              <>
                <span className="mx-2">•</span>
                <span>From Quotation {order.quotation.quotationNumber}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* PENDING Status Actions */}
          {order.status === 'PENDING' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading !== null}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {actionLoading === 'approve' ? 'Approving...' : 'Approve Order'}
              </button>
              
              <button
                onClick={() => router.push(`/sales-orders/${orderId}/edit`)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            </>
          )}

          {/* APPROVED Status Actions */}
          {order.status === 'APPROVED' && (
            <>
              <button
                onClick={() => router.push(`/shipments/new?orderId=${orderId}`)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                Create Shipment
              </button>
              
              <button
                onClick={handleStartProcessing}
                disabled={actionLoading !== null}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Package className="h-4 w-4 mr-2" />
                {actionLoading === 'process' ? 'Starting...' : 'Start Processing'}
              </button>
              
              <button
                onClick={handleCreateInvoice}
                disabled={actionLoading !== null}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                {actionLoading === 'invoice' ? 'Creating...' : 'Create Invoice'}
              </button>
              
              <button
                onClick={() => router.push(`/sales-orders/${orderId}/edit`)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            </>
          )}

          {/* PROCESSING Status Actions */}
          {order.status === 'PROCESSING' && (
            <>
              <button
                onClick={() => router.push(`/shipments/new?orderId=${orderId}`)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                Create Shipment
              </button>
              
              <button
                onClick={handleMarkShipped}
                disabled={actionLoading !== null}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Truck className="h-4 w-4 mr-2" />
                {actionLoading === 'ship' ? 'Shipping...' : 'Mark as Shipped'}
              </button>
              
              <button
                onClick={handleCreateInvoice}
                disabled={actionLoading !== null}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                {actionLoading === 'invoice' ? 'Creating...' : 'Create Invoice'}
              </button>
            </>
          )}

          {/* SHIPPED Status Actions */}
          {order.status === 'SHIPPED' && (
            <button
              onClick={handleMarkDelivered}
              disabled={actionLoading !== null}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {actionLoading === 'deliver' ? 'Delivering...' : 'Mark as Delivered'}
            </button>
          )}

          {/* Cancel button for non-final statuses */}
          {!['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(order.status) && (
            <button
              onClick={handleCancel}
              disabled={actionLoading !== null}
              className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.salesCase.customer.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.salesCase.customer.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.salesCase.customer.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer PO</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.customerPO || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* Order Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.itemCode}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </td>
                      <td className="px-3 py-4 text-right text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-3 py-4 text-right text-sm text-gray-900">
                        {item.discount > 0 ? `${item.discount}%` : '-'}
                      </td>
                      <td className="px-3 py-4 text-right text-sm text-gray-900">
                        {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                      Subtotal
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(order.subtotal)}
                    </td>
                  </tr>
                  {order.discountAmount > 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                        Discount
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-red-600">
                        -{formatCurrency(order.discountAmount)}
                      </td>
                    </tr>
                  )}
                  {order.taxAmount > 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                        Tax
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(order.taxAmount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right text-lg font-semibold text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-3 text-right text-lg font-semibold text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Sales Case</dt>
                <dd className="mt-1">
                  <button
                    onClick={() => router.push(`/sales-cases/${order.salesCase.id}`)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {order.salesCase.caseNumber}
                  </button>
                  <div className="text-sm text-gray-900">{order.salesCase.title}</div>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Requested Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(order.requestedDate)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Promised Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(order.promisedDate)}</dd>
              </div>
            </dl>
          </div>

          {/* Shipping & Payment */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Shipping & Payment</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <CreditCard className="h-4 w-4 mr-1" />
                  Payment Terms
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{order.paymentTerms || 'Net 30'}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Truck className="h-4 w-4 mr-1" />
                  Shipping Terms
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{order.shippingTerms || 'FOB Origin'}</dd>
              </div>

              {order.shippingAddress && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Shipping Address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                    {order.shippingAddress}
                  </dd>
                </div>
              )}

              {order.billingAddress && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Billing Address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                    {order.billingAddress}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Shipping & Delivery Tracking */}
          {(order.trackingNumber || order.shippedAt || order.deliveredAt) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Shipping & Delivery
              </h2>
              <dl className="space-y-4">
                {order.trackingNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tracking Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.trackingNumber}</dd>
                  </div>
                )}
                
                {order.shippedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Truck className="h-4 w-4 mr-1" />
                      Shipped Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(order.shippedAt)}</dd>
                  </div>
                )}
                
                {order.deliveredAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Delivered Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(order.deliveredAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Cancellation Info */}
          {order.status === 'CANCELLED' && order.cancelReason && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                Cancellation Details
              </h2>
              <dl className="space-y-4">
                {order.cancelledAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cancelled Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(order.cancelledAt)}</dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cancellation Reason</dt>
                  <dd className="mt-1 text-sm text-gray-900">{order.cancelReason}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notes</h2>
              <p className="text-sm text-gray-900 whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}