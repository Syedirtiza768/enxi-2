'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, Package, AlertTriangle, Plus, Minus, 
  Calendar, MapPin, CreditCard, Truck, FileText
} from 'lucide-react'

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<FormData>({
    customerPO: '',
    requestedDate: '',
    promisedDate: '',
    paymentTerms: '',
    shippingTerms: '',
    shippingAddress: '',
    billingAddress: '',
    notes: '',
    items: []
  })

  // Fetch sales order details
  useEffect(() => {
    const fetchOrder = async () => {
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
        setOrder(data)

        // Initialize form data
        setFormData({
          customerPO: data.customerPO || '',
          requestedDate: data.requestedDate ? data.requestedDate.split('T')[0] : '',
          promisedDate: data.promisedDate ? data.promisedDate.split('T')[0] : '',
          paymentTerms: data.paymentTerms || '',
          shippingTerms: data.shippingTerms || '',
          shippingAddress: data.shippingAddress || '',
          billingAddress: data.billingAddress || '',
          notes: data.notes || '',
          items: data.items || []
        })
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleItemChange = (index: number, field: keyof SalesOrderItem, value: string | number) => {
    const updatedItems = [...formData.items]
    const item = { ...updatedItems[index] }
    
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'taxRate') {
      item[field] = typeof value === 'string' ? parseFloat(value) || 0 : value
    } else {
      item[field] = value as string
    }

    // Recalculate totals for this item
    const quantity = item.quantity
    const unitPrice = item.unitPrice
    const discountPercent = item.discount
    const taxPercent = item.taxRate

    const subtotal = quantity * unitPrice
    const discountAmount = subtotal * (discountPercent / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (taxPercent / 100)
    const totalAmount = afterDiscount + taxAmount

    item.subtotal = subtotal
    item.discountAmount = discountAmount
    item.taxAmount = taxAmount
    item.totalAmount = totalAmount

    updatedItems[index] = item
    setFormData(prev => ({ ...prev, items: updatedItems }))
  }

  const addItem = () => {
    const newItem: SalesOrderItem = {
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0
    }
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) {
      setErrors(prev => ({ ...prev, items: 'At least one item is required' }))
      return
    }
    
    const updatedItems = formData.items.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, items: updatedItems }))
    
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: '' }))
    }
  }

  const calculateOrderTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0)
    const discountAmount = formData.items.reduce((sum, item) => sum + item.discountAmount, 0)
    const taxAmount = formData.items.reduce((sum, item) => sum + item.taxAmount, 0)
    const totalAmount = subtotal - discountAmount + taxAmount

    return { subtotal, discountAmount, taxAmount, totalAmount }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.customerPO.trim()) {
      newErrors.customerPO = 'Customer PO is required'
    }

    if (formData.requestedDate && formData.promisedDate) {
      const requestedDate = new Date(formData.requestedDate)
      const promisedDate = new Date(formData.promisedDate)
      
      if (promisedDate < requestedDate) {
        newErrors.promisedDate = 'Promised date cannot be before requested date'
      }
    }

    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required'
    }

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.itemCode.trim()) {
        newErrors[`item_${index}_itemCode`] = 'Item code is required'
      }
      if (!item.description.trim()) {
        newErrors[`item_${index}_description`] = 'Description is required'
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
      }
      if (item.unitPrice < 0) {
        newErrors[`item_${index}_unitPrice`] = 'Unit price cannot be negative'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)

      const totals = calculateOrderTotals()
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
      setErrors({
        submit: `Failed to update sales order: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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
  if (!['DRAFT', 'CONFIRMED'].includes(order.status)) {
    return (
      <div className="text-center py-12">
        <div className="text-yellow-500 mb-4">
          <AlertTriangle className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Cannot edit order with status: {order.status}
        </h3>
        <p className="text-gray-600 mb-4">Only DRAFT and CONFIRMED orders can be edited</p>
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

  const totals = calculateOrderTotals()

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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information (Read-only) */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <input
                    type="text"
                    value={order.salesCase.customer.name}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="text"
                    value={order.salesCase.customer.email}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="customerPO" className="block text-sm font-medium text-gray-700">
                    Customer PO
                  </label>
                  <input
                    type="text"
                    id="customerPO"
                    name="customerPO"
                    value={formData.customerPO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.customerPO && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerPO}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    id="paymentTerms"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Net 30 days"
                  />
                </div>

                <div>
                  <label htmlFor="requestedDate" className="block text-sm font-medium text-gray-700">
                    Requested Date
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="date"
                      id="requestedDate"
                      name="requestedDate"
                      value={formData.requestedDate}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="promisedDate" className="block text-sm font-medium text-gray-700">
                    Promised Date
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="date"
                      id="promisedDate"
                      name="promisedDate"
                      value={formData.promisedDate}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.promisedDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.promisedDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="shippingTerms" className="block text-sm font-medium text-gray-700">
                    Shipping Terms
                  </label>
                  <input
                    type="text"
                    id="shippingTerms"
                    name="shippingTerms"
                    value={formData.shippingTerms}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="FOB Origin"
                  />
                </div>
              </div>

              {/* Addresses */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                    Shipping Address
                  </label>
                  <textarea
                    id="shippingAddress"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700">
                    Billing Address
                  </label>
                  <textarea
                    id="billingAddress"
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Order Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </button>
              </div>

              {errors.items && (
                <p className="mb-4 text-sm text-red-600">{errors.items}</p>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-sm font-medium text-gray-900">Item {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Remove item"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                      <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Item Code</label>
                        <input
                          type="text"
                          value={item.itemCode}
                          onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-label="Item Code"
                        />
                        {errors[`item_${index}_itemCode`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_itemCode`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-label="Description"
                        />
                        {errors[`item_${index}_description`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_description`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="0"
                          step="1"
                          className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-label="Quantity"
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          min="0"
                          step="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-label="Unit Price"
                        />
                        {errors[`item_${index}_unitPrice`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_unitPrice`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total</label>
                        <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                          {formatCurrency(item.totalAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Subtotal</dt>
                  <dd className="text-gray-900">{formatCurrency(totals.subtotal)}</dd>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Discount</dt>
                    <dd className="text-red-600">-{formatCurrency(totals.discountAmount)}</dd>
                  </div>
                )}
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Tax</dt>
                    <dd className="text-gray-900">{formatCurrency(totals.taxAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                  <dt className="text-gray-900">Total</dt>
                  <dd className="text-gray-900">{formatCurrency(totals.totalAmount)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.push(`/sales-orders/${orderId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}