'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Save, X, FileText, Clock, Edit3, CheckCircle, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { LineItemEditorV2 } from './line-item-editor-v2'
import { ClientQuotationView } from './client-quotation-view'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient, type ApiResponse } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { 
  validatePaymentTerms, 
  validateValidUntilDate,
  validateItemCode,
  validateDescription,
  validateQuantity,
  validatePrice,
  validateDiscount,
  validateTaxRate,
  validateMargin,
  MAX_PAYMENT_TERMS_LENGTH,
  MAX_DELIVERY_TERMS_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_ITEM_CODE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LINE_DESCRIPTION_LENGTH
} from '@/lib/validators/quotation.validator'
import { checkMaxLength } from '@/lib/validators/common.validator'

interface QuotationItem {
  id: string
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  sortOrder: number
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string // Link to inventory item
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount?: number
  taxRate?: number
  taxRateId?: string
  unitOfMeasureId?: string
  availabilityStatus?: string
  availableQuantity?: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface Quotation {
  id?: string
  number?: string
  quotationNumber?: string
  salesCaseId: string
  validUntil: string | Date
  paymentTerms: string
  deliveryTerms?: string | null
  notes: string | null
  internalNotes?: string | null
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  items: QuotationItem[]
  createdBy?: string
  approvedBy?: string | null
  approvedAt?: string | Date | null
  rejectedBy?: string | null
  rejectedAt?: string | Date | null
  expiredAt?: string | Date | null
  rejectionReason?: string | null
  createdAt?: Date
  updatedAt?: Date
}

interface SalesCase {
  id: string
  caseNumber: string
  customer: {
    id: string
    name: string
    email: string
  }
  description: string
  status: string
}

interface QuotationFormProps {
  quotation?: Quotation & { lines?: any[] }
  onSubmit: (quotation: Quotation) => Promise<void>
  onCancel: () => void
  mode?: 'create' | 'edit' | 'preview'
  autoSave?: boolean
  viewMode?: 'internal' | 'client'
}

export function QuotationForm({ 
  quotation, 
  onSubmit, 
  onCancel, 
  mode: initialMode = 'create',
  autoSave = false,
  viewMode = 'internal'
}: QuotationFormProps) {
  const { user: _user } = useAuth()
  const { defaultCurrency, formatCurrency } = useCurrency()
  const [mode, setMode] = useState(initialMode)
  
  // Form state
  const [formData, setFormData] = useState<Quotation>({
    salesCaseId: quotation?.salesCaseId || '',
    validUntil: quotation?.validUntil ? (typeof quotation.validUntil === 'string' ? quotation.validUntil : quotation.validUntil.toISOString().split('T')[0]) : '',
    paymentTerms: quotation?.paymentTerms || 'Net 30',
    deliveryTerms: quotation?.deliveryTerms || null,
    notes: quotation?.notes || null,
    internalNotes: quotation?.internalNotes || null,
    status: quotation?.status || 'DRAFT',
    subtotal: quotation?.subtotal || 0,
    taxAmount: quotation?.taxAmount || 0,
    discountAmount: quotation?.discountAmount || 0,
    totalAmount: quotation?.totalAmount || 0,
    items: quotation?.items || [],
    ...(quotation?.id && { id: quotation.id }),
    ...(quotation?.number && { number: quotation.number }),
    ...(quotation?.quotationNumber && { quotationNumber: quotation.quotationNumber })
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [fieldValidationStatus, setFieldValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking'>>({})
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null)
  const [isFormValid, setIsFormValid] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [showRequiredFieldsMessage] = useState(true)

  // Reference data
  const [salesCases, setSalesCases] = useState<SalesCase[]>([])
  const [selectedSalesCase, setSelectedSalesCase] = useState<SalesCase | null>(null)

  // Auto-save timer and refs
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const hasUnsavedChangesRef = useRef(false)

  // Load sales cases
  useEffect(() => {
    const fetchSalesCases = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await apiClient<SalesCase[]>('/api/sales-cases?status=OPEN', {
          method: 'GET'
        })
        
        if (!('data' in response)) {
          throw new Error(response.error || 'Failed to load sales cases')
        }
        
        const salesCasesData = response?.data || []
        setSalesCases(Array.isArray(salesCasesData) ? salesCasesData : [])
        
        // Set selected sales case if editing
        if (formData.salesCaseId) {
          const salesCase = salesCasesData.find((sc: SalesCase) => sc.id === formData.salesCaseId)
          if (salesCase) {
            setSelectedSalesCase(salesCase)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales cases')
        console.error('Error fetching sales cases:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSalesCases()
  }, [formData.salesCaseId])
  
  // Run validation when form data or touched fields change
  useEffect(() => {
    validateForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, touchedFields])

  // Calculate totals from items
  const calculateTotals = useCallback((items: QuotationItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0)
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0)
    const totalAmount = subtotal - discountAmount + taxAmount
    
    return { subtotal, discountAmount, taxAmount, totalAmount }
  }, [])

  // Update form data
  const updateFormData = useCallback((updates: Partial<Quotation>) => {
    setFormData(prev => {
      const updated = { ...prev, ...updates }
      
      // Recalculate totals if items changed
      if (updates.items) {
        const totals = calculateTotals(updates.items)
        Object.assign(updated, totals)
      }
      
      return updated
    })
    setHasUnsavedChanges(true)
    
    // Mark fields as touched when they're updated
    Object.keys(updates).forEach(field => {
      setTouchedFields(prev => new Set(prev).add(field))
    })
    
  }, [calculateTotals])

  // Handle sales case selection
  const handleSalesCaseChange = (salesCaseId: string) => {
    const salesCase = salesCases.find(sc => sc.id === salesCaseId)
    setSelectedSalesCase(salesCase || null)
    updateFormData({ salesCaseId })
    setTouchedFields(prev => new Set(prev).add('salesCaseId'))
    
    // Validate immediately
    const error = validateField('salesCaseId', salesCaseId)
    if (error) {
      setValidationErrors(prev => ({ ...prev, salesCaseId: error }))
      setFieldValidationStatus(prev => ({ ...prev, salesCaseId: 'invalid' }))
    } else {
      setValidationErrors(prev => {
        const { salesCaseId, ...rest } = prev
        return rest
      })
      setFieldValidationStatus(prev => ({ ...prev, salesCaseId: 'valid' }))
    }
  }

  // Enhanced validation with real-time feedback
  const validateField = useCallback((fieldName: string, value: unknown, allData?: Partial<Quotation>): string | null => {
    const data = allData || formData
    
    switch (fieldName) {
      case 'salesCaseId':
        if (!value) return 'Sales case is required'
        const selectedCase = salesCases.find(sc => sc.id === value)
        if (selectedCase && selectedCase.status !== 'OPEN') {
          return 'Only open sales cases can have new quotations'
        }
        return null
        
      case 'validUntil':
        if (!value) return 'Valid until date is required'
        return validateValidUntilDate(value as string | Date)
        
      case 'paymentTerms':
        return validatePaymentTerms(value as string)
        
      case 'deliveryTerms':
        if (value && typeof value === 'string' && value.length > MAX_DELIVERY_TERMS_LENGTH) {
          return `Delivery terms must be ${MAX_DELIVERY_TERMS_LENGTH} characters or less`
        }
        return null
        
      case 'notes':
        return checkMaxLength(value as string, MAX_NOTES_LENGTH, 'Notes')
        
      case 'internalNotes':
        return checkMaxLength(value as string, MAX_NOTES_LENGTH, 'Internal notes')
        
      case 'items':
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one quotation item is required'
        }
        
        const items = value as QuotationItem[]
        
        // Validate each item
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          
          // Item code validation
          const itemCodeError = validateItemCode(item.itemCode)
          if (itemCodeError) {
            return `Line ${item.lineNumber}, Item ${i + 1}: ${itemCodeError}`
          }
          
          // Description validation
          const descriptionError = validateDescription(item.description)
          if (descriptionError) {
            return `Line ${item.lineNumber}, Item ${i + 1}: ${descriptionError}`
          }
          
          // Quantity validation
          const quantityError = validateQuantity(item.quantity)
          if (quantityError) {
            return `Line ${item.lineNumber}, Item ${i + 1}: ${quantityError}`
          }
          
          // Price validation
          const priceError = validatePrice(item.unitPrice)
          if (priceError) {
            return `Line ${item.lineNumber}, Item ${i + 1}: ${priceError}`
          }
          
          // Discount validation
          const discountError = validateDiscount(item.discount)
          if (discountError) {
            return `Line ${item.lineNumber}, Item ${i + 1}: ${discountError}`
          }
          
          // Tax rate validation
          const taxRateError = validateTaxRate(item.taxRate)
          if (taxRateError) {
            return `Line ${item.lineNumber}, Item ${i + 1}: ${taxRateError}`
          }
          
          // Margin validation
          const marginError = validateMargin(item.unitPrice, item.cost)
          if (marginError) {
            return `Line ${item.lineNumber}, Item ${i + 1}: ${marginError}`
          }
          
          // Line description validation
          if (item.lineDescription) {
            const lineDescError = checkMaxLength(item.lineDescription, MAX_LINE_DESCRIPTION_LENGTH, 'Line description')
            if (lineDescError) {
              return `Line ${item.lineNumber}: ${lineDescError}`
            }
          }
        }
        
        // Check for duplicate items within same line
        const lineItems = new Map<number, string[]>()
        items.forEach(item => {
          if (!lineItems.has(item.lineNumber)) {
            lineItems.set(item.lineNumber, [])
          }
          lineItems.get(item.lineNumber)!.push(item.itemCode.toLowerCase().trim())
        })
        
        for (const [lineNumber, codes] of lineItems) {
          const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index)
          if (duplicates.length > 0) {
            return `Line ${lineNumber}: Duplicate item codes found: ${duplicates.join(', ')}`
          }
        }
        
        // Validate totals
        const calculatedTotals = calculateTotals(items)
        if (calculatedTotals.totalAmount > 9999999.99) {
          return 'Total quotation amount exceeds maximum allowed value'
        }
        
        return null
        
      default:
        return null
    }
  }, [formData, salesCases, calculateTotals])

  const validateForm = useCallback((data?: Partial<Quotation>, showAllErrors: boolean = false): boolean => {
    const dataToValidate = data || formData
    const errors: Record<string, string> = {}
    const status: Record<string, 'valid' | 'invalid' | 'checking'> = {}

    // Validate all fields
    const fieldsToValidate = ['salesCaseId', 'validUntil', 'paymentTerms', 'deliveryTerms', 'notes', 'internalNotes', 'items']
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, (dataToValidate as any)[field], dataToValidate)
      if (error) {
        // Only show error if field is touched or showAllErrors is true
        if (showAllErrors || touchedFields.has(field)) {
          errors[field] = error
        }
        status[field] = 'invalid'
      } else {
        // Mark as valid if required fields have values, or if optional fields are validated
        const requiredFields = ['salesCaseId', 'validUntil', 'paymentTerms', 'items']
        if (requiredFields.includes(field) && (dataToValidate as any)[field]) {
          status[field] = 'valid'
        } else if (!requiredFields.includes(field) && touchedFields.has(field)) {
          status[field] = 'valid'
        }
      }
    })

    setValidationErrors(errors)
    setFieldValidationStatus(status)
    
    // Check if all required fields are valid
    const requiredFields = ['salesCaseId', 'validUntil', 'paymentTerms', 'items']
    const isValid = requiredFields.every(field => status[field] === 'valid') &&
                   Object.keys(errors).length === 0
    
    setIsFormValid(isValid)
    return isValid
  }, [formData, validateField, touchedFields])

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasUnsavedChanges && !saving && formData.id) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }

      const timer = setTimeout(async () => {
        // Only auto-save if form is valid
        if (validateForm()) {
          try {
            setSaving(true)
            setAutoSaveError(null)
            await onSubmit({ ...formData, status: 'DRAFT' })
            setHasUnsavedChanges(false)
            setLastAutoSave(new Date())
          } catch (error) {
            setAutoSaveError(error instanceof Error ? error.message : 'Auto-save failed')
            console.error('Auto-save error:', error)
          } finally {
            setSaving(false)
          }
        }
      }, 3000) // Auto-save after 3 seconds of inactivity

      setAutoSaveTimer(timer)
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [autoSave, hasUnsavedChanges, formData, onSubmit, saving, autoSaveTimer, validateForm])

  // Handle form submission
  const handleSubmit = async (status: 'DRAFT' | 'SENT' = 'SENT') => {
    // Mark all fields as touched to show all validation errors
    const allFields = ['salesCaseId', 'validUntil', 'paymentTerms', 'deliveryTerms', 'notes', 'internalNotes', 'items']
    allFields.forEach(field => setTouchedFields(prev => new Set(prev).add(field)))
    
    if (!validateForm(undefined, true)) {
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-has-error="true"]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      const totals = calculateTotals(formData.items)
      await onSubmit({
        ...formData,
        status,
        ...totals
      })
      
      setHasUnsavedChanges(false)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation')
      console.error('Error saving quotation:', err)
    } finally {
      setSaving(false)
    }
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

  const isEditing = mode === 'edit' || (quotation && mode !== 'preview')
  const isPreview = mode === 'preview'
  const title = isPreview ? 'Quotation Preview' : 
               isEditing ? 'Edit Quotation' : 'Create Quotation'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {quotation?.number && (
            <p className="mt-1 text-sm text-gray-600">
              Quotation #{quotation.number}
            </p>
          )}
          {showRequiredFieldsMessage && !isPreview && (
            <p className="mt-1 text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center space-x-4">
          {hasUnsavedChanges && !saving && (
            <span className="text-sm text-orange-600 flex items-center animate-pulse">
              <Clock className="h-4 w-4 mr-1" />
              Unsaved changes
            </span>
          )}
          
          {saving && (
            <span className="text-sm text-blue-600 flex items-center">
              <Save className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </span>
          )}
          
          {lastAutoSave && (
            <span className="text-sm text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Auto-saved {new Date(lastAutoSave).toLocaleTimeString()}
            </span>
          )}

          {isPreview && (
            <button
              onClick={() => setMode('edit')}
              className="flex items-center px-3 py-2 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Quotation
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
          <p className="text-sm text-green-800">Quotation saved successfully!</p>
        </div>
      )}

      {/* Auto-save Error */}
      {autoSaveError && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 text-orange-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-orange-800">Auto-save failed</h3>
            <p className="text-sm text-orange-700 mt-1">{autoSaveError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quotation Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sales Case */}
              <div className="relative" data-has-error={validationErrors.salesCaseId ? 'true' : 'false'}>
                <label htmlFor="salesCase" className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Case <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="salesCase"
                    value={formData.salesCaseId}
                    onChange={(e) => handleSalesCaseChange(e.target.value)}
                    disabled={isPreview}
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 transition-colors ${
                      validationErrors.salesCaseId
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : fieldValidationStatus.salesCaseId === 'valid'
                        ? 'border-green-300'
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">
                      {salesCases.length === 0 ? 'No open sales cases available' : 'Select sales case...'}
                    </option>
                    {salesCases.map(sc => (
                      <option key={sc.id} value={sc.id}>
                        {sc.caseNumber} - {sc.description}
                      </option>
                    ))}
                  </select>
                  {fieldValidationStatus.salesCaseId === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                  )}
                  {validationErrors.salesCaseId && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
                  )}
                </div>
                {validationErrors.salesCaseId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {validationErrors.salesCaseId}
                  </p>
                )}
                {salesCases.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    Only open sales cases can have quotations
                  </p>
                )}
              </div>

              {/* Valid Until */}
              <div className="relative" data-has-error={validationErrors.validUntil ? 'true' : 'false'}>
                <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="validUntil"
                    value={typeof formData.validUntil === 'string' ? formData.validUntil : formData.validUntil.toISOString().split('T')[0]}
                    onChange={(e) => {
                      updateFormData({ validUntil: e.target.value })
                      setTouchedFields(prev => new Set(prev).add('validUntil'))
                      
                      // Real-time validation
                      const error = validateField('validUntil', e.target.value)
                      if (error) {
                        setValidationErrors(prev => ({ ...prev, validUntil: error }))
                        setFieldValidationStatus(prev => ({ ...prev, validUntil: 'invalid' }))
                      } else {
                        setValidationErrors(prev => {
                          const { validUntil, ...rest } = prev
                          return rest
                        })
                        setFieldValidationStatus(prev => ({ ...prev, validUntil: 'valid' }))
                      }
                    }}
                    onBlur={() => setTouchedFields(prev => new Set(prev).add('validUntil'))}
                    disabled={isPreview}
                    readOnly={isPreview}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                    max={new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]} // 6 months
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 transition-colors ${
                      validationErrors.validUntil
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : fieldValidationStatus.validUntil === 'valid'
                        ? 'border-green-300'
                        : 'border-gray-300'
                    }`}
                  />
                  {fieldValidationStatus.validUntil === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                  )}
                  {validationErrors.validUntil && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
                  )}
                </div>
                {validationErrors.validUntil && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {validationErrors.validUntil}
                  </p>
                )}
              </div>

              {/* Payment Terms */}
              <div className="relative" data-has-error={validationErrors.paymentTerms ? 'true' : 'false'}>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => {
                      const value = e.target.value === 'Custom' ? '' : e.target.value
                      updateFormData({ paymentTerms: value })
                      setTouchedFields(prev => new Set(prev).add('paymentTerms'))
                      
                      // Real-time validation
                      const error = validateField('paymentTerms', value)
                      if (error) {
                        setValidationErrors(prev => ({ ...prev, paymentTerms: error }))
                        setFieldValidationStatus(prev => ({ ...prev, paymentTerms: 'invalid' }))
                      } else {
                        setValidationErrors(prev => {
                          const { paymentTerms, ...rest } = prev
                          return rest
                        })
                        setFieldValidationStatus(prev => ({ ...prev, paymentTerms: 'valid' }))
                      }
                    }}
                    onBlur={() => setTouchedFields(prev => new Set(prev).add('paymentTerms'))}
                    disabled={isPreview}
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 transition-colors ${
                      validationErrors.paymentTerms
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : fieldValidationStatus.paymentTerms === 'valid'
                        ? 'border-green-300'
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select payment terms...</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 7">Net 7</option>
                    <option value="Net 14">Net 14</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="COD">COD (Cash on Delivery)</option>
                    <option value="Custom">Custom (Enter manually)</option>
                  </select>
                  {fieldValidationStatus.paymentTerms === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                  )}
                  {validationErrors.paymentTerms && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
                  )}
                </div>
                {formData.paymentTerms === '' && (
                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={formData.paymentTerms}
                      onChange={(e) => {
                        updateFormData({ paymentTerms: e.target.value })
                        setTouchedFields(prev => new Set(prev).add('paymentTerms'))
                        // Validate as user types
                        const error = validateField('paymentTerms', e.target.value)
                        if (error) {
                          setValidationErrors(prev => ({ ...prev, paymentTerms: error }))
                          setFieldValidationStatus(prev => ({ ...prev, paymentTerms: 'invalid' }))
                        } else {
                          setValidationErrors(prev => {
                            const { paymentTerms, ...rest } = prev
                            return rest
                          })
                          setFieldValidationStatus(prev => ({ ...prev, paymentTerms: 'valid' }))
                        }
                      }}
                      onBlur={() => setTouchedFields(prev => new Set(prev).add('paymentTerms'))}
                      placeholder="Enter custom payment terms"
                      maxLength={MAX_PAYMENT_TERMS_LENGTH}
                      className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.paymentTerms ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.paymentTerms.length}/{MAX_PAYMENT_TERMS_LENGTH} characters
                    </p>
                  </div>
                )}
                {validationErrors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {validationErrors.paymentTerms}
                  </p>
                )}
              </div>

              {/* Quotation Number (if editing) */}
              {quotation?.number && (
                <div>
                  <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                    Quotation Number
                  </label>
                  <input
                    type="text"
                    id="number"
                    value={quotation.number}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              )}
            </div>

            {/* Delivery Terms */}
            <div className="mt-4">
              <label htmlFor="deliveryTerms" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Terms
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="deliveryTerms"
                  value={formData.deliveryTerms ?? ''}
                  onChange={(e) => {
                    updateFormData({ deliveryTerms: e.target.value })
                    setTouchedFields(prev => new Set(prev).add('deliveryTerms'))
                    
                    // Real-time validation
                    const error = validateField('deliveryTerms', e.target.value)
                    if (error) {
                      setValidationErrors(prev => ({ ...prev, deliveryTerms: error }))
                      setFieldValidationStatus(prev => ({ ...prev, deliveryTerms: 'invalid' }))
                    } else {
                      setValidationErrors(prev => {
                        const { deliveryTerms, ...rest } = prev
                        return rest
                      })
                      setFieldValidationStatus(prev => ({ ...prev, deliveryTerms: 'valid' }))
                    }
                  }}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add('deliveryTerms'))}
                  disabled={isPreview}
                  readOnly={isPreview}
                  placeholder="e.g., FOB, CIF, EXW..."
                  maxLength={MAX_DELIVERY_TERMS_LENGTH}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 transition-colors ${
                    validationErrors.deliveryTerms
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : fieldValidationStatus.deliveryTerms === 'valid' && formData.deliveryTerms
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                />
                {fieldValidationStatus.deliveryTerms === 'valid' && formData.deliveryTerms && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                )}
              </div>
              {validationErrors.deliveryTerms && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validationErrors.deliveryTerms}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.deliveryTerms ? `${formData.deliveryTerms.length}/${MAX_DELIVERY_TERMS_LENGTH} characters` : `Max ${MAX_DELIVERY_TERMS_LENGTH} characters`}
              </p>
            </div>

            {/* Notes */}
            <div className="mt-4" data-has-error={validationErrors.notes ? 'true' : 'false'}>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Customer Visible)
              </label>
              <div className="relative">
                <textarea
                  id="notes"
                  rows={3}
                  value={formData.notes ?? ''}
                  onChange={(e) => {
                    updateFormData({ notes: e.target.value })
                    setTouchedFields(prev => new Set(prev).add('notes'))
                    
                    // Real-time validation
                    const error = validateField('notes', e.target.value)
                    if (error) {
                      setValidationErrors(prev => ({ ...prev, notes: error }))
                      setFieldValidationStatus(prev => ({ ...prev, notes: 'invalid' }))
                    } else {
                      setValidationErrors(prev => {
                        const { notes, ...rest } = prev
                        return rest
                      })
                      setFieldValidationStatus(prev => ({ ...prev, notes: 'valid' }))
                    }
                  }}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add('notes'))}
                  disabled={isPreview}
                  readOnly={isPreview}
                  placeholder="Additional notes or comments visible to the customer..."
                  maxLength={MAX_NOTES_LENGTH}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 transition-colors ${
                    validationErrors.notes
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : fieldValidationStatus.notes === 'valid' && formData.notes
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                />
              </div>
              {validationErrors.notes && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validationErrors.notes}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.notes ? `${formData.notes.length}/${MAX_NOTES_LENGTH} characters` : `Max ${MAX_NOTES_LENGTH} characters`} - These notes will be visible to the customer
              </p>
            </div>

            {/* Internal Notes - Only show in internal view */}
            {viewMode === 'internal' && (
              <div className="mt-4" data-has-error={validationErrors.internalNotes ? 'true' : 'false'}>
              <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <div className="relative">
                <textarea
                  id="internalNotes"
                  rows={3}
                  value={formData.internalNotes ?? ''}
                  onChange={(e) => {
                    updateFormData({ internalNotes: e.target.value })
                    setTouchedFields(prev => new Set(prev).add('internalNotes'))
                    
                    // Real-time validation
                    const error = validateField('internalNotes', e.target.value)
                    if (error) {
                      setValidationErrors(prev => ({ ...prev, internalNotes: error }))
                      setFieldValidationStatus(prev => ({ ...prev, internalNotes: 'invalid' }))
                    } else {
                      setValidationErrors(prev => {
                        const { internalNotes, ...rest } = prev
                        return rest
                      })
                      setFieldValidationStatus(prev => ({ ...prev, internalNotes: 'valid' }))
                    }
                  }}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add('internalNotes'))}
                  disabled={isPreview}
                  readOnly={isPreview}
                  placeholder="Internal notes for staff only..."
                  maxLength={MAX_NOTES_LENGTH}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 transition-colors ${
                    validationErrors.internalNotes
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : fieldValidationStatus.internalNotes === 'valid' && formData.internalNotes
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                />
              </div>
              {validationErrors.internalNotes && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validationErrors.internalNotes}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {formData.internalNotes ? `${formData.internalNotes.length}/${MAX_NOTES_LENGTH} characters` : `Max ${MAX_NOTES_LENGTH} characters`} - Internal use only
              </p>
            </div>
            )}
          </div>

          {/* Quotation Items */}
          <div className="bg-white p-6 rounded-lg border" data-has-error={validationErrors.items ? 'true' : 'false'}>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                Quotation Items <span className="text-red-500 ml-1">*</span>
                {fieldValidationStatus.items === 'valid' && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
                )}
                {validationErrors.items && (
                  <AlertCircle className="h-5 w-5 text-red-500 ml-2" />
                )}
              </h3>
              {formData.items.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  {touchedFields.has('items') && validationErrors.items ? (
                    <span className="text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {validationErrors.items}
                    </span>
                  ) : (
                    'Add at least one item to the quotation'
                  )}
                </p>
              )}
            </div>
            {viewMode === 'internal' ? (
              <LineItemEditorV2
                quotationItems={formData.items}
                onChange={(items) => {
                  updateFormData({ items })
                  setTouchedFields(prev => new Set(prev).add('items'))
                  
                  // Validate items immediately
                  const error = validateField('items', items)
                  if (error) {
                    setValidationErrors(prev => ({ ...prev, items: error }))
                    setFieldValidationStatus(prev => ({ ...prev, items: 'invalid' }))
                  } else {
                    setValidationErrors(prev => {
                      const { items, ...rest } = prev
                      return rest
                    })
                    setFieldValidationStatus(prev => ({ ...prev, items: 'valid' }))
                  }
                }}
                disabled={isPreview}
              />
            ) : (
              <ClientQuotationView lines={quotation?.lines || []} items={formData.items} />
            )}
            {validationErrors.items && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {validationErrors.items}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          {selectedSalesCase && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedSalesCase.customer.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <a href={`mailto:${selectedSalesCase.customer.email}`} className="text-blue-600 hover:text-blue-800">
                      {selectedSalesCase.customer.email}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sales Case</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedSalesCase.caseNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quotation Summary */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Items</span>
                <span className="text-sm font-medium">{formData.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium">
                  {formatCurrency(formData.subtotal)}
                </span>
              </div>
              {formData.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Discount</span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(formData.discountAmount)}
                  </span>
                </div>
              )}
              {formData.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(formData.taxAmount)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-medium text-gray-900">Total</span>
                  <span className="text-base font-medium text-gray-900">
                    {formatCurrency(formData.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isPreview && (
            <div className="bg-white p-6 rounded-lg border">
              <div className="space-y-3">
                <button
                  onClick={() => handleSubmit('SENT')}
                  disabled={saving || !isFormValid}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                    isFormValid
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-50`}
                  title={!isFormValid ? 'Please fill in all required fields' : ''}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Quotation' : 'Create Quotation'}
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleSubmit('DRAFT')}
                  disabled={saving || !isFormValid}
                  className={`w-full flex items-center justify-center px-4 py-2 border rounded-md transition-colors ${
                    isFormValid
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  } disabled:opacity-50`}
                  title={!isFormValid ? 'Please fill in all required fields' : ''}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Draft
                </button>
                
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to cancel?')
                      if (confirmLeave) {
                        onCancel()
                      }
                    } else {
                      onCancel()
                    }
                  }}
                  disabled={saving}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}