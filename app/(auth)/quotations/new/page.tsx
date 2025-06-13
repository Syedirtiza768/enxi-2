'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { QuotationFormClean } from '@/components/quotations/quotation-form-clean'

function NewQuotationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const salesCaseId = searchParams.get('salesCaseId')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push('/quotations')}
          className="flex items-center hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Quotations
        </button>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold">New Quotation</h1>
        <p className="text-gray-600 mt-1">Create a professional quotation for your customer</p>
      </div>

      {/* Form */}
      <QuotationFormClean salesCaseId={salesCaseId} />
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