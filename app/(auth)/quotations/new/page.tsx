'use client'

import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { QuotationForm } from '@/components/quotations/quotation-form'
import { QuotationFormV2 } from '@/components/quotations/quotation-form-v2'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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

function NewQuotationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const salesCaseId = searchParams.get('salesCaseId')
  const [version, setVersion] = useState<'v1' | 'v2'>('v2')

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

      {/* Version Toggle - Remove this in production */}
      <div className="mb-6 flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <span className="text-sm font-medium">UI Version:</span>
        <ToggleGroup type="single" value={version} onValueChange={(v) => v && setVersion(v as 'v1' | 'v2')}>
          <ToggleGroupItem value="v1">Original</ToggleGroupItem>
          <ToggleGroupItem value="v2">Simplified</ToggleGroupItem>
        </ToggleGroup>
        <span className="text-xs text-gray-600 ml-4">
          (Testing improved UI - remove this toggle in production)
        </span>
      </div>

      {/* Form */}
      {version === 'v1' ? (
        <QuotationForm
          quotation={salesCaseId ? { salesCaseId } as any : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          autoSave={true}
        />
      ) : (
        <QuotationFormV2 />
      )}
    </div>
  )
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewQuotationContent />
    </Suspense>
  )
}