'use client'

import React, { useState, useEffect } from 'react'

interface Location {
  id?: string
  code: string
  name: string
  type: 'WAREHOUSE' | 'STORE' | 'PRODUCTION' | 'TRANSIT' | 'QUARANTINE' | 'DAMAGED'
  parentId?: string
  address?: {
    street1?: string
    street2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  contactPerson?: string
  phone?: string
  email?: string
  isActive: boolean
  allowNegativeStock?: boolean
  maxCapacity?: number
  currentUtilization?: number
  notes?: string
}

interface LocationFormProps {
  mode: 'create' | 'edit'
  location?: Location
  onSubmit: (data: Location) => Promise<void> | void
  onCancel: () => void
}

export function LocationForm({
  mode,
  location,
  onSubmit,
  onCancel
}: LocationFormProps) {
  const [formData, setFormData] = useState<Location>({
    code: location?.code || '',
    name: location?.name || '',
    type: location?.type || 'WAREHOUSE',
    parentId: location?.parentId || '',
    address: location?.address || {},
    contactPerson: location?.contactPerson || '',
    phone: location?.phone || '',
    email: location?.email || '',
    isActive: location?.isActive ?? true,
    allowNegativeStock: location?.allowNegativeStock ?? false,
    maxCapacity: location?.maxCapacity || 0,
    currentUtilization: location?.currentUtilization || 0,
    notes: location?.notes || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parentLocations, setParentLocations] = useState<Location[]>([])

  // Load parent locations
  useEffect(() => {
    const loadParentLocations = async (): Promise<void> => {
      try {
        const response = await fetch('/api/inventory/locations')
        if (response.ok) {
          const data = await response.json()
          setParentLocations(data.data || [])
        }
      } catch (error) {
        console.error('Error loading locations:', error)
      }
    }

    if (mode === 'create' || (mode === 'edit' && !location?.parentId)) {
      loadParentLocations()
    }
  }, [mode, location])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Location code is required'
    } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only uppercase letters, numbers, and hyphens'
    } else if (formData.code.length < 3) {
      newErrors.code = 'Code must be at least 3 characters long'
    } else if (formData.code.length > 20) {
      newErrors.code = 'Code must not exceed 20 characters'
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Location name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters long'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must not exceed 50 characters'
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // Phone validation
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format'
    }

    // Capacity validation
    if (formData.maxCapacity && formData.maxCapacity < 0) {
      newErrors.maxCapacity = 'Maximum capacity must be non-negative'
    }

    if (formData.currentUtilization && formData.currentUtilization < 0) {
      newErrors.currentUtilization = 'Current utilization must be non-negative'
    }

    if (formData.maxCapacity && formData.currentUtilization && formData.currentUtilization > formData.maxCapacity) {
      newErrors.currentUtilization = 'Current utilization cannot exceed maximum capacity'
    }

    // Parent location validation
    if (formData.parentId === formData.code) {
      newErrors.parentId = 'Location cannot be its own parent'
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

  const handleInputChange = (field: keyof Location | string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const locationTypes = [
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'STORE', label: 'Store' },
    { value: 'PRODUCTION', label: 'Production' },
    { value: 'TRANSIT', label: 'In Transit' },
    { value: 'QUARANTINE', label: 'Quarantine' },
    { value: 'DAMAGED', label: 'Damaged Goods' }
  ]

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">
        {mode === 'create' ? 'Create Location' : 'Edit Location'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Location Code *
              </label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="e.g., WH-001"
                maxLength={20}
              />
              {errors.code && (
                <div className="mt-1 text-sm text-red-600">{errors.code}</div>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Location Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Main Warehouse"
                maxLength={50}
              />
              {errors.name && (
                <div className="mt-1 text-sm text-red-600">{errors.name}</div>
              )}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Location Type *
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {locationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Location
              </label>
              <select
                id="parentId"
                value={formData.parentId}
                onChange={(e) => handleInputChange('parentId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No parent (top-level)</option>
                {parentLocations
                  .filter(loc => loc.code !== formData.code)
                  .map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))
                }
              </select>
              {errors.parentId && (
                <div className="mt-1 text-sm text-red-600">{errors.parentId}</div>
              )}
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="street1" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address 1
              </label>
              <input
                id="street1"
                type="text"
                value={formData.address?.street1 || ''}
                onChange={(e) => handleInputChange('address.street1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="street2" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address 2
              </label>
              <input
                id="street2"
                type="text"
                value={formData.address?.street2 || ''}
                onChange={(e) => handleInputChange('address.street2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                id="city"
                type="text"
                value={formData.address?.city || ''}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State/Province
              </label>
              <input
                id="state"
                type="text"
                value={formData.address?.state || ''}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                id="postalCode"
                type="text"
                value={formData.address?.postalCode || ''}
                onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={formData.address?.country || ''}
                onChange={(e) => handleInputChange('address.country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                id="contactPerson"
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <div className="mt-1 text-sm text-red-600">{errors.phone}</div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
              />
              {errors.email && (
                <div className="mt-1 text-sm text-red-600">{errors.email}</div>
              )}
            </div>
          </div>
        </div>

        {/* Capacity and Settings */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Capacity and Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Capacity
              </label>
              <input
                id="maxCapacity"
                type="number"
                min="0"
                step="0.01"
                value={formData.maxCapacity}
                onChange={(e) => handleInputChange('maxCapacity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Storage units or volume"
              />
              {errors.maxCapacity && (
                <div className="mt-1 text-sm text-red-600">{errors.maxCapacity}</div>
              )}
            </div>

            <div>
              <label htmlFor="currentUtilization" className="block text-sm font-medium text-gray-700 mb-1">
                Current Utilization
              </label>
              <input
                id="currentUtilization"
                type="number"
                min="0"
                step="0.01"
                value={formData.currentUtilization}
                onChange={(e) => handleInputChange('currentUtilization', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Currently used capacity"
              />
              {errors.currentUtilization && (
                <div className="mt-1 text-sm text-red-600">{errors.currentUtilization}</div>
              )}
              {formData.maxCapacity > 0 && formData.currentUtilization > 0 && (
                <div className="mt-1 text-sm text-gray-600">
                  Utilization: {((formData.currentUtilization / formData.maxCapacity) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active Location
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="allowNegativeStock"
                type="checkbox"
                checked={formData.allowNegativeStock}
                onChange={(e) => handleInputChange('allowNegativeStock', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allowNegativeStock" className="ml-2 text-sm text-gray-700">
                Allow Negative Stock
              </label>
              <span className="ml-2 text-xs text-gray-500">(Use with caution)</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional notes or special instructions"
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
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting 
              ? (mode === 'create' ? 'Creating...' : 'Updating...')
              : (mode === 'create' ? 'Create Location' : 'Update Location')
            }
          </button>
        </div>
      </form>
    </div>
  )
}