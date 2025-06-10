'use client'

import React, { useState } from 'react'
import { Edit2, Trash2, Package } from 'lucide-react'

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
}

export function ItemList({
  items,
  loading,
  onItemSelect,
  onItemEdit,
  onItemDelete,
  showStockDetails = false
}: ItemListProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading items...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <Package className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
        <p className="text-gray-500">Create your first inventory item to get started</p>
      </div>
    )
  }

  // formatCurrency function removed - use useCurrency hook instead

  const getItemTypeBadge = (type: Item['type']) => {
    const badges = {
      PRODUCT: { text: 'Product', className: 'bg-blue-100 text-blue-800' },
      SERVICE: { text: 'Service', className: 'bg-purple-100 text-purple-800' },
      RAW_MATERIAL: { text: 'Raw Material', className: 'bg-gray-100 text-gray-800' }
    }
    const badge = badges[type]
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.text}
      </span>
    )
  }

  const getStockDisplay = (item: Item) => {
    if (!item.trackInventory || !item.stockSummary) {
      return <span className="text-gray-500">N/A</span>
    }

    const { totalQuantity, availableQuantity, reservedQuantity } = item.stockSummary
    const isLowStock = totalQuantity < item.minStockLevel
    const isOutOfStock = totalQuantity === 0

    return (
      <div>
        <div className="flex items-center space-x-2">
          <span className={isOutOfStock ? 'text-red-600 font-medium' : ''}>
            {totalQuantity} {item.unitOfMeasure.code}
          </span>
          {isLowStock && !isOutOfStock && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              Low Stock
            </span>
          )}
        </div>
        {showStockDetails && reservedQuantity > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            <div>Available: {availableQuantity}</div>
            <div>Reserved: {reservedQuantity}</div>
          </div>
        )}
      </div>
    )
  }

  const handleDelete = (item: Item) => {
    setDeleteConfirm(item)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      onItemDelete(deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onItemSelect(item)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-500">{item.description}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.category.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getItemTypeBadge(item.type)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {getStockDisplay(item)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(item.listPrice)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {hoveredItem === item.id && (
                  <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onItemEdit(item)
                      }}
                      aria-label="Edit item"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item)
                      }}
                      aria-label="Delete item"
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Delete Item</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete &quot;{deleteConfirm.name}&quot;?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}