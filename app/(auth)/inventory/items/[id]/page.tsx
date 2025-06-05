'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Package, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react'
import { Item } from '@/components/inventory/item-list'

export default function ItemDetailPage() {
  const params = useParams()
  
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const itemId = params.id as string

  // Fetch item details
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/inventory/items/${itemId}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Failed to load item')
        }

        const data = await response.json()
        setItem(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item')
        console.error('Error fetching item:', err)
      } finally {
        setLoading(false)
      }
    }

    if (itemId) {
      fetchItem()
    }
  }, [itemId])

  // Handle navigation
  const handleBack = () => {
    window.location.href = '/inventory/items'
  }

  const handleEdit = () => {
    window.location.href = `/inventory/items/${itemId}/edit`
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/inventory/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      window.location.href = '/inventory/items'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    }
    setShowDeleteConfirm(false)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Get status badge
  const getStatusBadge = (status: boolean, label: string, trueColor = 'green', falseColor = 'gray') => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
      status 
        ? `bg-${trueColor}-100 text-${trueColor}-800` 
        : `bg-${falseColor}-100 text-${falseColor}-800`
    }`}>
      {status ? label : `Not ${label}`}
    </span>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading item details...</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Items
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-800">{error || 'Item not found'}</p>
        </div>
      </div>
    )
  }

  // Check stock status
  const isLowStock = item.trackInventory && item.stockSummary && 
    item.stockSummary.totalQuantity < item.minStockLevel
  const isOutOfStock = item.trackInventory && item.stockSummary && 
    item.stockSummary.totalQuantity === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Items
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleEdit}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Item
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Item
          </button>
        </div>
      </div>

      {/* Item Header */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Item Details</h1>
            <p className="mt-1 text-sm text-gray-600">
              {item.code} • {item.category.name}
            </p>
          </div>
          <div className="flex space-x-2">
            {getStatusBadge(item.isActive, 'Active')}
            {getStatusBadge(item.isSaleable, 'Saleable', 'blue')}
            {getStatusBadge(item.isPurchaseable, 'Purchaseable', 'purple')}
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-medium text-gray-900">{item.code}</h2>
          <h3 className="text-lg text-gray-700">{item.name}</h3>
          {item.description && (
            <p className="mt-2 text-gray-600">{item.description}</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {item.trackInventory && item.stockSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Stock</p>
                <p className={`text-2xl font-semibold ${
                  isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {item.stockSummary.totalQuantity}
                </p>
                <p className="text-xs text-gray-500">{item.unitOfMeasure.code}</p>
              </div>
              <Package className={`h-8 w-8 ${
                isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'
              }`} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {item.stockSummary.availableQuantity}
                </p>
                <p className="text-xs text-gray-500">Ready to sell</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reserved</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {item.stockSummary.reservedQuantity}
                </p>
                <p className="text-xs text-gray-500">On orders</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(item.stockSummary.totalValue)}
                </p>
                <p className="text-xs text-gray-500">At cost</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'stock-history', label: 'Stock History' },
              { id: 'analytics', label: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="text-sm text-gray-900">{item.category.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="text-sm text-gray-900">
                      {item.type === 'PRODUCT' ? 'Product' : 
                       item.type === 'SERVICE' ? 'Service' : 'Raw Material'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Unit of Measure</dt>
                    <dd className="text-sm text-gray-900">{item.unitOfMeasure.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Track Inventory</dt>
                    <dd className="text-sm text-gray-900">
                      {item.trackInventory ? 'Yes' : 'No'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Standard Cost</dt>
                    <dd className="text-sm text-gray-900">{formatCurrency(item.standardCost)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">List Price</dt>
                    <dd className="text-sm text-gray-900">{formatCurrency(item.listPrice)}</dd>
                  </div>
                </dl>
              </div>

              {/* Stock Levels */}
              {item.trackInventory && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Levels</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Min Stock Level</dt>
                      <dd className="text-sm text-gray-900">Min: {item.minStockLevel}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Max Stock Level</dt>
                      <dd className="text-sm text-gray-900">Max: {item.maxStockLevel}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Reorder Point</dt>
                      <dd className="text-sm text-gray-900">Reorder: {item.reorderPoint}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Stock Summary */}
              {item.trackInventory && item.stockSummary && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Summary</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Quantity</dt>
                      <dd className="text-sm text-gray-900">{item.stockSummary.totalQuantity}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Available</dt>
                      <dd className="text-sm text-gray-900">{item.stockSummary.availableQuantity}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Reserved</dt>
                      <dd className="text-sm text-gray-900">{item.stockSummary.reservedQuantity}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Value</dt>
                      <dd className="text-sm text-gray-900">{formatCurrency(item.stockSummary.totalValue)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stock-history' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Stock Movements</h3>
              <p className="text-gray-500">Stock movement history will be displayed here.</p>
              {/* TODO: Implement stock movement history */}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Item Analytics</h3>
              <p className="text-gray-500">Analytics and reports will be displayed here.</p>
              {/* TODO: Implement analytics */}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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