'use client'

import React, { useState, useCallback } from 'react'
import { Save, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useFormErrorHandling, useApiOperation } from '@/lib/hooks/use-error-handling'
import { FieldError, ValidationSummary } from '@/components/error/inline-error'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api/client'
import { validateEmail, validatePhone, checkMaxLength } from '@/lib/validators/common.validator'

interface CustomerFormData {
  name: string
  email: string
  phone: string
  company: string
  address: string
  creditLimit: string
}

interface EnhancedCustomerFormProps {
  initialData?: Partial<CustomerFormData>
  onSuccess?: (customer: any) => void
  onCancel?: () => void
}

export function EnhancedCustomerForm({
  initialData = {},
  onSuccess,
  onCancel
}: EnhancedCustomerFormProps) {
  const { success } = useToast()
  
  // Form state
  const [formData, setFormData] = useState<CustomerFormData>({
    name: initialData.name || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    company: initialData.company || '',
    address: initialData.address || '',
    creditLimit: initialData.creditLimit || '0'
  })

  // Enhanced error handling
  const {
    fieldErrors,
    touchedFields,
    isValid,
    setFieldError,
    setFieldTouched,
    validateField,
    clearAllErrors,
    getFieldError,
    hasErrors
  } = useFormErrorHandling()

  const {
    isLoading,
    hasError,
    error: apiError,
    execute: executeApiCall,
    clearError: clearApiError
  } = useApiOperation({
    showToast: true,
    context: { operation: 'create_customer' }
  })

  // Field validation functions
  const validateName = useCallback((value: string): string | null => {
    if (!value.trim()) return 'Customer name is required'
    return checkMaxLength(value, 100, 'Customer name')
  }, [])

  const validateEmailField = useCallback((value: string): string | null => {
    if (!value.trim()) return 'Email address is required'
    return validateEmail(value)
  }, [])

  const validatePhoneField = useCallback((value: string): string | null => {
    if (!value.trim()) return null // Phone is optional
    return validatePhone(value)
  }, [])

  const validateCompany = useCallback((value: string): string | null => {
    return checkMaxLength(value, 100, 'Company name')
  }, [])

  const validateAddress = useCallback((value: string): string | null => {
    return checkMaxLength(value, 200, 'Address')
  }, [])

  const validateCreditLimitField = useCallback((value: string): string | null => {
    if (!value.trim()) return null // Optional field
    
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return 'Credit limit must be a valid number'
    if (numValue < 0) return 'Credit limit cannot be negative'
    if (numValue > 1000000) return 'Credit limit cannot exceed 1,000,000'
    
    return null
  }, [])

  // Handle field changes with real-time validation
  const handleFieldChange = useCallback((field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Validate field if it's been touched or has an error
    if (touchedFields.has(field) || fieldErrors[field]) {
      let validator: (value: string) => string | null
      
      switch (field) {
        case 'name': validator = validateName; break
        case 'email': validator = validateEmailField; break
        case 'phone': validator = validatePhoneField; break
        case 'company': validator = validateCompany; break
        case 'address': validator = validateAddress; break
        case 'creditLimit': validator = validateCreditLimitField; break
        default: return
      }
      
      validateField(field, value, validator)
    }
  }, [
    touchedFields,
    fieldErrors,
    validateField,
    validateName,
    validateEmailField,
    validatePhoneField,
    validateCompany,
    validateAddress,
    validateCreditLimitField
  ])

  // Handle field blur (mark as touched and validate)
  const handleFieldBlur = useCallback((field: keyof CustomerFormData) => {
    setFieldTouched(field)
    
    let validator: (value: string) => string | null
    
    switch (field) {
      case 'name': validator = validateName; break
      case 'email': validator = validateEmailField; break
      case 'phone': validator = validatePhoneField; break
      case 'company': validator = validateCompany; break
      case 'address': validator = validateAddress; break
      case 'creditLimit': validator = validateCreditLimitField; break
      default: return
    }
    
    validateField(field, formData[field], validator)
  }, [
    formData,
    setFieldTouched,
    validateField,
    validateName,
    validateEmailField,
    validatePhoneField,
    validateCompany,
    validateAddress,
    validateCreditLimitField
  ])

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear any previous API errors
    clearApiError()
    
    // Validate all fields
    const validators = {
      name: validateName,
      email: validateEmailField,
      phone: validatePhoneField,
      company: validateCompany,
      address: validateAddress,
      creditLimit: validateCreditLimitField
    }
    
    let hasValidationErrors = false
    
    Object.entries(validators).forEach(([field, validator]) => {
      const error = validator(formData[field as keyof CustomerFormData])
      if (error) {
        setFieldError(field, error)
        setFieldTouched(field)
        hasValidationErrors = true
      }
    })
    
    if (hasValidationErrors) {
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error="true"]')
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    
    // Prepare API data
    const customerData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      company: formData.company.trim() || null,
      address: formData.address.trim() || null,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0
    }
    
    // Execute API call with enhanced error handling
    const result = await executeApiCall(async () => {
      const response = await apiClient<{ data: any[] }>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customerData)
      })
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to create customer')
      }
      
      return response?.data
    }, {
      context: { formData: customerData }
    })
    
    if (result) {
      success('Customer created successfully!')
      clearAllErrors()
      onSuccess?.(result)
    }
  }, [
    formData,
    clearApiError,
    validateName,
    validateEmailField,
    validatePhoneField,
    validateCompany,
    validateAddress,
    validateCreditLimitField,
    setFieldError,
    setFieldTouched,
    executeApiCall,
    success,
    clearAllErrors,
    onSuccess
  ])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm border rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Create Customer</h2>
          <p className="mt-1 text-sm text-gray-600">
            Enter customer information to create a new customer record.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* API Error Display */}
          {hasError && apiError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {apiError.title}
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {apiError.message}
                  </p>
                  {apiError.supportCode && (
                    <p className="mt-2 text-xs text-red-600 font-mono">
                      Ref: {apiError.supportCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Validation Summary */}
          {hasErrors && (
            <ValidationSummary
              errors={fieldErrors}
              title="Please correct the following errors:"
              maxErrors={5}
            />
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  data-error={Boolean(getFieldError('name'))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    getFieldError('name')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : touchedFields.has('name') && !fieldErrors.name
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter customer name"
                  maxLength={100}
                />
                {touchedFields.has('name') && !fieldErrors.name && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              <FieldError
                error={getFieldError('name')}
                touched={touchedFields.has('name')}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  data-error={Boolean(getFieldError('email'))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    getFieldError('email')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : touchedFields.has('email') && !fieldErrors.email
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="customer@example.com"
                />
                {touchedFields.has('email') && !fieldErrors.email && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              <FieldError
                error={getFieldError('email')}
                touched={touchedFields.has('email')}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onBlur={() => handleFieldBlur('phone')}
                  data-error={Boolean(getFieldError('phone'))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    getFieldError('phone')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : touchedFields.has('phone') && !fieldErrors.phone
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="+1 (555) 123-4567"
                />
                {touchedFields.has('phone') && !fieldErrors.phone && formData.phone && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              <FieldError
                error={getFieldError('phone')}
                touched={touchedFields.has('phone')}
              />
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  onBlur={() => handleFieldBlur('company')}
                  data-error={Boolean(getFieldError('company'))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    getFieldError('company')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : touchedFields.has('company') && !fieldErrors.company
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Company name"
                  maxLength={100}
                />
                {touchedFields.has('company') && !fieldErrors.company && formData.company && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              <FieldError
                error={getFieldError('company')}
                touched={touchedFields.has('company')}
              />
            </div>

            {/* Credit Limit */}
            <div>
              <label htmlFor="creditLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Credit Limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="creditLimit"
                  value={formData.creditLimit}
                  onChange={(e) => handleFieldChange('creditLimit', e.target.value)}
                  onBlur={() => handleFieldBlur('creditLimit')}
                  data-error={Boolean(getFieldError('creditLimit'))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    getFieldError('creditLimit')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : touchedFields.has('creditLimit') && !fieldErrors.creditLimit
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                  max="1000000"
                  step="0.01"
                />
                {touchedFields.has('creditLimit') && !fieldErrors.creditLimit && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              <FieldError
                error={getFieldError('creditLimit')}
                touched={touchedFields.has('creditLimit')}
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <div className="relative">
                <textarea
                  id="address"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  onBlur={() => handleFieldBlur('address')}
                  data-error={Boolean(getFieldError('address'))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    getFieldError('address')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : touchedFields.has('address') && !fieldErrors.address
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter customer address"
                  maxLength={200}
                />
                {touchedFields.has('address') && !fieldErrors.address && formData.address && (
                  <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-green-500" />
                )}
              </div>
              <FieldError
                error={getFieldError('address')}
                touched={touchedFields.has('address')}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || hasErrors}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}