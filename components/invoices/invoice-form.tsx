'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Save, X, FileText, Plus, Trash2, Calculator } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { TaxRateSelector } from '@/components/tax/tax-rate-selector'
import { useDefaultTaxRate } from '@/hooks/use-default-tax-rate'
import { TaxType } from '@/lib/types/shared-enums'

interface InvoiceItem {
  id?: string
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  taxRateId?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface QuotationItem {
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  taxRateId?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface Invoice {
  id?: string
  invoiceNumber?: string
  customerId: string
  salesOrderId?: string
  type: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA'
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  invoiceDate: string
  dueDate: string
  paymentTerms: string
  billingAddress: string
  notes: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  items: InvoiceItem[]
}

interface Customer {
  id: string
  name: string
  email: string
  address?: string
  currency?: string
}

interface SalesOrder {
  id: string
  orderNumber: string
  customerId: string
  customer: {
    name: string
  }
  status: string
  total: number
}

interface InventoryItem {
  id: string
  itemCode: string
  description: string
  unitPrice: number
}

interface InvoiceFormProps {
  invoice?: Invoice
  fromSalesOrder?: string
  fromQuotation?: string
  onSubmit: (invoice: Partial<Invoice>) => Promise<void>
  onCancel: () => void
}

export function InvoiceForm({ 
  invoice, 
  fromSalesOrder,
  fromQuotation,
  onSubmit, 
  onCancel 
}: InvoiceFormProps): React.JSX.Element {
  const { user: _user } = useAuth() // eslint-disable-line @typescript-eslint/no-unused-vars
  const { defaultRate } = useDefaultTaxRate()
  
  // Form state
  const [formData, setFormData] = useState<Partial<Invoice>>({
    customerId: invoice?.customerId || '',
    salesOrderId: invoice?.salesOrderId || fromSalesOrder || '',
    type: invoice?.type || 'SALES',
    status: invoice?.status || 'DRAFT',
    invoiceDate: invoice?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate || '',
    paymentTerms: invoice?.paymentTerms || 'Net 30',
    billingAddress: invoice?.billingAddress || '',
    notes: invoice?.notes || '',
    subtotal: invoice?.subtotal || 0,
    taxAmount: invoice?.taxAmount || 0,
    discountAmount: invoice?.discountAmount || 0,
    totalAmount: invoice?.totalAmount || 0,
    paidAmount: invoice?.paidAmount || 0,
    balanceAmount: invoice?.balanceAmount || 0,
    items: invoice?.items || [],
    ...(invoice?.id && { id: invoice.id }),
    ...(invoice?.invoiceNumber && { invoiceNumber: invoice.invoiceNumber })
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [_inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  // Load reference data
  useEffect(() => {
    const fetchReferenceData = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch customers
        const customersResponse = await apiClient('/api/customers', {
          method: 'GET'
        })
        if (customersResponse.ok) {
          const customersData = customersResponse.data?.data || customersResponse.data || []
          setCustomers(Array.isArray(customersData) ? customersData : [])
        }

        // Fetch sales orders
        const salesOrdersResponse = await apiClient('/api/sales-orders', {
          method: 'GET'
        })
        if (salesOrdersResponse.ok) {
          const salesOrdersData = salesOrdersResponse.data?.data || salesOrdersResponse.data || []
          setSalesOrders(Array.isArray(salesOrdersData) ? salesOrdersData : [])
        }

        // Fetch inventory items
        const itemsResponse = await apiClient('/api/inventory/items', {
          method: 'GET'
        })
        if (itemsResponse.ok) {
          const itemsData = itemsResponse.data?.data || itemsResponse.data || []
          setInventoryItems(Array.isArray(itemsData) ? itemsData : [])
        }

        // Load quotation data if creating from quotation
        if (fromQuotation) {
          const quotationResponse = await apiClient(`/api/quotations/${fromQuotation}`, {
            method: 'GET'
          })
          if (quotationResponse.ok) {
            const quotationData = quotationResponse.data?.data || quotationResponse.data
            if (quotationData) {
              // Calculate due date (30 days from today)
              const dueDate = new Date()
              dueDate.setDate(dueDate.getDate() + 30)
              
              // Pre-populate form with quotation data
              // Extract items from either direct items array or lines structure
              let quotationItems: QuotationItem[] = []
              if (quotationData.items && Array.isArray(quotationData.items)) {
                quotationItems = quotationData.items
              } else if (quotationData.lines && Array.isArray(quotationData.lines)) {
                // Extract items from lines structure (internal view)
                quotationItems = quotationData.lines.flatMap((line: any) => line.items || [])
              }
              
              setFormData(prev => ({
                ...prev,
                customerId: quotationData.salesCase?.customerId || '',
                paymentTerms: quotationData.paymentTerms || 'Net 30',
                dueDate: dueDate.toISOString().split('T')[0],
                notes: `Invoice created from quotation ${quotationData.quotationNumber}\n\n${quotationData.notes || ''}`,
                items: quotationItems.map((item: QuotationItem) => ({
                  itemCode: item.itemCode,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discount: item.discount || 0,
                  taxRate: item.taxRate || 0,
                  subtotal: item.subtotal,
                  discountAmount: item.discountAmount,
                  taxAmount: item.taxAmount,
                  totalAmount: item.totalAmount
                })),
                subtotal: quotationData.subtotal,
                discountAmount: quotationData.discountAmount,
                taxAmount: quotationData.taxAmount,
                totalAmount: quotationData.totalAmount,
                balanceAmount: quotationData.totalAmount
              }))
            }
          }
        }
        
      } catch (err) {
        setError('Failed to load form data')
        console.error('Error fetching reference data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReferenceData()
  }, [fromQuotation])

  // Auto-calculate due date based on payment terms
  useEffect(() => {
    if (formData.invoiceDate && formData.paymentTerms && !invoice) {
      const invoiceDate = new Date(formData.invoiceDate)
      let daysToAdd = 0
      
      if (formData.paymentTerms.includes('30')) {
        daysToAdd = 30
      } else if (formData.paymentTerms.includes('15')) {
        daysToAdd = 15
      } else if (formData.paymentTerms.includes('45')) {
        daysToAdd = 45
      } else if (formData.paymentTerms.includes('60')) {
        daysToAdd = 60
      }
      
      if (daysToAdd > 0) {
        invoiceDate.setDate(invoiceDate.getDate() + daysToAdd)
        setFormData(prev => ({
          ...prev,
          dueDate: invoiceDate.toISOString().split('T')[0]
        }))
      }
    }
  }, [formData.invoiceDate, formData.paymentTerms, invoice])

  // Calculate item totals
  const calculateItemTotal = useCallback((item: InvoiceItem): InvoiceItem => {
    const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
    const discountAmount = subtotal * (Number(item.discount || 0) / 100)
    const discountedAmount = subtotal - discountAmount
    const taxAmount = discountedAmount * (Number(item.taxRate || 0) / 100)
    const totalAmount = discountedAmount + taxAmount

    return {
      ...item,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    }
  }, [])

  // Calculate invoice totals
  const calculateInvoiceTotals = useCallback((items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0)
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0)
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0)
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      balanceAmount: totalAmount - (prev.paidAmount || 0)
    }))
  }, [])

  // Update form data
  const updateFormData = useCallback((updates: Partial<Invoice>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setValidationErrors({}) // Clear validation errors on change
  }, [])

  // Handle customer selection
  const handleCustomerChange = (customerId: string): void => {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      updateFormData({
        customerId,
        billingAddress: customer.address || ''
      })
    }
  }

  // Handle sales order selection
  const handleSalesOrderChange = async (salesOrderId: string): void => {
    if (!salesOrderId) {
      updateFormData({ salesOrderId: '' })
      return
    }

    const salesOrder = salesOrders.find(so => so.id === salesOrderId)
    if (salesOrder) {
      updateFormData({
        salesOrderId,
        customerId: salesOrder.customerId
      })
      
      // TODO: Load sales order items and convert to invoice items
    }
  }

  // Add new item
  const addItem = (): void => {
    const newItem: InvoiceItem = {
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: defaultRate?.rate || 0,
      taxRateId: defaultRate?.id,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0
    }
    
    const updatedItems = [...(formData.items || []), newItem]
    updateFormData({ items: updatedItems })
  }

  // Update item
  const updateItem = (index: number, updates: Partial<InvoiceItem>): void => {
    const items = [...(formData.items || [])]
    items[index] = calculateItemTotal({ ...items[index], ...updates })
    updateFormData({ items })
    calculateInvoiceTotals(items)
  }

  // Remove item
  const removeItem = (index: number): void => {
    const items = formData.items?.filter((_, i) => i !== index) || []
    updateFormData({ items })
    calculateInvoiceTotals(items)
  }

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.customerId) {
      errors.customerId = 'Customer is required'
    }

    if (!formData.invoiceDate) {
      errors.invoiceDate = 'Invoice date is required'
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required'
    } else if (formData.invoiceDate && formData.dueDate < formData.invoiceDate) {
      errors.dueDate = 'Due date must be after invoice date'
    }

    if (!formData.items || formData.items.length === 0) {
      errors.items = 'At least one invoice item is required'
    } else {
      // Validate each item
      let hasItemError = false
      formData.items.forEach((item, index) => {
        if (!item.description) {
          errors[`item_${index}_description`] = 'Description is required for all items'
          hasItemError = true
        }
        if (item.quantity <= 0) {
          errors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
          hasItemError = true
        }
        if (item.unitPrice <= 0) {
          errors[`item_${index}_unitPrice`] = 'Unit price must be greater than 0'
          hasItemError = true
        }
      })
      
      if (hasItemError && !errors.items) {
        errors.items = 'Please fix item errors'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (status: 'DRAFT' | 'SENT' = 'SENT'): void => {
    if (!validateForm()) return

    try {
      setSaving(true)
      setError(null)
      
      await onSubmit({
        ...formData,
        status
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice')
      console.error('Error saving invoice:', err)
    } finally {
      setSaving(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    const multiplier = formData.type === 'CREDIT_NOTE' ? -1 : 1
    const customer = customers.find(c => c.id === formData.customerId)
    const currency = customer?.currency || 'AED' // Use customer currency or fallback to AED
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount * multiplier))
    
    // Use English literal format
    const prefix = amount * multiplier < 0 ? '-' : ''
    return `${prefix}${currency} ${formattedAmount}`
  }

  // Get form title
  const getFormTitle = (): string => {
    const typeLabels = {
      SALES: 'Invoice',
      CREDIT_NOTE: 'Credit Note',
      DEBIT_NOTE: 'Debit Note',
      PROFORMA: 'Proforma Invoice'
    }
    
    const baseTitle = typeLabels[formData.type || 'SALES']
    
    if (fromSalesOrder) {
      return `Create ${baseTitle} from Sales Order`
    }
    
    return invoice ? `Edit ${baseTitle}` : `Create ${baseTitle}`
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{getFormTitle()}</h1>
          {invoice?.invoiceNumber && (
            <p className="mt-1 text-sm text-gray-600">
              Invoice #{invoice.invoiceNumber}
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div>
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  id="customer"
                  value={formData.customerId}
                  onChange={(e): void => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {validationErrors.customerId && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.customerId}</p>
                )}
              </div>

              {/* Invoice Type */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Type
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e): void => updateFormData({ type: e.target.value as Invoice['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="SALES">Sales Invoice</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="DEBIT_NOTE">Debit Note</option>
                  <option value="PROFORMA">Proforma Invoice</option>
                </select>
              </div>

              {/* Sales Order */}
              <div>
                <label htmlFor="salesOrder" className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Order (Optional)
                </label>
                <select
                  id="salesOrder"
                  value={formData.salesOrderId || ''}
                  onChange={(e): void => handleSalesOrderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No sales order</option>
                  {salesOrders.map(so => (
                    <option key={so.id} value={so.id}>
                      {so.orderNumber} - {so.customer?.name || 'Unknown Customer'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number (if editing) */}
              {invoice?.invoiceNumber && (
                <div>
                  <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    id="number"
                    value={invoice.invoiceNumber}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              )}

              {/* Invoice Date */}
              <div>
                <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  id="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={(e): void => updateFormData({ invoiceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {validationErrors.invoiceDate && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.invoiceDate}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e): void => updateFormData({ dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {validationErrors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.dueDate}</p>
                )}
              </div>

              {/* Payment Terms */}
              <div>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e): void => updateFormData({ paymentTerms: e.target.value })}
                  placeholder="e.g., Net 30, Net 15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="mt-4">
              <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Billing Address
              </label>
              <textarea
                id="billingAddress"
                rows={2}
                value={formData.billingAddress}
                onChange={(e): void => updateFormData({ billingAddress: e.target.value })}
                placeholder="Customer billing address..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e): void => updateFormData({ notes: e.target.value })}
                placeholder="Additional notes or comments for this invoice..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
              <button
                onClick={addItem}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>

            {validationErrors.items && (
              <p className="mb-4 text-sm text-red-600">{validationErrors.items}</p>
            )}

            <div className="space-y-4">
              {formData.items?.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-3">
                    {/* Item Code */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Item Code
                      </label>
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e): void => updateItem(index, { itemCode: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e): void => updateItem(index, { description: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                      {validationErrors[`item_${index}_description`] && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors[`item_${index}_description`]}</p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e): void => updateItem(index, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                        min="0"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                      {validationErrors[`item_${index}_quantity`] && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e): void => updateItem(index, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                      {validationErrors[`item_${index}_unitPrice`] && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors[`item_${index}_unitPrice`]}</p>
                      )}
                    </div>

                    {/* Discount */}
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e): void => updateItem(index, { discount: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Tax Rate */}
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tax
                      </label>
                      <TaxRateSelector
                        value={item.taxRateId}
                        onChange={(taxRateId, taxRate): void => {
                          updateItem(index, { 
                            taxRateId, 
                            taxRate 
                          })
                        }}
                        taxType={TaxType.SALES}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Select tax"
                      />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-end">
                      <button
                        onClick={(): void => removeItem(index)}
                        aria-label="Remove item"
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Item Totals */}
                  <div className="mt-2 flex items-center justify-end space-x-4 text-sm text-gray-600">
                    <span>Subtotal: {formatCurrency(item.subtotal)}</span>
                    {item.discountAmount > 0 && (
                      <span>Discount: -{formatCurrency(item.discountAmount)}</span>
                    )}
                    {item.taxAmount > 0 && (
                      <span>Tax: {formatCurrency(item.taxAmount)}</span>
                    )}
                    <span className="font-medium text-gray-900">Total: {formatCurrency(item.totalAmount)}</span>
                  </div>
                </div>
              ))}

              {(!formData.items || formData.items.length === 0) && (
                <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                  <Calculator className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
                  <p className="mt-1 text-sm text-gray-500">Add items to this invoice</p>
                  <button
                    onClick={addItem}
                    className="mt-4 inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium">{formatCurrency(formData.subtotal || 0)}</span>
              </div>
              {(formData.discountAmount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Discount</span>
                  <span className="text-sm font-medium">-{formatCurrency(formData.discountAmount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tax Amount</span>
                <span className="text-sm font-medium">{formatCurrency(formData.taxAmount || 0)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-medium text-gray-900">Total Amount</span>
                  <span className="text-base font-medium text-gray-900">
                    {formatCurrency(formData.totalAmount || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="space-y-3">
              <button
                onClick={(): void => handleSubmit('SENT')}
                disabled={saving}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {invoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
              
              <button
                onClick={(): void => handleSubmit('DRAFT')}
                disabled={saving}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Save as Draft
              </button>
              
              <button
                onClick={onCancel}
                disabled={saving}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}