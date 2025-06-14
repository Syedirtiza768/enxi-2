'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react'
import { SalesOrderForm } from '@/components/sales-orders/sales-order-form'

interface SalesOrderItem {
  id?: string
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface SalesOrder {
  id: string
  orderNumber: string
  salesCase: {
    id: string
    caseNumber: string
    title: string
    customer: {
      id: string
      name: string
      email: string
      phone?: string
      address?: string
      creditLimit?: number
      billingAddress?: string
      shippingAddress?: string
    }
  }
  quotation?: {
    id: string
    quotationNumber: string
  } | null
  status: 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  customerPO?: string
  requestedDate?: string
  promisedDate?: string
  paymentTerms?: string
  shippingTerms?: string
  shippingAddress?: string
  billingAddress?: string
  notes?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  items: SalesOrderItem[]
  createdAt: string
  updatedAt: string
}

interface FormData {
  customerPO: string
  requestedDate: string
  promisedDate: string
  paymentTerms: string
  shippingTerms: string
  shippingAddress: string
  billingAddress: string
  notes: string
  items: SalesOrderItem[]
}

export default function SalesOrderEditPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch sales order details
  useEffect(() => {
    const fetchOrder = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/sales-orders/${orderId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Sales order not found')
          }
          throw new Error('Failed to load sales order')
        }

        const data = await response.json()
        // Ensure customer has required fields for the form
        if (data.salesCase && data.salesCase.customer) {
          data.salesCase.customer.creditLimit = data.salesCase.customer.creditLimit || 0
          data.salesCase.customer.billingAddress = data.salesCase.customer.billingAddress || ''
          data.salesCase.customer.shippingAddress = data.salesCase.customer.shippingAddress || ''
        }
        setOrder(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales order')
        console.error('Error fetching sales order:', err)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const handleSubmit = async (formData: FormData) => {
    try {
      const totals = calculateOrderTotals(formData.items)
      const updateData = {
        customerPO: formData.customerPO,
        requestedDate: formData.requestedDate ? new Date(formData.requestedDate).toISOString() : undefined,
        promisedDate: formData.promisedDate ? new Date(formData.promisedDate).toISOString() : undefined,
        paymentTerms: formData.paymentTerms,
        shippingTerms: formData.shippingTerms,
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.billingAddress,
        notes: formData.notes,
        items: formData.items,
        ...totals
      }

      const response = await fetch(`/api/sales-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update sales order')
      }

      // Navigate back to order detail
      router.push(`/sales-orders/${orderId}`)
    } catch (error) {
      console.error('Error updating sales order:', error)
      alert(error instanceof Error ? error.message : 'Failed to update sales order')
      throw error
    }
  }

  const calculateOrderTotals = (items: SalesOrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0)
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0)
    const totalAmount = subtotal - discountAmount + taxAmount

    return { subtotal, discountAmount, taxAmount, totalAmount }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading sales order...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <Package className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Sales order not found'}
        </h3>
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

  // Check if order can be edited
  if (!['DRAFT', 'CONFIRMED', 'PENDING'].includes(order.status)) {
    return (
      <div className="text-center py-12">
        <div className="text-yellow-500 mb-4">
          <AlertTriangle className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Cannot edit order with status: {order.status}
        </h3>
        <p className="text-gray-600 mb-4">Only DRAFT, PENDING and CONFIRMED orders can be edited</p>
        <button
          onClick={() => router.push(`/sales-orders/${orderId}`)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Order
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
            onClick={() => router.push('/sales-orders')}
            className="flex items-center hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Sales Orders
          </button>
          <span>/</span>
          <button
            onClick={() => router.push(`/sales-orders/${orderId}`)}
            className="hover:text-gray-900"
          >
            {order.orderNumber}
          </button>
          <span>/</span>
          <span className="text-gray-900">Edit</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900">
          Edit Sales Order {order.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Modify order details and items
        </p>
      </div>

      {/* Sales Order Form */}
      <SalesOrderForm
        order={order}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/sales-orders/${orderId}`)}
        mode="edit"
      />

    </div>
  )
}