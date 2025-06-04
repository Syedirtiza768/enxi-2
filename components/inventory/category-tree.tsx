'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2 } from 'lucide-react'

export interface Category {
  id: string
  name: string
  code: string
  parentId?: string | null
  level?: number
  path?: string
  isActive: boolean
  children?: Category[]
  description?: string
  _count?: {
    children: number
    items: number
  }
  glAccounts?: {
    inventoryAccount: string
    cogsAccount: string
    varianceAccount: string
  }
}

interface CategoryTreeProps {
  categories: Category[]
  onCategoryUpdate: (id: string, updates: Partial<Category>) => void
  onCategoryCreate: (parentId?: string) => void
  onCategoryDelete: (id: string) => void
  showGLAccounts?: boolean
}

export function CategoryTree({
  categories,
  onCategoryUpdate,
  onCategoryCreate,
  onCategoryDelete,
  showGLAccounts = false
}: CategoryTreeProps) {
  // Initialize with all categories expanded for testing
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const allCategoryIds = new Set<string>()
    const collectIds = (cats: Category[]) => {
      cats.forEach(cat => {
        allCategoryIds.add(cat.id)
        if (cat.children && cat.children.length > 0) collectIds(cat.children)
      })
    }
    if (categories && categories.length > 0) {
      collectIds(categories)
    }
    return allCategoryIds
  })
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Empty state
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <Plus className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
        <p className="text-gray-500 mb-4">Create your first category to organize inventory items</p>
        <button
          onClick={() => onCategoryCreate()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Category
        </button>
      </div>
    )
  }

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const startEditing = (category: Category) => {
    setEditingCategory(category.id)
    setEditValue(category.name)
  }

  const saveEdit = () => {
    if (editingCategory && editValue.trim()) {
      onCategoryUpdate(editingCategory, { name: editValue.trim() })
    }
    setEditingCategory(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const handleDelete = (category: Category) => {
    if (category.children && category.children.length > 0) {
      // Show error for categories with children
      setErrorMessage('Cannot delete category with subcategories')
      return
    }
    setDeleteConfirm(category.id)
  }

  const confirmDelete = (categoryId: string) => {
    onCategoryDelete(categoryId)
    setDeleteConfirm(null)
  }

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const isEditing = editingCategory === category.id
    const isHovered = hoveredCategory === category.id

    return (
      <div key={category.id} className="category-item">
        <div
          data-testid="category-row"
          className="flex items-center py-2 px-3 hover:bg-gray-50 group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onMouseEnter={() => setHoveredCategory(category.id)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          {/* Expand/Collapse Button */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(category.id)}
                aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Category Name */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                className="px-2 py-1 border rounded text-sm w-full"
                autoFocus
              />
            ) : (
              <span
                className="text-sm font-medium text-gray-900 cursor-pointer"
                onDoubleClick={() => startEditing(category)}
              >
                {category.name}
              </span>
            )}
            {category.code && (
              <span className="ml-2 text-xs text-gray-500">({category.code})</span>
            )}
          </div>

          {/* GL Accounts */}
          {showGLAccounts && category.glAccounts && (
            <div className="flex space-x-2 text-xs text-gray-500">
              <span>{category.glAccounts.inventoryAccount}</span>
              <span>{category.glAccounts.cogsAccount}</span>
            </div>
          )}

          {/* Actions */}
          {isHovered && !isEditing && (
            <div className="flex space-x-1 ml-2">
              <button
                onClick={() => startEditing(category)}
                aria-label="Edit category"
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onCategoryCreate(category.id)}
                aria-label="Add subcategory"
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(category)}
                aria-label="Delete category"
                className="p-1 hover:bg-red-200 rounded text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="category-tree">
      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
      
      {categories.map((category) => renderCategory(category))}
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Delete Category</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete &quot;{categories.find(c => c.id === deleteConfirm)?.name}&quot;?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirm)}
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