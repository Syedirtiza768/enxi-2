'use client'

import React, { useState, useEffect } from 'react'
import { ArrowRight, Package, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { 
  quantityValidator,
  validateRequired,
  notesValidator,
  MAX_NOTES_LENGTH,
  checkMaxLength
} from '@/lib/validators/common.validator'

interface Item {
  id: string
  code: string
  name: string
  unitOfMeasure?: {
    code: string
    name: string
  }
}

interface Location {
  id: string
  code: string
  name: string
  type: 'WAREHOUSE' | 'STORE' | 'PRODUCTION' | 'TRANSIT'
}

interface TransferLine {
  itemId: string
  itemCode: string
  itemName: string
  quantity: number
  availableQty: number
  unitOfMeasure?: string
  notes?: string
}

interface StockTransferFormData {
  transferDate: string
  fromLocation: string
  toLocation: string
  transferType: 'INTERNAL' | 'INTER_WAREHOUSE' | 'TO_PRODUCTION' | 'FROM_PRODUCTION'
  reason: string
  notes?: string
  lines: TransferLine[]
  approvedBy?: string
  transportDetails?: {
    carrier?: string
    trackingNumber?: string
    estimatedArrival?: string
  }
}

interface StockTransferFormProps {
  mode: 'create' | 'edit' | 'view'
  transfer?: StockTransferFormData
  onSubmit: (data: StockTransferFormData) => Promise<void> | void
  onCancel: () => void
}

export function StockTransferForm({
  mode,
  transfer,
  onSubmit,
  onCancel
}: StockTransferFormProps) {
  const [formData, setFormData] = useState<StockTransferFormData>({
    transferDate: transfer?.transferDate || new Date().toISOString().split('T')[0],
    fromLocation: transfer?.fromLocation || '',
    toLocation: transfer?.toLocation || '',
    transferType: transfer?.transferType || 'INTERNAL',
    reason: transfer?.reason || '',
    notes: transfer?.notes || '',
    lines: transfer?.lines || [],
    approvedBy: transfer?.approvedBy || '',
    transportDetails: transfer?.transportDetails || {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lineErrors, setLineErrors] = useState<Record<number, Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [locationStock, setLocationStock] = useState<Record<string, Record<string, number>>>({})
  const [showTransportDetails, setShowTransportDetails] = useState(false)
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

  // Load stock levels when from location changes
  useEffect(() => {
    if (formData.fromLocation) {
      loadLocationStock(formData.fromLocation)
    }
  }, [formData.fromLocation])

  const loadLocationStock = async (location: string) => {
    setIsLoadingStock(true)
    try {
      const response = await fetch(`/api/inventory/stock-levels?location=${location}`)
      if (response.ok) {
        const data = await response.json()
        const stockMap: Record<string, number> = {}
        data.items?.forEach((item: any) => {
          stockMap[item.id] = item.currentStock || 0
        })
        setLocationStock(prev => ({ ...prev, [location]: stockMap }))
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
    const dateError = validateRequired(formData.transferDate, 'Transfer date')
    if (dateError) {
      newErrors.transferDate = dateError
    } else {
      const transferDate = new Date(formData.transferDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (transferDate > today) {
        newErrors.transferDate = 'Transfer date cannot be in the future'
      }
    }

    // Location validations
    const fromLocationError = validateRequired(formData.fromLocation, 'Source location')
    if (fromLocationError) {
      newErrors.fromLocation = fromLocationError
    }

    const toLocationError = validateRequired(formData.toLocation, 'Destination location')
    if (toLocationError) {
      newErrors.toLocation = toLocationError
    }

    if (formData.fromLocation && formData.toLocation && formData.fromLocation === formData.toLocation) {
      newErrors.toLocation = 'Source and destination must be different'
    }

    // Reason validation
    const reasonError = validateRequired(formData.reason.trim(), 'Transfer reason')
    if (reasonError) {
      newErrors.reason = reasonError
    }

    // Lines validation
    if (formData.lines.length === 0) {
      newErrors.lines = 'At least one item must be transferred'
    }

    // Validate each line
    formData.lines.forEach((line, index) => {
      const lineError: Record<string, string> = {}

      if (line.quantity <= 0) {
        lineError.quantity = 'Quantity must be positive'
      } else {
        const quantityResult = quantityValidator.safeParse(line.quantity)
        if (!quantityResult.success) {
          lineError.quantity = quantityResult.error.errors[0].message
        } else if (line.quantity > line.availableQty) {
          lineError.quantity = `Insufficient stock. Available: ${line.availableQty} ${line.unitOfMeasure || ''}`
        }
      }

      if (Object.keys(lineError).length > 0) {
        newLineErrors[index] = lineError
      }
    })

    // Validate transport details if inter-warehouse
    if (formData.transferType === 'INTER_WAREHOUSE') {
      const carrierError = validateRequired(formData.transportDetails?.carrier, 'Carrier')
      if (carrierError) {
        newErrors.carrier = carrierError
      }
    }

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

  const handleInputChange = (field: keyof StockTransferFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Mark field as touched
    if (!fieldTouched[field]) {
      setFieldTouched(prev => ({ ...prev, [field]: true }))
    }
    
    // Clear error for this field when user modifies it
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Show transport details for inter-warehouse transfers
    if (field === 'transferType' && value === 'INTER_WAREHOUSE') {
      setShowTransportDetails(true)
    }

    // Real-time validation for critical fields
    if (fieldTouched[field]) {
      validateField(field, value)
    }
  }

  const validateField = (field: string, value: any) => {
    let fieldError = ''

    switch (field) {
      case 'transferDate':
        if (!value) {
          fieldError = 'Transfer date is required'
        } else {
          const transferDate = new Date(value)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          if (transferDate > today) {
            fieldError = 'Transfer date cannot be in the future'
          }
        }
        break
        
      case 'reason':
        if (!String(value).trim()) {
          fieldError = 'Transfer reason is required'
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

  const handleTransportDetailChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      transportDetails: {
        ...prev.transportDetails,
        [field]: value
      }
    }))
  }

  const handleLineChange = (index: number, field: keyof TransferLine, value: string | number) => {
    const updatedLines = [...formData.lines]
    const line = { ...updatedLines[index] }
    
    if (field === 'quantity') {
      line.quantity = Number(value)
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

    const availableQty = locationStock[formData.fromLocation]?.[itemId] || 0

    const newLine: TransferLine = {
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      quantity: 0,
      availableQty,
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

  const calculateTotalQuantity = () => {
    return formData.lines.reduce((sum, line) => sum + line.quantity, 0)
  }

  const availableItems = items.filter(item => {
    if (selectedItems.has(item.id)) return false
    const stock = locationStock[formData.fromLocation]?.[item.id] || 0
    return stock > 0
  })

  const fromLocationDetails = locations.find(l => l.code === formData.fromLocation)
  const toLocationDetails = locations.find(l => l.code === formData.toLocation)

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">
        {mode === 'create' ? 'Create Stock Transfer' : mode === 'view' ? 'View Stock Transfer' : 'Edit Stock Transfer'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="transferDate" className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Date *
            </label>
            <div className="relative">
              <input
                id="transferDate"
                type="date"
                value={formData.transferDate}
                onChange={(e) => handleInputChange('transferDate', e.target.value)}
                onBlur={() => handleBlur('transferDate')}
                disabled={mode === 'view'}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                  errors.transferDate ? 'border-red-300' : fieldTouched.transferDate && formData.transferDate ? 'border-green-300' : 'border-gray-300'
                }`}
              />
              {fieldTouched.transferDate && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {errors.transferDate ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : formData.transferDate ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.transferDate && (
              <div className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.transferDate}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="transferType" className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Type *
            </label>
            <select
              id="transferType"
              value={formData.transferType}
              onChange={(e) => handleInputChange('transferType', e.target.value)}
              disabled={mode === 'view'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="INTERNAL">Internal Transfer</option>
              <option value="INTER_WAREHOUSE">Inter-Warehouse</option>
              <option value="TO_PRODUCTION">To Production</option>
              <option value="FROM_PRODUCTION">From Production</option>
            </select>
          </div>

          <div>
            <label htmlFor="approvedBy" className="block text-sm font-medium text-gray-700 mb-1">
              Approved By
            </label>
            <input
              id="approvedBy"
              type="text"
              value={formData.approvedBy}
              onChange={(e) => handleInputChange('approvedBy', e.target.value)}
              disabled={mode === 'view'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="Approver name"
            />
          </div>
        </div>

        {/* Location Selection */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="md:col-span-2">
              <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700 mb-1">
                From Location *
              </label>
              <select
                id="fromLocation"
                value={formData.fromLocation}
                onChange={(e) => handleInputChange('fromLocation', e.target.value)}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select location...</option>
                {locations.map(location => (
                  <option key={location.id} value={location.code}>
                    {location.name} ({location.type})
                  </option>
                ))}
              </select>
              {errors.fromLocation && (
                <div className="mt-1 text-sm text-red-600">{errors.fromLocation}</div>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-8 w-8 text-gray-400" />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700 mb-1">
                To Location *
              </label>
              <select
                id="toLocation"
                value={formData.toLocation}
                onChange={(e) => handleInputChange('toLocation', e.target.value)}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select location...</option>
                {locations.map(location => (
                  <option key={location.id} value={location.code}>
                    {location.name} ({location.type})
                  </option>
                ))}
              </select>
              {errors.toLocation && (
                <div className="mt-1 text-sm text-red-600">{errors.toLocation}</div>
              )}
            </div>
          </div>
        </div>

        {/* Transfer Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Transfer Reason *
          </label>
          <div className="relative">
            <input
              id="reason"
              type="text"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              onBlur={() => handleBlur('reason')}
              disabled={mode === 'view'}
              className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                errors.reason ? 'border-red-300' : fieldTouched.reason && formData.reason.trim() ? 'border-green-300' : 'border-gray-300'
              }`}
              placeholder="Reason for transfer"
            />
            {fieldTouched.reason && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {errors.reason ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : formData.reason.trim() ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          {errors.reason && (
            <div className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.reason}
            </div>
          )}
        </div>

        {/* Transport Details (for inter-warehouse) */}
        {(formData.transferType === 'INTER_WAREHOUSE' || showTransportDetails) && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Transport Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="carrier" className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier {formData.transferType === 'INTER_WAREHOUSE' && '*'}
                </label>
                <input
                  id="carrier"
                  type="text"
                  value={formData.transportDetails?.carrier || ''}
                  onChange={(e) => handleTransportDetailChange('carrier', e.target.value)}
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Transport company"
                />
                {errors.carrier && (
                  <div className="mt-1 text-sm text-red-600">{errors.carrier}</div>
                )}
              </div>

              <div>
                <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Number
                </label>
                <input
                  id="trackingNumber"
                  type="text"
                  value={formData.transportDetails?.trackingNumber || ''}
                  onChange={(e) => handleTransportDetailChange('trackingNumber', e.target.value)}
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Tracking number"
                />
              </div>

              <div>
                <label htmlFor="estimatedArrival" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Arrival
                </label>
                <input
                  id="estimatedArrival"
                  type="date"
                  value={formData.transportDetails?.estimatedArrival || ''}
                  onChange={(e) => handleTransportDetailChange('estimatedArrival', e.target.value)}
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Items to Transfer */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Items to Transfer</h3>
            {mode === 'create' && formData.fromLocation && (
              <select
                value=""
                onChange={(e) => e.target.value && addItem(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Add item...</option>
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name} (Available: {locationStock[formData.fromLocation]?.[item.id] || 0})
                  </option>
                ))}
              </select>
            )}
          </div>

          {errors.lines && (
            <div className="mb-2 text-sm text-red-600">{errors.lines}</div>
          )}

          {!formData.fromLocation && mode === 'create' && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Select a source location to add items</span>
            </div>
          )}

          {formData.lines.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                      Available
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transfer Qty
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UoM
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
                  {formData.lines.map((line, index) => (
                    <tr key={line.itemId}>
                      <td className="px-3 py-2 text-sm text-gray-900">{line.itemCode}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{line.itemName}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{line.availableQty}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max={line.availableQty}
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                          disabled={mode === 'view'}
                          className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm text-right disabled:bg-gray-100"
                        />
                        {lineErrors[index]?.quantity && (
                          <div className="text-xs text-red-600 mt-1">
                            {lineErrors[index].quantity}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">
                        {line.unitOfMeasure || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.notes || ''}
                          onChange={(e) => handleLineChange(index, 'notes', e.target.value)}
                          disabled={mode === 'view'}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                          placeholder="Optional"
                        />
                      </td>
                      {mode === 'create' && (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                      Total Items:
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                      {calculateTotalQuantity()}
                    </td>
                    <td colSpan={mode === 'create' ? 3 : 2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* General Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            General Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="Additional notes or comments"
          />
        </div>

        {/* Form Actions */}
        {mode !== 'view' && (
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
              disabled={isSubmitting || formData.lines.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting 
                ? 'Processing...'
                : mode === 'create' 
                  ? 'Create Transfer' 
                  : 'Update Transfer'
              }
            </button>
          </div>
        )}
      </form>
    </div>
  )
}