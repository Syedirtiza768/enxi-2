'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createSalesCaseSchema, type CreateSalesCaseData } from '@/lib/validators/sales-case.validator'
import { apiClient } from '@/lib/api/client'
import { AlertCircle } from 'lucide-react'

interface SalesCaseFormProps {
  customerId?: string
  customerName?: string
  onSuccess?: (salesCase: Record<string, unknown>) => void
  onCancel?: () => void
}

export function SalesCaseForm({ customerId, customerName, onSuccess, onCancel }: SalesCaseFormProps) {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  
  const [formData, setFormData] = useState<CreateSalesCaseData>({
    customerId: customerId || '',
    title: '',
    description: '',
    estimatedValue: 0,
    assignedTo: ''
  })

  // Load customers if not provided
  useState(() => {
    if (!customerId) {
      loadCustomers()
    }
  })

  const loadCustomers = async (): Promise<void> => {
    setLoadingCustomers(true)
    try {
      const response = await apiClient<{ data: any[]; total?: number } | any[]>('/api/customers', { method: 'GET' })
      if (response.ok && response.data) {
        const responseData = response.data
        const customersData = Array.isArray(responseData) ? responseData : (responseData.data || [])
        setCustomers(Array.isArray(customersData) ? customersData : [])
      }
} catch (error) {
      console.error('Error:', error);
      setLoadingCustomers(false)
    }
  }

  const handleChange = (field: keyof CreateSalesCaseData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      // Validate form data
      const validatedData = createSalesCaseSchema.parse(formData)
      
      // Submit to API
      const response = await apiClient('/api/sales-cases', {
        method: 'POST',
        body: JSON.stringify(validatedData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create sales case')
      }

      // Success
      if (onSuccess) {
        onSuccess(response.data)
      } else {
        router.push(`/sales-cases/${response.data.data.id}`)
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errors' in error) {
        // Zod validation errors
        const fieldErrors: Record<string, string> = {}
        const zodError = error as { errors: { path: (string | number)[]; message: string }[] }
        zodError.errors.forEach((err: { path: (string | number)[]; message: string }) => {
          if (err.path[0]) {
            fieldErrors[err.path[0]] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setErrors({ general: error instanceof Error ? error.message : 'Failed to create sales case' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Sales Case</CardTitle>
        <CardDescription>
          {customerName 
            ? `Creating sales case for ${customerName}`
            : 'Enter sales case information'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{errors.general}</span>
            </div>
          )}

          {/* Customer Selection (if not provided) */}
          {!customerId && (
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => handleChange('customerId', value)}
                disabled={loading || loadingCustomers}
              >
                <SelectTrigger 
                  id="customerId" 
                  className={errors.customerId ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && <p className="text-sm text-red-500">{errors.customerId}</p>}
            </div>
          )}

          {/* Case Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Case Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
              disabled={loading}
              placeholder="e.g., Enterprise Software Implementation"
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              disabled={loading}
              rows={4}
              placeholder="Provide details about the sales opportunity..."
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Estimated Value */}
          <div className="space-y-2">
            <Label htmlFor="estimatedValue">Estimated Value</Label>
            <Input
              id="estimatedValue"
              type="number"
              min="0"
              step="0.01"
              value={formData.estimatedValue}
              onChange={(e) => handleChange('estimatedValue', parseFloat(e.target.value) || 0)}
              className={errors.estimatedValue ? 'border-red-500' : ''}
              disabled={loading}
              placeholder="0.00"
            />
            {errors.estimatedValue && <p className="text-sm text-red-500">{errors.estimatedValue}</p>}
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assign To (User ID)</Label>
            <Input
              id="assignedTo"
              value={formData.assignedTo || ''}
              onChange={(e) => handleChange('assignedTo', e.target.value)}
              className={errors.assignedTo ? 'border-red-500' : ''}
              disabled={loading}
              placeholder="Enter user ID (optional)"
            />
            {errors.assignedTo && <p className="text-sm text-red-500">{errors.assignedTo}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || (!customerId && loadingCustomers)}>
              {loading ? 'Creating...' : 'Create Sales Case'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}