'use client'

import React, { useState, useMemo, useCallback, memo } from 'react'
import { Edit2, Trash2, Package } from 'lucide-react'
import { useCurrency } from '@/lib/contexts/currency-context'
import { FixedSizeList as List } from 'react-window'

export interface ItemStockSummary {
  totalQuantity: number
  availableQuantity: number
  reservedQuantity: number
  totalValue: number
}

export interface Item {
  id: string
  code: string
  name: string
  description?: string
  type: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
  category: {
    id: string
    name: string
  }
  unitOfMeasure: {
    id: string
    code: string
    name: string
  }
  trackInventory: boolean
  minStockLevel: number
  maxStockLevel: number
  reorderPoint: number
  standardCost: number
  listPrice: number
  isActive: boolean
  isSaleable: boolean
  isPurchaseable: boolean
  inventoryAccountId?: string
  cogsAccountId?: string
  salesAccountId?: string
  stockSummary?: ItemStockSummary | null
}

interface ItemListProps {
  items: Item[]
  loading: boolean
  onItemSelect: (item: Item) => void
  onItemEdit: (item: Item) => void
  onItemDelete: (item: Item) => void
  showStockDetails?: boolean
  searchTerm?: string
  selectedCategory?: string
  itemType?: string
}

// Memoized item row component for virtual scrolling
const ItemRow = memo(({ 
  index, 
  style, 
  data 
}: {
  index: number
  style: React.CSSProperties
  data: {
    items: Item[]
    onItemSelect: (item: Item) => void
    onItemEdit: (item: Item) => void
    onItemDelete: (item: Item) => void
    showStockDetails: boolean
    formatCurrency: (amount: number) => string
  }
}) => {
  const { 
    items, 
    onItemSelect, 
    onItemEdit, 
    onItemDelete, 
    showStockDetails, 
    formatCurrency 
  } = data
  
  const item = items[index]
  
  const handleSelect = useCallback(() => onItemSelect(item), [item, onItemSelect])
  const handleEdit = useCallback(() => onItemEdit(item), [item, onItemEdit])
  const handleDelete = useCallback(() => onItemDelete(item), [item, onItemDelete])
  
  const stockLevel = item.stockSummary?.availableQuantity || 0
  const isLowStock = item.trackInventory && stockLevel <= item.reorderPoint
  const isOutOfStock = item.trackInventory && stockLevel === 0

  return (
    <div style={style}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelect}
                className="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate"
                title={item.name}
              >
                {item.name}
              </button>
              
              {!item.isActive && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              )}
              
              {isOutOfStock && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Out of Stock
                </span>
              )}
              
              {isLowStock && !isOutOfStock && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Low Stock
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span className="font-mono">{item.code}</span>
              <span>{item.category.name}</span>
              <span>{item.type.replace('_', ' ')}</span>
            </div>
            
            {showStockDetails && item.trackInventory && item.stockSummary && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                <span>Available: {item.stockSummary.availableQuantity}</span>
                <span>Reserved: {item.stockSummary.reservedQuantity}</span>
                <span>Value: {formatCurrency(item.stockSummary.totalValue)}</span>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 text-right">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(item.listPrice)}
            </div>
            <div className="text-xs text-gray-500">
              Cost: {formatCurrency(item.standardCost)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleEdit}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit item"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
})

ItemRow.displayName = 'ItemRow'

// Optimized item list with virtual scrolling and memoization
export const ItemListOptimized = memo(({
  items,
  loading,
  onItemSelect,
  onItemEdit,
  onItemDelete,
  showStockDetails = false,
  searchTerm = '',
  selectedCategory = '',
  itemType = ''
}: ItemListProps) => {
  const { formatCurrency } = useCurrency()
  
  // Memoized filtered items
  const filteredItems = useMemo(() => {
    let filtered = items
    
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(lowercaseSearch) ||
        item.code.toLowerCase().includes(lowercaseSearch) ||
        item.description?.toLowerCase().includes(lowercaseSearch)
      )
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category.id === selectedCategory)
    }
    
    if (itemType) {
      filtered = filtered.filter(item => item.type === itemType)
    }
    
    return filtered
  }, [items, searchTerm, selectedCategory, itemType])
  
  // Memoized row data
  const rowData = useMemo(() => ({
    items: filteredItems,
    onItemSelect,
    onItemEdit,
    onItemDelete,
    showStockDetails,
    formatCurrency
  }), [
    filteredItems,
    onItemSelect,
    onItemEdit,
    onItemDelete,
    showStockDetails,
    formatCurrency
  ])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
        <p className="text-gray-500">
          {searchTerm || selectedCategory || itemType
            ? 'Try adjusting your filters or search terms.'
            : 'Get started by adding your first inventory item.'
          }
        </p>
      </div>
    )
  }

  // Use virtual scrolling for large lists (> 50 items)
  if (filteredItems.length > 50) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <List
          height={600}
          itemCount={filteredItems.length}
          itemSize={showStockDetails ? 120 : 100}
          itemData={rowData}
          overscanCount={5}
        >
          {ItemRow}
        </List>
      </div>
    )
  }

  // Regular rendering for smaller lists
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {filteredItems.map((item, index) => (
        <ItemRow
          key={item.id}
          index={index}
          style={{}}
          data={rowData}
        />
      ))}
    </div>
  )
})

ItemListOptimized.displayName = 'ItemListOptimized'