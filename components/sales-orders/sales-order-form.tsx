'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  ArrowLeft, Package, AlertTriangle, Plus, Minus, 
  Calendar, MapPin, CreditCard, Truck, CheckCircle, Info, AlertCircle, CheckCircle2
} from 'lucide-react'
import { useCurrency } from '@/lib/contexts/currency-context'
import { useDebounce } from '@/lib/hooks/use-debounce'
import {
  validateRequired,
  checkMaxLength,
  validatePercentage,
  validateCurrency as validateCurrencyAmount,
  MAX_ADDRESS_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_CODE_LENGTH
} from '@/lib/validators/common.validator'

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
  availableQuantity?: number
  itemId?: string
}

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  creditLimit?: number
  billingAddress?: string
  shippingAddress?: string
}

interface SalesCase {
  id: string
  caseNumber: string
  title: string
  customer: Customer
}

interface SalesOrder {
  id: string
  orderNumber: string
  salesCase: SalesCase
  quotation?: {
    id: string
    quotationNumber: string
  } | null
  status: string
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

interface SalesOrderFormProps {
  order: SalesOrder
  onSubmit: (data: FormData) => Promise<void>
  onCancel: () => void
  mode?: 'edit' | 'view'
}

// Common payment terms
const PAYMENT_TERMS = [
  'Net 30 days',
  'Net 60 days',
  'Net 90 days',
  'Due on Receipt',
  '2/10 Net 30',
  '50% Advance, 50% on Delivery',
  'Letter of Credit',
  'Cash on Delivery'
]

// Common shipping terms
const SHIPPING_TERMS = [
  'FOB Origin',
  'FOB Destination',
  'CIF (Cost, Insurance, and Freight)',
  'DDP (Delivered Duty Paid)',
  'EXW (Ex Works)',
  'FCA (Free Carrier)',
  'CPT (Carriage Paid To)',
  'DAP (Delivered at Place)'
]

export function SalesOrderForm({ order, onSubmit, onCancel, mode = 'edit' }: SalesOrderFormProps) {
  const { formatCurrency } = useCurrency()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<Record<string, string>>({})
  const [fieldStatus, setFieldStatus] = useState<Record<string, 'checking' | 'valid' | 'error'>>({})
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [checkingOrderNumber, setCheckingOrderNumber] = useState(false)
  const [creditCheckResult, setCreditCheckResult] = useState<{
    available: number
    used: number
    limit: number
  } | null>(null)
  const [approvalRequired, setApprovalRequired] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    customerPO: order.customerPO || '',
    requestedDate: order.requestedDate ? order.requestedDate.split('T')[0] : '',
    promisedDate: order.promisedDate ? order.promisedDate.split('T')[0] : '',
    paymentTerms: order.paymentTerms || '',
    shippingTerms: order.shippingTerms || '',
    shippingAddress: order.shippingAddress || order.salesCase.customer.shippingAddress || '',
    billingAddress: order.billingAddress || order.salesCase.customer.billingAddress || '',
    notes: order.notes || '',
    items: order.items || []
  })

  // Debounce customer PO for duplicate checking
  const debouncedCustomerPO = useDebounce(formData.customerPO, 500)

  const calculateOrderTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0)
    const discountAmount = formData.items.reduce((sum, item) => sum + item.discountAmount, 0)
    const taxAmount = formData.items.reduce((sum, item) => sum + item.taxAmount, 0)
    const totalAmount = subtotal - discountAmount + taxAmount

    return { subtotal, discountAmount, taxAmount, totalAmount }
  }

  // Check credit limit on mount and when total changes
  useEffect(() => {
    checkCreditLimit()
  }, [order.salesCase.customer.id, calculateOrderTotals().totalAmount])

  // Check inventory availability when items change
  useEffect(() => {
    if (formData.items.length > 0) {
      checkInventoryAvailability()
    }
  }, [formData.items])

  // Check for duplicate customer PO
  const checkDuplicateCustomerPO = useCallback(async (customerPO: string) => {
    if (!customerPO || customerPO === order.customerPO) return
    
    setCheckingOrderNumber(true)
    setFieldStatus(prev => ({ ...prev, customerPO: 'checking' }))
    
    try {
      const response = await fetch(`/api/sales-orders?customerPO=${encodeURIComponent(customerPO)}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          const duplicate = data.find((so: any) => 
            so.customerPO === customerPO && so.id !== order.id
          )
          if (duplicate) {
            setErrors(prev => ({ ...prev, customerPO: 'This customer PO already exists' }))
            setFieldStatus(prev => ({ ...prev, customerPO: 'error' }))
          } else {
            setFieldStatus(prev => ({ ...prev, customerPO: 'valid' }))
            if (errors.customerPO === 'This customer PO already exists') {
              setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors.customerPO
                return newErrors
              })
            }
          }
        } else {
          setFieldStatus(prev => ({ ...prev, customerPO: 'valid' }))
        }
      }
    } catch (error) {
      console.error('Error checking customer PO:', error)
    } finally {
      setCheckingOrderNumber(false)
    }
  }, [order.customerPO, order.id, errors.customerPO])

  // Run duplicate check when debounced customer PO changes
  useEffect(() => {
    if (debouncedCustomerPO) {
      checkDuplicateCustomerPO(debouncedCustomerPO)
    }
  }, [debouncedCustomerPO, checkDuplicateCustomerPO])

  const checkCreditLimit = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/customers/${order.salesCase.customer.id}/credit-limit`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setCreditCheckResult(data)
        
        const totals = calculateOrderTotals()
        const availableCredit = data.limit - data.used
        
        if (totals.totalAmount > availableCredit) {
          setWarnings(prev => ({
            ...prev,
            credit: `Order amount exceeds available credit limit. Available: ${formatCurrency(availableCredit)}`
          }))
          setApprovalRequired(true)
        } else {
          setWarnings(prev => {
            const { credit, ...rest } = prev
            return rest
          })
          // Check if order amount requires approval based on other business rules
          if (totals.totalAmount > 50000) { // Example threshold
            setApprovalRequired(true)
            setWarnings(prev => ({
              ...prev,
              approval: 'Order amount exceeds approval threshold'
            }))
          } else {
            setApprovalRequired(false)
            setWarnings(prev => {
              const { approval, ...rest } = prev
              return rest
            })
          }
        }
      }
    } catch (error) {
      console.error('Error checking credit limit:', error)
    }
  }

  const checkInventoryAvailability = async (): Promise<boolean> => {
    try {
      setInventoryLoading(true)
      const itemIds = formData.items
        .filter(item => item.itemId)
        .map(item => item.itemId)
      
      if (itemIds.length === 0) return
      
      const response = await fetch('/api/inventory/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemIds })
      })
      
      if (response.ok) {
        const availability = await response.json()
        const updatedItems = formData.items.map(item => {
          if (item.itemId && availability[item.itemId]) {
            return {
              ...item,
              availableQuantity: availability[item.itemId].available
            }
          }
          return item
        })
        
        setFormData(prev => ({ ...prev, items: updatedItems }))
        
        // Check for stock warnings
        updatedItems.forEach((item, index) => {
          if (item.availableQuantity !== undefined && item.quantity > item.availableQuantity) {
            setWarnings(prev => ({
              ...prev,
              [`item_${index}_stock`]: `Only ${item.availableQuantity} units available in stock`
            }))
          } else {
            setWarnings(prev => {
              const { [`item_${index}_stock`]: _, ...rest } = prev
              return rest
            })
          }
        })
      }
    } catch (error) {
      console.error('Error checking inventory:', error)
    } finally {
      setInventoryLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Real-time validation
    let error: string | null = null
    let warning: string | null = null
    
    switch (name) {
      case 'customerPO':
        error = validateCustomerPO(value)
        break
      
      case 'requestedDate':
      case 'promisedDate':
        const { error: dateError, warning: dateWarning } = validateDates(
          name === 'requestedDate' ? value : formData.requestedDate,
          name === 'promisedDate' ? value : formData.promisedDate
        )
        error = dateError
        warning = dateWarning
        break
      
      case 'paymentTerms':
        error = validateRequired(value, 'Payment terms')
        break
      
      case 'shippingTerms':
        error = validateRequired(value, 'Shipping terms')
        break
      
      case 'shippingAddress':
        if (value) {
          error = checkMaxLength(value, MAX_ADDRESS_LENGTH, 'Shipping address')
          if (!error) {
            const { error: addrError, warning: addrWarning } = validateAddress(value, 'shipping')
            error = addrError
            warning = addrWarning
          }
        }
        break
      
      case 'billingAddress':
        if (value) {
          error = checkMaxLength(value, MAX_ADDRESS_LENGTH, 'Billing address')
          if (!error) {
            const { error: addrError, warning: addrWarning } = validateAddress(value, 'billing')
            error = addrError
            warning = addrWarning
          }
        }
        break
      
      case 'notes':
        if (value) {
          error = checkMaxLength(value, MAX_NOTES_LENGTH, 'Notes')
        }
        break
    }
    
    // Update errors
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }))
      setFieldStatus(prev => ({ ...prev, [name]: 'error' }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
      if (name !== 'customerPO' || value === order.customerPO) {
        setFieldStatus(prev => ({ ...prev, [name]: 'valid' }))
      }
    }
    
    // Update warnings
    if (warning) {
      setWarnings(prev => ({ ...prev, [name]: warning }))
    } else {
      setWarnings(prev => {
        const newWarnings = { ...prev }
        delete newWarnings[name]
        return newWarnings
      })
    }
  }

  const validateCustomerPO = (value: string): string | null => {
    if (!value.trim()) {
      return 'Customer PO is required'
    }
    
    // Check max length
    const lengthError = checkMaxLength(value, MAX_CODE_LENGTH, 'Customer PO')
    if (lengthError) return lengthError
    
    // Check PO format (alphanumeric with optional dashes/underscores)
    const poFormat = /^[A-Za-z0-9-_]+$/
    if (!poFormat.test(value)) {
      return 'Customer PO must be alphanumeric (dashes and underscores allowed)'
    }
    
    return null
  }

  const validateDates = (requestedDate: string, promisedDate: string): { error: string | null, warning: string | null } => {
    let error: string | null = null
    let warning: string | null = null
    
    if (requestedDate && promisedDate) {
      const requested = new Date(requestedDate)
      const promised = new Date(promisedDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (requested < today) {
        warning = 'Requested date is in the past'
      }
      
      if (promised < requested) {
        error = 'Promised date cannot be before requested date'
      }
    }
    
    return { error, warning }
  }

  const validateAddress = (address: string, type: 'shipping' | 'billing'): { error: string | null, warning: string | null } => {
    if (!address.trim()) return { error: null, warning: null } // Optional field
    
    // Basic address validation - should contain at least street and city/country
    const lines = address.trim().split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return {
        error: null,
        warning: `${type === 'shipping' ? 'Shipping' : 'Billing'} address should include at least street and city/country`
      }
    }
    
    return { error: null, warning: null }
  }

  const handleItemChange = (index: number, field: keyof SalesOrderItem, value: string | number) => {
    const updatedItems = [...formData.items]
    const item = { ...updatedItems[index] }
    
    let error: string | null = null
    
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'taxRate') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
      
      // Validation for numeric fields
      switch (field) {
        case 'quantity':
          if (numValue <= 0) {
            error = 'Quantity must be greater than 0'
          } else if (!Number.isInteger(numValue)) {
            error = 'Quantity must be a whole number'
          }
          break
        
        case 'unitPrice':
          error = validateCurrencyAmount(numValue)
          if (!error && numValue < 0) {
            error = 'Unit price cannot be negative'
          }
          break
        
        case 'discount':
          error = validatePercentage(numValue)
          break
        
        case 'taxRate':
          error = validatePercentage(numValue)
          break
      }
      
      if (error) {
        setErrors(prev => ({ 
          ...prev, 
          [`item_${index}_${field}`]: error 
        }))
        setFieldStatus(prev => ({ ...prev, [`item_${index}_${field}`]: 'error' }))
        return
      } else {
        setFieldStatus(prev => ({ ...prev, [`item_${index}_${field}`]: 'valid' }))
      }
      
      item[field] = numValue
    } else {
      // String field validation
      switch (field) {
        case 'itemCode':
          error = validateRequired(value as string, 'Item code')
          if (!error) {
            error = checkMaxLength(value as string, MAX_CODE_LENGTH, 'Item code')
          }
          break
        
        case 'description':
          error = validateRequired(value as string, 'Description')
          if (!error) {
            error = checkMaxLength(value as string, 255, 'Description')
          }
          break
      }
      
      if (error) {
        setErrors(prev => ({ 
          ...prev, 
          [`item_${index}_${field}`]: error 
        }))
        setFieldStatus(prev => ({ ...prev, [`item_${index}_${field}`]: 'error' }))
      } else {
        setFieldStatus(prev => ({ ...prev, [`item_${index}_${field}`]: 'valid' }))
      }
      
      item[field] = value as string
    }

    // Clear field-specific errors
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`item_${index}_${field}`]
      return newErrors
    })

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
    
    // Clear item-specific errors and warnings
    setErrors(prev => {
      const newErrors = { ...prev }
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`item_${index}_`)) {
          delete newErrors[key]
        }
      })
      delete newErrors.items
      return newErrors
    })
    
    setWarnings(prev => {
      const newWarnings = { ...prev }
      Object.keys(newWarnings).forEach(key => {
        if (key.startsWith(`item_${index}_`)) {
          delete newWarnings[key]
        }
      })
      return newWarnings
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const newWarnings: Record<string, string> = {}

    // Customer PO validation
    const customerPOError = validateCustomerPO(formData.customerPO)
    if (customerPOError) {
      newErrors.customerPO = customerPOError
    }
    
    // Check for duplicate customer PO error
    if (fieldStatus.customerPO === 'error' && errors.customerPO) {
      newErrors.customerPO = errors.customerPO
    }

    // Date validation
    const { error: dateError, warning: dateWarning } = validateDates(formData.requestedDate, formData.promisedDate)
    if (dateError) {
      newErrors.promisedDate = dateError
    }
    if (dateWarning) {
      newWarnings.requestedDate = dateWarning
    }

    // Payment terms validation
    const paymentTermsError = validateRequired(formData.paymentTerms, 'Payment terms')
    if (paymentTermsError) {
      newErrors.paymentTerms = paymentTermsError
    }

    // Shipping terms validation
    const shippingTermsError = validateRequired(formData.shippingTerms, 'Shipping terms')
    if (shippingTermsError) {
      newErrors.shippingTerms = shippingTermsError
    }

    // Address validation
    if (formData.shippingAddress) {
      const lengthError = checkMaxLength(formData.shippingAddress, MAX_ADDRESS_LENGTH, 'Shipping address')
      if (lengthError) {
        newErrors.shippingAddress = lengthError
      } else {
        const { warning } = validateAddress(formData.shippingAddress, 'shipping')
        if (warning) {
          newWarnings.shippingAddress = warning
        }
      }
    }

    if (formData.billingAddress) {
      const lengthError = checkMaxLength(formData.billingAddress, MAX_ADDRESS_LENGTH, 'Billing address')
      if (lengthError) {
        newErrors.billingAddress = lengthError
      } else {
        const { warning } = validateAddress(formData.billingAddress, 'billing')
        if (warning) {
          newWarnings.billingAddress = warning
        }
      }
    }

    // Notes validation
    if (formData.notes) {
      const notesError = checkMaxLength(formData.notes, MAX_NOTES_LENGTH, 'Notes')
      if (notesError) {
        newErrors.notes = notesError
      }
    }

    // Items validation
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required'
    }

    // Validate each item
    formData.items.forEach((item, index) => {
      // Item code
      const itemCodeError = validateRequired(item.itemCode, 'Item code') || 
                           checkMaxLength(item.itemCode, MAX_CODE_LENGTH, 'Item code')
      if (itemCodeError) {
        newErrors[`item_${index}_itemCode`] = itemCodeError
      }
      
      // Description
      const descError = validateRequired(item.description, 'Description') ||
                       checkMaxLength(item.description, 255, 'Description')
      if (descError) {
        newErrors[`item_${index}_description`] = descError
      }
      
      // Quantity
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
      } else if (!Number.isInteger(item.quantity)) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be a whole number'
      }
      
      // Unit price
      const priceError = validateCurrencyAmount(item.unitPrice)
      if (priceError) {
        newErrors[`item_${index}_unitPrice`] = priceError
      } else if (item.unitPrice < 0) {
        newErrors[`item_${index}_unitPrice`] = 'Unit price cannot be negative'
      }
      
      // Discount
      const discountError = validatePercentage(item.discount)
      if (discountError) {
        newErrors[`item_${index}_discount`] = discountError
      }
      
      // Tax rate
      const taxError = validatePercentage(item.taxRate)
      if (taxError) {
        newErrors[`item_${index}_taxRate`] = taxError
      }
    })

    setErrors(newErrors)
    setWarnings(prev => ({ ...prev, ...newWarnings }))
    
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.text-red-600')
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    // Show warning dialog if there are warnings
    if (Object.keys(warnings).length > 0) {
      const warningMessages = Object.values(warnings).join('\n')
      if (!confirm(`Please review the following warnings:\n\n${warningMessages}\n\nDo you want to continue?`)) {
        return
      }
    }

    setSaving(true)
    try {
      await onSubmit(formData)
    } finally {
      setSaving(false)
    }
  }

  const totals = calculateOrderTotals()
  const isViewMode = mode === 'view'

  return (
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
              {creditCheckResult && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Credit Status</label>
                  <div className="mt-1 flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Limit:</span>
                      <span className="ml-1 font-medium">{formatCurrency(creditCheckResult.limit)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Used:</span>
                      <span className="ml-1 font-medium">{formatCurrency(creditCheckResult.used)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Available:</span>
                      <span className={`ml-1 font-medium ${creditCheckResult.available < totals.totalAmount ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(creditCheckResult.available)}
                      </span>
                    </div>
                  </div>
                  {warnings.credit && (
                    <p className="mt-1 text-sm text-orange-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {warnings.credit}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative">
                <label htmlFor="customerPO" className="block text-sm font-medium text-gray-700">
                  Customer PO <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="customerPO"
                    name="customerPO"
                    value={formData.customerPO}
                    onChange={handleInputChange}
                    disabled={isViewMode || checkingOrderNumber}
                    className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
                      errors.customerPO ? 'border-red-300' : ''
                    } ${isViewMode ? 'bg-gray-50' : ''}`}
                    placeholder="PO-2024-001"
                    maxLength={MAX_CODE_LENGTH}
                  />
                  {fieldStatus.customerPO === 'checking' && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                  {fieldStatus.customerPO === 'valid' && (
                    <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                  {fieldStatus.customerPO === 'error' && errors.customerPO && (
                    <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                  )}
                </div>
                {errors.customerPO && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.customerPO}
                  </p>
                )}
              </div>

              <div className="relative">
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="paymentTerms"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
                      errors.paymentTerms ? 'border-red-300' : ''
                    } ${isViewMode ? 'bg-gray-50' : ''}`}
                  >
                    <option value="">Select payment terms</option>
                    {PAYMENT_TERMS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                  {fieldStatus.paymentTerms === 'valid' && (
                    <CheckCircle2 className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                  )}
                </div>
                {errors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.paymentTerms}
                  </p>
                )}
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
                    disabled={isViewMode}
                    className={`block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                      isViewMode ? 'bg-gray-50' : ''
                    }`}
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {warnings.requestedDate && (
                  <p className="mt-1 text-sm text-orange-600 flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    {warnings.requestedDate}
                  </p>
                )}
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
                    disabled={isViewMode}
                    className={`block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                      errors.promisedDate ? 'border-red-300' : ''
                    } ${isViewMode ? 'bg-gray-50' : ''}`}
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.promisedDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.promisedDate}</p>
                )}
              </div>

              <div className="sm:col-span-2 relative">
                <label htmlFor="shippingTerms" className="block text-sm font-medium text-gray-700">
                  Shipping Terms <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="shippingTerms"
                    name="shippingTerms"
                    value={formData.shippingTerms}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
                      errors.shippingTerms ? 'border-red-300' : ''
                    } ${isViewMode ? 'bg-gray-50' : ''}`}
                  >
                    <option value="">Select shipping terms</option>
                    {SHIPPING_TERMS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                  {fieldStatus.shippingTerms === 'valid' && (
                    <CheckCircle2 className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                  )}
                </div>
                {errors.shippingTerms && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.shippingTerms}
                  </p>
                )}
              </div>
            </div>

            {/* Addresses */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative">
                <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                  Shipping Address
                </label>
                <div className="relative">
                  <textarea
                    id="shippingAddress"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    rows={3}
                    className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
                      errors.shippingAddress ? 'border-red-300' : ''
                    } ${isViewMode ? 'bg-gray-50' : ''}`}
                    placeholder="Street address&#10;City, State ZIP&#10;Country"
                    maxLength={MAX_ADDRESS_LENGTH}
                  />
                  {fieldStatus.shippingAddress === 'valid' && formData.shippingAddress && (
                    <CheckCircle2 className="absolute right-2 top-8 h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex justify-between mt-1">
                  <div>
                    {errors.shippingAddress && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.shippingAddress}
                      </p>
                    )}
                    {!errors.shippingAddress && warnings.shippingAddress && (
                      <p className="text-sm text-orange-600 flex items-center">
                        <Info className="h-4 w-4 mr-1" />
                        {warnings.shippingAddress}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formData.shippingAddress?.length || 0}/{MAX_ADDRESS_LENGTH}
                  </span>
                </div>
              </div>

              <div className="relative">
                <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700">
                  Billing Address
                </label>
                <div className="relative">
                  <textarea
                    id="billingAddress"
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    rows={3}
                    className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
                      errors.billingAddress ? 'border-red-300' : ''
                    } ${isViewMode ? 'bg-gray-50' : ''}`}
                    placeholder="Street address&#10;City, State ZIP&#10;Country"
                    maxLength={MAX_ADDRESS_LENGTH}
                  />
                  {fieldStatus.billingAddress === 'valid' && formData.billingAddress && (
                    <CheckCircle2 className="absolute right-2 top-8 h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex justify-between mt-1">
                  <div>
                    {errors.billingAddress && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.billingAddress}
                      </p>
                    )}
                    {!errors.billingAddress && warnings.billingAddress && (
                      <p className="text-sm text-orange-600 flex items-center">
                        <Info className="h-4 w-4 mr-1" />
                        {warnings.billingAddress}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formData.billingAddress?.length || 0}/{MAX_ADDRESS_LENGTH}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6 relative">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <div className="relative">
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  rows={3}
                  className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
                    errors.notes ? 'border-red-300' : ''
                  } ${isViewMode ? 'bg-gray-50' : ''}`}
                  placeholder="Additional notes or special instructions..."
                  maxLength={MAX_NOTES_LENGTH}
                />
                {fieldStatus.notes === 'valid' && formData.notes && (
                  <CheckCircle2 className="absolute right-2 top-8 h-5 w-5 text-green-500" />
                )}
              </div>
              <div className="flex justify-between mt-1">
                <div>
                  {errors.notes && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.notes}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {formData.notes?.length || 0}/{MAX_NOTES_LENGTH}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Order Items</h2>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </button>
              )}
            </div>

            {errors.items && (
              <p className="mb-4 text-sm text-red-600">{errors.items}</p>
            )}

            {inventoryLoading && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800 flex items-center">
                  <Package className="h-4 w-4 mr-2 animate-pulse" />
                  Checking inventory availability...
                </p>
              </div>
            )}

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-medium text-gray-900">Item {index + 1}</h3>
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Remove item"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Item Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)}
                        disabled={isViewMode}
                        className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors[`item_${index}_itemCode`] ? 'border-red-300' : ''
                        } ${isViewMode ? 'bg-gray-50' : ''}`}
                        placeholder="ITEM001"
                      />
                      {errors[`item_${index}_itemCode`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_itemCode`]}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        disabled={isViewMode}
                        className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors[`item_${index}_description`] ? 'border-red-300' : ''
                        } ${isViewMode ? 'bg-gray-50' : ''}`}
                        placeholder="Item description"
                      />
                      {errors[`item_${index}_description`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_description`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        disabled={isViewMode}
                        min="0"
                        step="1"
                        className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors[`item_${index}_quantity`] ? 'border-red-300' : ''
                        } ${isViewMode ? 'bg-gray-50' : ''}`}
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_quantity`]}</p>
                      )}
                      {item.availableQuantity !== undefined && (
                        <p className={`mt-1 text-xs ${
                          item.quantity > item.availableQuantity ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          Available: {item.availableQuantity}
                        </p>
                      )}
                      {warnings[`item_${index}_stock`] && (
                        <p className="mt-1 text-xs text-orange-600 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {warnings[`item_${index}_stock`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        disabled={isViewMode}
                        min="0"
                        step="0.01"
                        className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors[`item_${index}_unitPrice`] ? 'border-red-300' : ''
                        } ${isViewMode ? 'bg-gray-50' : ''}`}
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
                        disabled={isViewMode}
                        min="0"
                        max="100"
                        step="0.01"
                        className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors[`item_${index}_discount`] ? 'border-red-300' : ''
                        } ${isViewMode ? 'bg-gray-50' : ''}`}
                      />
                      {errors[`item_${index}_discount`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_discount`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                        disabled={isViewMode}
                        min="0"
                        max="100"
                        step="0.01"
                        className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors[`item_${index}_taxRate`] ? 'border-red-300' : ''
                        } ${isViewMode ? 'bg-gray-50' : ''}`}
                      />
                      {errors[`item_${index}_taxRate`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_taxRate`]}</p>
                      )}
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

          {/* Approval Requirements */}
          {approvalRequired && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-amber-800">Approval Required</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>This order requires approval for the following reasons:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {warnings.credit && (
                        <li>Credit limit exceeded</li>
                      )}
                      {warnings.approval && (
                        <li>Order amount exceeds threshold</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Status</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  order.status === 'DRAFT' ? 'bg-gray-100' : 'bg-green-100'
                }`}>
                  {order.status === 'DRAFT' ? (
                    <Package className="h-5 w-5 text-gray-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Draft</p>
                  <p className="text-xs text-gray-500">Order created</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) 
                    ? 'bg-green-100' 
                    : 'bg-gray-100'
                }`}>
                  {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Approved</p>
                  <p className="text-xs text-gray-500">Pending approval</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) 
                    ? 'bg-green-100' 
                    : 'bg-gray-100'
                }`}>
                  {['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) ? (
                    <Package className="h-5 w-5 text-green-600" />
                  ) : (
                    <Package className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Processing</p>
                  <p className="text-xs text-gray-500">Order fulfillment</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  ['SHIPPED', 'DELIVERED'].includes(order.status) 
                    ? 'bg-green-100' 
                    : 'bg-gray-100'
                }`}>
                  {['SHIPPED', 'DELIVERED'].includes(order.status) ? (
                    <Truck className="h-5 w-5 text-green-600" />
                  ) : (
                    <Truck className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Shipped</p>
                  <p className="text-xs text-gray-500">In transit</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  order.status === 'DELIVERED' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {order.status === 'DELIVERED' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Delivered</p>
                  <p className="text-xs text-gray-500">Order complete</p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Summary */}
          {(Object.keys(errors).length > 0 || Object.keys(warnings).length > 0) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Validation Summary</h2>
              
              {Object.keys(errors).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-red-600 mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Errors ({Object.keys(errors).length})
                  </h3>
                  <ul className="space-y-1">
                    {Object.entries(errors).map(([key, message]) => (
                      <li key={key} className="text-xs text-red-600">• {message}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {Object.keys(warnings).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-orange-600 mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Warnings ({Object.keys(warnings).length})
                  </h3>
                  <ul className="space-y-1">
                    {Object.entries(warnings).map(([key, message]) => (
                      <li key={key} className="text-xs text-orange-600">• {message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Actions */}
      {!isViewMode && (
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || checkingOrderNumber || Object.keys(errors).length > 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : checkingOrderNumber ? 'Checking...' : 'Save Changes'}
          </button>
        </div>
      )}
    </form>
  )
}