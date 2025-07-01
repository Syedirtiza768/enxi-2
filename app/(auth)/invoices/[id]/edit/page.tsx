'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { InvoiceFormEnhanced } from '@/components/invoices/invoice-form-enhanced'
import { apiClient } from '@/lib/api/client'

interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  salesOrderId?: string
  type: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA'
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  invoiceDate: string
  dueDate: string
  paymentTerms?: string
  billingAddress?: string
  notes?: string
  internalNotes?: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  items: any[]
  lines?: any[]
}

interface EditInvoicePageProps {
  params: Promise<{ id: string }>
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const invoiceId = resolvedParams.id
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await apiClient(`/api/invoices/${invoiceId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch invoice')
        }

        const invoiceData = response.data?.data || response.data
        setInvoice(invoiceData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice')
        console.error('Error fetching invoice:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId])

  const handleSubmit = async (invoiceData: Record<string, unknown>) => {
    try {
      const response = await apiClient(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify(invoiceData)
      })

      if (!response.ok) {
        throw new Error('Failed to update invoice')
      }
      
      // Navigate back to the invoice detail page
      router.push(`/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Failed to update invoice')
    }
  }

  const handleCancel = () => {
    router.push(`/invoices/${invoiceId}`)
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

  // Only allow editing draft invoices
  if (invoice.status !== 'DRAFT') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Only draft invoices can be edited.</p>
          <button
            onClick={() => router.push(`/invoices/${invoiceId}`)}
            className="mt-2 text-yellow-600 hover:text-yellow-800 text-sm font-medium"
          >
            Back to Invoice
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push(`/invoices/${invoiceId}`)}
          className="flex items-center hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Invoice
        </button>
      </div>

      {/* Form */}
      <InvoiceFormEnhanced
        invoice={invoice}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}