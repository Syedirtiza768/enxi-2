'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { CategoryTree, Category } from '@/components/inventory/category-tree'
import { CategoryForm } from '@/components/inventory/category-form'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'


export default function CategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [parentId, setParentId] = useState<string | undefined>()

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (!showInactive) params.append('isActive', 'true')
      params.append('includeChildren', 'true')

      const response = await apiClient(`/api/inventory/categories/tree?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      // Handle both wrapped and unwrapped responses
      const categoriesData = response.data?.data || response.data || []
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showInactive])

  // Handle category create
  const handleCategoryCreate = (parentId?: string) => {
    setFormMode('create')
    setEditingCategory(null)
    setParentId(parentId)
    setShowForm(true)
  }

  // Handle category update
  const handleCategoryUpdate = async (id: string, updates: Partial<Category>) => {
    try {
      const response = await apiClient(`/api/inventory/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to update category')
      }

      // Refresh categories
      await fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
    }
  }

  // Handle category delete
  const handleCategoryDelete = async (id: string) => {
    try {
      const response = await apiClient(`/api/inventory/categories/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to delete category')
      }

      // Refresh categories
      await fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  // Handle form submission
  const handleFormSubmit = async (data: Record<string, unknown>) => {
    try {
      const url = formMode === 'create' 
        ? '/api/inventory/categories'
        : `/api/inventory/categories/${editingCategory?.id}`

      const response = await apiClient(url, {
        method: formMode === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify({
          ...data,
          createdById: user?.id,
          isActive: true
        })
      })

      if (!response.ok) {
        throw new Error(response.error || `Failed to ${formMode} category`)
      }

      setShowForm(false)
      setEditingCategory(null)
      setParentId(undefined)
      await fetchCategories()
    } catch (err) {
      throw err // Let the form handle the error
    }
  }

  // Handle edit button click
  const _handleEditClick = (category: Category) => {
    setFormMode('edit')
    setEditingCategory(category)
    setParentId(category.parentId || undefined)
    setShowForm(true)
  }

  // Calculate statistics
  const stats = {
    total: categories.length,
    active: categories.filter(c => c.isActive).length,
    withItems: 0 // This would need item count from backend
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory Categories</h1>
          <p className="mt-1 text-sm text-gray-600">
            Organize your inventory items into categories
          </p>
        </div>
        <button
          onClick={() => handleCategoryCreate()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Total Categories</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Active Categories</div>
          <div className="text-2xl font-semibold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Categories with Items</div>
          <div className="text-2xl font-semibold text-blue-600">{stats.withItems}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Show inactive categories</span>
            </label>
          </div>
          <button
            onClick={fetchCategories}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Category Tree or Form */}
      {showForm ? (
        <CategoryForm
          mode={formMode}
          category={editingCategory || undefined}
          parentId={parentId}
          availableCategories={categories}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingCategory(null)
            setParentId(undefined)
          }}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg border">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Category Hierarchy</h2>
            <div className="text-sm text-gray-500">
              Click category name to edit • Drag to reorganize
            </div>
          </div>
          
          <CategoryTree
            categories={categories}
            onCategoryUpdate={handleCategoryUpdate}
            onCategoryCreate={handleCategoryCreate}
            onCategoryDelete={handleCategoryDelete}
            showGLAccounts={true}
          />
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Quick Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Double-click category names to rename them inline</li>
          <li>• Hover over categories to see action buttons</li>
          <li>• Categories with items cannot be deleted</li>
          <li>• Each category must have unique code</li>
          <li>• GL accounts are used for inventory valuation and cost tracking</li>
        </ul>
      </div>
    </div>
  )
}