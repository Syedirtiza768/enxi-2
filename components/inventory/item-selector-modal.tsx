'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Package, Wrench, Filter, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { useDebounce } from '@/lib/hooks/use-debounce'

interface Item {
  id: string
  code: string
  name: string
  description?: string
  type: 'PRODUCT' | 'SERVICE'
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

interface Category {
  id: string
  code: string
  name: string
}

interface UnitOfMeasure {
  id: string
  code: string
  name: string
  symbol: string
}

interface ItemSelectorModalProps {
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
}

interface SelectedItem {
  itemId: string
  itemCode: string
  name: string
  description: string
  type: 'PRODUCT' | 'SERVICE'
  quantity: number
  unitPrice: number
  unitOfMeasureId: string
  cost?: number
  availableStock?: number
}

interface NewItemForm {
  code: string
  name: string
  description: string
  type: 'PRODUCT' | 'SERVICE'
  categoryId: string
  unitOfMeasureId: string
  listPrice: number
  standardCost: number
  trackInventory: boolean
  initialQuantity: number
  inventoryAccountId?: string
  cogsAccountId?: string
  salesAccountId?: string
}

export function ItemSelectorModal({
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
  excludeItemIds = []
}: ItemSelectorModalProps) {
  const { formatCurrency } = useCurrency()
  
  // State
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [unitOfMeasures, setUnitOfMeasures] = useState<UnitOfMeasure[]>([])
  const [glAccounts, setGlAccounts] = useState<{
    inventory: any[]
    cogs: any[]
    sales: any[]
  }>({
    inventory: [],
    cogs: [],
    sales: []
  })
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedType, setSelectedType] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL')
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  
  // New item form
  const [showNewItemForm, setShowNewItemForm] = useState(false)
  const [newItemForm, setNewItemForm] = useState<NewItemForm>({
    code: '',
    name: '',
    description: '',
    type: 'PRODUCT',
    categoryId: '',
    unitOfMeasureId: '',
    listPrice: 0,
    standardCost: 0,
    trackInventory: true,
    initialQuantity: 0,
    inventoryAccountId: '',
    cogsAccountId: '',
    salesAccountId: ''
  })
  const [savingNewItem, setSavingNewItem] = useState(false)
  
  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Load reference data
  useEffect(() => {
    if (open) {
      loadReferenceData()
      loadItems()
    }
  }, [open])

  // Load items when filters change
  useEffect(() => {
    if (open) {
      loadItems()
    }
  }, [debouncedSearchTerm, selectedCategory, selectedType, stockFilter, priceMin, priceMax])

  const loadReferenceData = async (): Promise<void> => {
    try {
      const [categoriesRes, uomRes, accountsRes, settingsRes] = await Promise.all([
        apiClient('/api/inventory/categories', { method: 'GET' }),
        apiClient('/api/inventory/units-of-measure', { method: 'GET' }),
        apiClient('/api/accounting/accounts', { method: 'GET' }),
        apiClient('/api/settings/company', { method: 'GET' })
      ])

      if (categoriesRes.ok) {
        setCategories(categoriesRes.data || [])
      }
      
      if (uomRes.ok) {
        setUnitOfMeasures(uomRes.data || [])
      }
      
      if (accountsRes.ok && accountsRes.data) {
        const allAccounts = accountsRes.data
        setGlAccounts({
          inventory: allAccounts.filter((acc: any) => acc.type === 'ASSET'),
          cogs: allAccounts.filter((acc: any) => acc.type === 'EXPENSE'),
          sales: allAccounts.filter((acc: any) => acc.type === 'INCOME')
        })
      }
      
      if (settingsRes.ok && settingsRes.data) {
        setCompanySettings(settingsRes.data.settings)
      }
    } catch (err) {
      console.error('Error loading reference data:', err)
    }
  }

  const loadItems = async (): Promise<unknown> => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (selectedCategory) params.append('categoryId', selectedCategory)
      if (selectedType !== 'ALL') params.append('type', selectedType)
      if (priceMin) params.append('priceMin', priceMin)
      if (priceMax) params.append('priceMax', priceMax)
      params.append('isSaleable', 'true')
      params.append('isActive', 'true')

      const response = await apiClient<{ data: any[] }>(`/api/inventory/items?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load items')
      }

      let itemsData = response?.data || []
      
      // Filter by stock status
      if (stockFilter !== 'ALL') {
        itemsData = itemsData.filter((item: Item) => {
          if (!item.trackInventory) return true // Services always available
          
          const stock = item.availableStock || 0
          switch (stockFilter) {
            case 'IN_STOCK':
              return stock > 10
            case 'LOW_STOCK':
              return stock > 0 && stock <= 10
            case 'OUT_OF_STOCK':
              return stock === 0
            default:
              return true
          }
        })
      }

      // Exclude already added items
      itemsData = itemsData.filter((item: Item) => !excludeItemIds.includes(item.id))

      setItems(itemsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
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
    if (item) {
      item.quantity = quantity
      newSelected.set(itemId, item)
      setSelectedItems(newSelected)
    }
  }

  const handlePriceChange = (itemId: string, price: number) => {
    const newSelected = new Map(selectedItems)
    const item = newSelected.get(itemId)
    if (item) {
      item.unitPrice = price
      newSelected.set(itemId, item)
      setSelectedItems(newSelected)
    }
  }

  const handleCreateNewItem = async (): Promise<void> => {
    try {
      setSavingNewItem(true)
      setError(null)

      // Validate form
      if (!newItemForm.code || !newItemForm.name || !newItemForm.categoryId || !newItemForm.unitOfMeasureId) {
        setError('Please fill in all required fields')
        return
      }

      // Create item
      const response = await apiClient('/api/inventory/items', {
        method: 'POST',
        data: {
          ...newItemForm,
          isSaleable: true,
          isPurchaseable: true,
          isActive: true,
          inventoryAccountId: newItemForm.inventoryAccountId || undefined,
          cogsAccountId: newItemForm.cogsAccountId || undefined,
          salesAccountId: newItemForm.salesAccountId || undefined
        }
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create item')
      }

      const newItem = response?.data

      // Add initial stock if specified
      if (newItemForm.trackInventory && newItemForm.initialQuantity > 0) {
        await apiClient('/api/inventory/stock-movements', {
          method: 'POST',
          data: {
            itemId: newItem.id,
            movementType: 'OPENING',
            quantity: newItemForm.initialQuantity,
            unitCost: newItemForm.standardCost,
            notes: 'Initial stock'
          }
        })
      }

      // Reset form and reload items
      setShowNewItemForm(false)
      setNewItemForm({
        code: '',
        name: '',
        description: '',
        type: 'PRODUCT',
        categoryId: '',
        unitOfMeasureId: '',
        listPrice: 0,
        standardCost: 0,
        trackInventory: true,
        initialQuantity: 0
      })
      
      await loadItems()
      
      // Auto-select the new item
      handleItemToggle({
        ...newItem,
        availableStock: newItemForm.initialQuantity
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setSavingNewItem(false)
    }
  }

  const handleConfirmSelection = () => {
    const selected = Array.from(selectedItems.values())
    onSelect(selected)
    setSelectedItems(new Map())
    onClose()
  }

  const filteredItemsCount = items.length

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Select Items</h2>
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
                onClick={() => {
                  setNewItemForm({
                    code: '',
                    name: '',
                    description: '',
                    type: 'PRODUCT',
                    categoryId: '',
                    unitOfMeasureId: '',
                    listPrice: 0,
                    standardCost: 0,
                    trackInventory: true,
                    initialQuantity: 0,
                    inventoryAccountId: companySettings?.defaultInventoryAccountId || '',
                    cogsAccountId: companySettings?.defaultCogsAccountId || '',
                    salesAccountId: companySettings?.defaultSalesAccountId || ''
                  })
                  setShowNewItemForm(true)
                }}
                variant="outline"
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
                {categories.map((cat) => (
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
                  placeholder="Min price"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-24"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  placeholder="Max price"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-24"
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Items list */}
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
            ) : filteredItemsCount === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No items found matching your criteria
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item) => {
                  const isSelected = selectedItems.has(item.id)
                  const selectedItem = selectedItems.get(item.id)
                  
                  return (
                    <div
                      key={item.id}
                      className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleItemToggle(item)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{item.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {item.code}
                                </Badge>
                                {item.type === 'PRODUCT' ? (
                                  <Package className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Wrench className="h-4 w-4 text-gray-400" />
                                )}
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
                                {item.trackInventory && (
                                  <span>
                                    Stock: {item.availableStock || 0}
                                    {item.availableStock === 0 && (
                                      <Badge variant="destructive" className="ml-2 text-xs">
                                        Out of Stock
                                      </Badge>
                                    )}
                                    {item.availableStock && item.availableStock > 0 && item.availableStock <= 10 && (
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        Low Stock
                                      </Badge>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-medium">{formatCurrency(item.listPrice)}</div>
                              {item.standardCost > 0 && (
                                <div className="text-sm text-gray-500">
                                  Cost: {formatCurrency(item.standardCost)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                              <div>
                                <label className="text-sm text-gray-600">Quantity</label>
                                <Input
                                  type="number"
                                  value={selectedItem?.quantity || 1}
                                  onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 1)}
                                  min="0.01"
                                  step="0.01"
                                  className="w-24"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-600">Unit Price</label>
                                <Input
                                  type="number"
                                  value={selectedItem?.unitPrice || item.listPrice}
                                  onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                  className="w-32"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected items summary */}
          {selectedItems.size > 0 && (
            <div className="w-80 border-l bg-gray-50 p-4">
              <h3 className="font-medium mb-4">
                Selected Items ({selectedItems.size})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Array.from(selectedItems.values()).map((item) => (
                  <div key={item.itemId} className="bg-white p-3 rounded-md border">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>
                    {formatCurrency(
                      Array.from(selectedItems.values()).reduce(
                        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
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
          <div className="text-sm text-gray-500">
            {filteredItemsCount} items found
            {selectedItems.size > 0 && `, ${selectedItems.size} selected`}
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
              Add Selected Items
            </Button>
          </div>
        </div>
      </div>

      {/* New Item Form Modal */}
      {showNewItemForm && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Create New Item</h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Item Code*</label>
                  <Input
                    value={newItemForm.code}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., PROD-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type*</label>
                  <select
                    value={newItemForm.type}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="PRODUCT">Product</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name*</label>
                <Input
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Item description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category*</label>
                  <select
                    value={newItemForm.categoryId}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit of Measure*</label>
                  <select
                    value={newItemForm.unitOfMeasureId}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, unitOfMeasureId: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select unit</option>
                    {unitOfMeasures.map((uom) => (
                      <option key={uom.id} value={uom.id}>
                        {uom.name} ({uom.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">List Price*</label>
                  <Input
                    type="number"
                    value={newItemForm.listPrice}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, listPrice: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Standard Cost*</label>
                  <Input
                    type="number"
                    value={newItemForm.standardCost}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, standardCost: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {newItemForm.type === 'PRODUCT' && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="trackInventory"
                      checked={newItemForm.trackInventory}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, trackInventory: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="trackInventory" className="text-sm">
                      Track inventory for this item
                    </label>
                  </div>

                  {newItemForm.trackInventory && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Initial Quantity</label>
                      <Input
                        type="number"
                        value={newItemForm.initialQuantity}
                        onChange={(e) => setNewItemForm(prev => ({ ...prev, initialQuantity: parseFloat(e.target.value) || 0 }))}
                        min="0"
                        step="1"
                      />
                    </div>
                  )}
                </>
              )}

              {/* GL Accounts Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">GL Accounts</h4>
                <div className="grid grid-cols-1 gap-4">
                  {newItemForm.trackInventory && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Inventory Account</label>
                      <select
                        value={newItemForm.inventoryAccountId || ''}
                        onChange={(e) => setNewItemForm(prev => ({ ...prev, inventoryAccountId: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="">Select account...</option>
                        {glAccounts.inventory.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">COGS Account</label>
                    <select
                      value={newItemForm.cogsAccountId || ''}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, cogsAccountId: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select account...</option>
                      {glAccounts.cogs.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Sales Account</label>
                    <select
                      value={newItemForm.salesAccountId || ''}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, salesAccountId: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select account...</option>
                      {glAccounts.sales.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewItemForm(false)}
                disabled={savingNewItem}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateNewItem}
                disabled={savingNewItem}
              >
                {savingNewItem ? 'Creating...' : 'Create Item'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}