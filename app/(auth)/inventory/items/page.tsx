'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, RefreshCw, Download, Package } from 'lucide-react'
import { PageLayout, PageHeader, PageSection, VStack, Button, Card, CardContent, CardHeader, CardTitle, Grid } from '@/components/design-system'
import { ItemList, Item } from '@/components/inventory/item-list'
import { apiClient } from '@/lib/api/client'

interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  limit?: number
}

interface Category {
  id: string
  name: string
}

export default function ItemsPage() {
  const router = useRouter()
  
  // State management
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 20
  
  // Selection for bulk operations
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  // Reference data
  const [categories, setCategories] = useState<Category[]>([])

  // Fetch items from API
  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      })
      
      if (search) params.append('search', search)
      if (categoryFilter) params.append('categoryId', categoryFilter)
      if (typeFilter) params.append('type', typeFilter)
      if (statusFilter === 'active') params.append('isActive', 'true')
      if (statusFilter === 'inactive') params.append('isActive', 'false')
      if (lowStockOnly) params.append('lowStock', 'true')

      const response = await apiClient(`/api/inventory/items?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load items')
      }

      const data = response.data
      const itemsData = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      
      // Transform items to match expected structure
      const transformedItems = itemsData.map((item: any) => ({
        ...item,
        stockSummary: item.currentStock !== undefined ? {
          totalQuantity: item.currentStock,
          availableQuantity: item.currentStock,
          reservedQuantity: 0,
          totalValue: item.stockValue || (item.currentStock * item.standardCost)
        } : null
      }))
      
      setItems(transformedItems)
      setTotalItems(data.total || itemsData.length)
      setTotalPages(Math.ceil((data.total || itemsData.length) / limit))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories for filter
  const fetchCategories = async () => {
    try {
      const response = await apiClient('/api/inventory/categories', {
        method: 'GET'
      })
      if (response.ok) {
        const data = response.data
        setCategories(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  // Effects
  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchItems()
  }, [currentPage, search, categoryFilter, typeFilter, statusFilter, lowStockOnly])

  // Event handlers
  const handleItemSelect = (item: Item) => {
    router.push(`/inventory/items/${item.id}`)
  }

  const handleItemEdit = (item: Item) => {
    router.push(`/inventory/items/${item.id}/edit`)
  }

  const handleItemDelete = async (item: Item) => {
    try {
      const response = await apiClient(`/api/inventory/items/${item.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      await fetchItems()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  const handleCreateNew = () => {
    router.push('/inventory/items/new')
  }

  const handleExport = () => {
    const csvContent = items.map(item => 
      [
        item.code,
        item.name,
        item.category.name,
        item.type,
        item.stockSummary?.totalQuantity || 0,
        item.listPrice
      ].join(',')
    ).join('\n')

    const header = 'Code,Name,Category,Type,Stock,Price\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventory-items.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkUpdate = () => {
    // TODO: Implement bulk update functionality
    console.log('Bulk update for items:', selectedItems)
  }

  // Calculate stats
  const stats = {
    total: totalItems,
    lowStock: items.filter(item => 
      item.trackInventory && 
      item.stockSummary && 
      item.stockSummary.totalQuantity < item.minStockLevel
    ).length,
    outOfStock: items.filter(item => 
      item.trackInventory && 
      item.stockSummary && 
      item.stockSummary.totalQuantity === 0
    ).length
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader 
          title="Inventory Items"
          description="Manage your inventory items and stock levels"
          centered={false}
          actions={
            <button
              onClick={handleCreateNew}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </button>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={3} gap="lg">
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Items</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Low Stock Items</div>
              <div className="text-2xl font-semibold text-yellow-600">{stats.lowStock}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Out of Stock</div>
              <div className="text-2xl font-semibold text-red-600">{stats.outOfStock}</div>
            </Card>
          </Grid>
        </PageSection>

        {/* Filters and Search */}
        <PageSection>
          <Card className="bg-white p-4 rounded-lg border space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  aria-label="Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  aria-label="Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="PRODUCT">Product</option>
                  <option value="SERVICE">Service</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  aria-label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchItems}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>

            {/* Additional Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="Show low stock only"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Show low stock only</span>
              </label>

              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="flex items-center space-x-2 ml-auto">
                  <span className="text-sm text-gray-600">
                    {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={handleExport}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Export Selected
                  </button>
                  <button
                    onClick={handleBulkUpdate}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Bulk Update
                  </button>
                </div>
              )}

              {/* Export Button */}
              {selectedItems.length === 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              )}
            </div>
          </Card>
        </PageSection>

        {/* Error Message */}
        {error && (
          <PageSection>
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          </PageSection>
        )}

        {/* Items List or Loading */}
        <PageSection>
          <Card className="bg-white rounded-lg border">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading items...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <Package className="mx-auto h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500">Create your first inventory item to get started</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Item
                </button>
              </div>
            ) : (
              <ItemList
                items={items}
                loading={loading}
                onItemSelect={handleItemSelect}
                onItemEdit={handleItemEdit}
                onItemDelete={handleItemDelete}
                showStockDetails={true}
              />
            )}
          </Card>
        </PageSection>

        {/* Pagination */}
        {totalPages > 1 && (
          <PageSection>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems} items
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </PageSection>
        )}
      </VStack>
    </PageLayout>
  )
}