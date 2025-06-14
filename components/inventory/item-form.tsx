'use client'

import React, { useState, useEffect } from 'react'
import { Item } from './item-list'
import { Category } from './category-tree'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { 
  codeValidator,
  nameValidator,
  descriptionValidator,
  nonNegativeNumberValidator,
  currencyAmountValidator,
  validateRequired,
  MAX_CODE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  checkMaxLength
} from '@/lib/validators/common.validator'

interface UnitOfMeasure {
  id: string
  code: string
  name: string
  symbol?: string
}

interface GLAccount {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
}

interface ItemFormData {
  code: string
  name: string
  description: string
  categoryId: string
  type: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
  unitOfMeasureId: string
  trackInventory: boolean
  minStockLevel: number
  maxStockLevel: number
  reorderPoint: number
  standardCost: number
  listPrice: number
  inventoryAccountId?: string
  cogsAccountId?: string
  salesAccountId?: string
  isActive: boolean
  isSaleable: boolean
  isPurchaseable: boolean
}

interface ItemFormProps {
  mode: 'create' | 'edit'
  item?: Item
  onSubmit: (data: ItemFormData) => Promise<void> | void
  onCancel: () => void
}

export function ItemForm({
  mode,
  item,
  onSubmit,
  onCancel
}: ItemFormProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    code: item?.code || '',
    name: item?.name || '',
    description: item?.description || '',
    categoryId: item?.category?.id || '',
    type: item?.type || 'PRODUCT',
    unitOfMeasureId: item?.unitOfMeasure?.id || '',
    trackInventory: item?.trackInventory ?? true,
    minStockLevel: item?.minStockLevel || 0,
    maxStockLevel: item?.maxStockLevel || 0,
    reorderPoint: item?.reorderPoint || 0,
    standardCost: item?.standardCost || 0,
    listPrice: item?.listPrice || 0,
    inventoryAccountId: item?.inventoryAccountId || '',
    cogsAccountId: item?.cogsAccountId || '',
    salesAccountId: item?.salesAccountId || '',
    isActive: item?.isActive ?? true,
    isSaleable: item?.isSaleable ?? true,
    isPurchaseable: item?.isPurchaseable ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<UnitOfMeasure[]>([])
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([])
  const [generatingCode, setGeneratingCode] = useState(false)
  const [checkingCodeUniqueness, setCheckingCodeUniqueness] = useState(false)
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({})

  // Load reference data on mount
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        // Load categories
        const catResponse = await fetch('/api/inventory/categories')
        if (catResponse.ok) {
          const catData = await catResponse.json()
          setCategories(catData.data || [])
        }

        // Load units of measure
        const uomResponse = await fetch('/api/inventory/units-of-measure')
        if (uomResponse.ok) {
          const uomData = await uomResponse.json()
          setUnits(uomData.data || [])
        }

        // Load GL accounts
        const glResponse = await fetch('/api/accounting/accounts')
        if (glResponse.ok) {
          const glData = await glResponse.json()
          setGlAccounts(glData.data || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [])

  // Auto-disable inventory tracking for services
  useEffect(() => {
    if (formData.type === 'SERVICE') {
      setFormData(prev => ({ ...prev, trackInventory: false }))
    }
  }, [formData.type])

  const generateCode = async (): Promise<unknown> => {
    if (!formData.categoryId) {
      setErrors(prev => ({ ...prev, categoryId: 'Select a category first' }))
      return
    }

    setGeneratingCode(true)
    try {
      const response = await fetch(`/api/inventory/items/generate-code?categoryId=${formData.categoryId}`)
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, code: data.code }))
        setErrors(prev => ({ ...prev, code: '' }))
      }
      } catch (error) {
        console.error('Error generating code:', error)
      } finally {
        setGeneratingCode(false)
      }
  }

  const checkCodeUniqueness = async (code: string) => {
    if (!code || mode !== 'create') return

    setCheckingCodeUniqueness(true)
    try {
      const response = await fetch(`/api/inventory/items/check-code?code=${encodeURIComponent(code)}`)
      if (response.ok) {
        const data = await response.json()
        if (!data.available) {
          setErrors(prev => ({ ...prev, code: 'This item code already exists' }))
        }
      }
    } catch (error) {
      console.error('Error checking code uniqueness:', error)
    } finally {
      setCheckingCodeUniqueness(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Item code validation using common validator
    if (!formData.code.trim()) {
      newErrors.code = 'Item code is required'
    } else {
      const codeResult = codeValidator.safeParse(formData.code)
      if (!codeResult.success) {
        newErrors.code = codeResult.error.errors[0].message
      } else if (formData.code.length < 3) {
        newErrors.code = 'Item code must be at least 3 characters long'
      }
    }

    // Item name validation using common validator
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required'
    } else {
      const nameResult = nameValidator.safeParse(formData.name)
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message
      } else if (formData.name.length < 3) {
        newErrors.name = 'Item name must be at least 3 characters long'
      }
    }

    // Description validation using common validator
    if (formData.description) {
      const descResult = descriptionValidator.safeParse(formData.description)
      if (!descResult.success) {
        newErrors.description = descResult.error.errors[0].message
      }
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required'
    }

    if (!formData.unitOfMeasureId) {
      newErrors.unitOfMeasureId = 'Unit of measure is required'
    }

    // Stock level validations
    if (formData.trackInventory) {
      if (formData.minStockLevel < 0) {
        newErrors.minStockLevel = 'Min stock level must be non-negative'
      }

      if (formData.maxStockLevel < 0) {
        newErrors.maxStockLevel = 'Max stock level must be non-negative'
      }

      if (formData.maxStockLevel > 0 && formData.minStockLevel > formData.maxStockLevel) {
        newErrors.minStockLevel = 'Min stock level cannot exceed max stock level'
      }

      if (formData.reorderPoint < 0) {
        newErrors.reorderPoint = 'Reorder point must be non-negative'
      }

      if (formData.reorderPoint > 0 && formData.minStockLevel > 0 && formData.reorderPoint < formData.minStockLevel) {
        newErrors.reorderPoint = 'Reorder point should not be less than min stock level'
      }

      if (formData.maxStockLevel > 0 && formData.reorderPoint > formData.maxStockLevel) {
        newErrors.reorderPoint = 'Reorder point should not exceed max stock level'
      }
    }

    // Cost and price validations
    if (formData.standardCost < 0) {
      newErrors.standardCost = 'Standard cost must be non-negative'
    }

    if (formData.listPrice < 0) {
      newErrors.listPrice = 'List price must be non-negative'
    }

    if (formData.isSaleable && formData.listPrice === 0) {
      newErrors.listPrice = 'List price is required for saleable items'
    }

    if (formData.listPrice > 0 && formData.standardCost > formData.listPrice) {
      newErrors.standardCost = 'Standard cost should not exceed list price'
    }

    // GL Account validations
    if (formData.trackInventory && !formData.inventoryAccountId) {
      newErrors.inventoryAccountId = 'Inventory account is required for items that track inventory'
    }

    if (formData.isSaleable && !formData.salesAccountId) {
      newErrors.salesAccountId = 'Sales account is required for saleable items'
    }

    if ((formData.isSaleable || formData.trackInventory) && !formData.cogsAccountId) {
      newErrors.cogsAccountId = 'COGS account is required'
    }

    // Business rule validations
    if (formData.type === 'SERVICE' && formData.trackInventory) {
      newErrors.trackInventory = 'Services cannot track inventory'
    }

    if (!formData.isSaleable && !formData.isPurchaseable) {
      newErrors.isSaleable = 'Item must be either saleable or purchaseable'
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

  const handleInputChange = (field: keyof ItemFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Filter GL accounts by type
  const inventoryAccounts = glAccounts.filter(acc => acc.type === 'ASSET')
  const cogsAccounts = glAccounts.filter(acc => acc.type === 'EXPENSE')
  const salesAccounts = glAccounts.filter(acc => acc.type === 'INCOME')

  const isInventoryDisabled = formData.type === 'SERVICE' || !formData.trackInventory

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">
        {mode === 'create' ? 'Create Item' : 'Edit Item'}
      </h2>

      <form role="form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Item Code *
              </label>
              <div className="flex space-x-2">
                <input
                  id="code"
                  type="text"
                  required
                  disabled={mode === 'edit'}
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  onBlur={() => mode === 'create' && formData.code && checkCodeUniqueness(formData.code)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Enter or generate code"
                  maxLength={20}
                />
                {mode === 'create' && (
                  <button
                    type="button"
                    onClick={generateCode}
                    disabled={generatingCode}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    {generatingCode ? 'Generating...' : 'Generate Code'}
                  </button>
                )}
              </div>
              {errors.code && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.code}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Item Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter item name"
                maxLength={100}
              />
              {errors.name && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.name}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
                maxLength={500}
              />
              {errors.description && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.description}
                </div>
              )}
              <div className="mt-1 text-xs text-gray-500">
                {formData.description.length}/500 characters
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.categoryId}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PRODUCT">Product</option>
                <option value="SERVICE">Service</option>
                <option value="RAW_MATERIAL">Raw Material</option>
              </select>
            </div>

            <div>
              <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure *
              </label>
              <select
                id="unitOfMeasure"
                value={formData.unitOfMeasureId}
                onChange={(e) => handleInputChange('unitOfMeasureId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select unit...</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
              {errors.unitOfMeasureId && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.unitOfMeasureId}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="trackInventory"
                type="checkbox"
                checked={formData.trackInventory}
                onChange={(e) => handleInputChange('trackInventory', e.target.checked)}
                disabled={formData.type === 'SERVICE'}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="trackInventory" className="ml-2 text-sm text-gray-700">
                Track Inventory
              </label>
              {formData.type === 'SERVICE' && (
                <span className="ml-2 text-xs text-gray-500">(Inventory tracking disabled)</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="minStockLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Min Stock Level
                </label>
                <input
                  id="minStockLevel"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={isInventoryDisabled}
                  value={formData.minStockLevel}
                  onChange={(e) => handleInputChange('minStockLevel', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
                {errors.minStockLevel && (
                  <div role="alert" className="mt-1 text-sm text-red-600">
                    {errors.minStockLevel}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="maxStockLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Stock Level
                </label>
                <input
                  id="maxStockLevel"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={isInventoryDisabled}
                  value={formData.maxStockLevel}
                  onChange={(e) => handleInputChange('maxStockLevel', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
                {errors.maxStockLevel && (
                  <div role="alert" className="mt-1 text-sm text-red-600">
                    {errors.maxStockLevel}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Point
                </label>
                <input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={isInventoryDisabled}
                  value={formData.reorderPoint}
                  onChange={(e) => handleInputChange('reorderPoint', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
                {errors.reorderPoint && (
                  <div role="alert" className="mt-1 text-sm text-red-600">
                    {errors.reorderPoint}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="standardCost" className="block text-sm font-medium text-gray-700 mb-1">
                Standard Cost
              </label>
              <input
                id="standardCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.standardCost}
                onChange={(e) => handleInputChange('standardCost', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.standardCost && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.standardCost}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="listPrice" className="block text-sm font-medium text-gray-700 mb-1">
                List Price
              </label>
              <input
                id="listPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.listPrice}
                onChange={(e) => handleInputChange('listPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.listPrice && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.listPrice}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GL Accounts */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">GL Account Assignments</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inventoryAccount" className="block text-sm font-medium text-gray-700 mb-1">
                Inventory Account
              </label>
              <select
                id="inventoryAccount"
                value={formData.inventoryAccountId}
                onChange={(e) => handleInputChange('inventoryAccountId', e.target.value)}
                disabled={!formData.trackInventory}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select account...</option>
                {inventoryAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cogsAccount" className="block text-sm font-medium text-gray-700 mb-1">
                COGS Account
              </label>
              <select
                id="cogsAccount"
                value={formData.cogsAccountId}
                onChange={(e) => handleInputChange('cogsAccountId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select account...</option>
                {cogsAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="salesAccount" className="block text-sm font-medium text-gray-700 mb-1">
                Sales Account
              </label>
              <select
                id="salesAccount"
                value={formData.salesAccountId}
                onChange={(e) => handleInputChange('salesAccountId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select account...</option>
                {salesAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="isSaleable"
                type="checkbox"
                checked={formData.isSaleable}
                onChange={(e) => handleInputChange('isSaleable', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isSaleable" className="ml-2 text-sm text-gray-700">
                Can be Sold
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="isPurchaseable"
                type="checkbox"
                checked={formData.isPurchaseable}
                onChange={(e) => handleInputChange('isPurchaseable', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPurchaseable" className="ml-2 text-sm text-gray-700">
                Can be Purchased
              </label>
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
            disabled={isSubmitting || checkingCodeUniqueness}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting 
              ? (mode === 'create' ? 'Creating...' : 'Updating...')
              : (mode === 'create' ? 'Create Item' : 'Update Item')
            }
          </button>
        </div>
      </form>
    </div>
  )
}