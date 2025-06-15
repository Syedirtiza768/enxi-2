'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VStack, HStack, Input, Textarea, Button, Select, Text, Card, CardContent } from '@/components/design-system'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Building2, CreditCard, Globe, Info } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { 
  MAX_NAME_LENGTH, 
  MAX_CODE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_URL_LENGTH,
  MAX_NOTES_LENGTH,
  validateEmail,
  validatePhone,
  validateUrl,
  checkMaxLength,
  creditLimitValidator,
  paymentTermsValidator
} from '@/lib/validators/common.validator'

interface BankDetails {
  bankName?: string
  accountName?: string
  accountNumber?: string
  routingNumber?: string
  swiftCode?: string
  iban?: string
  bankAddress?: string
  bankCountry?: string
}

interface SupplierFormData {
  code: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  taxId?: string
  vatNumber?: string
  registrationNumber?: string
  paymentTerms?: number
  creditLimit?: number
  currency?: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  preferredPaymentMethod?: 'BANK_TRANSFER' | 'CHECK' | 'WIRE_TRANSFER' | 'ACH' | 'CREDIT_CARD'
  bankDetails?: BankDetails
  website?: string
  category?: string
  notes?: string
}

interface SupplierFormProps {
  supplier?: SupplierFormData & { id: string }
  onSuccess?: () => void
}

// Country-specific validation patterns
const COUNTRY_PATTERNS = {
  UAE: {
    taxId: /^\d{15}$/,
    vatNumber: /^\d{15}$/,
    postalCode: /^\d{5,6}$/,
    phone: /^(\+971|00971|0)?[1-9]\d{8}$/,
    hint: {
      taxId: 'UAE Tax Registration Number (TRN) - 15 digits',
      vatNumber: 'UAE VAT Number - 15 digits',
      phone: 'Format: +971 50 123 4567',
      postalCode: '5-6 digit postal code'
    }
  },
  SA: {
    taxId: /^\d{15}$/,
    vatNumber: /^3\d{14}$/,
    postalCode: /^\d{5}$/,
    phone: /^(\+966|00966|0)?[5]\d{8}$/,
    hint: {
      taxId: 'Saudi Tax Number - 15 digits',
      vatNumber: 'Saudi VAT Number - 15 digits starting with 3',
      phone: 'Format: +966 50 123 4567',
      postalCode: '5 digit postal code'
    }
  },
  USA: {
    taxId: /^\d{2}-?\d{7}$/,
    postalCode: /^\d{5}(-\d{4})?$/,
    phone: /^(\+1|001|1)?[2-9]\d{9}$/,
    hint: {
      taxId: 'EIN Format: XX-XXXXXXX',
      phone: 'Format: +1 234 567 8900',
      postalCode: 'ZIP Code: 12345 or 12345-6789'
    }
  },
  UK: {
    taxId: /^[A-Z]{2}\d{6}[A-Z]?$/,
    vatNumber: /^GB\d{9}$/,
    postalCode: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
    phone: /^(\+44|0044|0)?[1-9]\d{9,10}$/,
    hint: {
      taxId: 'Company Registration Number',
      vatNumber: 'Format: GB123456789',
      phone: 'Format: +44 20 1234 5678',
      postalCode: 'Format: SW1A 1AA'
    }
  }
}

// IBAN validation patterns by country
const IBAN_PATTERNS: Record<string, RegExp> = {
  UAE: /^AE\d{2}\d{3}\d{16}$/,
  SA: /^SA\d{2}\d{2}[A-Z0-9]{18}$/,
  UK: /^GB\d{2}[A-Z]{4}\d{14}$/,
  DE: /^DE\d{2}\d{18}$/,
  FR: /^FR\d{2}\d{10}[A-Z0-9]{11}\d{2}$/,
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingCode, setCheckingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<SupplierFormData>({
    code: supplier?.code || '',
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    city: supplier?.city || '',
    state: supplier?.state || '',
    country: supplier?.country || 'UAE',
    postalCode: supplier?.postalCode || '',
    taxId: supplier?.taxId || '',
    vatNumber: supplier?.vatNumber || '',
    registrationNumber: supplier?.registrationNumber || '',
    paymentTerms: supplier?.paymentTerms || 30,
    creditLimit: supplier?.creditLimit || 0,
    currency: supplier?.currency || 'AED',
    status: supplier?.status || 'ACTIVE',
    preferredPaymentMethod: supplier?.preferredPaymentMethod || 'BANK_TRANSFER',
    bankDetails: supplier?.bankDetails || {},
    website: supplier?.website || '',
    category: supplier?.category || '',
    notes: supplier?.notes || ''
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [fieldStatus, setFieldStatus] = useState<Record<string, 'valid' | 'error' | 'checking'>>({})

  // Check supplier code uniqueness
  const checkSupplierCode = useCallback(async (code: string) => {
    if (!code || (supplier && code === supplier.code)) return true

    setCheckingCode(true)
    setFieldStatus(prev => ({ ...prev, code: 'checking' }))

    try {
      const response = await apiClient<{ data: any[] }>('/api/suppliers/check-code', {
        method: 'POST',
        body: { code }
      })

      const isAvailable = response?.data?.available
      
      if (!isAvailable) {
        setValidationErrors(prev => ({ ...prev, code: 'This supplier code is already in use' }))
        setFieldStatus(prev => ({ ...prev, code: 'error' }))
      } else {
        setValidationErrors(prev => {
          const { code, ...rest } = prev
          return rest
        })
        setFieldStatus(prev => ({ ...prev, code: 'valid' }))
      }

      return isAvailable
    } catch (err) {
      console.error('Error checking supplier code:', err)
      return true // Allow submission on error
    } finally {
      setCheckingCode(false)
    }
  }, [supplier])

  // Debounce code checking
  useEffect(() => {
    if (!formData.code || (supplier && formData.code === supplier.code)) return

    const timer = setTimeout(() => {
      checkSupplierCode(formData.code)
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.code, checkSupplierCode, supplier])

  // Get country-specific patterns and hints
  const getCountryPatterns = useCallback((country: string) => {
    return COUNTRY_PATTERNS[country as keyof typeof COUNTRY_PATTERNS] || null
  }, [])

  // Validate individual field
  const validateField = useCallback((name: string, value: any): string | null => {
    switch (name) {
      case 'code':
        if (!value?.trim()) return 'Supplier code is required'
        if (value.length > MAX_CODE_LENGTH) return `Code must be less than ${MAX_CODE_LENGTH} characters`
        if (!/^[A-Z0-9\-_]+$/.test(value)) return 'Code can only contain uppercase letters, numbers, hyphens, and underscores'
        return null

      case 'name':
        if (!value?.trim()) return 'Supplier name is required'
        return checkMaxLength(value, MAX_NAME_LENGTH, 'Name')

      case 'contactPerson':
        if (value) return checkMaxLength(value, MAX_NAME_LENGTH, 'Contact person')
        return null

      case 'email':
        if (value) return validateEmail(value)
        return null

      case 'phone':
        if (value) {
          const phoneError = validatePhone(value)
          if (phoneError) return phoneError
          
          // Country-specific phone validation
          const patterns = getCountryPatterns(formData.country || 'UAE')
          if (patterns?.phone && !patterns.phone.test(value.replace(/[\s\-\(\)]/g, ''))) {
            return patterns.hint.phone ? `Invalid format. ${patterns.hint.phone}` : 'Invalid phone format for selected country'
          }
        }
        return null

      case 'address':
        if (value) return checkMaxLength(value, MAX_ADDRESS_LENGTH, 'Address')
        return null

      case 'city':
        if (value) return checkMaxLength(value, 100, 'City')
        return null

      case 'state':
        if (value) return checkMaxLength(value, 100, 'State')
        return null

      case 'postalCode':
        if (value) {
          const patterns = getCountryPatterns(formData.country || 'UAE')
          if (patterns?.postalCode && !patterns.postalCode.test(value)) {
            return patterns.hint.postalCode || 'Invalid postal code format'
          }
        }
        return null

      case 'taxId':
        if (value) {
          if (value.length > 50) return 'Tax ID must be less than 50 characters'
          const patterns = getCountryPatterns(formData.country || 'UAE')
          if (patterns?.taxId && !patterns.taxId.test(value.replace(/[\s\-]/g, ''))) {
            return patterns.hint.taxId || 'Invalid Tax ID format'
          }
        }
        return null

      case 'vatNumber':
        if (value) {
          if (value.length > 50) return 'VAT Number must be less than 50 characters'
          const patterns = getCountryPatterns(formData.country || 'UAE')
          if (patterns?.vatNumber && !patterns.vatNumber.test(value.replace(/[\s\-]/g, ''))) {
            return patterns.hint.vatNumber || 'Invalid VAT Number format'
          }
        }
        return null

      case 'registrationNumber':
        if (value && value.length > 50) return 'Registration number must be less than 50 characters'
        return null

      case 'website':
        if (value) return validateUrl(value)
        return null

      case 'creditLimit':
        const creditResult = creditLimitValidator.safeParse(value)
        return creditResult.success ? null : creditResult.error.errors[0].message

      case 'paymentTerms':
        const paymentResult = paymentTermsValidator.safeParse(value)
        return paymentResult.success ? null : paymentResult.error.errors[0].message

      case 'notes':
        if (value) return checkMaxLength(value, MAX_NOTES_LENGTH, 'Notes')
        return null

      // Bank details validation
      case 'bankAccountNumber':
        if (value && !/^[A-Za-z0-9\-]{5,34}$/.test(value)) {
          return 'Account number should be 5-34 alphanumeric characters'
        }
        return null

      case 'bankSwiftCode':
        if (value && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value)) {
          return 'Invalid SWIFT/BIC format (8 or 11 characters)'
        }
        return null

      case 'bankIban':
        if (value) {
          const cleanIban = value.replace(/\s/g, '').toUpperCase()
          if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleanIban)) {
            return 'Invalid IBAN format'
          }
          
          // Country-specific IBAN validation
          const countryCode = cleanIban.substring(0, 2)
          const pattern = IBAN_PATTERNS[countryCode]
          if (pattern && !pattern.test(cleanIban)) {
            return `Invalid IBAN format for country ${countryCode}`
          }
        }
        return null

      case 'bankRoutingNumber':
        if (value) {
          if (formData.country === 'USA' && !/^\d{9}$/.test(value)) {
            return 'US routing number must be 9 digits'
          }
          if (formData.country === 'UK' && !/^\d{6}$/.test(value)) {
            return 'UK sort code must be 6 digits'
          }
        }
        return null

      default:
        return null
    }
  }, [formData.country, getCountryPatterns])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Clear validation error when field is modified
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    }

    // Update form data
    let processedValue: any = value
    if (name === 'paymentTerms' || name === 'creditLimit') {
      processedValue = value ? parseFloat(value) : 0
    } else if (name === 'code') {
      processedValue = value.toUpperCase()
    } else if (name === 'email') {
      processedValue = value.toLowerCase()
    } else if (name === 'website' && value && !value.startsWith('http')) {
      processedValue = `https://${value}`
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))

    // Real-time validation
    const error = validateField(name, processedValue)
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }))
      setFieldStatus(prev => ({ ...prev, [name]: 'error' }))
    } else if (name !== 'code' || (supplier && value === supplier.code)) {
      setFieldStatus(prev => ({ ...prev, [name]: 'valid' }))
    }
  }

  const handleBankDetailsChange = (field: keyof BankDetails, value: string) => {
    const processedValue = field === 'swiftCode' || field === 'iban' ? value.toUpperCase() : value
    
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: processedValue
      }
    }))

    // Map bank field to validation field name
    const validationFieldMap: Record<string, string> = {
      accountNumber: 'bankAccountNumber',
      swiftCode: 'bankSwiftCode',
      iban: 'bankIban',
      routingNumber: 'bankRoutingNumber'
    }

    const validationField = validationFieldMap[field]
    if (validationField) {
      const error = validateField(validationField, processedValue)
      if (error) {
        setValidationErrors(prev => ({ ...prev, [validationField]: error }))
        setFieldStatus(prev => ({ ...prev, [validationField]: 'error' }))
      } else {
        setValidationErrors(prev => {
          const { [validationField]: _, ...rest } = prev
          return rest
        })
        setFieldStatus(prev => ({ ...prev, [validationField]: 'valid' }))
      }
    }
  }

  const validateForm = async (): Promise<boolean> => {
    const errors: Record<string, string> = {}

    // Validate all fields
    const fieldsToValidate = [
      'code', 'name', 'contactPerson', 'email', 'phone', 
      'address', 'city', 'state', 'postalCode',
      'taxId', 'vatNumber', 'registrationNumber', 'website',
      'creditLimit', 'paymentTerms', 'notes'
    ]

    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof SupplierFormData])
      if (error) {
        errors[field] = error
      }
    })

    // Validate bank details if payment method requires it
    if (formData.preferredPaymentMethod === 'BANK_TRANSFER' || 
        formData.preferredPaymentMethod === 'WIRE_TRANSFER' || 
        formData.preferredPaymentMethod === 'ACH') {
      
      const bankErrors = {
        bankAccountNumber: validateField('bankAccountNumber', formData.bankDetails?.accountNumber),
        bankSwiftCode: validateField('bankSwiftCode', formData.bankDetails?.swiftCode),
        bankIban: validateField('bankIban', formData.bankDetails?.iban),
        bankRoutingNumber: validateField('bankRoutingNumber', formData.bankDetails?.routingNumber)
      }

      Object.entries(bankErrors).forEach(([key, error]) => {
        if (error) errors[key] = error
      })
    }

    // Check supplier code availability
    if (!errors.code && formData.code && (!supplier || formData.code !== supplier.code)) {
      const isAvailable = await checkSupplierCode(formData.code)
      if (!isAvailable) {
        errors.code = 'This supplier code is already in use'
      }
    }

    setValidationErrors(errors)
    
    // Update field statuses
    const newFieldStatus: Record<string, 'valid' | 'error'> = {}
    fieldsToValidate.forEach(field => {
      newFieldStatus[field] = errors[field] ? 'error' : 'valid'
    })
    setFieldStatus(newFieldStatus)

    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!(await validateForm())) {
      setError('Please fix the validation errors before submitting')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = supplier ? 'PUT' : 'POST'

      const response = await apiClient(url, {
        method,
        body: formData
      })

      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/suppliers')
        }
      } else {
        throw new Error(response.error || 'Failed to save supplier')
      }
    } catch (err) {
      console.error('Error saving supplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to save supplier')
    } finally {
      setLoading(false)
    }
  }

  const generateSupplierCode = () => {
    const prefix = 'SUP'
    const timestamp = Date.now().toString().slice(-6)
    const newCode = `${prefix}-${timestamp}`
    setFormData(prev => ({ ...prev, code: newCode }))
    
    // Trigger validation for the new code
    const error = validateField('code', newCode)
    if (!error) {
      checkSupplierCode(newCode)
    }
  }

  // Get country-specific hints
  const countryHints = getCountryPatterns(formData.country || 'UAE')

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap="xl">
        {error && (
          <Card variant="elevated" className="border-[var(--color-semantic-error-200)] bg-[var(--color-semantic-error-50)]">
            <CardContent>
              <HStack gap="sm" align="center">
                <AlertCircle className="h-5 w-5 text-[var(--color-semantic-error-600)]" />
                <Text color="error">{error}</Text>
              </HStack>
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Basic Information</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Supplier Code <span className="text-red-500">*</span>
                  </label>
                  <HStack gap="sm">
                    <div className="relative flex-1">
                      <Input
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder="SUP-001"
                        required
                        fullWidth
                        maxLength={MAX_CODE_LENGTH}
                        className={validationErrors.code ? 'border-red-500' : ''}
                        disabled={loading || checkingCode}
                      />
                      {fieldStatus.code === 'checking' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
                        </div>
                      )}
                      {fieldStatus.code === 'valid' && !checkingCode && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                      {fieldStatus.code === 'error' && !checkingCode && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                    </div>
                    {!supplier && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateSupplierCode}
                        disabled={loading}
                      >
                        Generate
                      </Button>
                    )}
                  </HStack>
                  {validationErrors.code && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.code}
                      </HStack>
                    </Text>
                  )}
                  <Text size="xs" color="secondary" className="mt-1">
                    Unique identifier for this supplier
                  </Text>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="ABC Suppliers Ltd."
                    required
                    fullWidth
                    maxLength={MAX_NAME_LENGTH}
                    className={validationErrors.name ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.name === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.name && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.name}
                      </HStack>
                    </Text>
                  )}
                  <div className="absolute right-3 bottom-1 text-xs text-gray-500">
                    {formData.name?.length || 0}/{MAX_NAME_LENGTH}
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Contact Person
                  </label>
                  <Input
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="John Smith"
                    fullWidth
                    maxLength={MAX_NAME_LENGTH}
                    disabled={loading}
                  />
                  {fieldStatus.contactPerson === 'valid' && formData.contactPerson && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                      { value: 'BLOCKED', label: 'Blocked' }
                    ]}
                    fullWidth
                    disabled={loading}
                  />
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Contact Information</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="supplier@example.com"
                    fullWidth
                    maxLength={MAX_EMAIL_LENGTH}
                    className={validationErrors.email ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.email === 'valid' && formData.email && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.email && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.email}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={countryHints?.hint.phone || "+971 50 123 4567"}
                    fullWidth
                    maxLength={MAX_PHONE_LENGTH}
                    className={validationErrors.phone ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.phone === 'valid' && formData.phone && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.phone && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.phone}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium mb-2">
                    Address
                  </label>
                  <Textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main Street, Building A"
                    fullWidth
                    rows={2}
                    maxLength={MAX_ADDRESS_LENGTH}
                    className={validationErrors.address ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  <div className="absolute right-3 bottom-1 text-xs text-gray-500">
                    {formData.address?.length || 0}/{MAX_ADDRESS_LENGTH}
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    City
                  </label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Dubai"
                    fullWidth
                    maxLength={100}
                    disabled={loading}
                  />
                  {fieldStatus.city === 'valid' && formData.city && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    State/Province
                  </label>
                  <Input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Dubai"
                    fullWidth
                    maxLength={100}
                    disabled={loading}
                  />
                  {fieldStatus.state === 'valid' && formData.state && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Country
                  </label>
                  <Select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    options={[
                      { value: 'UAE', label: 'United Arab Emirates' },
                      { value: 'SA', label: 'Saudi Arabia' },
                      { value: 'QA', label: 'Qatar' },
                      { value: 'KW', label: 'Kuwait' },
                      { value: 'BH', label: 'Bahrain' },
                      { value: 'OM', label: 'Oman' },
                      { value: 'USA', label: 'United States' },
                      { value: 'UK', label: 'United Kingdom' },
                      { value: 'IN', label: 'India' },
                      { value: 'CN', label: 'China' },
                      { value: 'JP', label: 'Japan' },
                      { value: 'DE', label: 'Germany' },
                      { value: 'FR', label: 'France' },
                      { value: 'OTHER', label: 'Other' }
                    ]}
                    fullWidth
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Postal Code
                  </label>
                  <Input
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder={countryHints?.hint.postalCode || "12345"}
                    fullWidth
                    className={validationErrors.postalCode ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.postalCode === 'valid' && formData.postalCode && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.postalCode && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.postalCode}
                      </HStack>
                    </Text>
                  )}
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <HStack gap="sm" align="center">
                <Building2 className="h-5 w-5" />
                <Text size="lg" weight="semibold">Business Information</Text>
              </HStack>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Registration Number
                  </label>
                  <Input
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="Company registration number"
                    fullWidth
                    maxLength={50}
                    disabled={loading}
                  />
                  {fieldStatus.registrationNumber === 'valid' && formData.registrationNumber && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    VAT Number
                  </label>
                  <Input
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                    placeholder={countryHints?.hint.vatNumber || "VAT registration number"}
                    fullWidth
                    maxLength={50}
                    className={validationErrors.vatNumber ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.vatNumber === 'valid' && formData.vatNumber && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.vatNumber && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.vatNumber}
                      </HStack>
                    </Text>
                  )}
                  {countryHints?.hint.vatNumber && (
                    <Text size="xs" color="secondary" className="mt-1">
                      <HStack gap="xs" align="center">
                        <Info className="h-3 w-3" />
                        {countryHints.hint.vatNumber}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Website
                  </label>
                  <Input
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    leftIcon={<Globe className="h-4 w-4" />}
                    fullWidth
                    maxLength={MAX_URL_LENGTH}
                    className={validationErrors.website ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.website === 'valid' && formData.website && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.website && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.website}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Supplier Category
                  </label>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Select category' },
                      { value: 'MANUFACTURER', label: 'Manufacturer' },
                      { value: 'DISTRIBUTOR', label: 'Distributor' },
                      { value: 'SERVICE_PROVIDER', label: 'Service Provider' },
                      { value: 'CONTRACTOR', label: 'Contractor' },
                      { value: 'CONSULTANT', label: 'Consultant' },
                      { value: 'LOGISTICS', label: 'Logistics' },
                      { value: 'OTHER', label: 'Other' }
                    ]}
                    fullWidth
                    disabled={loading}
                  />
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Financial Information</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Tax ID / TRN
                  </label>
                  <Input
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder={countryHints?.hint.taxId || "Tax registration number"}
                    fullWidth
                    maxLength={50}
                    className={validationErrors.taxId ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.taxId === 'valid' && formData.taxId && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.taxId && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.taxId}
                      </HStack>
                    </Text>
                  )}
                  {countryHints?.hint.taxId && (
                    <Text size="xs" color="secondary" className="mt-1">
                      <HStack gap="xs" align="center">
                        <Info className="h-3 w-3" />
                        {countryHints.hint.taxId}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency
                  </label>
                  <Select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    options={[
                      { value: 'AED', label: 'AED - UAE Dirham' },
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'GBP', label: 'GBP - British Pound' },
                      { value: 'SAR', label: 'SAR - Saudi Riyal' },
                      { value: 'QAR', label: 'QAR - Qatari Riyal' },
                      { value: 'KWD', label: 'KWD - Kuwaiti Dinar' },
                      { value: 'BHD', label: 'BHD - Bahraini Dinar' },
                      { value: 'OMR', label: 'OMR - Omani Rial' }
                    ]}
                    fullWidth
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Payment Terms (days)
                  </label>
                  <Input
                    type="number"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    placeholder="30"
                    min="0"
                    max="365"
                    fullWidth
                    className={validationErrors.paymentTerms ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.paymentTerms === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.paymentTerms && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.paymentTerms}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Credit Limit
                  </label>
                  <Input
                    type="number"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={handleChange}
                    placeholder="10000"
                    min="0"
                    step="0.01"
                    fullWidth
                    className={validationErrors.creditLimit ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {fieldStatus.creditLimit === 'valid' && formData.creditLimit > 0 && (
                    <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                  )}
                  {validationErrors.creditLimit && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.creditLimit}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preferred Payment Method
                  </label>
                  <Select
                    name="preferredPaymentMethod"
                    value={formData.preferredPaymentMethod}
                    onChange={handleChange}
                    options={[
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                      { value: 'WIRE_TRANSFER', label: 'Wire Transfer' },
                      { value: 'CHECK', label: 'Check' },
                      { value: 'ACH', label: 'ACH Transfer' },
                      { value: 'CREDIT_CARD', label: 'Credit Card' }
                    ]}
                    fullWidth
                    disabled={loading}
                  />
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Bank Details */}
        {(formData.preferredPaymentMethod === 'BANK_TRANSFER' || 
          formData.preferredPaymentMethod === 'WIRE_TRANSFER' || 
          formData.preferredPaymentMethod === 'ACH') && (
          <Card variant="elevated">
            <CardContent>
              <VStack gap="lg">
                <HStack gap="sm" align="center">
                  <CreditCard className="h-5 w-5" />
                  <Text size="lg" weight="semibold">Bank Details</Text>
                </HStack>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      Bank Name
                    </label>
                    <Input
                      value={formData.bankDetails?.bankName || ''}
                      onChange={(e) => handleBankDetailsChange('bankName', e.target.value)}
                      placeholder="Bank name"
                      fullWidth
                      disabled={loading}
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      Account Name
                    </label>
                    <Input
                      value={formData.bankDetails?.accountName || ''}
                      onChange={(e) => handleBankDetailsChange('accountName', e.target.value)}
                      placeholder="Account holder name"
                      fullWidth
                      disabled={loading}
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      Account Number
                    </label>
                    <Input
                      value={formData.bankDetails?.accountNumber || ''}
                      onChange={(e) => handleBankDetailsChange('accountNumber', e.target.value)}
                      placeholder="Account number"
                      fullWidth
                      className={validationErrors.bankAccountNumber ? 'border-red-500' : ''}
                      disabled={loading}
                    />
                    {fieldStatus.bankAccountNumber === 'valid' && formData.bankDetails?.accountNumber && (
                      <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                    )}
                    {validationErrors.bankAccountNumber && (
                      <Text size="sm" color="error" className="mt-1">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.bankAccountNumber}
                        </HStack>
                      </Text>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      {formData.country === 'USA' ? 'Routing Number' : 'Sort Code / Routing Number'}
                    </label>
                    <Input
                      value={formData.bankDetails?.routingNumber || ''}
                      onChange={(e) => handleBankDetailsChange('routingNumber', e.target.value)}
                      placeholder={formData.country === 'USA' ? '9 digits' : 'Routing number'}
                      fullWidth
                      className={validationErrors.bankRoutingNumber ? 'border-red-500' : ''}
                      disabled={loading}
                    />
                    {fieldStatus.bankRoutingNumber === 'valid' && formData.bankDetails?.routingNumber && (
                      <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                    )}
                    {validationErrors.bankRoutingNumber && (
                      <Text size="sm" color="error" className="mt-1">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.bankRoutingNumber}
                        </HStack>
                      </Text>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      SWIFT / BIC Code
                    </label>
                    <Input
                      value={formData.bankDetails?.swiftCode || ''}
                      onChange={(e) => handleBankDetailsChange('swiftCode', e.target.value)}
                      placeholder="SWIFT code (8 or 11 characters)"
                      fullWidth
                      className={validationErrors.bankSwiftCode ? 'border-red-500' : ''}
                      disabled={loading}
                    />
                    {fieldStatus.bankSwiftCode === 'valid' && formData.bankDetails?.swiftCode && (
                      <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                    )}
                    {validationErrors.bankSwiftCode && (
                      <Text size="sm" color="error" className="mt-1">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.bankSwiftCode}
                        </HStack>
                      </Text>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      IBAN
                    </label>
                    <Input
                      value={formData.bankDetails?.iban || ''}
                      onChange={(e) => handleBankDetailsChange('iban', e.target.value)}
                      placeholder="International Bank Account Number"
                      fullWidth
                      className={validationErrors.bankIban ? 'border-red-500' : ''}
                      disabled={loading}
                    />
                    {fieldStatus.bankIban === 'valid' && formData.bankDetails?.iban && (
                      <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                    )}
                    {validationErrors.bankIban && (
                      <Text size="sm" color="error" className="mt-1">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.bankIban}
                        </HStack>
                      </Text>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Bank Address
                    </label>
                    <Input
                      value={formData.bankDetails?.bankAddress || ''}
                      onChange={(e) => handleBankDetailsChange('bankAddress', e.target.value)}
                      placeholder="Bank address"
                      fullWidth
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Bank Country
                    </label>
                    <Input
                      value={formData.bankDetails?.bankCountry || ''}
                      onChange={(e) => handleBankDetailsChange('bankCountry', e.target.value)}
                      placeholder="Bank country"
                      fullWidth
                      disabled={loading}
                    />
                  </div>
                </div>

                <Card variant="outlined" className="bg-blue-50">
                  <CardContent className="p-4">
                    <HStack gap="sm" align="start">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <VStack gap="xs">
                        <Text size="sm" weight="medium">Bank Details Security</Text>
                        <Text size="sm" color="secondary">
                          Bank details are encrypted and stored securely. Only authorized personnel can view complete account information.
                        </Text>
                      </VStack>
                    </HStack>
                  </CardContent>
                </Card>
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Additional Information</Text>
              
              <div className="relative">
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes about this supplier..."
                  rows={4}
                  fullWidth
                  maxLength={MAX_NOTES_LENGTH}
                  className={validationErrors.notes ? 'border-red-500' : ''}
                  disabled={loading}
                />
                <div className="absolute right-3 bottom-1 text-xs text-gray-500">
                  {formData.notes?.length || 0}/{MAX_NOTES_LENGTH}
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Actions */}
        <HStack gap="md" justify="end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/suppliers')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || Object.keys(validationErrors).length > 0}
            loading={loading}
          >
            {supplier ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )
}