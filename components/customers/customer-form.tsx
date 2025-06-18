'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { 
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_URL_LENGTH,
  MAX_ADDRESS_LENGTH,
  SUPPORTED_CURRENCIES,
  validateEmail,
  validatePhone,
  validateUrl,
  checkMaxLength,
  validateCurrency
} from '@/lib/validators/common.validator'
import { apiClient } from '@/lib/api/client'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { FormErrors } from '@/lib/types/common.types'

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

const currencies = SUPPORTED_CURRENCIES.map(code => {
  const labels: Record<string, string> = {
    'AED': 'UAE Dirham',
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'SAR': 'Saudi Riyal',
    'QAR': 'Qatari Riyal',
    'OMR': 'Omani Rial',
    'KWD': 'Kuwaiti Dinar',
    'BHD': 'Bahraini Dinar'
  }
  return { value: code, label: `${code} - ${labels[code] || code}` }
})

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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [fieldStatus, setFieldStatus] = useState<Record<string, 'checking' | 'valid' | 'error'>>({})
  const [checkingEmail, setCheckingEmail] = useState(false)
  
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

  // Debounce email for duplicate checking
  const debouncedEmail = useDebounce(formData.email, 500)

  // Check for duplicate email
  const checkDuplicateEmail = useCallback(async (email: string) => {
    if (!email || validateEmail(email)) return
    
    setCheckingEmail(true)
    setFieldStatus(prev => ({ ...prev, email: 'checking' }))
    
    try {
      const response = await apiClient<{ data: { id: string; email: string }[] }>(`/api/customers?email=${encodeURIComponent(email)}`)
      if (response?.data && response?.data.length > 0) {
        setErrors(prev => ({ ...prev, email: 'A customer with this email already exists' }))
        setFieldStatus(prev => ({ ...prev, email: 'error' }))
      } else {
        setFieldStatus(prev => ({ ...prev, email: 'valid' }))
        if (errors.email === 'A customer with this email already exists') {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.email
            return newErrors
          })
        }
      }
    } catch (error) {
      console.error('Error checking email:', error)
    } finally {
      setCheckingEmail(false)
    }
  }, [errors.email])

  // Run email duplicate check when debounced email changes
  useEffect(() => {
    if (debouncedEmail && !leadData?.email) {
      checkDuplicateEmail(debouncedEmail)
    }
  }, [debouncedEmail, checkDuplicateEmail, leadData?.email])

  const handleChange = (field: keyof CreateCustomerData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation
    let error: string | null = null
    
    switch (field) {
      case 'name':
        error = checkMaxLength(value as string, MAX_NAME_LENGTH, 'Company name')
        if (!error && !value) error = 'Company name is required'
        break
      case 'email':
        error = validateEmail(value as string)
        if (!error) error = checkMaxLength(value as string, MAX_EMAIL_LENGTH, 'Email')
        break
      case 'phone':
        if (value) {
          error = validatePhone(value as string)
          if (!error) error = checkMaxLength(value as string, MAX_PHONE_LENGTH, 'Phone')
        }
        break
      case 'website':
        if (value) {
          error = validateUrl(value as string)
          if (!error) error = checkMaxLength(value as string, MAX_URL_LENGTH, 'Website')
        }
        break
      case 'address':
        if (value) {
          error = checkMaxLength(value as string, MAX_ADDRESS_LENGTH, 'Address')
        }
        break
      case 'taxId':
        if (value) {
          const taxIdValue = value as string
          if (!/^[A-Z0-9\-\/]*$/.test(taxIdValue)) {
            error = 'Tax ID can only contain uppercase letters, numbers, hyphens, and slashes'
          } else if (taxIdValue.length > 50) {
            error = 'Tax ID must be less than 50 characters'
          }
        }
        break
      case 'creditLimit':
        const creditLimitValue = value as number
        if (creditLimitValue < 0) {
          error = 'Credit limit cannot be negative'
        } else if (creditLimitValue > 999999999.99) {
          error = 'Credit limit too high'
        } else {
          error = validateCurrency(creditLimitValue)
        }
        break
      case 'paymentTerms':
        const paymentTermsValue = value as number
        if (paymentTermsValue < 0) {
          error = 'Payment terms cannot be negative'
        } else if (paymentTermsValue > 365) {
          error = 'Payment terms cannot exceed 365 days'
        } else if (!Number.isInteger(paymentTermsValue)) {
          error = 'Payment terms must be a whole number'
        }
        break
    }
    
    // Update errors
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
      setFieldStatus(prev => ({ ...prev, [field]: 'error' as const }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      if (field !== 'email' || leadData?.email) {
        setFieldStatus(prev => ({ ...prev, [field]: 'valid' as const }))
      }
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
      const response = await apiClient<{ success: boolean; data: { id: string; name: string; email: string } }>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(validatedData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create customer')
      }

      // Success - response.data contains the API response object { success: true, data: customer }
      const customer = response.data?.data
      if (!customer || !customer.id) {
        throw new Error('Invalid response from server - missing customer data')
      }

      if (onSuccess) {
        onSuccess(customer)
      } else {
        router.push(`/customers/${customer.id}`)
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errors' in error) {
        // Zod validation errors
        const fieldErrors: FormErrors = {}
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
                <div className="relative">
                  <Input
                    label="Company Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    error={errors.name}
                    disabled={loading}
                    required
                    fullWidth
                    maxLength={MAX_NAME_LENGTH}
                  />
                  {fieldStatus.name === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="relative">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value.toLowerCase())}
                    error={errors.email}
                    disabled={loading || checkingEmail}
                    required
                    fullWidth
                    maxLength={MAX_EMAIL_LENGTH}
                  />
                  {fieldStatus.email === 'checking' && (
                    <div className="absolute right-3 top-9 h-5 w-5">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
                    </div>
                  )}
                  {fieldStatus.email === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="relative">
                  <Input
                    label="Phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    error={errors.phone}
                    disabled={loading}
                    fullWidth
                    maxLength={MAX_PHONE_LENGTH}
                    placeholder="+971 50 123 4567"
                  />
                  {fieldStatus.phone === 'valid' && formData.phone && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <Select
                  label="Industry"
                  value={formData.industry || ''}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  error={errors.industry}
                  disabled={loading}
                  placeholder="Select industry"
                  options={industries.map(industry => ({ value: industry, label: industry }))}
                  fullWidth
                />

                <div className="relative">
                  <Input
                    label="Website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    error={errors.website}
                    disabled={loading}
                    fullWidth
                    maxLength={MAX_URL_LENGTH}
                  />
                  {fieldStatus.website === 'valid' && formData.website && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="relative">
                  <Input
                    label="Tax ID"
                    type="text"
                    value={formData.taxId || ''}
                    onChange={(e) => handleChange('taxId', e.target.value.toUpperCase())}
                    error={errors.taxId}
                    disabled={loading}
                    fullWidth
                    maxLength={50}
                    placeholder="ABC123-45"
                  />
                  {fieldStatus.taxId === 'valid' && formData.taxId && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>
              </Grid>

              <div className="relative">
                <Textarea
                  label="Address"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  error={errors.address}
                  disabled={loading}
                  rows={3}
                  fullWidth
                  maxLength={MAX_ADDRESS_LENGTH}
                />
                <div className="absolute right-3 bottom-3 text-xs text-gray-500">
                  {formData.address?.length || 0}/{MAX_ADDRESS_LENGTH}
                </div>
              </div>
            </VStack>

            <VStack gap="md">
              <Text weight="medium">Financial Information</Text>
              
              <Grid cols={3} gap="md">
                <Select
                  label="Currency"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  disabled={loading}
                  options={currencies}
                  fullWidth
                />

                <div className="relative">
                  <Input
                    label="Credit Limit"
                    type="number"
                    min="0"
                    step="0.01"
                    max="999999999.99"
                    value={formData.creditLimit}
                    onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                    error={errors.creditLimit}
                    disabled={loading}
                    fullWidth
                  />
                  {fieldStatus.creditLimit === 'valid' && formData.creditLimit > 0 && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="relative">
                  <Input
                    label="Payment Terms (days)"
                    type="number"
                    min="0"
                    max="365"
                    step="1"
                    value={formData.paymentTerms}
                    onChange={(e) => handleChange('paymentTerms', parseInt(e.target.value) || 0)}
                    error={errors.paymentTerms}
                    disabled={loading}
                    fullWidth
                  />
                  {fieldStatus.paymentTerms === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>
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