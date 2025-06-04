'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface QuotationItem {
  id: string
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
    name: string
  }
}

interface SimpleItemEditorProps {
  quotationItems: QuotationItem[]
  onChange: (items: QuotationItem[]) => void
  disabled?: boolean
}

export function SimpleItemEditor({ quotationItems, onChange, disabled = false }: SimpleItemEditorProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInventorySelector, setShowInventorySelector] = useState(false)

  // Load inventory items
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

  const calculateItemAmounts = (item: Partial<QuotationItem>): QuotationItem => {
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
      id: item.id || generateId(),
      itemId: item.itemId,
      itemCode: item.itemCode || '',
      description: item.description || '',
      internalDescription: item.internalDescription || '',
      quantity,
      unitPrice,
      cost: item.cost || 0,
      discount,
      taxRate,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Item management functions
  const addQuotationItem = (fromInventoryItem?: InventoryItem) => {
    const newItem = calculateItemAmounts({
      id: generateId(),
      itemId: fromInventoryItem?.id,
      itemCode: fromInventoryItem?.code || '',
      description: fromInventoryItem?.name || '',
      quantity: 1,
      unitPrice: fromInventoryItem?.listPrice || 0,
      cost: fromInventoryItem?.standardCost || 0,
      discount: 0,
      taxRate: 0
    })
    
    onChange([...quotationItems, newItem])
    setShowInventorySelector(false)
  }

  const updateQuotationItem = (itemId: string, updates: Partial<QuotationItem>) => {
    const updatedItems = quotationItems.map(item => {
      if (item.id === itemId) {
        return calculateItemAmounts({ ...item, ...updates })
      }
      return item
    })
    onChange(updatedItems)
  }

  const removeQuotationItem = (itemId: string) => {
    const updatedItems = quotationItems.filter(item => item.id !== itemId)
    onChange(updatedItems)
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Loading items...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Quotation Items</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowInventorySelector(!showInventorySelector)}
            disabled={disabled}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <Search className="h-4 w-4 mr-2" />
            Add from Inventory
          </button>
          <button
            onClick={() => addQuotationItem()}
            disabled={disabled}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Item
          </button>
        </div>
      </div>

      {/* Inventory Selector */}
      {showInventorySelector && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Select Inventory Item</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {inventoryItems.map(item => (
              <button
                key={item.id}
                onClick={() => addQuotationItem(item)}
                className="text-left p-3 border border-gray-200 rounded-md hover:bg-white hover:border-blue-300"
              >
                <div className="font-medium text-sm">{item.code}</div>
                <div className="text-sm text-gray-600">{item.name}</div>
                <div className="text-sm text-green-600">{formatCurrency(item.listPrice)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Items List */}
      {quotationItems.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No items added yet</p>
          <p className="text-sm text-gray-400">Click "Add Custom Item" or "Add from Inventory" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotationItems.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Item Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={item.itemCode}
                    onChange={(e) => updateQuotationItem(item.id, { itemCode: e.target.value })}
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateQuotationItem(item.id, { description: e.target.value })}
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateQuotationItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateQuotationItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                {/* Total */}
                <div className="flex items-end">
                  <div className="w-full">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                    <div className="px-2 py-1 text-sm bg-gray-50 border border-gray-300 rounded">
                      {formatCurrency(item.totalAmount)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeQuotationItem(item.id)}
                    disabled={disabled}
                    className="ml-2 p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Advanced Options (optional) */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.discount || 0}
                    onChange={(e) => updateQuotationItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.taxRate || 0}
                    onChange={(e) => updateQuotationItem(item.id, { taxRate: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Internal Notes</label>
                  <input
                    type="text"
                    value={item.internalDescription || ''}
                    onChange={(e) => updateQuotationItem(item.id, { internalDescription: e.target.value })}
                    disabled={disabled}
                    placeholder="Internal notes (not visible to client)"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Totals Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(quotationItems.reduce((sum, item) => sum + item.subtotal, 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>-{formatCurrency(quotationItems.reduce((sum, item) => sum + item.discountAmount, 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(quotationItems.reduce((sum, item) => sum + item.taxAmount, 0))}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(quotationItems.reduce((sum, item) => sum + item.totalAmount, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}