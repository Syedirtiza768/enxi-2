'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Edit, Send, FileText, Trash2, DollarSign, Download } from 'lucide-react'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { PaymentForm } from '@/components/payments/payment-form'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    id: string
    name: string
    email: string
  }
  salesOrder?: {
    id: string
    orderNumber: string
  }
  type: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA'
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  invoiceDate: string
  dueDate: string
  paymentTerms: string
  billingAddress: string
  notes: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  createdAt: string
  items: Array<{
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
  }>
  payments?: Array<{
    id: string
    paymentNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
    reference: string
  }>
}

export default function InvoiceDetailPage() {
  
  const { formatCurrency } = useCurrency()
const params = useParams()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Fetch invoice details
  const fetchInvoice = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient<{ data: any[] }>(`/api/invoices/${invoiceId}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load invoice')
      }

      setInvoice(response.data?.data || response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice')
      console.error('Error fetching invoice:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId])

  const handleUpdate = async (invoiceData: Record<string, unknown>) => {
    try {
      const response = await apiClient<{ data: any[] }>(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify(invoiceData)
      })

      if (!response.ok) {
        throw new Error('Failed to update invoice')
      }

      setInvoice(response.data?.data || response.data)
      setMode('view')
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSend = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: any[] }>(`/api/invoices/${invoiceId}/send`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to send invoice')
      }

      setInvoice(response.data?.data || response.data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleRecordPayment = () => {
    setShowPaymentModal(true)
  }

  const handleDownloadPDF = async (): Promise<void> => {
    // TODO: Implement PDF download
    console.warn('Download PDF functionality coming soon')
  }

  const handleDelete = async (): Promise<void> => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return
    }

    try {
      const response = await apiClient(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete invoice')
      }

      window.location.href = '/invoices'
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      DRAFT: { text: 'Draft', className: 'bg-gray-100 text-gray-800' },
      SENT: { text: 'Sent', className: 'bg-blue-100 text-blue-800' },
      VIEWED: { text: 'Viewed', className: 'bg-indigo-100 text-indigo-800' },
      PARTIAL: { text: 'Partial', className: 'bg-yellow-100 text-yellow-800' },
      PAID: { text: 'Paid', className: 'bg-green-100 text-green-800' },
      OVERDUE: { text: 'Overdue', className: 'bg-red-100 text-red-800' },
      CANCELLED: { text: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
      REFUNDED: { text: 'Refunded', className: 'bg-purple-100 text-purple-800' }
    } as const

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
        {config.text}
      </span>
    )
  }

  // formatCurrency function removed - use useCurrency hook instead

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <FileText className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Invoice not found'}
        </h3>
        <button
          onClick={() => window.location.href = '/invoices'}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </button>
      </div>
    )
  }

  // Edit mode
  if (mode === 'edit') {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => window.location.href = '/invoices'}
            className="flex items-center hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Invoices
          </button>
          <span>/</span>
          <button
            onClick={() => setMode('view')}
            className="hover:text-gray-900"
          >
            {invoice.invoiceNumber}
          </button>
          <span>/</span>
          <span className="text-gray-900">Edit</span>
        </div>

        {/* Form */}
        <InvoiceForm
          invoice={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.customer.id,
            salesOrderId: invoice.salesOrder?.id,
            type: invoice.type,
            status: invoice.status,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            paymentTerms: invoice.paymentTerms,
            billingAddress: invoice.billingAddress,
            notes: invoice.notes,
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            discountAmount: invoice.discountAmount,
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount,
            balanceAmount: invoice.balanceAmount,
            items: invoice.items
          }}
          onSubmit={handleUpdate}
          onCancel={() => setMode('view')}
        />
      </div>
    )
  }

  // View mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <button
              onClick={() => window.location.href = '/invoices'}
              className="flex items-center hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Invoices
            </button>
            <span>/</span>
            <span className="text-gray-900">{invoice.invoiceNumber}</span>
          </div>

          {/* Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {invoice.type === 'CREDIT_NOTE' ? 'Credit Note' : 
               invoice.type === 'DEBIT_NOTE' ? 'Debit Note' :
               invoice.type === 'PROFORMA' ? 'Proforma Invoice' :
               'Invoice'} {invoice.invoiceNumber}
            </h1>
            {getStatusBadge(invoice.status)}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            <span>Customer: {invoice.customer.name}</span>
            <span className="mx-2">•</span>
            <span>Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {invoice.status === 'DRAFT' && (
            <>
              <button
                onClick={handleSend}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </button>
              
              <button
                onClick={() => setMode('edit')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            </>
          )}

          {invoice.balanceAmount > 0 && invoice.status !== 'DRAFT' && (
            <button
              onClick={handleRecordPayment}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>

          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleDelete}
              className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white rounded-lg border p-8">
        {/* Invoice Header */}
        <div className="flex justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {invoice.type === 'CREDIT_NOTE' ? 'CREDIT NOTE' : 
               invoice.type === 'DEBIT_NOTE' ? 'DEBIT NOTE' :
               invoice.type === 'PROFORMA' ? 'PROFORMA INVOICE' :
               'INVOICE'}
            </h2>
            <p className="text-lg text-gray-600 mt-1">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Invoice Date</p>
            <p className="text-lg font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600 mt-2">Due Date</p>
            <p className="text-lg font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Billing Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Bill To</h3>
            <p className="font-medium text-gray-900">{invoice.customer.name}</p>
            <p className="text-gray-600 whitespace-pre-line">{invoice.billingAddress}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Payment Terms</h3>
            <p className="text-gray-900">{invoice.paymentTerms}</p>
            {invoice.salesOrder && (
              <>
                <h3 className="text-sm font-medium text-gray-600 mb-2 mt-4">Sales Order</h3>
                <p className="text-gray-900">{invoice.salesOrder.orderNumber}</p>
              </>
            )}
          </div>
        </div>

        {/* Invoice Items */}
        <table className="w-full mb-8">
          <thead className="border-b-2 border-gray-300">
            <tr>
              <th className="text-left py-2 text-sm font-medium text-gray-600">Item</th>
              <th className="text-left py-2 text-sm font-medium text-gray-600">Description</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Qty</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Unit Price</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Discount</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Tax</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id || index} className="border-b border-gray-200">
                <td className="py-2 text-sm">{item.itemCode || '-'}</td>
                <td className="py-2 text-sm">{item.description}</td>
                <td className="py-2 text-sm text-right">{item.quantity}</td>
                <td className="py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-sm text-right">{item.discount}%</td>
                <td className="py-2 text-sm text-right">{item.taxRate}%</td>
                <td className="py-2 text-sm text-right font-medium">{formatCurrency(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-sm font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Discount</span>
                <span className="text-sm font-medium">-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Tax</span>
              <span className="text-sm font-medium">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between py-3 border-b-2 border-gray-300">
              <span className="text-base font-medium">Total</span>
              <span className="text-base font-bold">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">Paid</span>
                  <span className="text-sm font-medium">-{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between py-3 border-t">
                  <span className="text-base font-medium">Balance Due</span>
                  <span className="text-base font-bold text-red-600">{formatCurrency(invoice.balanceAmount)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Payment #</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Method</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Reference</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-2 text-sm">{payment.paymentNumber}</td>
                    <td className="py-2 text-sm">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td className="py-2 text-sm">{payment.paymentMethod}</td>
                    <td className="py-2 text-sm">{payment.reference || '-'}</td>
                    <td className="py-2 text-sm text-right font-medium">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <PaymentForm
              invoiceId={invoice.id}
              customerId={invoice.customer.id}
              invoiceNumber={invoice.invoiceNumber}
              customerName={invoice.customer.name}
              totalAmount={invoice.totalAmount}
              balanceAmount={invoice.balanceAmount}
              onSuccess={() => {
                setShowPaymentModal(false)
                // Refresh invoice data to show updated payment
                fetchInvoice()
              }}
              onCancel={() => setShowPaymentModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}