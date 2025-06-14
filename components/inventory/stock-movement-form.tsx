'use client'

import React, { useState, useEffect } from 'react'
import { MovementType } from '@/lib/generated/prisma'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { 
  quantityValidator,
  nonNegativeNumberValidator,
  notesValidator,
  validateRequired,
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
}

interface StockMovementFormData {
  itemId: string
  movementType: MovementType
  quantity: number
  unitCost: number
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  location?: string
  fromLocation?: string
  toLocation?: string
  notes?: string
}

interface StockMovementFormProps {
  mode: 'create' | 'edit'
  movementType?: MovementType
  movement?: StockMovementFormData
  onSubmit: (data: StockMovementFormData) => Promise<void> | void
  onCancel: () => void
}

export function StockMovementForm({
  mode,
  movementType: initialMovementType,
  movement,
  onSubmit,
  onCancel
}: StockMovementFormProps): React.JSX.Element {
  const [formData, setFormData] = useState<StockMovementFormData>({
    itemId: movement?.itemId || '',
    movementType: movement?.movementType || initialMovementType || MovementType.ADJUSTMENT,
    quantity: movement?.quantity || 0,
    unitCost: movement?.unitCost || 0,
    referenceType: movement?.referenceType || '',
    referenceId: movement?.referenceId || '',
    referenceNumber: movement?.referenceNumber || '',
    location: movement?.location || '',
    fromLocation: movement?.fromLocation || '',
    toLocation: movement?.toLocation || '',
    notes: movement?.notes || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [locationStock, setLocationStock] = useState<Record<string, number>>({})
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({})

  // Load reference data
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        // Load items
        const itemResponse = await fetch('/api/inventory/items')
        if (itemResponse.ok) {
          const itemData = await itemResponse.json()
          setItems(itemData.data || [])
        }

        // Load locations
        const locationResponse = await fetch('/api/inventory/locations')
        if (locationResponse.ok) {
          const locationData = await locationResponse.json()
          setLocations(locationData.data || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [])

  // Load current stock when item changes
  useEffect(() => {
    if (formData.itemId) {
      loadCurrentStock(formData.itemId)
    }
  }, [formData.itemId])

  // Load location stock for transfers
  useEffect(() => {
    if (formData.itemId && formData.movementType === MovementType.TRANSFER) {
      loadLocationStock(formData.itemId)
    }
  }, [formData.itemId, formData.movementType])

  const loadCurrentStock = async (itemId: string): void => {
    setIsLoadingStock(true)
    try {
      const response = await fetch(`/api/inventory/items/${itemId}/stock`)
      if (response.ok) {
        const data = await response.json()
        setCurrentStock(data.stock)
      }
    } catch (error) {
      console.error('Error loading stock:', error)
    } finally {
      setIsLoadingStock(false)
    }
  }

  const loadLocationStock = async (itemId: string): void => {
    try {
      const response = await fetch(`/api/inventory/items/${itemId}/stock-by-location`)
      if (response.ok) {
        const data = await response.json()
        setLocationStock(data.stockByLocation || {})
      }
    } catch (error) {
      console.error('Error loading location stock:', error)
    }
  }

  const validateForm = (): void => {
    const newErrors: Record<string, string> = {}

    // Item validation
    const itemError = validateRequired(formData.itemId, 'Item')
    if (itemError) {
      newErrors.itemId = itemError
    }

    // Movement type validation
    const movementTypeError = validateRequired(formData.movementType, 'Movement type')
    if (movementTypeError) {
      newErrors.movementType = movementTypeError
    }

    // Quantity validation
    if (formData.quantity === 0) {
      newErrors.quantity = 'Quantity cannot be zero'
    } else if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity must be positive'
    } else {
      const quantityResult = quantityValidator.safeParse(formData.quantity)
      if (!quantityResult.success) {
        newErrors.quantity = quantityResult.error.errors[0].message
      }
    }

    // Stock out validations
    if ([MovementType.STOCK_OUT, MovementType.SALE, MovementType.CONSUMPTION].includes(formData.movementType)) {
      if (currentStock !== null && formData.quantity > currentStock) {
        newErrors.quantity = `Insufficient stock. Available: ${currentStock}`
      }
    }

    // Transfer validations
    if (formData.movementType === MovementType.TRANSFER) {
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
      
      if (formData.fromLocation && locationStock[formData.fromLocation] !== undefined && formData.quantity > locationStock[formData.fromLocation]) {
        newErrors.quantity = `Insufficient stock at source. Available: ${locationStock[formData.fromLocation]} ${selectedItem?.unitOfMeasure?.code || ''}`
      }
    }

    // Location validation for non-transfer movements
    if (formData.movementType !== MovementType.TRANSFER) {
      const locationError = validateRequired(formData.location, 'Location')
      if (locationError) {
        newErrors.location = locationError
      }
    }

    // Unit cost validation
    const unitCostResult = nonNegativeNumberValidator.safeParse(formData.unitCost)
    if (!unitCostResult.success) {
      newErrors.unitCost = unitCostResult.error.errors[0].message
    }

    // Stock in movements require unit cost
    if ([MovementType.STOCK_IN, MovementType.PURCHASE, MovementType.RETURN].includes(formData.movementType) && formData.unitCost === 0) {
      newErrors.unitCost = 'Unit cost is required for inbound movements'
    }

    // Adjustment movements require notes/reason
    if (formData.movementType === MovementType.ADJUSTMENT) {
      const notesError = validateRequired(formData.notes?.trim(), 'Reason')
      if (notesError) {
        newErrors.notes = 'Reason is required for adjustments'
      }
    }

    // Validate notes length if provided
    if (formData.notes) {
      const notesLengthError = checkMaxLength(formData.notes, MAX_NOTES_LENGTH, 'Notes')
      if (notesLengthError) {
        newErrors.notes = notesLengthError
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): void => {
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

  const handleInputChange = (field: keyof StockMovementFormData, value: string | number): void => {
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

  const validateField = (field: keyof StockMovementFormData, value: string | number): void => {
    let fieldError = ''

    switch (field) {
      case 'quantity':
        const qty = Number(value)
        if (qty === 0) {
          fieldError = 'Quantity cannot be zero'
        } else if (qty < 0) {
          fieldError = 'Quantity must be positive'
        } else if ([MovementType.STOCK_OUT, MovementType.SALE, MovementType.CONSUMPTION].includes(formData.movementType) && currentStock !== null && qty > currentStock) {
          fieldError = `Insufficient stock. Available: ${currentStock}`
        }
        break
      
      case 'unitCost':
        const cost = Number(value)
        if (cost < 0) {
          fieldError = 'Unit cost must be non-negative'
        }
        break
        
      case 'notes':
        if (formData.movementType === MovementType.ADJUSTMENT && !String(value).trim()) {
          fieldError = 'Reason is required for adjustments'
        } else if (String(value).length > MAX_NOTES_LENGTH) {
          fieldError = `Notes must be less than ${MAX_NOTES_LENGTH} characters`
        }
        break
    }

    if (fieldError) {
      setErrors(prev => ({ ...prev, [field]: fieldError }))
    }
  }

  const handleBlur = (field: keyof StockMovementFormData): void => {
    if (!fieldTouched[field]) {
      setFieldTouched(prev => ({ ...prev, [field]: true }))
    }
    validateField(field, formData[field] as string | number)
  }

  const isInboundMovement = [MovementType.STOCK_IN, MovementType.PURCHASE, MovementType.RETURN, MovementType.PRODUCTION].includes(formData.movementType)
  const isOutboundMovement = [MovementType.STOCK_OUT, MovementType.SALE, MovementType.CONSUMPTION].includes(formData.movementType)
  const isTransferMovement = formData.movementType === MovementType.TRANSFER
  const isAdjustmentMovement = formData.movementType === MovementType.ADJUSTMENT

  const selectedItem = items.find(item => item.id === formData.itemId)

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">
        {mode === 'create' ? 'Create Stock Movement' : 'Edit Stock Movement'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Movement Type */}
        <div>
          <label htmlFor="movementType" className="block text-sm font-medium text-gray-700 mb-1">
            Movement Type *
          </label>
          <div className="relative">
            <select
              id="movementType"
              value={formData.movementType}
              onChange={(e): void => handleInputChange('movementType', e.target.value as MovementType)}
              onBlur={(): void => handleBlur('movementType')}
              disabled={mode === 'edit' || !!initialMovementType}
              className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                errors.movementType ? 'border-red-300' : fieldTouched.movementType && formData.movementType ? 'border-green-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select movement type...</option>
              <option value={MovementType.ADJUSTMENT}>Adjustment</option>
              <option value={MovementType.STOCK_IN}>Stock In</option>
              <option value={MovementType.STOCK_OUT}>Stock Out</option>
              <option value={MovementType.TRANSFER}>Transfer</option>
              <option value={MovementType.PURCHASE}>Purchase</option>
              <option value={MovementType.SALE}>Sale</option>
              <option value={MovementType.CONSUMPTION}>Consumption</option>
              <option value={MovementType.PRODUCTION}>Production</option>
              <option value={MovementType.RETURN}>Return</option>
            </select>
            {fieldTouched.movementType && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {errors.movementType ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : formData.movementType ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          {errors.movementType && (
            <div className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.movementType}
            </div>
          )}
        </div>

        {/* Item Selection */}
        <div>
          <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
            Item *
          </label>
          <div className="relative">
            <select
              id="item"
              value={formData.itemId}
              onChange={(e): void => handleInputChange('itemId', e.target.value)}
              onBlur={(): void => handleBlur('itemId')}
              disabled={mode === 'edit'}
              className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                errors.itemId ? 'border-red-300' : fieldTouched.itemId && formData.itemId ? 'border-green-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
            {(fieldTouched.itemId || isLoadingStock) && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {isLoadingStock ? (
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                ) : errors.itemId ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : formData.itemId ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          {errors.itemId && (
            <div className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.itemId}
            </div>
          )}
          {currentStock !== null && !isTransferMovement && formData.itemId && (
            <div className={`mt-1 text-sm flex items-center ${
              currentStock === 0 ? 'text-red-600' : currentStock < 10 ? 'text-orange-600' : 'text-gray-600'
            }`}>
              {currentStock === 0 && <AlertCircle className="h-4 w-4 mr-1" />}
              Current stock: {currentStock} {selectedItem?.unitOfMeasure?.code}
              {currentStock === 0 && ' (Out of stock)'}
              {currentStock > 0 && currentStock < 10 && ' (Low stock)'}
            </div>
          )}
        </div>

        {/* Quantity and Unit Cost */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <div className="relative">
              <div className="flex items-center space-x-2">
                <input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity || ''}
                  onChange={(e): void => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
                  onBlur={(): void => handleBlur('quantity')}
                  className={`flex-1 px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.quantity ? 'border-red-300' : fieldTouched.quantity && formData.quantity > 0 ? 'border-green-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter quantity"
                />
                {selectedItem?.unitOfMeasure && (
                  <span className="text-sm text-gray-600">{selectedItem.unitOfMeasure.code}</span>
                )}
              </div>
              {fieldTouched.quantity && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none" style={{ right: selectedItem?.unitOfMeasure ? '60px' : '12px' }}>
                  {errors.quantity ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : formData.quantity > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.quantity && (
              <div className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.quantity}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700 mb-1">
              Unit Cost {isInboundMovement && '*'}
            </label>
            <div className="relative">
              <input
                id="unitCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitCost || ''}
                onChange={(e): void => handleInputChange('unitCost', parseFloat(e.target.value) || 0)}
                onBlur={(): void => handleBlur('unitCost')}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  isOutboundMovement ? 'bg-gray-100' : ''
                } ${
                  errors.unitCost ? 'border-red-300' : fieldTouched.unitCost && (formData.unitCost >= 0 && (!isInboundMovement || formData.unitCost > 0)) ? 'border-green-300' : 'border-gray-300'
                }`}
                placeholder={isOutboundMovement ? 'Auto-calculated (FIFO)' : 'Enter unit cost'}
                readOnly={isOutboundMovement}
              />
              {fieldTouched.unitCost && !isOutboundMovement && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {errors.unitCost ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (formData.unitCost >= 0 && (!isInboundMovement || formData.unitCost > 0)) ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.unitCost && (
              <div className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.unitCost}
              </div>
            )}
            {formData.quantity > 0 && formData.unitCost > 0 && (
              <div className="mt-1 text-sm text-gray-600">
                Total cost: AED {(Number(formData.quantity || 0) * Number(formData.unitCost || 0)).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Location fields */}
        {isTransferMovement ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700 mb-1">
                From Location *
              </label>
              <div className="relative">
                <select
                  id="fromLocation"
                  value={formData.fromLocation}
                  onChange={(e): void => handleInputChange('fromLocation', e.target.value)}
                  onBlur={(): void => handleBlur('fromLocation')}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fromLocation ? 'border-red-300' : fieldTouched.fromLocation && formData.fromLocation ? 'border-green-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select location...</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.code}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {fieldTouched.fromLocation && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {errors.fromLocation ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : formData.fromLocation ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {errors.fromLocation && (
                <div className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.fromLocation}
                </div>
              )}
              {formData.fromLocation && locationStock[formData.fromLocation] !== undefined && (
                <div className={`mt-1 text-sm flex items-center ${
                  locationStock[formData.fromLocation] === 0 ? 'text-red-600' : 
                  locationStock[formData.fromLocation] < formData.quantity ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {locationStock[formData.fromLocation] === 0 && <AlertCircle className="h-4 w-4 mr-1" />}
                  Available: {locationStock[formData.fromLocation]} {selectedItem?.unitOfMeasure?.code}
                  {locationStock[formData.fromLocation] === 0 && ' (No stock at this location)'}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700 mb-1">
                To Location *
              </label>
              <div className="relative">
                <select
                  id="toLocation"
                  value={formData.toLocation}
                  onChange={(e): void => handleInputChange('toLocation', e.target.value)}
                  onBlur={(): void => handleBlur('toLocation')}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.toLocation ? 'border-red-300' : fieldTouched.toLocation && formData.toLocation ? 'border-green-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select location...</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.code}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {fieldTouched.toLocation && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {errors.toLocation ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : formData.toLocation ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {errors.toLocation && (
                <div className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.toLocation}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <div className="relative">
              <select
                id="location"
                value={formData.location}
                onChange={(e): void => handleInputChange('location', e.target.value)}
                onBlur={(): void => handleBlur('location')}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.location ? 'border-red-300' : fieldTouched.location && formData.location ? 'border-green-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select location...</option>
                {locations.map(location => (
                  <option key={location.id} value={location.code}>
                    {location.name}
                  </option>
                ))}
              </select>
              {fieldTouched.location && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {errors.location ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : formData.location ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.location && (
              <div className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.location}
              </div>
            )}
          </div>
        )}

        {/* Reference Information */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reference Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="referenceType" className="block text-sm font-medium text-gray-700 mb-1">
                Reference Type
              </label>
              <input
                id="referenceType"
                type="text"
                value={formData.referenceType}
                onChange={(e): void => handleInputChange('referenceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., PO, SO, Invoice"
              />
            </div>

            <div>
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                id="referenceNumber"
                type="text"
                value={formData.referenceNumber}
                onChange={(e): void => handleInputChange('referenceNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document number"
              />
            </div>

            <div>
              <label htmlFor="referenceId" className="block text-sm font-medium text-gray-700 mb-1">
                Reference ID
              </label>
              <input
                id="referenceId"
                type="text"
                value={formData.referenceId}
                onChange={(e): void => handleInputChange('referenceId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="System ID"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes {isAdjustmentMovement && '(Reason) *'}
          </label>
          <div className="relative">
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e): void => handleInputChange('notes', e.target.value)}
              onBlur={(): void => handleBlur('notes')}
              className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.notes ? 'border-red-300' : 
                fieldTouched.notes && ((isAdjustmentMovement && formData.notes?.trim()) || (!isAdjustmentMovement && formData.notes)) ? 'border-green-300' : 
                'border-gray-300'
              }`}
              placeholder={isAdjustmentMovement ? 'Reason for adjustment (required)' : 'Additional notes (optional)'}
              maxLength={MAX_NOTES_LENGTH}
            />
            {fieldTouched.notes && (
              <div className="absolute top-2 right-2 pointer-events-none">
                {errors.notes ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : ((isAdjustmentMovement && formData.notes?.trim()) || (!isAdjustmentMovement && formData.notes)) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          <div className="mt-1 flex justify-between items-center">
            {errors.notes && (
              <div className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.notes}
              </div>
            )}
            <div className={`text-xs ${formData.notes.length > MAX_NOTES_LENGTH * 0.9 ? 'text-orange-600' : 'text-gray-500'} ml-auto`}>
              {formData.notes.length}/{MAX_NOTES_LENGTH} characters
            </div>
          </div>
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
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting 
              ? (mode === 'create' ? 'Creating...' : 'Updating...')
              : (mode === 'create' ? 'Create Movement' : 'Update Movement')
            }
          </button>
        </div>
      </form>
    </div>
  )
}