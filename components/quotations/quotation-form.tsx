'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Save, X, FileText, Clock, Edit3 } from 'lucide-react'
import { LineItemEditorV2 } from './line-item-editor-v2'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

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
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface Quotation {
  id?: string
  number?: string
  salesCaseId: string
  validUntil: string
  paymentTerms: string
  deliveryTerms?: string
  notes: string
  internalNotes?: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  items: QuotationItem[]
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
}

interface QuotationFormProps {
  quotation?: Quotation
  onSubmit: (quotation: Quotation) => Promise<void>
  onCancel: () => void
  mode?: 'create' | 'edit' | 'preview'
  autoSave?: boolean
}

export function QuotationForm({ 
  quotation, 
  onSubmit, 
  onCancel, 
  mode: initialMode = 'create',
  autoSave = false 
}: QuotationFormProps) {
  const { user: _user } = useAuth()
  const { defaultCurrency, formatCurrency } = useCurrency()
  const [mode, setMode] = useState(initialMode)
  
  // Form state
  const [formData, setFormData] = useState<Quotation>({
    salesCaseId: quotation?.salesCaseId || '',
    validUntil: quotation?.validUntil || '',
    paymentTerms: quotation?.paymentTerms || 'Net 30',
    deliveryTerms: quotation?.deliveryTerms || '',
    notes: quotation?.notes || '',
    internalNotes: quotation?.internalNotes || '',
    status: quotation?.status || 'DRAFT',
    subtotal: quotation?.subtotal || 0,
    taxAmount: quotation?.taxAmount || 0,
    discountAmount: quotation?.discountAmount || 0,
    totalAmount: quotation?.totalAmount || 0,
    items: quotation?.items || [],
    ...(quotation?.id && { id: quotation.id }),
    ...(quotation?.number && { number: quotation.number })
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Reference data
  const [salesCases, setSalesCases] = useState<SalesCase[]>([])
  const [selectedSalesCase, setSelectedSalesCase] = useState<SalesCase | null>(null)

  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  // Load sales cases
  useEffect(() => {
    const fetchSalesCases = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await apiClient('/api/sales-cases?status=OPEN', {
          method: 'GET'
        })
        
        if (!response.ok) {
          throw new Error('Failed to load sales cases')
        }
        
        const salesCasesData = response.data?.data || response.data || []
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
    setValidationErrors({}) // Clear validation errors on change
  }, [calculateTotals])

  // Handle sales case selection
  const handleSalesCaseChange = (salesCaseId: string) => {
    const salesCase = salesCases.find(sc => sc.id === salesCaseId)
    setSelectedSalesCase(salesCase || null)
    updateFormData({ salesCaseId })
  }

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.salesCaseId) {
      errors.salesCaseId = 'Sales case is required'
    }

    if (!formData.validUntil) {
      errors.validUntil = 'Valid until date is required'
    } else {
      const validUntilDate = new Date(formData.validUntil)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (validUntilDate <= today) {
        errors.validUntil = 'Valid until date must be in the future'
      }
    }

    if (formData.items.length === 0) {
      errors.items = 'At least one quotation item is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasUnsavedChanges && !saving && formData.id) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }

      const timer = setTimeout(async () => {
        try {
          setSaving(true)
          await onSubmit({ ...formData, status: 'DRAFT' })
          setHasUnsavedChanges(false)
          setLastAutoSave(new Date())
        } catch (error) {
          console.error('Auto-save error:', error)
        } finally {
          setSaving(false)
        }
      }, 3000) // Auto-save after 3 seconds of inactivity

      setAutoSaveTimer(timer)
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [autoSave, hasUnsavedChanges, formData, onSubmit, saving])

  // Handle form submission
  const handleSubmit = async (status: 'DRAFT' | 'SENT' = 'SENT') => {
    if (!validateForm()) return

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
        </div>

        {/* Status indicators */}
        <div className="flex items-center space-x-4">
          {hasUnsavedChanges && !saving && (
            <span className="text-sm text-orange-600 flex items-center">
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
              <Save className="h-4 w-4 mr-1" />
              Auto-saved
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
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-800">{error}</p>
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
              <div>
                <label htmlFor="salesCase" className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Case *
                </label>
                <select
                  id="salesCase"
                  value={formData.salesCaseId}
                  onChange={(e) => handleSalesCaseChange(e.target.value)}
                  disabled={isPreview}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
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
                {validationErrors.salesCaseId && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.salesCaseId}</p>
                )}
                {salesCases.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">Only open sales cases can have quotations</p>
                )}
              </div>

              {/* Valid Until */}
              <div>
                <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until *
                </label>
                <input
                  type="date"
                  id="validUntil"
                  value={formData.validUntil}
                  onChange={(e) => updateFormData({ validUntil: e.target.value })}
                  disabled={isPreview}
                  readOnly={isPreview}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
                {validationErrors.validUntil && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.validUntil}</p>
                )}
              </div>

              {/* Terms */}
              <div>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => updateFormData({ paymentTerms: e.target.value })}
                  disabled={isPreview}
                  readOnly={isPreview}
                  placeholder="e.g., Net 30, Net 15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
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

            {/* Notes */}
            <div className="mt-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => updateFormData({ notes: e.target.value })}
                disabled={isPreview}
                readOnly={isPreview}
                placeholder="Additional notes or comments for this quotation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Quotation Items */}
          <div className="bg-white p-6 rounded-lg border">
            <LineItemEditorV2
              quotationItems={formData.items}
              onChange={(items) => updateFormData({ items })}
              disabled={isPreview}
            />
            {validationErrors.items && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.items}</p>
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
                  <p className="mt-1 text-sm text-gray-900">{selectedSalesCase.customer.email}</p>
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
                  disabled={saving}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Quotation' : 'Create Quotation'}
                </button>
                
                <button
                  onClick={() => handleSubmit('DRAFT')}
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
          )}
        </div>
      </div>
    </div>
  )
}