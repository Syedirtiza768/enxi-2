'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ItemForm } from '@/components/inventory/item-form'
import { useAuth } from '@/lib/hooks/use-auth'

interface ItemFormData {
  code: string
  name: string
  description: string
  categoryId: string
  type: 'PRODUCT' | 'SERVICE' | 'RAW_MATERIAL'
  unitOfMeasureId: string
  trackInventory: boolean
  minStockLevel: number
  maxStockLevel: number
  reorderPoint: number
  standardCost: number
  listPrice: number
  inventoryAccountId?: string
  cogsAccountId?: string
  salesAccountId?: string
  isActive: boolean
  isSaleable: boolean
  isPurchaseable: boolean
}

export default function NewItemPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: ItemFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          createdById: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create item')
      }

      const result = await response.json()
      
      // Navigate back to items list on success
      router.push('/inventory/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
      throw err // Re-throw so ItemForm can handle it
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/inventory/items')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Items
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">New Item</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create a new inventory item
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Item Form */}
      <ItemForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}