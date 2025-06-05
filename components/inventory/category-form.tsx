'use client'

import React, { useState, useEffect } from 'react'
import { Category } from './category-tree'

interface GLAccount {
  id: string
  code: string
  name: string
}

interface CategoryFormData {
  name: string
  code: string
  description: string
  parentId?: string
  glAccounts: {
    inventoryAccount: string
    cogsAccount: string
    varianceAccount: string
  }
}

interface CategoryFormProps {
  mode: 'create' | 'edit'
  category?: Category
  parentId?: string
  availableCategories: Category[]
  onSubmit: (data: CategoryFormData) => Promise<void> | void
  onCancel: () => void
}

export function CategoryForm({
  mode,
  category,
  parentId,
  availableCategories,
  onSubmit,
  onCancel
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || '',
    code: category?.code || '',
    description: category?.description || '',
    parentId: parentId || category?.parentId || undefined,
    glAccounts: {
      inventoryAccount: category?.glAccounts?.inventoryAccount || '',
      cogsAccount: category?.glAccounts?.cogsAccount || '',
      varianceAccount: category?.glAccounts?.varianceAccount || ''
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([])
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)

  // Load GL accounts on mount
  useEffect(() => {
    const loadGLAccounts = async () => {
      try {
        const response = await fetch('/api/accounting/accounts')
        if (response.ok) {
          const data = await response.json()
          setGlAccounts(data.data || [])
        }
      } catch {
        // Ignore error
      }
    }

    loadGLAccounts()
  }, [])

  // Auto-generate code from name
  useEffect(() => {
    if (!codeManuallyEdited && formData.name && mode === 'create') {
      const generatedCode = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim()
      
      setFormData(prev => ({ ...prev, code: generatedCode }))
    }
  }, [formData.name, codeManuallyEdited, mode])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Category code is required'
    } else {
      // Check code uniqueness (exclude current category in edit mode)
      const existingCategory = availableCategories.find(cat => 
        cat.code === formData.code && cat.id !== category?.id
      )
      if (existingCategory) {
        newErrors.code = 'Category code already exists'
      }
    }

    if (!formData.glAccounts.inventoryAccount) {
      newErrors.inventoryAccount = 'Inventory account is required'
    }

    if (!formData.glAccounts.cogsAccount) {
      newErrors.cogsAccount = 'COGS account is required'
    }

    if (!formData.glAccounts.varianceAccount) {
      newErrors.varianceAccount = 'Variance account is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleGLAccountChange = (accountType: keyof CategoryFormData['glAccounts'], value: string) => {
    setFormData(prev => ({
      ...prev,
      glAccounts: {
        ...prev.glAccounts,
        [accountType]: value
      }
    }))

    // Clear error for this field
    if (errors[accountType]) {
      setErrors(prev => ({ ...prev, [accountType]: '' }))
    }
  }

  const parentCategory = parentId ? availableCategories.find(cat => cat.id === parentId) : null

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">
        {mode === 'create' ? 'Create Category' : 'Edit Category'}
      </h2>

      {parentCategory && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            Parent Category: {parentCategory.name}
          </p>
        </div>
      )}

      <form role="form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter category name"
            />
            {errors.name && (
              <div role="alert" className="mt-1 text-sm text-red-600">
                {errors.name}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Category Code *
            </label>
            <input
              id="code"
              type="text"
              required
              value={formData.code}
              onChange={(e) => {
                setCodeManuallyEdited(true)
                handleInputChange('code', e.target.value.toUpperCase())
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="AUTO_GENERATED"
            />
            {errors.code && (
              <div role="alert" className="mt-1 text-sm text-red-600">
                {errors.code}
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional description"
          />
        </div>

        {/* GL Account Assignments */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">GL Account Assignments</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inventoryAccount" className="block text-sm font-medium text-gray-700 mb-1">
                Inventory Account *
              </label>
              <select
                id="inventoryAccount"
                value={formData.glAccounts.inventoryAccount}
                onChange={(e) => handleGLAccountChange('inventoryAccount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select account...</option>
                {glAccounts.map(account => (
                  <option key={account.id} value={account.code}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
              {errors.inventoryAccount && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.inventoryAccount}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cogsAccount" className="block text-sm font-medium text-gray-700 mb-1">
                COGS Account *
              </label>
              <select
                id="cogsAccount"
                value={formData.glAccounts.cogsAccount}
                onChange={(e) => handleGLAccountChange('cogsAccount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select account...</option>
                {glAccounts.map(account => (
                  <option key={account.id} value={account.code}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
              {errors.cogsAccount && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.cogsAccount}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="varianceAccount" className="block text-sm font-medium text-gray-700 mb-1">
                Variance Account *
              </label>
              <select
                id="varianceAccount"
                value={formData.glAccounts.varianceAccount}
                onChange={(e) => handleGLAccountChange('varianceAccount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select account...</option>
                {glAccounts.map(account => (
                  <option key={account.id} value={account.code}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
              {errors.varianceAccount && (
                <div role="alert" className="mt-1 text-sm text-red-600">
                  {errors.varianceAccount}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting 
              ? (mode === 'create' ? 'Creating...' : 'Updating...')
              : (mode === 'create' ? 'Create Category' : 'Update Category')
            }
          </button>
        </div>
      </form>
    </div>
  )
}