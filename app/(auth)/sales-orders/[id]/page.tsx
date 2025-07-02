'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, Package, FileText, CheckCircle, XCircle, 
  Truck, Edit, Calendar, MapPin, CreditCard, Clock, History,
  Eye, EyeOff, Download
} from 'lucide-react'
import { OrderTimelineEnhanced } from '@/components/sales-orders/order-timeline-enhanced'
import { SalesOrderLineView } from '@/components/sales-orders/sales-order-line-view'
import { SalesOrderProfitability } from '@/components/sales-orders/sales-order-profitability'
import { useCurrency } from '@/lib/contexts/currency-context'

interface SalesOrderItem {
  id: string
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  sortOrder: number
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount: number
  taxRate: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  margin?: number
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
  internalNotes?: string
  version: number
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
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showTimeline, setShowTimeline] = useState(true)
  const [viewMode, setViewMode] = useState<'internal' | 'client'>('internal')

  // Fetch sales order details
  const fetchOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/sales-orders/${orderId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error:', response.status, errorData)
        throw new Error(errorData.error || `Failed to load sales order: ${response.status}`)
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
  
  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  // Auto-refresh for APPROVED status to catch workflow updates
  useEffect(() => {
    if (order?.status === 'APPROVED') {
      const interval = setInterval(() => {
        fetch(`/api/sales-orders/${orderId}`, {
          credentials: 'include',
        })
          .then(res => res.json())
          .then(data => {
            if (data.status !== order.status) {
              setOrder(data)
            }
          })
          .catch(console.error)
      }, 3000) // Check every 3 seconds

      return () => clearInterval(interval)
    }
  }, [order?.status, orderId])

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this sales order?')) {
      return
    }

    try {
      setActionLoading('approve')
      const response = await fetch(`/api/sales-orders/${orderId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error || `Failed to approve sales order (${response.status})`
        throw new Error(errorMessage)
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder.order || updatedOrder)
      alert('Sales order has been approved!')
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve sales order')
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error || `Failed to start processing (${response.status})`
        throw new Error(errorMessage)
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      alert('Order processing has started!')
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to start processing')
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
      console.error('Error:', error);
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
      console.error('Error:', error);
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
      console.error('Error:', error);
      setActionLoading(null)
    }
  }

  const handleCreateInvoice = async () => {
    if (!confirm('Create an invoice from this sales order?')) {
      return
    }

    try {
      setActionLoading('invoice')
      console.log('Creating invoice for order:', orderId)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(`/api/sales-orders/${orderId}/create-invoice`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error || `Failed to create invoice (${response.status})`
        throw new Error(errorMessage)
      }

      const invoice = await response.json()
      alert(`Invoice ${invoice.invoiceNumber} has been created!`)
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      console.error('Error creating invoice:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          alert('Request timed out. Please try again.')
        } else if (error.message.includes('Failed to fetch')) {
          alert('Network error. Please check your connection and try again.')
        } else {
          alert(error.message)
        }
      } else {
        alert('Failed to create invoice')
      }
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
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { text: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
        {getStatusIcon(status)}
        {config.text}
      </span>
    )
  }

  // formatCurrency function removed - use useCurrency hook instead

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
            {order.version > 1 && (
              <span className="text-sm text-gray-500 ml-2">(Version {order.version})</span>
            )}
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
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'internal' ? 'client' : 'internal')}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            {viewMode === 'internal' ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {viewMode === 'internal' ? 'Internal View' : 'Client View'}
          </button>
          
          {/* PDF Download */}
          <a
            href={`/api/sales-orders/${orderId}/pdf?view=${viewMode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </a>
          {/* Timeline Button */}
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <History className="h-4 w-4 mr-2" />
            {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
          </button>
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
              <div className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md">
                <Clock className="h-4 w-4 mr-2 animate-pulse" />
                Stock allocation in progress...
              </div>
              
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
                onClick={() => router.push(`/shipments/new?orderId=${order.id}`)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                Create Shipment
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
            
            <SalesOrderLineView items={order.items} viewMode={viewMode} />
            
            {/* Order Totals */}
            <div className="mt-6 border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">Discount</span>
                    <span className="font-medium text-red-600">-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">Tax</span>
                    <span className="font-medium text-gray-900">{formatCurrency(order.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base pt-2 border-t">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profitability Analysis */}
          <SalesOrderProfitability orderId={orderId} />
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Notes</h2>
              <p className="text-sm text-gray-900 whitespace-pre-line">{order.notes}</p>
            </div>
          )}
          
          {/* Internal Notes (only in internal view) */}
          {viewMode === 'internal' && order.internalNotes && (
            <div className="bg-white shadow rounded-lg p-6 border-l-4 border-yellow-400">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Internal Notes</h2>
              <p className="text-sm text-gray-900 whitespace-pre-line">{order.internalNotes}</p>
            </div>
          )}

          {/* Order Timeline */}
          {showTimeline && (
            <OrderTimelineEnhanced 
              salesOrderId={orderId} 
              onRefresh={fetchOrder}
            />
          )}
        </div>
      </div>
    </div>
  )
}