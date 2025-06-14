'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { 
  quantityValidator,
  validateRequired,
  notesValidator,
  MAX_NOTES_LENGTH,
  checkMaxLength,
  nonNegativeNumberValidator
} from '@/lib/validators/common.validator'

interface Item {
  id: string
  code: string
  name: string
  unitOfMeasure?: {
    code: string
    name: string
  }
  currentStock?: number
}

interface CountLine {
  itemId: string
  itemCode: string
  itemName: string
  systemQuantity: number
  countedQuantity: number
  variance: number
  variancePercentage: number
  unitOfMeasure?: string
  notes?: string
}

interface PhysicalCountFormData {
  countDate: string
  location: string
  countedBy: string
  verifiedBy?: string
  notes?: string
  lines: CountLine[]
}

interface Location {
  id: string
  code: string
  name: string
}

interface PhysicalCountFormProps {
  mode: 'create' | 'edit' | 'verify'
  count?: PhysicalCountFormData
  onSubmit: (data: PhysicalCountFormData) => Promise<void> | void
  onCancel: () => void
}

export function PhysicalCountForm({
  mode,
  count,
  onSubmit,
  onCancel
}: PhysicalCountFormProps) {
  const [formData, setFormData] = useState<PhysicalCountFormData>({
    countDate: count?.countDate || new Date().toISOString().split('T')[0],
    location: count?.location || '',
    countedBy: count?.countedBy || '',
    verifiedBy: count?.verifiedBy || '',
    notes: count?.notes || '',
    lines: count?.lines || []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lineErrors, setLineErrors] = useState<Record<number, Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [varianceThreshold, setVarianceThreshold] = useState(5) // 5% default
  const [showOnlyVariances, setShowOnlyVariances] = useState(false)
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({})
  const [isLoadingStock, setIsLoadingStock] = useState(false)

  // Load reference data
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        // Load locations
        const locationResponse = await fetch('/api/inventory/locations')
        if (locationResponse.ok) {
          const locationData = await locationResponse.json()
          setLocations(locationData.data || [])
        }

        // Load items
        const itemResponse = await fetch('/api/inventory/items?trackInventory=true')
        if (itemResponse.ok) {
          const itemData = await itemResponse.json()
          setItems(itemData.data || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [])

  // Load stock levels when location changes
  useEffect(() => {
    if (formData.location && mode === 'create') {
      loadStockLevels(formData.location)
    }
  }, [formData.location, mode])

  const loadStockLevels = async (location: string) => {
    setIsLoadingStock(true)
    try {
      const response = await fetch(`/api/inventory/stock-levels?location=${location}`)
      if (response.ok) {
        const data = await response.json()
        const stockedItems = data.items || []
        
        // Create count lines for all stocked items
        const lines: CountLine[] = stockedItems.map((item: any) => ({
          itemId: item.id,
          itemCode: item.code,
          itemName: item.name,
          systemQuantity: item.currentStock || 0,
          countedQuantity: 0,
          variance: -item.currentStock || 0,
          variancePercentage: -100,
          unitOfMeasure: item.unitOfMeasure?.code
        }))

        setFormData(prev => ({ ...prev, lines }))
        setSelectedItems(new Set(lines.map(line => line.itemId)))
      }
    } catch (error) {
      console.error('Error loading stock levels:', error)
    } finally {
      setIsLoadingStock(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const newLineErrors: Record<number, Record<string, string>> = {}

    // Date validation
    const dateError = validateRequired(formData.countDate, 'Count date')
    if (dateError) {
      newErrors.countDate = dateError
    } else {
      const countDate = new Date(formData.countDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (countDate > today) {
        newErrors.countDate = 'Count date cannot be in the future'
      }
    }

    // Location validation
    const locationError = validateRequired(formData.location, 'Location')
    if (locationError) {
      newErrors.location = locationError
    }

    // Counted by validation
    const countedByError = validateRequired(formData.countedBy.trim(), 'Counted by')
    if (countedByError) {
      newErrors.countedBy = countedByError
    }

    // Verified by validation (for verify mode)
    if (mode === 'verify') {
      const verifiedByError = validateRequired(formData.verifiedBy?.trim(), 'Verified by')
      if (verifiedByError) {
        newErrors.verifiedBy = verifiedByError
      }
    }

    // Lines validation
    if (formData.lines.length === 0) {
      newErrors.lines = 'At least one item must be counted'
    }

    // Validate each line
    formData.lines.forEach((line, index) => {
      const lineError: Record<string, string> = {}

      const quantityResult = nonNegativeNumberValidator.safeParse(line.countedQuantity)
      if (!quantityResult.success) {
        lineError.countedQuantity = quantityResult.error.errors[0].message
      }

      // Check for high variance
      if (Math.abs(line.variancePercentage) > varianceThreshold && !line.notes?.trim()) {
        lineError.notes = `Notes required for variance > ${varianceThreshold}%`
      }

      if (Object.keys(lineError).length > 0) {
        newLineErrors[index] = lineError
      }
    })

    // Notes validation
    if (formData.notes) {
      const notesLengthError = checkMaxLength(formData.notes, MAX_NOTES_LENGTH, 'Notes')
      if (notesLengthError) {
        newErrors.notes = notesLengthError
      }
    }

    setErrors(newErrors)
    setLineErrors(newLineErrors)
    return Object.keys(newErrors).length === 0 && Object.keys(newLineErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof PhysicalCountFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Mark field as touched
    if (!fieldTouched[field]) {
      setFieldTouched(prev => ({ ...prev, [field]: true }))
    }
    
    // Clear error for this field when user modifies it
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Real-time validation for critical fields
    if (fieldTouched[field]) {
      validateField(field, value)
    }
  }

  const validateField = (field: string, value: any) => {
    let fieldError = ''

    switch (field) {
      case 'countDate':
        if (!value) {
          fieldError = 'Count date is required'
        } else {
          const countDate = new Date(value)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          if (countDate > today) {
            fieldError = 'Count date cannot be in the future'
          }
        }
        break
        
      case 'countedBy':
        if (!String(value).trim()) {
          fieldError = 'Counted by is required'
        }
        break
        
      case 'verifiedBy':
        if (mode === 'verify' && !String(value).trim()) {
          fieldError = 'Verified by is required'
        }
        break
        
      case 'notes':
        if (String(value).length > MAX_NOTES_LENGTH) {
          fieldError = `Notes must be less than ${MAX_NOTES_LENGTH} characters`
        }
        break
    }

    if (fieldError) {
      setErrors(prev => ({ ...prev, [field]: fieldError }))
    }
  }

  const handleBlur = (field: string) => {
    if (!fieldTouched[field]) {
      setFieldTouched(prev => ({ ...prev, [field]: true }))
    }
    validateField(field, (formData as any)[field])
  }

  const handleLineChange = (index: number, field: keyof CountLine, value: string | number) => {
    const updatedLines = [...formData.lines]
    const line = { ...updatedLines[index] }
    
    if (field === 'countedQuantity') {
      line.countedQuantity = Number(value)
      line.variance = line.countedQuantity - line.systemQuantity
      line.variancePercentage = line.systemQuantity > 0 
        ? (line.variance / line.systemQuantity) * 100 
        : line.countedQuantity > 0 ? 100 : 0
    } else {
      (line as any)[field] = value
    }
    
    updatedLines[index] = line
    setFormData(prev => ({ ...prev, lines: updatedLines }))

    // Clear line error
    if (lineErrors[index]?.[field]) {
      const newLineErrors = { ...lineErrors }
      delete newLineErrors[index][field]
      if (Object.keys(newLineErrors[index]).length === 0) {
        delete newLineErrors[index]
      }
      setLineErrors(newLineErrors)
    }
  }

  const addItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item || selectedItems.has(itemId)) return

    const newLine: CountLine = {
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      systemQuantity: item.currentStock || 0,
      countedQuantity: 0,
      variance: -(item.currentStock || 0),
      variancePercentage: -100,
      unitOfMeasure: item.unitOfMeasure?.code
    }

    setFormData(prev => ({ ...prev, lines: [...prev.lines, newLine] }))
    setSelectedItems(prev => new Set([...prev, itemId]))
  }

  const removeItem = (index: number) => {
    const line = formData.lines[index]
    const updatedLines = formData.lines.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, lines: updatedLines }))
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(line.itemId)
      return newSet
    })

    // Remove any errors for this line
    const newLineErrors = { ...lineErrors }
    delete newLineErrors[index]
    setLineErrors(newLineErrors)
  }

  const calculateTotalVariance = () => {
    return formData.lines.reduce((sum, line) => sum + Math.abs(line.variance), 0)
  }

  const filteredLines = showOnlyVariances 
    ? formData.lines.filter(line => line.variance !== 0)
    : formData.lines

  const availableItems = items.filter(item => !selectedItems.has(item.id))

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">
        {mode === 'create' ? 'Create Physical Count' : mode === 'verify' ? 'Verify Physical Count' : 'Edit Physical Count'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="countDate" className="block text-sm font-medium text-gray-700 mb-1">
              Count Date *
            </label>
            <div className="relative">
              <input
                id="countDate"
                type="date"
                value={formData.countDate}
                onChange={(e) => handleInputChange('countDate', e.target.value)}
                onBlur={() => handleBlur('countDate')}
                disabled={mode !== 'create'}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                  errors.countDate ? 'border-red-300' : fieldTouched.countDate && formData.countDate ? 'border-green-300' : 'border-gray-300'
                }`}
              />
              {fieldTouched.countDate && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {errors.countDate ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : formData.countDate ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.countDate && (
              <div className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.countDate}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <select
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              disabled={mode !== 'create'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select location...</option>
              {locations.map(location => (
                <option key={location.id} value={location.code}>
                  {location.name}
                </option>
              ))}
            </select>
            {errors.location && (
              <div className="mt-1 text-sm text-red-600">{errors.location}</div>
            )}
          </div>

          <div>
            <label htmlFor="countedBy" className="block text-sm font-medium text-gray-700 mb-1">
              Counted By *
            </label>
            <input
              id="countedBy"
              type="text"
              value={formData.countedBy}
              onChange={(e) => handleInputChange('countedBy', e.target.value)}
              disabled={mode === 'verify'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="Name of person counting"
            />
            {errors.countedBy && (
              <div className="mt-1 text-sm text-red-600">{errors.countedBy}</div>
            )}
          </div>

          {mode === 'verify' && (
            <div>
              <label htmlFor="verifiedBy" className="block text-sm font-medium text-gray-700 mb-1">
                Verified By *
              </label>
              <input
                id="verifiedBy"
                type="text"
                value={formData.verifiedBy}
                onChange={(e) => handleInputChange('verifiedBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Name of verifier"
              />
              {errors.verifiedBy && (
                <div className="mt-1 text-sm text-red-600">{errors.verifiedBy}</div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-t border-b py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                id="showVariances"
                type="checkbox"
                checked={showOnlyVariances}
                onChange={(e) => setShowOnlyVariances(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showVariances" className="ml-2 text-sm text-gray-700">
                Show only variances
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="varianceThreshold" className="text-sm text-gray-700">
                Variance threshold:
              </label>
              <input
                id="varianceThreshold"
                type="number"
                min="0"
                max="100"
                value={varianceThreshold}
                onChange={(e) => setVarianceThreshold(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-sm text-gray-700">%</span>
            </div>
          </div>

          {mode === 'create' && (
            <div className="flex items-center space-x-2">
              <select
                value=""
                onChange={(e) => e.target.value && addItem(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Add item...</option>
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Count Lines */}
        <div>
          {errors.lines && (
            <div className="mb-2 text-sm text-red-600">{errors.lines}</div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    System Qty
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Counted Qty
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UoM
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Var %
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  {mode === 'create' && (
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLines.map((line, index) => {
                  const originalIndex = formData.lines.indexOf(line)
                  const hasHighVariance = Math.abs(line.variancePercentage) > varianceThreshold
                  
                  return (
                    <tr key={line.itemId} className={hasHighVariance ? 'bg-yellow-50' : ''}>
                      <td className="px-3 py-2 text-sm text-gray-900">{line.itemCode}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{line.itemName}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{line.systemQuantity}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.countedQuantity}
                          onChange={(e) => handleLineChange(originalIndex, 'countedQuantity', e.target.value)}
                          disabled={mode === 'verify'}
                          className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm text-right disabled:bg-gray-100"
                        />
                        {lineErrors[originalIndex]?.countedQuantity && (
                          <div className="text-xs text-red-600 mt-1">
                            {lineErrors[originalIndex].countedQuantity}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">
                        {line.unitOfMeasure || '-'}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-medium ${
                        line.variance > 0 ? 'text-green-600' : line.variance < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {line.variance > 0 && '+'}{line.variance.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-medium ${
                        hasHighVariance ? 'text-orange-600' : 'text-gray-900'
                      }`}>
                        {line.variance !== 0 ? `${line.variancePercentage.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.notes || ''}
                          onChange={(e) => handleLineChange(originalIndex, 'notes', e.target.value)}
                          disabled={mode === 'verify'}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                          placeholder={hasHighVariance ? 'Required' : 'Optional'}
                        />
                        {lineErrors[originalIndex]?.notes && (
                          <div className="text-xs text-red-600 mt-1">
                            {lineErrors[originalIndex].notes}
                          </div>
                        )}
                      </td>
                      {mode === 'create' && (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(originalIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                    Total Absolute Variance:
                  </td>
                  <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                    {calculateTotalVariance().toFixed(2)}
                  </td>
                  <td colSpan={mode === 'create' ? 3 : 2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            General Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            disabled={mode === 'verify'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="Additional observations or comments"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || filteredLines.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting 
              ? 'Processing...'
              : mode === 'create' 
                ? 'Submit Count' 
                : mode === 'verify'
                  ? 'Verify Count'
                  : 'Update Count'
            }
          </button>
        </div>
      </form>
    </div>
  )
}