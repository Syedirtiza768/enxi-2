'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, FileText, Send, Download, Receipt, Calendar, 
  CreditCard, MapPin, DollarSign, CheckCircle, Clock,
  AlertCircle, XCircle, Edit, Trash2
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { InvoiceLineView } from '@/components/invoices/invoice-line-view'

interface InvoiceItem {
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

interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    id: string
    name: string
    email: string
    phone?: string
    address?: string
  }
  salesOrder?: {
    id: string
    orderNumber: string
  }
  type: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PURCHASE'
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  invoiceDate: string
  dueDate: string
  paymentTerms?: string
  billingAddress?: string
  notes?: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  createdAt: string
  items: InvoiceItem[]
  payments?: Array<{
    id: string
    paymentNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
    reference?: string
  }>
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const { formatCurrency } = useCurrency()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Fetch invoice details
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true)
        const response = await apiClient<Invoice>(`/api/invoices/${invoiceId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load invoice')
        }
        
        setInvoice(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice')
        console.error('Error fetching invoice:', err)
      } finally {
        setLoading(false)
      }
    }

    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId])

  // Handle send invoice
  const handleSendInvoice = async () => {
    if (!confirm('Send this invoice to the customer?')) {
      return
    }

    try {
      setActionLoading('send')
      const response = await apiClient(`/api/invoices/${invoiceId}/send`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to send invoice')
      }

      const updatedInvoice = response.data
      setInvoice(updatedInvoice)
      alert('Invoice has been sent!')
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Failed to send invoice')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle record payment
  const handleRecordPayment = async () => {
    router.push(`/invoices/${invoiceId}/payment`)
  }

  // Handle download PDF
  const handleDownloadPDF = async () => {
    try {
      setActionLoading('download')
      window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to download PDF')
    } finally {
      setActionLoading(null)
    }
  }

  // Get status icon
  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'DRAFT': return <Clock className="h-5 w-5" />
      case 'SENT': return <Send className="h-5 w-5" />
      case 'VIEWED': return <FileText className="h-5 w-5" />
      case 'PARTIAL': return <DollarSign className="h-5 w-5" />
      case 'PAID': return <CheckCircle className="h-5 w-5" />
      case 'OVERDUE': return <AlertCircle className="h-5 w-5" />
      case 'CANCELLED': return <XCircle className="h-5 w-5" />
      case 'REFUNDED': return <Receipt className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  // Get status color
  const getStatusColor = (status: Invoice['status']) => {
    const statusConfig = {
      DRAFT: { text: 'Draft', className: 'bg-gray-100 text-gray-800' },
      SENT: { text: 'Sent', className: 'bg-blue-100 text-blue-800' },
      VIEWED: { text: 'Viewed', className: 'bg-purple-100 text-purple-800' },
      PARTIAL: { text: 'Partial Payment', className: 'bg-yellow-100 text-yellow-800' },
      PAID: { text: 'Paid', className: 'bg-green-100 text-green-800' },
      OVERDUE: { text: 'Overdue', className: 'bg-red-100 text-red-800' },
      CANCELLED: { text: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
      REFUNDED: { text: 'Refunded', className: 'bg-orange-100 text-orange-800' }
    }
    return statusConfig[status] || statusConfig.DRAFT
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading invoice...</div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Invoice not found'}</p>
          <button
            onClick={() => router.push('/invoices')}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusColor(invoice.status)
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.balanceAmount > 0 && invoice.status !== 'PAID'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/invoices')}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice {invoice.invoiceNumber}
            </h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
              {getStatusIcon(invoice.status)}
              <span className="ml-1">{statusInfo.text}</span>
            </span>
            {isOverdue && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <AlertCircle className="h-4 w-4 mr-1" />
                Overdue
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {invoice.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => router.push(`/invoices/${invoiceId}/edit`)}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleSendInvoice}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {actionLoading === 'send' ? 'Sending...' : 'Send Invoice'}
                </button>
              </>
            )}
            
            {['SENT', 'VIEWED', 'PARTIAL'].includes(invoice.status) && invoice.balanceAmount > 0 && (
              <button
                onClick={handleRecordPayment}
                disabled={actionLoading !== null}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Record Payment
              </button>
            )}
            
            <button
              onClick={handleDownloadPDF}
              disabled={actionLoading !== null}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {actionLoading === 'download' ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details and Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg">
            {/* Customer Info */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{invoice.customer.name}</p>
                  <p className="text-sm text-gray-500">{invoice.customer.email}</p>
                  {invoice.customer.phone && (
                    <p className="text-sm text-gray-500">{invoice.customer.phone}</p>
                  )}
                </div>
                {invoice.billingAddress && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Billing Address:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.billingAddress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h3>
              <InvoiceLineView items={invoice.items} />
              
              {/* Totals */}
              <div className="mt-6 border-t pt-6">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="font-medium text-gray-900">Discount</span>
                    <span className="text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="font-medium text-gray-900">Tax</span>
                    <span className="text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base pt-4 mt-4 border-t">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.paidAmount > 0 && (
                  <>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="font-medium text-gray-900">Paid</span>
                      <span className="text-green-600">-{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 mt-2 border-t">
                      <span className="font-semibold text-gray-900">Balance Due</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(invoice.balanceAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h2>
            <dl className="space-y-4">
              {invoice.salesOrder && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sales Order</dt>
                  <dd className="mt-1">
                    <button
                      onClick={() => router.push(`/sales-orders/${invoice.salesOrder!.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {invoice.salesOrder.orderNumber}
                    </button>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Invoice Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.invoiceDate)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Due Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.dueDate)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <CreditCard className="h-4 w-4 mr-1" />
                  Payment Terms
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.paymentTerms || 'Net 30'}</dd>
              </div>
            </dl>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment History</h2>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {payment.paymentNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(payment.paymentDate)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.paymentMethod}
                          {payment.reference && ` • ${payment.reference}`}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notes</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}