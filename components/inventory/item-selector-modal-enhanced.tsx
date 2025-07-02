'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Package, Wrench, Filter, X, Check, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { QuickItemForm } from './quick-item-form'

interface Item {
  id: string
  code: string
  name: string
  description?: string
  type: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
  categoryId: string
  category?: {
    id: string
    name: string
  }
  unitOfMeasureId: string
  unitOfMeasure?: {
    id: string
    code: string
    name: string
  }
  trackInventory: boolean
  standardCost: number
  listPrice: number
  isActive: boolean
  isSaleable: boolean
  currentStock?: number
  availableStock?: number
}

interface SelectedItem {
  itemId: string
  itemCode: string
  name: string
  description: string
  type: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
  quantity: number
  unitPrice: number
  unitOfMeasureId: string
  cost?: number
  availableStock?: number
}

interface ItemSelectorModalEnhancedProps {
  open: boolean
  onClose: () => void
  onSelect: (items: SelectedItem[]) => void
  multiSelect?: boolean
  showCreateNew?: boolean
  filters?: {
    category?: boolean
    priceRange?: boolean
    stockStatus?: boolean
    itemType?: boolean
  }
  excludeItemIds?: string[]
  defaultFilters?: {
    categoryId?: string
    type?: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
    locationId?: string
  }
  title?: string
  submitLabel?: string
}

export function ItemSelectorModalEnhanced({
  open,
  onClose,
  onSelect,
  multiSelect = true,
  showCreateNew = true,
  filters = {
    category: true,
    priceRange: true,
    stockStatus: true,
    itemType: true
  },
  excludeItemIds = [],
  defaultFilters,
  title = 'Select Items',
  submitLabel = 'Add Selected Items'
}: ItemSelectorModalEnhancedProps) {
  const { formatCurrency } = useCurrency()
  
  // State
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultFilters?.categoryId || '')
  const [selectedType, setSelectedType] = useState<'ALL' | 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'>(
    defaultFilters?.type || 'ALL'
  )
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  
  // New item form
  const [showNewItemForm, setShowNewItemForm] = useState(false)
  
  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  
  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // Load reference data
  useEffect(() => {
    if (open) {
      loadCategories()
      loadItems()
    }
  }, [open])
  
  // Load items when filters change
  useEffect(() => {
    if (open) {
      loadItems()
    }
  }, [debouncedSearchTerm, selectedCategory, selectedType, stockFilter, priceMin, priceMax])
  
  const loadCategories = async () => {
    try {
      const response = await apiClient('/api/inventory/categories', { method: 'GET' })
      if (response.ok) {
        const categoryData = response.data?.data || response.data || []
        setCategories(Array.isArray(categoryData) ? categoryData : [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }
  
  const loadItems = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (selectedCategory) params.append('categoryId', selectedCategory)
      if (selectedType !== 'ALL') params.append('type', selectedType)
      if (stockFilter !== 'ALL') params.append('stockFilter', stockFilter)
      if (priceMin) params.append('priceMin', priceMin)
      if (priceMax) params.append('priceMax', priceMax)
      params.append('isActive', 'true')
      params.append('isSaleable', 'true')
      
      const response = await apiClient(`/api/inventory/items?${params.toString()}`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const responseData = response.data?.data || response.data?.items || response.data || []
        const allItems = Array.isArray(responseData) ? responseData : []
        // Filter out excluded items
        const filteredItems = allItems.filter((item: Item) => !excludeItemIds.includes(item.id))
        setItems(filteredItems)
      } else {
        throw new Error(response.error || 'Failed to load items')
      }
    } catch (error) {
      console.error('Error loading items:', error)
      setError(error instanceof Error ? error.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }
  
  const handleItemToggle = (item: Item) => {
    const newSelected = new Map(selectedItems)
    
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id)
    } else {
      if (!multiSelect) {
        newSelected.clear()
      }
      
      newSelected.set(item.id, {
        itemId: item.id,
        itemCode: item.code,
        name: item.name,
        description: item.description || '',
        type: item.type,
        quantity: 1,
        unitPrice: item.listPrice,
        unitOfMeasureId: item.unitOfMeasureId,
        cost: item.standardCost,
        availableStock: item.availableStock
      })
    }
    
    setSelectedItems(newSelected)
  }
  
  const handleQuantityChange = (itemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems)
    const item = newSelected.get(itemId)
    if (item && quantity > 0) {
      item.quantity = quantity
      newSelected.set(itemId, item)
      setSelectedItems(newSelected)
    }
  }
  
  const handlePriceChange = (itemId: string, price: number) => {
    const newSelected = new Map(selectedItems)
    const item = newSelected.get(itemId)
    if (item && price >= 0) {
      item.unitPrice = price
      newSelected.set(itemId, item)
      setSelectedItems(newSelected)
    }
  }
  
  const handleNewItemSuccess = (newItem: any) => {
    setShowNewItemForm(false)
    loadItems()
    
    // Auto-select the new item
    handleItemToggle({
      ...newItem,
      availableStock: newItem.availableStock || 0
    })
  }
  
  const handleConfirmSelection = () => {
    const selected = Array.from(selectedItems.values())
    onSelect(selected)
    setSelectedItems(new Map())
    onClose()
  }
  
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory(defaultFilters?.categoryId || '')
    setSelectedType(defaultFilters?.type || 'ALL')
    setStockFilter('ALL')
    setPriceMin('')
    setPriceMax('')
  }
  
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchTerm) count++
    if (selectedCategory) count++
    if (selectedType !== 'ALL') count++
    if (stockFilter !== 'ALL') count++
    if (priceMin || priceMax) count++
    return count
  }, [searchTerm, selectedCategory, selectedType, stockFilter, priceMin, priceMax])
  
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {selectedItems.size > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="px-6 py-4 border-b space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by code, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {showCreateNew && (
              <Button
                type="button"
                onClick={() => setShowNewItemForm(!showNewItemForm)}
                variant={showNewItemForm ? 'default' : 'outline'}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Item
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {filters.category && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Categories</option>
                {Array.isArray(categories) && categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            
            {filters.itemType && (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="PRODUCT">Products</option>
                <option value="SERVICE">Services</option>
                <option value="RAW_MATERIAL">Raw Materials</option>
              </select>
            )}
            
            {filters.stockStatus && (
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="ALL">All Stock Status</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            )}
            
            {filters.priceRange && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-20 text-sm"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-20 text-sm"
                />
              </div>
            )}
            
            {activeFiltersCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-600"
              >
                Clear filters ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* New Item Form Sidebar */}
          {showNewItemForm && (
            <div className="w-96 border-r overflow-y-auto p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Item</h3>
              <QuickItemForm
                onSuccess={handleNewItemSuccess}
                onCancel={() => setShowNewItemForm(false)}
                defaultValues={{
                  categoryId: selectedCategory,
                  type: selectedType !== 'ALL' ? selectedType : undefined,
                  locationId: defaultFilters?.locationId
                }}
                compact={true}
              />
            </div>
          )}
          
          {/* Items List */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="px-6 py-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Loading items...
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No items found matching your criteria</p>
                {showCreateNew && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewItemForm(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {Array.isArray(items) && items.map((item) => {
                  const isSelected = selectedItems.has(item.id)
                  const selectedItem = selectedItems.get(item.id)
                  
                  return (
                    <div
                      key={item.id}
                      className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="mt-1 cursor-pointer"
                          onClick={() => handleItemToggle(item)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{item.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {item.code}
                                </Badge>
                                {item.type === 'PRODUCT' ? (
                                  <Package className="h-4 w-4 text-gray-400" />
                                ) : item.type === 'SERVICE' ? (
                                  <Wrench className="h-4 w-4 text-gray-400" />
                                ) : null}
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                {item.category && (
                                  <span>Category: {item.category.name}</span>
                                )}
                                {item.unitOfMeasure && (
                                  <span>Unit: {item.unitOfMeasure.code}</span>
                                )}
                                <span>Price: {formatCurrency(item.listPrice)}</span>
                                {item.trackInventory && (
                                  <span className="flex items-center gap-1">
                                    Stock: {item.availableStock || 0}
                                    {item.availableStock === 0 && (
                                      <Badge variant="destructive" className="ml-1 text-xs">
                                        Out of Stock
                                      </Badge>
                                    )}
                                    {item.availableStock && item.availableStock > 0 && item.availableStock <= 10 && (
                                      <Badge variant="secondary" className="ml-1 text-xs">
                                        Low Stock
                                      </Badge>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {isSelected && (
                              <div className="flex items-center gap-2 ml-4">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                                  <Input
                                    type="number"
                                    value={selectedItem?.quantity || 1}
                                    onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 1)}
                                    min="1"
                                    step="1"
                                    className="w-20 h-8"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Price</label>
                                  <Input
                                    type="number"
                                    value={selectedItem?.unitPrice || item.listPrice}
                                    onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                    className="w-24 h-8"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Selected Items Summary */}
          {selectedItems.size > 0 && (
            <div className="w-80 border-l p-4 overflow-y-auto">
              <h3 className="font-semibold mb-4">Selected Items</h3>
              <div className="space-y-3">
                {Array.from(selectedItems.values()).map((item) => (
                  <div key={item.itemId} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newSelected = new Map(selectedItems)
                          newSelected.delete(item.itemId)
                          setSelectedItems(newSelected)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      Array.from(selectedItems.values()).reduce(
                        (sum, item) => sum + item.quantity * item.unitPrice,
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {items.length} item{items.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSelection}
              disabled={selectedItems.size === 0}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}