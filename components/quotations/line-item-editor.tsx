'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Eye, Settings } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface QuotationItem {
  id: string
  itemId?: string // Link to inventory item
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
    name: string
  }
}

interface LineItemEditorProps {
  quotationItems: QuotationItem[]
  onChange: (items: QuotationItem[]) => void
  disabled?: boolean
}

export function LineItemEditor({ quotationItems, onChange, disabled = false }: LineItemEditorProps) {
  const [viewMode, setViewMode] = useState<'client' | 'internal'>('client')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load inventory items for selection
  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await apiClient('/api/inventory/items', {
          method: 'GET'
        })
        
        if (!response.ok) {
          throw new Error('Failed to load inventory items')
        }
        
        const inventoryData = response.data?.data || response.data || []
        setInventoryItems(Array.isArray(inventoryData) ? inventoryData : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory items')
        console.error('Error fetching inventory items:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInventoryItems()
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

  // Item management functions
  const _addQuotationItem = (fromInventoryItem?: InventoryItem) => {
    const newItem: QuotationItem = {
      id: generateId(),
      itemId: fromInventoryItem?.id,
      itemCode: fromInventoryItem?.code || '',
      description: fromInventoryItem?.name || '',
      internalDescription: '',
      quantity: 1,
      unitPrice: fromInventoryItem?.listPrice || 0,
      cost: fromInventoryItem?.standardCost || 0,
      discount: 0,
      taxRate: 0,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0
    }
    
    const calculatedItem = calculateItemAmounts(newItem) as QuotationItem
    onChange([...quotationItems, calculatedItem])
  }

  const _updateQuotationItem = (itemId: string, updates: Partial<QuotationItem>) => {
    const updatedItems = quotationItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates }
        return calculateItemAmounts(updatedItem) as QuotationItem
      }
      return item
    })
    onChange(updatedItems)
  }

  const _removeQuotationItem = (itemId: string) => {
    const updatedItems = quotationItems.filter(item => item.id !== itemId)
    onChange(updatedItems)
  }

  // Simplified quotation structure - using quotationItems directly
  const quotationLines: Array<{ id: string; description: string; lineItems: Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number; inventoryItemId?: string; type?: string }>; total: number }> = []
  const expandedLines = new Set<string>()
  const setExpandedLines = (_: Set<string>) => {} // Placeholder
  
  // Helper functions for the render logic
  const addQuotationLine = () => {
    // Add quotation line functionality not implemented
  }

  // Line item management functions
  const addLineItem = (lineId: string) => {
    const line = quotationLines.find(l => l.id === lineId)
    if (!line) return

    const newLineItem: LineItem = {
      id: generateId(),
      type: 'INVENTORY',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }

    const updatedLineItems = [...line.lineItems, newLineItem]
    updateQuotationLine(lineId, { lineItems: updatedLineItems })
  }

  const deleteLineItem = (lineId: string, itemId: string) => {
    const line = quotationLines.find(l => l.id === lineId)
    if (!line) return

    const updatedLineItems = line.lineItems.filter(item => item.id !== itemId)
    updateQuotationLine(lineId, { lineItems: updatedLineItems })
  }

  const updateLineItem = (lineId: string, itemId: string, updates: Partial<LineItem>) => {
    const line = quotationLines.find(l => l.id === lineId)
    if (!line) return

    const updatedLineItems = line.lineItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates }
        
        // Prevent negative values
        if (updatedItem.quantity < 0) updatedItem.quantity = 0
        if (updatedItem.unitPrice < 0) updatedItem.unitPrice = 0
        
        // Recalculate total
        updatedItem.total = calculateItemTotal(updatedItem.quantity, updatedItem.unitPrice)
        return updatedItem
      }
      return item
    })

    updateQuotationLine(lineId, { lineItems: updatedLineItems })
  }

  // Handle inventory item selection
  const handleInventoryItemSelection = (lineId: string, itemId: string, inventoryItemId: string) => {
    const inventoryItem = inventoryItems.find(item => item.id === inventoryItemId)
    if (!inventoryItem) return

    updateLineItem(lineId, itemId, {
      description: inventoryItem.name,
      unitPrice: inventoryItem.listPrice,
      inventoryItemId: inventoryItemId,
      type: inventoryItem.type,
      total: calculateItemTotal(1, inventoryItem.listPrice) // Assuming quantity 1
    })
  }

  // Toggle line expansion
  const toggleLineExpansion = (lineId: string) => {
    const newExpanded = new Set(expandedLines)
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId)
    } else {
      newExpanded.add(lineId)
    }
    setExpandedLines(newExpanded)
  }

  // Validation
  const validateLine = (line: QuotationLine): string[] => {
    const errors: string[] = []
    if (!line.description.trim()) {
      errors.push('Line description is required')
    }
    return errors
  }

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Quotation Lines</h3>
        
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('client')}
              className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'client'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Client View
            </button>
            <button
              onClick={() => setViewMode('internal')}
              className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'internal'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="h-4 w-4 mr-2" />
              Internal View
            </button>
          </div>

          {/* Add Line Button */}
          {!disabled && (
            <button
              onClick={addQuotationLine}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </button>
          )}
        </div>
      </div>

      {/* Error Display - only for inventory loading issues */}
      {error && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <p className="text-yellow-800">{error}</p>
          <p className="text-sm text-yellow-600 mt-1">You can still create quotation lines, but inventory selection may be limited.</p>
        </div>
      )}

      {/* Quotation Lines */}
      <div className="space-y-4">
        {quotationLines.map((line, lineIndex) => {
          const isExpanded = expandedLines.has(line.id)
          const errors = validateLine(line)
          
          return (
            <div key={line.id} className="bg-white border border-gray-200 rounded-lg">
              {/* Line Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start space-x-4">
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleLineExpansion(line.id)}
                    aria-label="Expand line items"
                    className="flex-shrink-0 mt-1 p-1 hover:bg-gray-100 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Line Content */}
                  <div className="flex-1 space-y-3">
                    {/* Line Description */}
                    <div>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateQuotationLine(line.id, { description: e.target.value })}
                        placeholder="Enter line description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.length > 0 && (
                        <div className="mt-1">
                          {errors.map((error, i) => (
                            <p key={i} className="text-sm text-red-600">{error}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Line Summary */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        Line {lineIndex + 1} • {line.lineItems.length} items
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(line.total)}
                      </span>
                    </div>

                    {/* Internal View: Show line items breakdown */}
                    {viewMode === 'internal' && line.lineItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {line.lineItems.map((item) => (
                          <div key={item.id} className="text-sm text-gray-600 flex justify-between">
                            <span>{item.description}</span>
                            <span>{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteQuotationLine(line.id)}
                    aria-label="Delete line"
                    className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Line Items (expanded view AND internal view) */}
              {isExpanded && (
                <div className="p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Line Items</h4>
                    <button
                      onClick={() => addLineItem(line.id)}
                      className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </button>
                  </div>

                  {line.lineItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No line items yet. Click &quot;Add Item&quot; to get started.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {line.lineItems.map((item) => (
                        <div key={item.id} className="bg-white p-3 rounded border">
                          <div className="grid grid-cols-12 gap-3 items-start">
                            {/* Inventory Selection */}
                            <div className="col-span-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Item
                              </label>
                              <select
                                value={item.inventoryItemId || ''}
                                onChange={(e) => handleInventoryItemSelection(line.id, item.id, e.target.value)}
                                aria-label="Select inventory item"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select item...</option>
                                {inventoryItems.map(invItem => (
                                  <option key={invItem.id} value={invItem.id}>
                                    {invItem.code} - {invItem.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Description */}
                            <div className="col-span-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateLineItem(line.id, item.id, { description: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Quantity */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Qty
                              </label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(line.id, item.id, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                                min="0"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Unit Price */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Unit Price
                              </label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(line.id, item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Total */}
                            <div className="col-span-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Total
                              </label>
                              <div className="text-sm font-medium text-gray-900 py-1">
                                {formatCurrency(item.total)}
                              </div>
                            </div>

                            {/* Delete Button */}
                            <div className="col-span-1">
                              <button
                                onClick={() => deleteLineItem(line.id, item.id)}
                                aria-label="Delete line item"
                                className="w-full p-1 text-red-600 hover:bg-red-50 rounded mt-5"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Empty State */}
        {quotationLines.length === 0 && (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-500 mb-4">
              <Plus className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quotation lines</h3>
            <p className="text-gray-500 mb-4">Start building your quotation by adding the first line</p>
            <button
              onClick={addQuotationLine}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Line
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      {quotationLines.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total ({quotationLines.length} lines, {quotationLines.reduce((sum, line) => sum + line.lineItems.length, 0)} items)
            </span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(quotationLines.reduce((sum, line) => sum + line.total, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}