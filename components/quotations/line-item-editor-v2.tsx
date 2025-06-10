'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Eye, Settings, Package, Briefcase, Search, ShoppingCart } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

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

interface Category {
  id: string
  code: string
  name: string
  type: 'PRODUCT' | 'SERVICE'
}

interface LineItemEditorV2Props {
  quotationItems: QuotationItem[]
  onChange: (items: QuotationItem[]) => void
  disabled?: boolean
}

export function LineItemEditorV2({ quotationItems, onChange, disabled = false }: LineItemEditorV2Props) {
  const [viewMode, setViewMode] = useState<'client' | 'internal'>('internal')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [_loading, _setLoading] = useState(true)
  const [_error, _setError] = useState<string | null>(null)
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

  // Load inventory items and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch inventory items
        const itemsResponse = await apiClient('/api/inventory/items', { method: 'GET' })
        if (itemsResponse.ok) {
          const inventoryData = itemsResponse.data?.data || itemsResponse.data || []
          setInventoryItems(Array.isArray(inventoryData) ? inventoryData : [])
        }
        
        // Fetch categories
        const categoriesResponse = await apiClient('/api/inventory/categories', { method: 'GET' })
        if (categoriesResponse.ok) {
          const categoryData = categoriesResponse.data?.data || categoriesResponse.data || []
          setCategories(Array.isArray(categoryData) ? categoryData : [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper functions
  const generateId = () => Math.random().toString(36).substr(2, 9)

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

  // formatCurrency function removed - use useCurrency hook instead

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
  const addLine = () => {
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

  const removeLine = (lineNumber: number) => {
    onChange(quotationItems.filter(item => item.lineNumber !== lineNumber))
  }

  const updateLineDescription = (lineNumber: number, description: string) => {
    onChange(quotationItems.map(item => 
      item.lineNumber === lineNumber 
        ? { ...item, lineDescription: description }
        : item
    ))
  }

  // Item management
  const addItemToLine = (lineNumber: number) => {
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
      ...calculateItemAmounts({ quantity: 1, unitPrice: 0 })
    } as QuotationItem
    
    onChange([...quotationItems, newItem])
  }

  const removeItem = (itemId: string) => {
    onChange(quotationItems.filter(item => item.id !== itemId))
  }

  const updateItem = (itemId: string, updates: Partial<QuotationItem>) => {
    onChange(quotationItems.map(item => 
      item.id === itemId 
        ? { ...item, ...updates, ...calculateItemAmounts({ ...item, ...updates }) }
        : item
    ))
  }

  const selectInventoryItem = (itemId: string, inventoryItem: InventoryItem) => {
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
  const handleCreateNewItem = async () => {
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

  const toggleLine = (lineNumber: number) => {
    const newExpanded = new Set(expandedLines)
    if (newExpanded.has(lineNumber)) {
      newExpanded.delete(lineNumber)
    } else {
      newExpanded.add(lineNumber)
    }
    setExpandedLines(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Quotation Lines</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'client' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('client')}
            disabled={disabled}
          >
            <Eye className="h-4 w-4 mr-1" />
            Client View
          </Button>
          <Button
            variant={viewMode === 'internal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('internal')}
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
                    onClick={() => toggleLine(line.lineNumber)}
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
                  onChange={(e) => updateLineDescription(line.lineNumber, e.target.value)}
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
                    onClick={() => removeLine(line.lineNumber)}
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
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-1">
                        <Select
                          value={item.itemType}
                          onValueChange={(value) => updateItem(item.id, { itemType: value as 'PRODUCT' | 'SERVICE' })}
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
                      
                      <div className="col-span-3">
                        <div className="relative">
                          <Select
                            value={item.itemId || 'custom'}
                            onValueChange={(value) => {
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
                              <SelectValue placeholder="Select or add item" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <div className="relative">
                                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                  <Input
                                    placeholder="Search items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 mb-2"
                                    onClick={(e) => e.stopPropagation()}
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
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Item description"
                          disabled={disabled}
                        />
                      </div>

                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                          placeholder="Qty"
                          disabled={disabled}
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          placeholder="Unit price"
                          disabled={disabled}
                        />
                      </div>

                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={item.discount || 0}
                          onChange={(e) => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                          placeholder="Disc %"
                          disabled={disabled}
                        />
                      </div>

                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={item.taxRate || 0}
                          onChange={(e) => updateItem(item.id, { taxRate: parseFloat(e.target.value) || 0 })}
                          placeholder="Tax %"
                          disabled={disabled}
                        />
                      </div>

                      <div className="col-span-1 flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Internal notes */}
                    <div>
                      <Textarea
                        value={item.internalDescription || ''}
                        onChange={(e) => updateItem(item.id, { internalDescription: e.target.value })}
                        placeholder="Internal notes (not shown to client)"
                        className="h-16"
                        disabled={disabled}
                      />
                    </div>

                    {/* Cost and margin info */}
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <label className="text-gray-600">Cost:</label>
                        <Input
                          type="number"
                          value={item.cost || 0}
                          onChange={(e) => updateItem(item.id, { cost: parseFloat(e.target.value) || 0 })}
                          disabled={disabled}
                        />
                      </div>
                      <div>
                        <label className="text-gray-600">Margin:</label>
                        <div className="font-medium">
                          {item.cost && item.unitPrice > 0 
                            ? `${((item.unitPrice - item.cost) / item.unitPrice * 100).toFixed(1)}%`
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
                  onClick={() => addItemToLine(line.lineNumber)}
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

      {/* Totals */}
      <div className="mt-6 border-t pt-4">
        <div className="space-y-1 text-sm">
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
            <span>{formatCurrency(grandTotal)}</span>
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
                  onChange={(e) => setNewItemData({ ...newItemData, code: e.target.value })}
                  placeholder="e.g. PROD-001"
                />
              </div>
              
              <div>
                <Label htmlFor="itemType">Type</Label>
                <Select
                  value={newItemData.type}
                  onValueChange={(value) => setNewItemData({ ...newItemData, type: value as 'PRODUCT' | 'SERVICE' })}
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
                onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>

            <div>
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea
                id="itemDescription"
                value={newItemData.description}
                onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                placeholder="Item description (optional)"
                className="h-20"
              />
            </div>

            <div>
              <Label htmlFor="itemCategory">Category</Label>
              <Select
                value={newItemData.categoryId}
                onValueChange={(value) => setNewItemData({ ...newItemData, categoryId: value })}
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
                  onChange={(e) => setNewItemData({ ...newItemData, listPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="standardCost">Standard Cost</Label>
                <Input
                  id="standardCost"
                  type="number"
                  value={newItemData.standardCost}
                  onChange={(e) => setNewItemData({ ...newItemData, standardCost: parseFloat(e.target.value) || 0 })}
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
                    onChange={(e) => setNewItemData({ ...newItemData, initialStock: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>
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