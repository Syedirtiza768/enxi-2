'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { InvoiceFormEnhanced } from '@/components/invoices/invoice-form-enhanced'
import { apiClient } from '@/lib/api/client'

function NewInvoiceContent() {
  const searchParams = useSearchParams()
  const fromSalesOrder = searchParams.get('fromSalesOrder')
  const fromQuotation = searchParams.get('fromQuotation')

  const handleSubmit = async (invoiceData: Record<string, unknown>) => {
    try {
      console.log('Submitting invoice:', invoiceData)
      
      let response
      
      // If creating from quotation, use the dedicated endpoint
      if (fromQuotation) {
        console.log('Creating invoice from quotation:', fromQuotation)
        
        // Extract only the fields needed for the quotation endpoint
        const quotationInvoiceData = {
          dueDate: invoiceData.dueDate,
          paymentTerms: invoiceData.paymentTerms,
          billingAddress: invoiceData.billingAddress,
          notes: invoiceData.notes,
          internalNotes: invoiceData.internalNotes
        }
        
        response = await apiClient(`/api/quotations/${fromQuotation}/create-invoice`, {
          method: 'POST',
          body: JSON.stringify(quotationInvoiceData)
        })
      } else {
        // First test with test endpoint for regular invoice creation
        const testResponse = await apiClient('/api/invoices/test', {
          method: 'POST',
          body: JSON.stringify(invoiceData)
        })
        
        console.log('Test endpoint response:', testResponse)
        
        if (!testResponse.ok) {
          console.error('Test validation failed:', testResponse.data)
          // Continue to real endpoint anyway to see the actual error
        } else {
          console.log('Test validation passed. Data structure looks good:', testResponse.data)
        }
        
        response = await apiClient('/api/invoices', {
          method: 'POST',
          body: JSON.stringify(invoiceData)
        })
      }

      console.log('Invoice API response:', response)

      if (!response.ok) {
        const errorData = response.data || response
        console.error('Invoice creation failed:', errorData)
        
        // Extract error message
        let errorMessage = 'Failed to create invoice'
        if (errorData?.details) {
          // If there are validation details, show them
          console.error('Validation errors:', errorData.details)
          if (Array.isArray(errorData.details)) {
            errorMessage = 'Validation errors:\n' + errorData.details.map((err: any) => 
              typeof err === 'object' ? `${err.path?.join('.')}: ${err.message}` : err
            ).join('\n')
          } else {
            errorMessage = JSON.stringify(errorData.details)
          }
        } else if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.error) {
          errorMessage = errorData.error
        }
        
        throw new Error(errorMessage)
      }

      const responseData = response?.data
      const invoiceId = responseData && typeof responseData === 'object' && 'data' in responseData 
        ? responseData.data.id 
        : (responseData as { id: string }).id
      
      // Navigate to the new invoice detail page
      window.location.href = `/invoices/${invoiceId}`
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Failed to create invoice')
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
      <InvoiceFormEnhanced
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