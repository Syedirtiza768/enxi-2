'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { apiClient } from '@/lib/api/client'

function NewInvoiceContent() {
  const searchParams = useSearchParams()
  const fromSalesOrder = searchParams.get('fromSalesOrder')
  const fromQuotation = searchParams.get('fromQuotation')

  const handleSubmit = async (invoiceData: Record<string, unknown>) => {
    try {
      const response = await apiClient('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData)
      })

      if (!response.ok) {
        throw new Error('Failed to create invoice')
      }

      const invoiceId = response.data?.data?.id || response.data?.id
      
      // Navigate to the new invoice detail page
      window.location.href = `/invoices/${invoiceId}`
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCancel = () => {
    window.location.href = '/invoices'
  }

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
      </div>

      {/* Form */}
      <InvoiceForm
        fromSalesOrder={fromSalesOrder || undefined}
        fromQuotation={fromQuotation || undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  )
}