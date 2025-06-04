'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { apiClient } from '@/lib/api/client'

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSalesOrder = searchParams.get('fromSalesOrder')
  const fromQuotation = searchParams.get('fromQuotation')

  const handleSubmit = async (invoiceData: any) => {
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
      router.push(`/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      throw error // Re-throw to let form handle error display
    }
  }

  const handleCancel = () => {
    router.push('/invoices')
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push('/invoices')}
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