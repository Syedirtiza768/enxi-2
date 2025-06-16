'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Package } from 'lucide-react'
import { SalesOrderForm } from '@/components/sales-orders/sales-order-form'
import { CustomerSearch } from '@/components/customers/customer-search'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function NewSalesOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quotationId = searchParams.get('quotationId')
  const salesCaseId = searchParams.get('salesCaseId')
  const [quotationData, setQuotationData] = useState<any>(null)
  const [salesCaseData, setSalesCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerError, setCustomerError] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (quotationId) {
          // Fetch quotation data
          const response = await fetch(`/api/quotations/${quotationId}`, {
            credentials: 'include',
          })
          if (!response.ok) throw new Error('Failed to load quotation')
          const data = await response.json()
          setQuotationData(data)
          setSalesCaseData(data.salesCase)
        } else if (salesCaseId) {
          // Fetch sales case data
          const response = await fetch(`/api/sales-cases/${salesCaseId}`, {
            credentials: 'include',
          })
          if (!response.ok) throw new Error('Failed to load sales case')
          const data = await response.json()
          setSalesCaseData(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (quotationId || salesCaseId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [quotationId, salesCaseId])

  const handleCustomerChange = (customerId: string, customer?: any) => {
    setSelectedCustomerId(customerId)
    setSelectedCustomer(customer)
    setCustomerError('')
  }

  const handleSubmit = async (formData: any) => {
    // If no sales case, ensure customer is selected
    if (!salesCaseData && !salesCaseId && !selectedCustomerId) {
      setCustomerError('Please select a customer')
      return
    }

    try {
      const payload = {
        ...formData,
        quotationId,
        salesCaseId: salesCaseData?.id || salesCaseId,
        // If creating without sales case, we'll need to create one
        customerId: !salesCaseData && !salesCaseId ? selectedCustomerId : undefined,
      }

      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to create sales order')
      }

      const newOrder = await response.json()
      alert(`Sales order ${newOrder.orderNumber} created successfully!`)
      router.push(`/sales-orders/${newOrder.id}`)
    } catch (error) {
      console.error('Error creating sales order:', error)
      alert(error instanceof Error ? error.message : 'Failed to create sales order')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <Package className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
        <button
          onClick={() => router.push('/sales-orders')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sales Orders
        </button>
      </div>
    )
  }

  // Create a temporary order object for the form
  const tempOrder = {
    id: 'new',
    orderNumber: 'NEW',
    salesCase: salesCaseData || (selectedCustomer ? {
      id: '',
      caseNumber: '',
      title: '',
      customer: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone || '',
        address: selectedCustomer.address || '',
      }
    } : {
      id: '',
      caseNumber: '',
      title: '',
      customer: {
        id: '',
        name: '',
        email: '',
        phone: '',
        address: '',
      }
    }),
    quotation: quotationData ? {
      id: quotationData.id,
      quotationNumber: quotationData.quotationNumber
    } : null,
    status: 'PENDING',
    customerPO: '',
    requestedDate: '',
    promisedDate: '',
    paymentTerms: quotationData?.paymentTerms || '',
    shippingTerms: '',
    shippingAddress: salesCaseData?.customer?.address || '',
    billingAddress: salesCaseData?.customer?.address || '',
    notes: quotationData?.notes || '',
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    items: quotationData?.items?.map((item: any) => ({
      itemCode: item.itemCode,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      taxRate: item.taxRate || 0,
      subtotal: item.subtotal || 0,
      discountAmount: item.discountAmount || 0,
      taxAmount: item.taxAmount || 0,
      totalAmount: item.totalAmount || 0,
      itemId: item.itemId,
    })) || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push('/sales-orders')}
          className="flex items-center hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sales Orders
        </button>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold">New Sales Order</h1>
        <p className="text-gray-600 mt-1">
          {quotationId 
            ? `Creating order from quotation ${quotationData?.quotationNumber || ''}` 
            : salesCaseId
            ? `Creating order for sales case ${salesCaseData?.caseNumber || ''}`
            : 'Create a new sales order for your customer'}
        </p>
      </div>

      {/* Customer Selection - Show only when no sales case or quotation */}
      {!quotationId && !salesCaseId && (
        <Card>
          <CardHeader>
            <CardTitle>Select Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerSearch
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              required
              error={customerError}
            />
          </CardContent>
        </Card>
      )}

      {/* Form - Show only when customer is selected or we have sales case/quotation */}
      {(quotationId || salesCaseId || selectedCustomerId) && (
        <SalesOrderForm 
          order={tempOrder} 
          onSubmit={handleSubmit}
          onCancel={() => router.push('/sales-orders')}
          mode="edit"
        />
      )}
    </div>
  )
}

export default function NewSalesOrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewSalesOrderContent />
    </Suspense>
  )
}