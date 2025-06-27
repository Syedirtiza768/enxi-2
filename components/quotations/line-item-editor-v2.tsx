import type { Category } from '@/components/inventory/category-tree'
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Eye, Settings, Package, Briefcase, Search, ShoppingCart, AlertCircle, CheckCircle, CheckCircle2 } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useCurrency } from '@/lib/contexts/currency-context'
import { TaxRateSelector } from '@/components/tax/tax-rate-selector'
import { TaxType } from '@/lib/types/shared-enums'
import { useDefaultTaxRate } from '@/hooks/use-default-tax-rate'
import {
  validateItemCode,
  validateDescription,
  validateQuantity,
  validatePrice,
  validateDiscount,
  validateTaxRate,
  MAX_ITEM_CODE_LENGTH,
  MAX_DESCRIPTION_LENGTH
} from '@/lib/validators/quotation.validator'

interface QuotationLine {
  lineNumber: number
  lineDescription: string
  items: QuotationItem[]
  // Calculated totals for the line
  lineSubtotal?: number
  lineDiscount?: number
  lineTax?: number
  lineTotal?: number
}

interface QuotationItem {
  id: string
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  sortOrder: number
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string
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

interface InventoryItem {
  id: string
  code: string
  name: string
  type: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
  listPrice: number
  standardCost: number
  category: {
    id: string
    name: string
  }
  availableQuantity?: number
}

interface NewItemData {
  code: string
  name: string
  type: 'PRODUCT' | 'SERVICE'
  categoryId: string
  listPrice: number
  standardCost: number
  initialStock: number
  description?: string
}

// Category moved to inventory types

interface LineItemEditorV2Props {
  quotationItems: QuotationItem[]
  onChange: (items: QuotationItem[]) => void
  disabled?: boolean
}

interface ItemValidationErrors {
  [itemId: string]: {
    [field: string]: string
  }
}

export function LineItemEditorV2({ quotationItems, onChange, disabled = false }: LineItemEditorV2Props): React.JSX.Element {
  const { formatCurrency } = useCurrency()
  const { defaultRate } = useDefaultTaxRate()
  const [viewMode, setViewMode] = useState<'client' | 'internal'>('internal')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([1]))
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewItemDialog, setShowNewItemDialog] = useState(false)
  const [targetItemId, setTargetItemId] = useState<string | null>(null)
  const [newItemData, setNewItemData] = useState<NewItemData>({
    code: '',
    name: '',
    type: 'PRODUCT',
    categoryId: '',
    listPrice: 0,
    standardCost: 0,
    initialStock: 0,
    description: ''
  })
  const [itemValidationErrors, setItemValidationErrors] = useState<ItemValidationErrors>({})

  // Group items by line number
  const groupItemsByLine = (items: QuotationItem[]): QuotationLine[] => {
    const lines: Map<number, QuotationLine> = new Map()
    
    items.forEach(item => {
      if (!lines.has(item.lineNumber)) {
        lines.set(item.lineNumber, {
          lineNumber: item.lineNumber,
          lineDescription: item.lineDescription || `Line ${item.lineNumber}`,
          items: []
        })
      }
      lines.get(item.lineNumber)!.items.push(item)
    })
    
    // Sort items within each line by sortOrder
    lines.forEach(line => {
      line.items.sort((a, b) => a.sortOrder - b.sortOrder)
      
      // Calculate line totals
      line.lineSubtotal = line.items.reduce((sum, item) => sum + item.subtotal, 0)
      line.lineDiscount = line.items.reduce((sum, item) => sum + item.discountAmount, 0)
      line.lineTax = line.items.reduce((sum, item) => sum + item.taxAmount, 0)
      line.lineTotal = line.items.reduce((sum, item) => sum + item.totalAmount, 0)
    })
    
    return Array.from(lines.values()).sort((a, b) => a.lineNumber - b.lineNumber)
  }

  const lines = groupItemsByLine(quotationItems)

  // Load inventory items and categories with better loading states
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch both in parallel for better performance
        const [itemsResponse, categoriesResponse] = await Promise.all([
          apiClient<{ data?: InventoryItem[] }>('/api/inventory/items', { method: 'GET' }),
          apiClient<{ data?: ItemCategory[] }>('/api/inventory/categories', { method: 'GET' })
        ])
        
        // Process inventory items
        if (itemsResponse.ok) {
          const inventoryData = itemsResponse.data?.data || itemsResponse.data || []
          setInventoryItems(Array.isArray(inventoryData) ? inventoryData : [])
        } else {
          console.warn('Failed to load inventory items:', itemsResponse.error)
        }
        
        // Process categories
        if (categoriesResponse.ok) {
          const categoryData = categoriesResponse.data?.data || categoriesResponse.data || []
          setCategories(Array.isArray(categoryData) ? categoryData : [])
        } else {
          console.warn('Failed to load categories:', categoriesResponse.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        console.error('Error loading line item data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper functions
  const generateId = (): void => Math.random().toString(36).substr(2, 9)
  
  // Item validation
  const validateItem = useCallback((item: QuotationItem): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    // Item code validation
    const itemCodeError = validateItemCode(item.itemCode)
    if (itemCodeError) errors.itemCode = itemCodeError
    
    // Description validation
    if (!item.description || item.description.trim().length === 0) {
      errors.description = 'Description is required'
    } else if (item.description.length > 500) {
      errors.description = 'Description must be 500 characters or less'
    }
    
    // Quantity validation
    if (!item.quantity || item.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0'
    } else if (item.quantity > 999999) {
      errors.quantity = 'Quantity must be less than 1,000,000'
    } else if (!Number.isFinite(item.quantity)) {
      errors.quantity = 'Quantity must be a valid number'
    }
    
    // Unit price validation
    if (item.unitPrice < 0) {
      errors.unitPrice = 'Unit price cannot be negative'
    } else if (item.unitPrice > 9999999.99) {
      errors.unitPrice = 'Unit price must be less than 10,000,000'
    } else if (!Number.isFinite(item.unitPrice)) {
      errors.unitPrice = 'Unit price must be a valid number'
    }
    
    // Discount validation
    if (item.discount !== undefined && item.discount !== null) {
      if (item.discount < 0 || item.discount > 100) {
        errors.discount = 'Discount must be between 0% and 100%'
      } else if (!Number.isFinite(item.discount)) {
        errors.discount = 'Discount must be a valid number'
      }
    }
    
    // Tax rate validation
    if (item.taxRate !== undefined && item.taxRate !== null) {
      if (item.taxRate < 0 || item.taxRate > 100) {
        errors.taxRate = 'Tax rate must be between 0% and 100%'
      } else if (!Number.isFinite(item.taxRate)) {
        errors.taxRate = 'Tax rate must be a valid number'
      }
    }
    
    // Cost validation (if provided)
    if (item.cost !== undefined && item.cost !== null) {
      if (item.cost < 0) {
        errors.cost = 'Cost cannot be negative'
      } else if (item.cost > 9999999.99) {
        errors.cost = 'Cost must be less than 10,000,000'
      } else if (!Number.isFinite(item.cost)) {
        errors.cost = 'Cost must be a valid number'
      }
    }
    
    // Line description validation
    if (item.lineDescription && item.lineDescription.length > 200) {
      errors.lineDescription = 'Line description must be 200 characters or less'
    }
    
    // Internal description validation
    if (item.internalDescription && item.internalDescription.length > 1000) {
      errors.internalDescription = 'Internal description must be 1000 characters or less'
    }
    
    // Business rule: Margin check if selling below cost
    if (item.cost !== undefined && item.cost > 0 && item.unitPrice > 0) {
      const margin = ((item.unitPrice - item.cost) / item.unitPrice) * 100
      if (margin < -100) {
        errors.unitPrice = 'Selling price significantly below cost'
      } else if (margin < 0) {
        // Warning, not error - could be added to a warnings object if needed
      }
    }
    
    return errors
  }, [validateItemCode, validateDescription, validateQuantity, validatePrice, validateDiscount, validateTaxRate])
  
  // Validate all items and update errors
  const validateAllItems = useCallback(() => {
    const newErrors: ItemValidationErrors = {}
    
    // Check for duplicate item codes
    const itemCodes = quotationItems
      .filter(item => item.itemCode && item.itemCode.trim())
      .map(item => ({ id: item.id, code: item.itemCode.toLowerCase().trim() }))
    
    const duplicateGroups = itemCodes.reduce((acc, { id, code }) => {
      if (!acc[code]) acc[code] = []
      acc[code].push(id)
      return acc
    }, {} as Record<string, string[]>)
    
    const duplicateItemIds = new Set<string>()
    Object.values(duplicateGroups).forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => duplicateItemIds.add(id))
      }
    })
    
    quotationItems.forEach(item => {
      const itemErrors = validateItem(item)
      
      // Add duplicate code error
      if (duplicateItemIds.has(item.id)) {
        itemErrors.itemCode = 'Duplicate item code found'
      }
      
      if (Object.keys(itemErrors).length > 0) {
        newErrors[item.id] = itemErrors
      }
    })
    
    setItemValidationErrors(newErrors)
    return newErrors
  }, [quotationItems, validateItem])
  
  // Validate items when they change
  useEffect(() => {
    validateAllItems()
  }, [quotationItems, validateAllItems])

  const calculateItemAmounts = (item: Partial<QuotationItem>): Partial<QuotationItem> => {
    const quantity = item.quantity || 0
    const unitPrice = item.unitPrice || 0
    const discount = item.discount || 0
    const taxRate = item.taxRate || 0
    
    const subtotal = quantity * unitPrice
    const discountAmount = subtotal * (discount / 100)
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (taxRate / 100)
    const totalAmount = taxableAmount + taxAmount
    
    return {
      ...item,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    }
  }

  // Filter inventory items based on search
  const filteredInventoryItems = inventoryItems.filter(item => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      item.code.toLowerCase().includes(search) ||
      item.name.toLowerCase().includes(search) ||
      item.category?.name.toLowerCase().includes(search)
    )
  })

  // Line management
  const addLine = (): void => {
    const newLineNumber = Math.max(...lines.map(l => l.lineNumber), 0) + 1
    const newItem: QuotationItem = {
      id: generateId(),
      lineNumber: newLineNumber,
      lineDescription: `Line ${newLineNumber}`,
      isLineHeader: true,
      sortOrder: 0,
      itemType: 'PRODUCT',
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      ...calculateItemAmounts({ quantity: 1, unitPrice: 0 })
    } as QuotationItem
    
    onChange([...quotationItems, newItem])
    setExpandedLines(new Set([...expandedLines, newLineNumber]))
  }

  const removeLine = (lineNumber: number): void => {
    onChange(quotationItems.filter(item => item.lineNumber !== lineNumber))
  }

  const updateLineDescription = (lineNumber: number, description: string): void => {
    onChange(quotationItems.map(item => 
      item.lineNumber === lineNumber 
        ? { ...item, lineDescription: description }
        : item
    ))
  }

  // Item management
  const addItemToLine = (lineNumber: number): void => {
    const lineItems = quotationItems.filter(item => item.lineNumber === lineNumber)
    const maxSortOrder = Math.max(...lineItems.map(item => item.sortOrder), -1)
    
    const newItem: QuotationItem = {
      id: generateId(),
      lineNumber,
      isLineHeader: false,
      sortOrder: maxSortOrder + 1,
      itemType: 'PRODUCT',
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: defaultRate?.rate || 0,
      taxRateId: defaultRate?.id,
      ...calculateItemAmounts({ 
        quantity: 1, 
        unitPrice: 0, 
        taxRate: defaultRate?.rate || 0 
      })
    } as QuotationItem
    
    onChange([...quotationItems, newItem])
  }

  const removeItem = (itemId: string): void => {
    onChange(quotationItems.filter(item => item.id !== itemId))
  }

  const updateItem = (itemId: string, updates: Partial<QuotationItem>): void => {
    const updatedItems = quotationItems.map(item => 
      item.id === itemId 
        ? { ...item, ...updates, ...calculateItemAmounts({ ...item, ...updates }) }
        : item
    )
    onChange(updatedItems)
    
    // Validate the updated item
    const updatedItem = updatedItems.find(item => item.id === itemId)
    if (updatedItem) {
      const itemErrors = validateItem(updatedItem)
      setItemValidationErrors(prev => ({
        ...prev,
        [itemId]: Object.keys(itemErrors).length > 0 ? itemErrors : undefined
      }))
    }
  }

  const selectInventoryItem = (itemId: string, inventoryItem: InventoryItem): void => {
    updateItem(itemId, {
      itemId: inventoryItem.id,
      itemCode: inventoryItem.code,
      description: inventoryItem.name,
      unitPrice: inventoryItem.listPrice,
      cost: inventoryItem.standardCost,
      itemType: inventoryItem.type as 'PRODUCT' | 'SERVICE'
    })
  }

  // Create new inventory item
  const handleCreateNewItem: () => Promise<void>= async(): void => {
    try {
      // Create the item
      // First, get the default unit of measure
      const uomResponse = await apiClient('/api/inventory/units-of-measure', { method: 'GET' })
      const uoms = uomResponse.data?.data || []
      const defaultUom = uoms.find((u: { code: string }) => u.code === 'EA' || u.code === 'EACH') || uoms[0]
      
      if (!defaultUom) {
        throw new Error('No unit of measure found. Please create one first.')
      }
      
      const itemResponse = await apiClient('/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify({
          ...newItemData,
          type: newItemData.type,
          unitOfMeasureId: defaultUom.id,
          trackInventory: newItemData.type === 'PRODUCT',
          isSaleable: true,
          isPurchaseable: true,
          isActive: true
        })
      })

      if (!itemResponse.ok) {
        throw new Error(itemResponse.error || 'Failed to create item')
      }

      const newItem = itemResponse.data

      // If initial stock is provided, create a stock movement
      if (newItemData.initialStock > 0 && newItemData.type === 'PRODUCT') {
        await apiClient('/api/inventory/stock-movements/opening', {
          method: 'POST',
          body: JSON.stringify({
            itemId: newItem.id,
            quantity: newItemData.initialStock,
            unitCost: newItemData.standardCost,
            notes: 'Initial stock from quotation'
          })
        })
      }

      // Add the new item to inventory list
      setInventoryItems([...inventoryItems, newItem])

      // Select it for the current line item
      if (targetItemId) {
        selectInventoryItem(targetItemId, newItem)
      }

      // Reset and close dialog
      setShowNewItemDialog(false)
      setTargetItemId(null)
      setNewItemData({
        code: '',
        name: '',
        type: 'PRODUCT',
        categoryId: '',
        listPrice: 0,
        standardCost: 0,
        initialStock: 0,
        description: ''
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Calculate totals
  const totalSubtotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0)
  const totalDiscount = quotationItems.reduce((sum, item) => sum + item.discountAmount, 0)
  const totalTax = quotationItems.reduce((sum, item) => sum + item.taxAmount, 0)
  const grandTotal = quotationItems.reduce((sum, item) => sum + item.totalAmount, 0)

  const toggleLine = (lineNumber: number): void => {
    const newExpanded = new Set(expandedLines)
    if (newExpanded.has(lineNumber)) {
      newExpanded.delete(lineNumber)
    } else {
      newExpanded.add(lineNumber)
    }
    setExpandedLines(newExpanded)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Quotation Lines</h3>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
            <div className="h-8 w-28 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-32 bg-gray-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {/* Validation Summary */}
      {Object.keys(itemValidationErrors).length > 0 && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
            <p className="text-orange-800 font-medium text-sm">
              {Object.keys(itemValidationErrors).length} item(s) have validation errors
            </p>
          </div>
          <p className="text-orange-700 text-xs">
            Please review and fix the highlighted issues before saving.
          </p>
        </div>
      )}
      
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Quotation Lines</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'client' ? 'default' : 'outline'}
            size="sm"
            onClick={(): void => setViewMode('client')}
            disabled={disabled}
          >
            <Eye className="h-4 w-4 mr-1" />
            Client View
          </Button>
          <Button
            variant={viewMode === 'internal' ? 'default' : 'outline'}
            size="sm"
            onClick={(): void => setViewMode('internal')}
            disabled={disabled}
          >
            <Settings className="h-4 w-4 mr-1" />
            Internal View
          </Button>
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-4">
        {lines.map((line) => (
          <div key={line.lineNumber} className="border rounded-lg p-4">
            {/* Line Header - Always visible in both views */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                {viewMode === 'internal' && (
                  <button
                    onClick={(): void => toggleLine(line.lineNumber)}
                    className="p-1 hover:bg-gray-100 rounded"
                    disabled={disabled}
                  >
                    {expandedLines.has(line.lineNumber) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
                <Input
                  value={line.lineDescription}
                  onChange={(e): void => updateLineDescription(line.lineNumber, e.target.value)}
                  placeholder="Line description (visible to client)"
                  className="flex-1 font-medium"
                  disabled={disabled || viewMode === 'client'}
                />
                <div className="text-sm text-gray-600">
                  {viewMode === 'internal' && `${line.items.length} item${line.items.length !== 1 ? 's' : ''} • `}
                  {formatCurrency(line.lineTotal || 0)}
                </div>
                {viewMode === 'internal' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => removeLine(line.lineNumber)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Line Items - Only visible in internal view when expanded */}
            {viewMode === 'internal' && expandedLines.has(line.lineNumber) && (
              <div className="space-y-2 pl-8">
                {line.items.map((item) => (
                  <div key={item.id} className="border rounded p-3 space-y-2">
                    <div className="grid grid-cols-14 gap-2">
                      <div className="col-span-1">
                        <Select
                          value={item.itemType}
                          onValueChange={(value): void => updateItem(item.id, { itemType: value as 'PRODUCT' | 'SERVICE' })}
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRODUCT">
                              <Package className="h-4 w-4 inline mr-1" />
                              Product
                            </SelectItem>
                            <SelectItem value="SERVICE">
                              <Briefcase className="h-4 w-4 inline mr-1" />
                              Service
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="relative">
                          <Input
                            value={item.itemCode}
                            onChange={(e): void => updateItem(item.id, { itemCode: e.target.value.toUpperCase() })}
                            placeholder="Item code"
                            disabled={disabled}
                            maxLength={MAX_ITEM_CODE_LENGTH}
                            className={itemValidationErrors[item.id]?.itemCode ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.itemCode && item.itemCode && (
                            <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.itemCode && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.itemCode && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].itemCode}</p>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <div className="relative">
                          <Select
                            value={item.itemId || 'custom'}
                            onValueChange={(value): void => {
                              if (value === 'new') {
                                setTargetItemId(item.id)
                                setShowNewItemDialog(true)
                              } else if (value !== 'custom') {
                                const invItem = inventoryItems.find(i => i.id === value)
                                if (invItem) selectInventoryItem(item.id, invItem)
                              }
                            }}
                            disabled={disabled}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Link to inventory" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <div className="relative">
                                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                  <Input
                                    placeholder="Search items..."
                                    value={searchTerm}
                                    onChange={(e): void => setSearchTerm(e.target.value)}
                                    className="pl-8 mb-2"
                                    onClick={(e): void => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <SelectItem value="custom">Custom Item (no inventory link)</SelectItem>
                              <SelectItem value="new" className="text-blue-600">
                                <Plus className="h-4 w-4 inline mr-1" />
                                Create New Item
                              </SelectItem>
                              <div className="border-t my-1" />
                              {filteredInventoryItems.length === 0 ? (
                                <div className="p-2 text-sm text-gray-500 text-center">No items found</div>
                              ) : (
                                filteredInventoryItems.map(invItem => (
                                  <SelectItem key={invItem.id} value={invItem.id}>
                                    <div className="flex justify-between items-center w-full">
                                      <div>
                                        <span className="font-medium">{invItem.code}</span>
                                        <span className="text-gray-600 ml-2">{invItem.name}</span>
                                      </div>
                                      <div className="text-right text-sm">
                                        <div>{formatCurrency(invItem.listPrice)}</div>
                                        {invItem.availableQuantity !== undefined && (
                                          <div className="text-gray-500">Stock: {invItem.availableQuantity}</div>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <Input
                            value={item.description}
                            onChange={(e): void => updateItem(item.id, { description: e.target.value })}
                            placeholder="Item description"
                            disabled={disabled}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            className={itemValidationErrors[item.id]?.description ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.description && item.description && (
                            <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.description && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.description && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].description}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {item.description.length}/{MAX_DESCRIPTION_LENGTH} characters
                        </div>
                      </div>

                      <div className="col-span-1">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e): void => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            placeholder="Qty"
                            disabled={disabled}
                            min="0.01"
                            max="999999"
                            step="0.01"
                            className={itemValidationErrors[item.id]?.quantity ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.quantity && item.quantity > 0 && (
                            <CheckCircle2 className="absolute right-2 top-2 h-3 w-3 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.quantity && (
                            <AlertCircle className="absolute right-2 top-2 h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.quantity && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].quantity}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e): void => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                            placeholder="Unit price"
                            disabled={disabled}
                            min="0"
                            max="9999999.99"
                            step="0.01"
                            className={itemValidationErrors[item.id]?.unitPrice ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.unitPrice && item.unitPrice >= 0 && (
                            <CheckCircle2 className="absolute right-2 top-2 h-3 w-3 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.unitPrice && (
                            <AlertCircle className="absolute right-2 top-2 h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.unitPrice && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].unitPrice}</p>
                        )}
                      </div>

                      <div className="col-span-1">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e): void => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                            placeholder="Disc %"
                            disabled={disabled}
                            min="0"
                            max="100"
                            step="0.01"
                            className={itemValidationErrors[item.id]?.discount ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.discount && (
                            <CheckCircle2 className="absolute right-2 top-2 h-3 w-3 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.discount && (
                            <AlertCircle className="absolute right-2 top-2 h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.discount && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].discount}</p>
                        )}
                      </div>

                      <div className="col-span-1">
                        <TaxRateSelector
                          value={item.taxRateId}
                          onChange={(taxRateId, taxRate): void => {
                            updateItem(item.id, { 
                              taxRateId, 
                              taxRate 
                            })
                          }}
                          disabled={disabled}
                          className="w-full h-9"
                          placeholder="Tax"
                          taxType={TaxType.SALES}
                        />
                      </div>

                      <div className="col-span-1 flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(): void => removeItem(item.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Internal notes */}
                    <div>
                      <div className="relative">
                        <Textarea
                          value={item.internalDescription || ''}
                          onChange={(e): void => updateItem(item.id, { internalDescription: e.target.value })}
                          placeholder="Internal notes (not shown to client)"
                          className={`h-16 resize-none ${
                            itemValidationErrors[item.id]?.internalDescription ? 'border-red-300 focus:border-red-500' : ''
                          }`}
                          disabled={disabled}
                          maxLength={1000}
                        />
                        {!itemValidationErrors[item.id]?.internalDescription && item.internalDescription && (
                          <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                        )}
                        {itemValidationErrors[item.id]?.internalDescription && (
                          <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {itemValidationErrors[item.id]?.internalDescription && (
                        <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].internalDescription}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {(item.internalDescription || '').length}/1000 characters
                      </div>
                    </div>

                    {/* Cost and margin info */}
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <label className="text-gray-600">Cost:</label>
                        <Input
                          type="number"
                          value={item.cost || 0}
                          onChange={(e): void => updateItem(item.id, { cost: parseFloat(e.target.value) || 0 })}
                          disabled={disabled}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600">Margin:</label>
                        <div className={`font-medium ${
                          item.cost && item.unitPrice > 0 
                            ? ((Number(item.unitPrice || 0) - Number(item.cost || 0)) / Number(item.unitPrice || 1) * 100) < 0 
                              ? 'text-red-600' 
                              : ((Number(item.unitPrice || 0) - Number(item.cost || 0)) / Number(item.unitPrice || 1) * 100) < 10 
                                ? 'text-orange-600' 
                                : 'text-green-600'
                            : 'text-gray-500'
                        }`}>
                          {item.cost && item.unitPrice > 0 
                            ? `${((Number(item.unitPrice || 0) - Number(item.cost || 0)) / Number(item.unitPrice || 1) * 100).toFixed(1)}%`
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-600">Subtotal:</label>
                        <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                      </div>
                      <div>
                        <label className="text-gray-600">Total:</label>
                        <div className="font-medium">{formatCurrency(item.totalAmount)}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add item button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => addItemToLine(line.lineNumber)}
                  disabled={disabled}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item to Line
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add line button - only in internal view */}
      {viewMode === 'internal' && (
        <Button
          variant="outline"
          onClick={addLine}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add New Line
        </Button>
      )}

      {/* Totals with validation status */}
      <div className="mt-6 border-t pt-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span>Items:</span>
            <span className="flex items-center gap-2">
              {quotationItems.length}
              {Object.keys(itemValidationErrors).length > 0 && (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(totalSubtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {totalTax > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span className="flex items-center gap-2">
              {formatCurrency(grandTotal)}
              {Object.keys(itemValidationErrors).length === 0 && quotationItems.length > 0 && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* New Item Dialog */}
      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Inventory Item</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemCode">Item Code</Label>
                <Input
                  id="itemCode"
                  value={newItemData.code}
                  onChange={(e): void => setNewItemData({ ...newItemData, code: e.target.value })}
                  placeholder="e.g. PROD-001"
                />
              </div>
              
              <div>
                <Label htmlFor="itemType">Type</Label>
                <Select
                  value={newItemData.type}
                  onValueChange={(value): void => setNewItemData({ ...newItemData, type: value as 'PRODUCT' | 'SERVICE' })}
                >
                  <SelectTrigger id="itemType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT">Product</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="itemName">Name</Label>
              <Input
                id="itemName"
                value={newItemData.name}
                onChange={(e): void => setNewItemData({ ...newItemData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>

            <div>
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea
                id="itemDescription"
                value={newItemData.description}
                onChange={(e): void => setNewItemData({ ...newItemData, description: e.target.value })}
                placeholder="Item description (optional)"
                className="h-20"
              />
            </div>

            <div>
              <Label htmlFor="itemCategory">Category</Label>
              <Select
                value={newItemData.categoryId}
                onValueChange={(value): void => setNewItemData({ ...newItemData, categoryId: value })}
              >
                <SelectTrigger id="itemCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => cat.type === newItemData.type)
                    .map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.code} - {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="listPrice">List Price</Label>
                <Input
                  id="listPrice"
                  type="number"
                  value={newItemData.listPrice}
                  onChange={(e): void => setNewItemData({ ...newItemData, listPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="standardCost">Standard Cost</Label>
                <Input
                  id="standardCost"
                  type="number"
                  value={newItemData.standardCost}
                  onChange={(e): void => setNewItemData({ ...newItemData, standardCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              
              {newItemData.type === 'PRODUCT' && (
                <div>
                  <Label htmlFor="initialStock">Initial Stock</Label>
                  <Input
                    id="initialStock"
                    type="number"
                    value={newItemData.initialStock}
                    onChange={(e): void => setNewItemData({ ...newItemData, initialStock: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={(): void => setShowNewItemDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNewItem}
              disabled={!newItemData.code || !newItemData.name || !newItemData.categoryId}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}