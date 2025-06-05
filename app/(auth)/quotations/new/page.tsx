'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { QuotationForm } from '@/components/quotations/quotation-form'
import { apiClient } from '@/lib/api/client'

interface QuotationFormData {
  salesCaseId: string
  validUntil: string
  paymentTerms: string
  deliveryTerms?: string
  notes: string
  internalNotes?: string
  items: Array<{
    itemCode: string
    description: string
    quantity: number
    unitPrice: number
    discount?: number
    taxRate?: number
  }>
}

export default function NewQuotationPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars

  const handleSubmit = async (quotationData: QuotationFormData) => {
    try {
      const response = await apiClient('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(quotationData)
      })

      if (!response.ok) {
        throw new Error('Failed to create quotation')
      }

      const result = response.data?.data || response.data
      
      // Navigate to the new quotation detail page
      router.push(`/quotations/${result.id}`)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCancel = () => {
    router.push('/quotations')
  }

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
      </div>

      {/* Form */}
      <QuotationForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        autoSave={true}
      />
    </div>
  )
}