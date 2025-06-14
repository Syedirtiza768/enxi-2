'use client'

import React, { useState, useEffect } from 'react'

interface UnitOfMeasure {
  id?: string
  code: string
  name: string
  symbol?: string
  category: 'LENGTH' | 'WEIGHT' | 'VOLUME' | 'AREA' | 'TIME' | 'QUANTITY' | 'TEMPERATURE' | 'OTHER'
  baseUnitId?: string
  conversionFactor?: number
  decimalPlaces: number
  isActive: boolean
  description?: string
}

interface UnitOfMeasureFormProps {
  mode: 'create' | 'edit'
  unit?: UnitOfMeasure
  onSubmit: (data: UnitOfMeasure) => Promise<void> | void
  onCancel: () => void
}

export function UnitOfMeasureForm({
  mode,
  unit,
  onSubmit,
  onCancel
}: UnitOfMeasureFormProps) {
  const [formData, setFormData] = useState<UnitOfMeasure>({
    code: unit?.code || '',
    name: unit?.name || '',
    symbol: unit?.symbol || '',
    category: unit?.category || 'QUANTITY',
    baseUnitId: unit?.baseUnitId || '',
    conversionFactor: unit?.conversionFactor || 1,
    decimalPlaces: unit?.decimalPlaces || 2,
    isActive: unit?.isActive ?? true,
    description: unit?.description || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [baseUnits, setBaseUnits] = useState<UnitOfMeasure[]>([])

  // Load base units for conversion
  useEffect(() => {
    const loadBaseUnits = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/inventory/units-of-measure?category=${formData.category}`)
        if (response.ok) {
          const data = await response.json()
          setBaseUnits(data.data?.filter((u: UnitOfMeasure) => !u.baseUnitId) || [])
        }
      } catch (error) {
        console.error('Error loading base units:', error)
      }
    }

    loadBaseUnits()
  }, [formData.category])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Unit code is required'
    } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only uppercase letters, numbers, and hyphens'
    } else if (formData.code.length > 10) {
      newErrors.code = 'Code must not exceed 10 characters'
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Unit name is required'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must not exceed 50 characters'
    }

    // Symbol validation
    if (formData.symbol && formData.symbol.length > 10) {
      newErrors.symbol = 'Symbol must not exceed 10 characters'
    }

    // Conversion factor validation
    if (formData.baseUnitId && formData.conversionFactor) {
      if (formData.conversionFactor <= 0) {
        newErrors.conversionFactor = 'Conversion factor must be positive'
      }
      if (formData.conversionFactor > 1000000) {
        newErrors.conversionFactor = 'Conversion factor seems too large'
      }
    }

    // Decimal places validation
    if (formData.decimalPlaces < 0) {
      newErrors.decimalPlaces = 'Decimal places must be non-negative'
    } else if (formData.decimalPlaces > 6) {
      newErrors.decimalPlaces = 'Maximum 6 decimal places allowed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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

  const handleInputChange = (field: keyof UnitOfMeasure, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Reset base unit and conversion factor when category changes
    if (field === 'category') {
      setFormData(prev => ({ ...prev, baseUnitId: '', conversionFactor: 1 }))
    }
  }

  const unitCategories = [
    { value: 'LENGTH', label: 'Length' },
    { value: 'WEIGHT', label: 'Weight' },
    { value: 'VOLUME', label: 'Volume' },
    { value: 'AREA', label: 'Area' },
    { value: 'TIME', label: 'Time' },
    { value: 'QUANTITY', label: 'Quantity' },
    { value: 'TEMPERATURE', label: 'Temperature' },
    { value: 'OTHER', label: 'Other' }
  ]

  const commonUnits = {
    LENGTH: [
      { code: 'M', name: 'Meter', symbol: 'm' },
      { code: 'CM', name: 'Centimeter', symbol: 'cm' },
      { code: 'MM', name: 'Millimeter', symbol: 'mm' },
      { code: 'KM', name: 'Kilometer', symbol: 'km' },
      { code: 'FT', name: 'Feet', symbol: 'ft' },
      { code: 'IN', name: 'Inch', symbol: 'in' }
    ],
    WEIGHT: [
      { code: 'KG', name: 'Kilogram', symbol: 'kg' },
      { code: 'G', name: 'Gram', symbol: 'g' },
      { code: 'MG', name: 'Milligram', symbol: 'mg' },
      { code: 'MT', name: 'Metric Ton', symbol: 't' },
      { code: 'LB', name: 'Pound', symbol: 'lb' },
      { code: 'OZ', name: 'Ounce', symbol: 'oz' }
    ],
    VOLUME: [
      { code: 'L', name: 'Liter', symbol: 'L' },
      { code: 'ML', name: 'Milliliter', symbol: 'mL' },
      { code: 'GAL', name: 'Gallon', symbol: 'gal' },
      { code: 'QT', name: 'Quart', symbol: 'qt' }
    ],
    QUANTITY: [
      { code: 'EA', name: 'Each', symbol: 'ea' },
      { code: 'PC', name: 'Piece', symbol: 'pc' },
      { code: 'BOX', name: 'Box', symbol: 'box' },
      { code: 'CTN', name: 'Carton', symbol: 'ctn' },
      { code: 'DZ', name: 'Dozen', symbol: 'dz' },
      { code: 'PAIR', name: 'Pair', symbol: 'pr' }
    ]
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">
        {mode === 'create' ? 'Create Unit of Measure' : 'Edit Unit of Measure'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Unit Code *
              </label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="e.g., KG, EA, L"
                maxLength={10}
              />
              {errors.code && (
                <div className="mt-1 text-sm text-red-600">{errors.code}</div>
              )}
            </div>

            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                Symbol
              </label>
              <input
                id="symbol"
                type="text"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., kg, ea, L"
                maxLength={10}
              />
              {errors.symbol && (
                <div className="mt-1 text-sm text-red-600">{errors.symbol}</div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Unit Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Kilogram, Each, Liter"
              maxLength={50}
            />
            {errors.name && (
              <div className="mt-1 text-sm text-red-600">{errors.name}</div>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {unitCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description or notes"
            />
          </div>
        </div>

        {/* Conversion Settings */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="baseUnitId" className="block text-sm font-medium text-gray-700 mb-1">
                Base Unit
              </label>
              <select
                id="baseUnitId"
                value={formData.baseUnitId}
                onChange={(e) => handleInputChange('baseUnitId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">This is a base unit</option>
                {baseUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty if this is a base unit for its category
              </p>
            </div>

            {formData.baseUnitId && (
              <div>
                <label htmlFor="conversionFactor" className="block text-sm font-medium text-gray-700 mb-1">
                  Conversion Factor *
                </label>
                <input
                  id="conversionFactor"
                  type="number"
                  min="0.000001"
                  step="any"
                  value={formData.conversionFactor}
                  onChange={(e) => handleInputChange('conversionFactor', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 1000 (for g to kg)"
                />
                {errors.conversionFactor && (
                  <div className="mt-1 text-sm text-red-600">{errors.conversionFactor}</div>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  1 {formData.code || 'unit'} = {formData.conversionFactor} {baseUnits.find(u => u.id === formData.baseUnitId)?.code || 'base unit'}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="decimalPlaces" className="block text-sm font-medium text-gray-700 mb-1">
                Decimal Places *
              </label>
              <input
                id="decimalPlaces"
                type="number"
                min="0"
                max="6"
                value={formData.decimalPlaces}
                onChange={(e) => handleInputChange('decimalPlaces', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.decimalPlaces && (
                <div className="mt-1 text-sm text-red-600">{errors.decimalPlaces}</div>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Number of decimal places to display for this unit
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active
              </label>
            </div>
          </div>
        </div>

        {/* Common Units Reference */}
        {mode === 'create' && commonUnits[formData.category as keyof typeof commonUnits] && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Common Units for {formData.category}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
              {commonUnits[formData.category as keyof typeof commonUnits].map(unit => (
                <div key={unit.code} className="flex items-center">
                  <span className="font-mono">{unit.code}</span>
                  <span className="mx-1">-</span>
                  <span>{unit.name}</span>
                  {unit.symbol && <span className="ml-1 text-gray-400">({unit.symbol})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting 
              ? (mode === 'create' ? 'Creating...' : 'Updating...')
              : (mode === 'create' ? 'Create Unit' : 'Update Unit')
            }
          </button>
        </div>
      </form>
    </div>
  )
}