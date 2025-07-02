'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Loader2, AlertCircle, Check, Package, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import {
  codeValidator,
  nameValidator,
  descriptionValidator,
} from '@/lib/validators/common.validator'

interface QuickItemFormProps {
  onSuccess?: (item: any) => void
  onCancel?: () => void
  defaultValues?: {
    categoryId?: string
    type?: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
    locationId?: string
  }
  compact?: boolean
}

interface FormData {
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
  isSaleable: boolean
  isPurchaseable: boolean
  initialQuantity: number
  locationId?: string
}

interface ReferenceData {
  categories: Array<{ id: string; code: string; name: string }>
  unitOfMeasures: Array<{ id: string; code: string; name: string; symbol?: string }>
  locations: Array<{ id: string; code: string; name: string }>
  glAccounts: {
    inventory: Array<{ id: string; code: string; name: string }>
    cogs: Array<{ id: string; code: string; name: string }>
    sales: Array<{ id: string; code: string; name: string }>
  }
  companySettings?: any
}

export function QuickItemForm({
  onSuccess,
  onCancel,
  defaultValues,
  compact = false
}: QuickItemFormProps) {
  const { formatCurrency } = useCurrency()
  
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    description: '',
    categoryId: defaultValues?.categoryId || '',
    type: defaultValues?.type || 'PRODUCT',
    unitOfMeasureId: '',
    trackInventory: true,
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderPoint: 0,
    standardCost: 0,
    listPrice: 0,
    inventoryAccountId: '',
    cogsAccountId: '',
    salesAccountId: '',
    isSaleable: true,
    isPurchaseable: true,
    initialQuantity: 0,
    locationId: defaultValues?.locationId || ''
  })
  
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    categories: [],
    unitOfMeasures: [],
    locations: [],
    glAccounts: {
      inventory: [],
      cogs: [],
      sales: []
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generatingCode, setGeneratingCode] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(!compact)
  
  // Load reference data
  useEffect(() => {
    loadReferenceData()
  }, [])
  
  // Auto-disable inventory tracking for services
  useEffect(() => {
    if (formData.type === 'SERVICE') {
      setFormData(prev => ({ ...prev, trackInventory: false, initialQuantity: 0 }))
    }
  }, [formData.type])
  
  const loadReferenceData = async () => {
    setLoading(true)
    try {
      const [catRes, uomRes, locRes, accRes, settingsRes] = await Promise.all([
        apiClient('/api/inventory/categories', { method: 'GET' }),
        apiClient('/api/inventory/units-of-measure', { method: 'GET' }),
        apiClient('/api/inventory/locations', { method: 'GET' }),
        apiClient('/api/accounting/accounts', { method: 'GET' }),
        apiClient('/api/settings/company', { method: 'GET' })
      ])
      
      const categories = catRes.ok ? (catRes.data?.data || catRes.data || []) : []
      const unitOfMeasures = uomRes.ok ? (uomRes.data?.data || uomRes.data || []) : []
      const locations = locRes.ok ? (locRes.data?.data || locRes.data || []) : []
      const accounts = accRes.ok ? (accRes.data?.data || accRes.data || []) : []
      const settings = settingsRes.ok ? (settingsRes.data?.settings || settingsRes.data?.data?.settings) : null
      
      setReferenceData({
        categories: Array.isArray(categories) ? categories : [],
        unitOfMeasures: Array.isArray(unitOfMeasures) ? unitOfMeasures : [],
        locations: Array.isArray(locations) ? locations : [],
        glAccounts: {
          inventory: Array.isArray(accounts) ? accounts.filter((acc: any) => acc.type === 'ASSET') : [],
          cogs: Array.isArray(accounts) ? accounts.filter((acc: any) => acc.type === 'EXPENSE') : [],
          sales: Array.isArray(accounts) ? accounts.filter((acc: any) => acc.type === 'INCOME') : []
        },
        companySettings: settings
      })
      
      // Set defaults from company settings
      if (settings) {
        setFormData(prev => ({
          ...prev,
          inventoryAccountId: settings.defaultInventoryAccountId || '',
          cogsAccountId: settings.defaultCogsAccountId || '',
          salesAccountId: settings.defaultSalesAccountId || '',
          trackInventory: settings.defaultTrackInventory ?? true
        }))
      }
      
      // Set default UOM if exists
      const defaultUOM = unitOfMeasures.find((uom: any) => uom.code === 'EACH')
      if (defaultUOM) {
        setFormData(prev => ({ ...prev, unitOfMeasureId: defaultUOM.id }))
      }
      
      // Set default location if only one exists
      if (locations.length === 1) {
        setFormData(prev => ({ ...prev, locationId: locations[0].id }))
      }
    } catch (error) {
      console.error('Error loading reference data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const generateCode = async () => {
    if (!formData.categoryId) {
      setErrors(prev => ({ ...prev, categoryId: 'Select a category first' }))
      return
    }
    
    setGeneratingCode(true)
    try {
      const response = await apiClient(`/api/inventory/items/generate-code?categoryId=${formData.categoryId}`, {
        method: 'GET'
      })
      
      if (response.ok && response.data) {
        setFormData(prev => ({ ...prev, code: response.data.code }))
        setErrors(prev => ({ ...prev, code: '' }))
      }
    } catch (error) {
      console.error('Error generating code:', error)
    } finally {
      setGeneratingCode(false)
    }
  }
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Item code is required'
    } else {
      const codeResult = codeValidator.safeParse(formData.code)
      if (!codeResult.success) {
        newErrors.code = codeResult.error.errors[0].message
      }
    }
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required'
    } else {
      const nameResult = nameValidator.safeParse(formData.name)
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message
      }
    }
    
    // Description validation
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
        newErrors.minStockLevel = 'Must be non-negative'
      }
      
      if (formData.maxStockLevel < 0) {
        newErrors.maxStockLevel = 'Must be non-negative'
      }
      
      if (formData.maxStockLevel > 0 && formData.minStockLevel > formData.maxStockLevel) {
        newErrors.minStockLevel = 'Cannot exceed max level'
      }
      
      if (formData.reorderPoint < 0) {
        newErrors.reorderPoint = 'Must be non-negative'
      }
      
      if (formData.initialQuantity > 0 && !formData.locationId && referenceData.locations.length > 1) {
        newErrors.locationId = 'Location required for initial stock'
      }
    }
    
    // Pricing validations
    if (formData.standardCost < 0) {
      newErrors.standardCost = 'Must be non-negative'
    }
    
    if (formData.listPrice < 0) {
      newErrors.listPrice = 'Must be non-negative'
    }
    
    if (formData.isSaleable && formData.listPrice === 0) {
      newErrors.listPrice = 'Required for saleable items'
    }
    
    // Business rules
    if (formData.type === 'SERVICE' && formData.trackInventory) {
      newErrors.trackInventory = 'Services cannot track inventory'
    }
    
    if (!formData.isSaleable && !formData.isPurchaseable) {
      newErrors.isSaleable = 'Must be either saleable or purchaseable'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSaving(true)
    try {
      // Create the item
      const itemResponse = await apiClient('/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          isActive: true
        })
      })
      
      if (!itemResponse.ok) {
        throw new Error(itemResponse.error || 'Failed to create item')
      }
      
      const newItem = itemResponse.data
      
      // Create initial stock movement if specified
      if (formData.trackInventory && formData.initialQuantity > 0) {
        const movementData: any = {
          itemId: newItem.id,
          movementType: 'OPENING',
          quantity: formData.initialQuantity,
          unitCost: formData.standardCost,
          notes: 'Initial stock from quick creation'
        }
        
        // Add location if specified
        if (formData.locationId) {
          movementData.locationId = formData.locationId
        }
        
        const movementResponse = await apiClient('/api/inventory/stock-movements', {
          method: 'POST',
          body: JSON.stringify(movementData)
        })
        
        if (!movementResponse.ok) {
          console.error('Failed to create initial stock movement:', movementResponse.error)
        }
      }
      
      // Success callback
      if (onSuccess) {
        onSuccess({
          ...newItem,
          availableStock: formData.initialQuantity
        })
      }
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        categoryId: defaultValues?.categoryId || '',
        type: defaultValues?.type || 'PRODUCT',
        unitOfMeasureId: referenceData.unitOfMeasures.find((uom: any) => uom.code === 'EACH')?.id || '',
        trackInventory: true,
        minStockLevel: 0,
        maxStockLevel: 0,
        reorderPoint: 0,
        standardCost: 0,
        listPrice: 0,
        inventoryAccountId: referenceData.companySettings?.defaultInventoryAccountId || '',
        cogsAccountId: referenceData.companySettings?.defaultCogsAccountId || '',
        salesAccountId: referenceData.companySettings?.defaultSalesAccountId || '',
        isSaleable: true,
        isPurchaseable: true,
        initialQuantity: 0,
        locationId: defaultValues?.locationId || (referenceData.locations.length === 1 ? referenceData.locations[0].id : '')
      })
      
      setErrors({})
    } catch (error) {
      console.error('Error creating item:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create item' })
    } finally {
      setSaving(false)
    }
  }
  
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">{errors.submit}</span>
        </div>
      )}
      
      {/* Basic Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Item Code *
          </label>
          <div className="flex gap-2">
            <Input
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              placeholder="e.g., PROD-001"
              className={errors.code ? 'border-red-500' : ''}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateCode}
              disabled={generatingCode || !formData.categoryId}
            >
              {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
          </div>
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="PRODUCT">Product</option>
            <option value="SERVICE">Service</option>
            <option value="RAW_MATERIAL">Raw Material</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Name *
        </label>
        <Input
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Item name"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>
      
      {!compact && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={2}
            placeholder="Optional description"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Category *
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => handleInputChange('categoryId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${errors.categoryId ? 'border-red-500' : ''}`}
          >
            <option value="">Select category</option>
            {Array.isArray(referenceData.categories) && referenceData.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Unit of Measure *
          </label>
          <select
            value={formData.unitOfMeasureId}
            onChange={(e) => handleInputChange('unitOfMeasureId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${errors.unitOfMeasureId ? 'border-red-500' : ''}`}
          >
            <option value="">Select unit</option>
            {Array.isArray(referenceData.unitOfMeasures) && referenceData.unitOfMeasures.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.name} ({uom.symbol || uom.code})
              </option>
            ))}
          </select>
          {errors.unitOfMeasureId && (
            <p className="mt-1 text-sm text-red-600">{errors.unitOfMeasureId}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            List Price *
          </label>
          <Input
            type="number"
            value={formData.listPrice}
            onChange={(e) => handleInputChange('listPrice', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className={errors.listPrice ? 'border-red-500' : ''}
          />
          {errors.listPrice && (
            <p className="mt-1 text-sm text-red-600">{errors.listPrice}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Standard Cost *
          </label>
          <Input
            type="number"
            value={formData.standardCost}
            onChange={(e) => handleInputChange('standardCost', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className={errors.standardCost ? 'border-red-500' : ''}
          />
          {errors.standardCost && (
            <p className="mt-1 text-sm text-red-600">{errors.standardCost}</p>
          )}
        </div>
      </div>
      
      {/* Inventory Section */}
      {formData.type !== 'SERVICE' && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trackInventory"
                checked={formData.trackInventory}
                onChange={(e) => handleInputChange('trackInventory', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="trackInventory" className="text-sm font-medium">
                Track Inventory
              </label>
            </div>
            
            {compact && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Less Options' : 'More Options'}
              </Button>
            )}
          </div>
          
          {formData.trackInventory && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Initial Quantity
                  </label>
                  <Input
                    type="number"
                    value={formData.initialQuantity}
                    onChange={(e) => handleInputChange('initialQuantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                  />
                </div>
                
                {Array.isArray(referenceData.locations) && referenceData.locations.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Location {formData.initialQuantity > 0 && '*'}
                    </label>
                    <select
                      value={formData.locationId}
                      onChange={(e) => handleInputChange('locationId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md ${errors.locationId ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select location</option>
                      {Array.isArray(referenceData.locations) && referenceData.locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                    {errors.locationId && (
                      <p className="mt-1 text-sm text-red-600">{errors.locationId}</p>
                    )}
                  </div>
                )}
              </div>
              
              {(showAdvanced || !compact) && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Min Stock Level
                    </label>
                    <Input
                      type="number"
                      value={formData.minStockLevel}
                      onChange={(e) => handleInputChange('minStockLevel', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className={errors.minStockLevel ? 'border-red-500' : ''}
                    />
                    {errors.minStockLevel && (
                      <p className="mt-1 text-sm text-red-600">{errors.minStockLevel}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Max Stock Level
                    </label>
                    <Input
                      type="number"
                      value={formData.maxStockLevel}
                      onChange={(e) => handleInputChange('maxStockLevel', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className={errors.maxStockLevel ? 'border-red-500' : ''}
                    />
                    {errors.maxStockLevel && (
                      <p className="mt-1 text-sm text-red-600">{errors.maxStockLevel}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Reorder Point
                    </label>
                    <Input
                      type="number"
                      value={formData.reorderPoint}
                      onChange={(e) => handleInputChange('reorderPoint', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className={errors.reorderPoint ? 'border-red-500' : ''}
                    />
                    {errors.reorderPoint && (
                      <p className="mt-1 text-sm text-red-600">{errors.reorderPoint}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Advanced Options */}
      {(showAdvanced || !compact) && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium">Sales & Purchase Settings</h4>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isSaleable}
                onChange={(e) => handleInputChange('isSaleable', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Can be sold</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPurchaseable}
                onChange={(e) => handleInputChange('isPurchaseable', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Can be purchased</span>
            </label>
          </div>
          {errors.isSaleable && (
            <p className="text-sm text-red-600">{errors.isSaleable}</p>
          )}
          
          {/* GL Accounts */}
          {Array.isArray(referenceData.glAccounts.inventory) && referenceData.glAccounts.inventory.length > 0 && (
            <>
              <h4 className="text-sm font-medium">GL Accounts</h4>
              <div className="grid grid-cols-1 gap-4">
                {formData.trackInventory && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Inventory Account
                    </label>
                    <select
                      value={formData.inventoryAccountId || ''}
                      onChange={(e) => handleInputChange('inventoryAccountId', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="">Select account...</option>
                      {Array.isArray(referenceData.glAccounts.inventory) && referenceData.glAccounts.inventory.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    COGS Account
                  </label>
                  <select
                    value={formData.cogsAccountId || ''}
                    onChange={(e) => handleInputChange('cogsAccountId', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select account...</option>
                    {Array.isArray(referenceData.glAccounts.cogs) && referenceData.glAccounts.cogs.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sales Account
                  </label>
                  <select
                    value={formData.salesAccountId || ''}
                    onChange={(e) => handleInputChange('salesAccountId', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select account...</option>
                    {Array.isArray(referenceData.glAccounts.sales) && referenceData.glAccounts.sales.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Create Item
            </>
          )}
        </Button>
      </div>
    </form>
  )
}