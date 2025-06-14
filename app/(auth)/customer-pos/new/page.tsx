'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import CustomerPOForm from '@/components/customer-pos/customer-po-form'

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
  totalAmount: number
  currency: string
}

function NewCustomerPOContent() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const searchParams = useSearchParams()
  const quotationId = searchParams.get('quotationId')

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(!!quotationId)
  const [error, setError] = useState<string | null>(null)

  // Fetch quotation if ID provided
  useEffect(() => {
    const fetchQuotation = async (): Promise<unknown> => {
      if (!quotationId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/quotations/${quotationId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to load quotation')
        }

        const data = await response.json()
        setQuotation(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quotation')
        console.error('Error fetching quotation:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuotation()
  }, [quotationId])

  const handleSubmit = async (data: {
    poNumber: string
    customerId: string
    quotationId?: string
    poDate: string
    poAmount: number
    currency: string
    attachmentUrl?: string
    notes?: string
  }) => {
    try {
      const response = await fetch('/api/customer-pos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create customer PO')
      }

      const result = await response.json()
      
      // Navigate to the created PO
      router.push(`/customer-pos/${result.id}`)
    } catch (error) {
      console.error('Error creating customer PO:', error)
      alert(error instanceof Error ? error.message : 'Failed to create customer PO')
    }
  }

  const handleCancel = () => {
    router.push('/customer-pos')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <ArrowLeft className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading quotation</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => router.push('/customer-pos')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customer POs
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
          <button
            onClick={() => router.push('/customer-pos')}
            className="flex items-center hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Customer POs
          </button>
          <span>/</span>
          <span className="text-gray-900">New</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900">
          {quotation ? 'Record Customer PO from Quotation' : 'Record New Customer PO'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {quotation 
            ? `Create a customer PO record for quotation ${quotation.quotationNumber}`
            : 'Record a new customer purchase order'
          }
        </p>
      </div>

      {/* Form */}
      <CustomerPOForm
        quotation={quotation || undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default function NewCustomerPOPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewCustomerPOContent />
    </Suspense>
  )
}