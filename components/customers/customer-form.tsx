'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  VStack, 
  HStack, 
  Grid, 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  Input, 
  Textarea,
  Select,
  Heading,
  Text
} from '@/components/design-system'
import { createCustomerSchema, type CreateCustomerData } from '@/lib/validators/customer.validator'
import { apiClient } from '@/lib/api/client'
import { AlertCircle } from 'lucide-react'

interface CustomerFormProps {
  leadData?: {
    id: string
    name: string
    email: string
    phone?: string
    company?: string
  }
  onSuccess?: (customer: Record<string, unknown>) => void
  onCancel?: () => void
}

const currencies = [
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' }
]

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Consulting',
  'Real Estate',
  'Transportation',
  'Energy',
  'Other'
]

export function CustomerForm({ leadData, onSuccess, onCancel }: CustomerFormProps) {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: leadData?.name || '',
    email: leadData?.email || '',
    phone: leadData?.phone || '',
    industry: '',
    website: '',
    address: '',
    taxId: '',
    currency: 'AED',
    creditLimit: 0,
    paymentTerms: 30,
    leadId: leadData?.id
  })

  const handleChange = (field: keyof CreateCustomerData, value: string | number) => {
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
      const validatedData = createCustomerSchema.parse(formData)
      
      // Submit to API
      const response = await apiClient('/api/customers', {
        method: 'POST',
        body: JSON.stringify(validatedData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create customer')
      }

      // Success
      if (onSuccess) {
        onSuccess(response.data)
      } else {
        router.push(`/customers/${response.data.data.id}`)
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
        setErrors({ general: error instanceof Error ? error.message : 'Failed to create customer' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="elevated" padding="xl">
      <CardHeader border>
        <VStack gap="sm">
          <Heading as="h2">
            {leadData ? 'Convert Lead to Customer' : 'Create New Customer'}
          </Heading>
          <Text color="secondary">
            {leadData 
              ? `Converting lead "${leadData.name}" to a customer`
              : 'Enter customer information to create a new account'
            }
          </Text>
        </VStack>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <VStack gap="lg">
            {errors.general && (
              <div className="flex items-center gap-2 p-3 bg-[var(--color-semantic-error-50)] dark:bg-[var(--color-semantic-error-950)] rounded-[var(--radius-lg)]">
                <AlertCircle className="h-5 w-5 text-[var(--color-semantic-error-600)]" />
                <Text size="sm" color="error">
                  {errors.general}
                </Text>
              </div>
            )}

            <VStack gap="md">
              <Text weight="medium">Basic Information</Text>
              
              <Grid cols={2} gap="md">
                <Input
                  label="Company Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  error={errors.name}
                  disabled={loading}
                  required
                  fullWidth
                />

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  disabled={loading}
                  required
                  fullWidth
                />

                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  error={errors.phone}
                  disabled={loading}
                  fullWidth
                />

                <Select
                  label="Industry"
                  value={formData.industry || ''}
                  onValueChange={(value) => handleChange('industry', value)}
                  error={errors.industry}
                  disabled={loading}
                  placeholder="Select industry"
                  options={industries.map(industry => ({ value: industry, label: industry }))}
                  fullWidth
                />

                <Input
                  label="Website"
                  type="url"
                  placeholder="https://"
                  value={formData.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  error={errors.website}
                  disabled={loading}
                  fullWidth
                />

                <Input
                  label="Tax ID"
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => handleChange('taxId', e.target.value)}
                  error={errors.taxId}
                  disabled={loading}
                  fullWidth
                />
              </Grid>

              <Textarea
                label="Address"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                error={errors.address}
                disabled={loading}
                rows={3}
                fullWidth
              />
            </VStack>

            <VStack gap="md">
              <Text weight="medium">Financial Information</Text>
              
              <Grid cols={3} gap="md">
                <Select
                  label="Currency"
                  value={formData.currency}
                  onValueChange={(value) => handleChange('currency', value)}
                  disabled={loading}
                  options={currencies}
                  fullWidth
                />

                <Input
                  label="Credit Limit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                  error={errors.creditLimit}
                  disabled={loading}
                  fullWidth
                />

                <Input
                  label="Payment Terms (days)"
                  type="number"
                  min="0"
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', parseInt(e.target.value) || 0)}
                  error={errors.paymentTerms}
                  disabled={loading}
                  fullWidth
                />
              </Grid>
            </VStack>

            <HStack justify="end" gap="md" className="pt-6">
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
              <Button 
                type="submit" 
                variant="primary" 
                disabled={loading} 
                loading={loading}
              >
                {leadData ? 'Convert to Customer' : 'Create Customer'}
              </Button>
            </HStack>
          </VStack>
        </form>
      </CardContent>
    </Card>
  )
}