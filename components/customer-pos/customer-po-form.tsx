'use client'

import React, { useState, useEffect } from 'react'
import { Upload, X, Calendar, FileText, AlertTriangle, Search } from 'lucide-react'
import { useCurrency } from '@/lib/contexts/currency-context'
import { apiClient } from '@/lib/api/client'
import { SUPPORTED_CURRENCIES } from '@/lib/validators/common.validator'

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

interface Customer {
  id: string
  name: string
  email: string
}

interface CustomerPOFormData {
  poNumber: string
  customerId: string
  quotationId?: string
  poDate: string
  poAmount: number
  currency: string
  attachmentUrl?: string
  notes?: string
}

interface CustomerPOFormProps {
  quotation?: Quotation
  onSubmit: (data: CustomerPOFormData) => Promise<void>
  onCancel: () => void
}

export default function CustomerPOForm({ quotation, onSubmit, onCancel }: CustomerPOFormProps): React.JSX.Element {
  const { formatCurrency, defaultCurrency } = useCurrency()
  const [formData, setFormData] = useState<CustomerPOFormData>({
    poNumber: '',
    customerId: quotation?.salesCase?.customer?.id || '',
    quotationId: quotation?.id,
    poDate: new Date().toISOString().split('T')[0],
    poAmount: quotation?.totalAmount || 0,
    currency: quotation?.currency || defaultCurrency || 'USD',
    attachmentUrl: undefined,
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string>('')
  const [amountWarning, setAmountWarning] = useState<string>('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    quotation?.salesCase?.customer || null
  )

  // Update customer info when quotation changes
  useEffect(() => {
    if (quotation) {
      setFormData(prev => ({
        ...prev,
        customerId: quotation?.salesCase?.customer?.id,
        quotationId: quotation.id,
        poAmount: quotation.totalAmount,
        currency: quotation.currency
      }))
      setSelectedCustomer(quotation.salesCase.customer)
    }
  }, [quotation])

  // Load customers if no quotation
  useEffect(() => {
    if (!quotation) {
      loadCustomers()
    }
  }, [quotation])

  const loadCustomers = async (): Promise<void> => {
    try {
      setLoadingCustomers(true)
      
      // Use fetch directly with credentials for better compatibility
      const response = await fetch('/api/customers', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        console.error('Failed to load customers:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      const customerList = data?.customers || data?.data || []
      
      if (Array.isArray(customerList)) {
        setCustomers(customerList)
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  // Validate PO amount against quotation
  useEffect(() => {
    if (quotation && formData.poAmount > 0) {
      const quotationAmount = quotation.totalAmount
      const poAmount = formData.poAmount
      const difference = Math.abs(poAmount - quotationAmount)
      const percentageDifference = (difference / quotationAmount) * 100

      if (percentageDifference > 5) {
        setAmountWarning(`PO amount differs significantly from quotation amount (${formatCurrency(quotationAmount)}). Difference: ${percentageDifference.toFixed(1)}%`)
      } else {
        setAmountWarning('')
      }
    }
  }, [formData.poAmount, quotation, formatCurrency])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'poAmount' ? parseFloat(value) || 0 : value
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only PDF, DOC, DOCX, and image files are allowed')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    setUploadedFile(file)
  }

  const removeFile = (): void => {
    setUploadedFile(null)
    setUploadError('')
    setFormData(prev => ({ ...prev, attachmentUrl: undefined }))
  }

  const generatePONumber = (): void => {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const poNumber = `PO-${year}-${randomNum}`
    
    setFormData(prev => ({ ...prev, poNumber }))
    
    if (errors.poNumber) {
      setErrors(prev => ({ ...prev, poNumber: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.poNumber.trim()) {
      newErrors.poNumber = 'PO Number is required'
    } else if (!/^PO-\d{4}-\d{3}$/.test(formData.poNumber)) {
      newErrors.poNumber = 'PO Number should be in format PO-YYYY-NNN'
    }

    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required'
    }

    if (!formData.poDate) {
      newErrors.poDate = 'PO Date is required'
    }

    if (!formData.poAmount || formData.poAmount <= 0) {
      newErrors.poAmount = 'PO Amount is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('File upload failed')
    }

    const result = await response.json()
    return result.url
  }

  const handleSubmit = async (e: React.FormEvent): void => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      let attachmentUrl = formData.attachmentUrl

      // Upload file if selected
      if (uploadedFile) {
        attachmentUrl = await uploadFile(uploadedFile)
      }

      await onSubmit({
        ...formData,
        attachmentUrl
      })
    } catch (error) {
      console.error('Error submitting PO:', error)
      alert(error instanceof Error ? error.message : 'Failed to create customer PO')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Customer Purchase Order</h2>
          <p className="mt-1 text-sm text-gray-600">Record a new customer purchase order</p>
        </div>

        {/* Quotation Info */}
        {quotation && (
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">From Quotation</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Quotation:</span>
                <span className="ml-2 font-medium">{quotation.quotationNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Sales Case:</span>
                <span className="ml-2 font-medium">{quotation.salesCase?.caseNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Customer:</span>
                <span className="ml-2 font-medium">{quotation.salesCase?.customer?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Amount:</span>
                <span className="ml-2 font-medium">{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* PO Number */}
          <div>
            <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700">
              PO Number
            </label>
            <div className="mt-1 flex">
              <input
                type="text"
                id="poNumber"
                name="poNumber"
                value={formData.poNumber}
                onChange={handleInputChange}
                className="flex-1 block w-full rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="PO-2024-001"
              />
              <button
                type="button"
                onClick={generatePONumber}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100"
              >
                Auto-generate
              </button>
            </div>
            {errors.poNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.poNumber}</p>
            )}
          </div>

          {/* Customer */}
          <div>
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
              Customer
            </label>
            {quotation ? (
              <input
                type="text"
                id="customer"
                value={quotation.salesCase.customer.name}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 sm:text-sm"
              />
            ) : (
              <div className="mt-1 relative">
                <select
                  id="customer"
                  name="customerId"
                  value={formData.customerId}
                  onChange={(e) => {
                    const customerId = e.target.value
                    setFormData(prev => ({ ...prev, customerId }))
                    const customer = customers.find(c => c.id === customerId)
                    setSelectedCustomer(customer || null)
                    if (errors.customerId) {
                      setErrors(prev => ({ ...prev, customerId: '' }))
                    }
                  }}
                  className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10"
                  disabled={loadingCustomers}
                >
                  <option value="">
                    {loadingCustomers ? 'Loading customers...' : 
                     customers.length === 0 ? 'No customers available' : 
                     'Select a customer'}
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.email ? `(${customer.email})` : ''}
                    </option>
                  ))}
                </select>
                {loadingCustomers && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400 animate-pulse" />
                  </div>
                )}
              </div>
            )}
            {errors.customerId && (
              <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>
            )}
          </div>

          {/* PO Date */}
          <div>
            <label htmlFor="poDate" className="block text-sm font-medium text-gray-700">
              PO Date
            </label>
            <div className="mt-1 relative">
              <input
                type="date"
                id="poDate"
                name="poDate"
                value={formData.poDate}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {errors.poDate && (
              <p className="mt-1 text-sm text-red-600">{errors.poDate}</p>
            )}
          </div>

          {/* PO Amount */}
          <div>
            <label htmlFor="poAmount" className="block text-sm font-medium text-gray-700">
              PO Amount
            </label>
            <div className="mt-1 relative">
              <input
                type="number"
                id="poAmount"
                name="poAmount"
                value={formData.poAmount}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="0.00"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                {getCurrencySymbol(formData.currency)}
              </span>
            </div>
            {errors.poAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.poAmount}</p>
            )}
            {amountWarning && (
              <div className="mt-1 flex items-start space-x-2 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{amountWarning}</p>
              </div>
            )}
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency} - {getCurrencyName(currency)}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label htmlFor="attachment" className="block text-sm font-medium text-gray-700">
              PO Attachment
            </label>
            <div className="mt-1">
              {!uploadedFile ? (
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="attachment"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="attachment"
                          name="attachment"
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, or images up to 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-900">{uploadedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {uploadError && (
                <p className="mt-1 text-sm text-red-600">{uploadError}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Additional notes about this PO..."
            />
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
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Recording PO...' : 'Record PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getCurrencyName(code: string): string {
  const currencyNames: Record<string, string> = {
    AED: 'UAE Dirham',
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    SAR: 'Saudi Riyal',
    QAR: 'Qatari Riyal',
    OMR: 'Omani Rial',
    KWD: 'Kuwaiti Dinar',
    BHD: 'Bahraini Dinar'
  }
  return currencyNames[code] || code
}

function getCurrencySymbol(code: string): string {
  const currencySymbols: Record<string, string> = {
    AED: 'AED',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    SAR: 'SAR',
    QAR: 'QAR',
    OMR: 'OMR',
    KWD: 'KWD',
    BHD: 'BHD'
  }
  return currencySymbols[code] || code
}