'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Send, FileText, Trash2, Copy, CheckCircle, XCircle, Eye, EyeOff, Printer, Download } from 'lucide-react'
import { QuotationForm } from '@/components/quotations/quotation-form'
import { apiClient } from '@/lib/api/client'

interface QuotationItem {
  id: string
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount?: number
  taxRate?: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface Quotation {
  id: string
  quotationNumber: string
  salesCase: {
    id: string
    caseNumber: string
    customer: {
      id: string
      name: string
      email: string
    }
  }
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  validUntil: string
  paymentTerms: string
  deliveryTerms?: string
  notes: string
  internalNotes?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  createdAt: string
  items: QuotationItem[]
}

export default function QuotationDetailPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const quotationId = params.id as string

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [viewMode, setViewMode] = useState<'internal' | 'client'>('internal')

  // Fetch quotation details
  useEffect(() => {
    const fetchQuotation = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient<{ data: Quotation }>(`/api/quotations/${quotationId}?view=${viewMode}`, {
          method: 'GET'
        })

        if (!response.ok) {
          throw new Error('Failed to load quotation')
        }

        const quotationData = response?.data?.data || response?.data
        setQuotation(quotationData as Quotation)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quotation')
        console.error('Error fetching quotation:', err)
      } finally {
        setLoading(false)
      }
    }

    if (quotationId) {
      fetchQuotation()
    }
  }, [quotationId, viewMode])

  const handleUpdate = async (quotationData: Partial<Quotation>) => {
    try {
      const response = await apiClient<{ data: any[] }>(`/api/quotations/${quotationId}`, {
        method: 'PUT',
        body: JSON.stringify(quotationData)
      })

      if (!response.ok) {
        throw new Error('Failed to update quotation')
      }

      // After successful update, refresh the quotation with the current view mode
      const refreshResponse = await apiClient<{ data: Quotation }>(`/api/quotations/${quotationId}?view=${viewMode}`, {
        method: 'GET'
      })

      if (refreshResponse.ok) {
        const quotationData = refreshResponse?.data?.data || refreshResponse?.data
        setQuotation(quotationData as Quotation)
      }
      
      setMode('view')
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSend = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: any[] }>(`/api/quotations/${quotationId}/send`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to send quotation')
      }

      // Refresh with current view mode
      const refreshResponse = await apiClient<{ data: Quotation }>(`/api/quotations/${quotationId}?view=${viewMode}`, {
        method: 'GET'
      })

      if (refreshResponse.ok) {
        const quotationData = refreshResponse?.data?.data || refreshResponse?.data
        setQuotation(quotationData as Quotation)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDuplicate = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: any[] }>(`/api/quotations/${quotationId}/duplicate`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate quotation')
      }

      const result = response?.data?.data || response?.data
      router.push(`/quotations/${result.id}`)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!confirm('Are you sure you want to delete this quotation?')) {
      return
    }

    try {
      const response = await apiClient(`/api/quotations/${quotationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete quotation')
      }

      router.push('/quotations')
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleAccept = async (): Promise<void> => {
    if (!confirm('Are you sure you want to accept this quotation? This will create a sales order.')) {
      return
    }

    try {
      const response = await apiClient<{ data: any[] }>(`/api/quotations/${quotationId}/accept`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to accept quotation')
      }

      const result = response?.data || response
      setQuotation(result.quotation || result)
      
      // If a sales order was created, show success message and redirect
      if (result.salesOrder) {
        alert(`Quotation accepted! Sales Order ${result.salesOrder.orderNumber} has been created.`)
        // Redirect to the sales order
        router.push(`/sales-orders/${result.salesOrder.id}`)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleReject = async (): Promise<void> => {
    const reason = prompt('Please provide a reason for rejecting this quotation:')
    if (!reason) {
      return
    }

    try {
      const response = await apiClient<{ data: any[] }>(`/api/quotations/${quotationId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to reject quotation')
      }

      setQuotation(response?.data || response)
      alert('Quotation has been rejected.')
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handlePrint = async () => {
    try {
      // Open PDF in new window for printing
      const pdfUrl = `/api/quotations/${quotationId}/pdf?view=${viewMode}`
      window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error('Error opening PDF:', error)
      alert('Failed to open PDF for printing')
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}/pdf?view=${viewMode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quotation?.quotationNumber || 'quotation'}-${viewMode}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF')
    }
  }

  const getStatusBadge = (status: Quotation['status']) => {
    const statusConfig = {
      DRAFT: { text: 'Draft', className: 'bg-gray-100 text-gray-800' },
      SENT: { text: 'Sent', className: 'bg-blue-100 text-blue-800' },
      ACCEPTED: { text: 'Accepted', className: 'bg-green-100 text-green-800' },
      REJECTED: { text: 'Rejected', className: 'bg-red-100 text-red-800' },
      EXPIRED: { text: 'Expired', className: 'bg-red-100 text-red-800' }
    } as const

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !quotation) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <FileText className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Quotation not found'}
        </h3>
        <button
          onClick={() => router.push('/quotations')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotations
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
            onClick={() => router.push('/quotations')}
            className="flex items-center hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Quotations
          </button>
          <span>/</span>
          <button
            onClick={() => setMode('view')}
            className="hover:text-gray-900"
          >
            {quotation.quotationNumber}
          </button>
          <span>/</span>
          <span className="text-gray-900">Edit</span>
        </div>

        {/* Form */}
        <QuotationForm
          quotation={{
            id: quotation.id,
            number: quotation.quotationNumber,
            salesCaseId: quotation.salesCase.id,
            validUntil: quotation.validUntil,
            paymentTerms: quotation.paymentTerms,
            deliveryTerms: quotation.deliveryTerms,
            notes: quotation.notes,
            internalNotes: quotation.internalNotes,
            status: quotation.status,
            subtotal: quotation.subtotal,
            discountAmount: quotation.discountAmount,
            taxAmount: quotation.taxAmount,
            totalAmount: quotation.totalAmount,
            items: quotation.items
          }}
          onSubmit={handleUpdate}
          onCancel={() => setMode('view')}
          mode="edit"
          autoSave={true}
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
              onClick={() => router.push('/quotations')}
              className="flex items-center hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Quotations
            </button>
            <span>/</span>
            <span className="text-gray-900">{quotation.quotationNumber}</span>
          </div>

          {/* Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Quotation {quotation.quotationNumber}
            </h1>
            {getStatusBadge(quotation.status)}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            <span>Created on {new Date(quotation.createdAt).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>Valid until {new Date(quotation.validUntil).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>Total: {formatCurrency(quotation.totalAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'internal' ? 'client' : 'internal')}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            title={viewMode === 'internal' ? 'Switch to Client View' : 'Switch to Internal View'}
          >
            {viewMode === 'internal' ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Internal View
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Client View
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            title="Print quotation"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            title="Download PDF"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>

          {quotation.status === 'DRAFT' && (
            <button
              onClick={handleSend}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Quotation
            </button>
          )}
          
          {quotation.status === 'SENT' && (
            <>
              <button
                onClick={() => router.push(`/customer-pos/new?quotationId=${quotationId}`)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Record Customer PO
              </button>
              
              <button
                onClick={handleAccept}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Quotation
              </button>
              
              <button
                onClick={handleReject}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Quotation
              </button>
            </>
          )}
          
          {quotation.status === 'ACCEPTED' && (
            <button
              onClick={() => router.push(`/invoices/new?fromQuotation=${quotationId}`)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Invoice
            </button>
          )}
          
          {(quotation.status === 'DRAFT' || quotation.status === 'SENT') && (
            <button
              onClick={() => setMode('edit')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}

          <div className="relative">
            <button
              onClick={handleDuplicate}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </button>
          </div>

          {quotation.status !== 'ACCEPTED' && (
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

      {/* Content */}
      <QuotationForm
        quotation={{
          id: quotation.id,
          number: quotation.quotationNumber,
          salesCaseId: quotation.salesCase.id,
          validUntil: quotation.validUntil,
          paymentTerms: quotation.paymentTerms,
          deliveryTerms: quotation.deliveryTerms,
          notes: quotation.notes,
          internalNotes: quotation.internalNotes,
          status: quotation.status,
          subtotal: quotation.subtotal,
          discountAmount: quotation.discountAmount,
          taxAmount: quotation.taxAmount,
          totalAmount: quotation.totalAmount,
          items: quotation.items,
          lines: (quotation as any).lines // For client view
        }}
        onSubmit={handleUpdate}
        onCancel={() => {}}
        mode="preview"
        viewMode={viewMode}
      />
    </div>
  )
}