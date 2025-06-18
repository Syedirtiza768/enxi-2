'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
// Accessibility components - commented out until implemented
// import { AccessibleForm, FormFieldGroup } from '@/components/accessibility/AccessibleForm'
// import { AccessibleInput } from '@/components/accessibility/AccessibleInput'
// import { AccessibleButton } from '@/components/accessibility/AccessibleButton'
// import { useScreenReaderAnnouncements } from '@/lib/accessibility/announce'
// import { LoadingStatus, ErrorStatus, ValidationStatus } from '@/components/accessibility/LiveRegion'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { AlertCircle, Banknote, CreditCard, Building2, Globe, Laptop, CheckCircle2, Loader2 } from 'lucide-react'
import type { FormErrors } from '@/lib/types'
import { 
  currencyAmountValidator,
  paymentMethodValidator,
  notesValidator,
  MAX_NOTES_LENGTH,
  validateRequired,
  checkMaxLength,
  SUPPORTED_CURRENCIES
} from '@/lib/validators/common.validator'
import { useDebounce } from '@/lib/hooks/use-debounce'

interface PaymentFormProps {
  invoiceId: string
  customerId: string
  invoiceNumber: string
  customerName: string
  totalAmount: number
  balanceAmount: number
  currency?: string
  onSuccess: () => void
  onCancel: () => void
}

interface PaymentFormData {
  amount: number | null
  paymentMethod: string
  paymentDate: string
  reference: string
  checkNumber: string
  bankName: string
  accountNumber: string
  transactionId: string
  last4Digits: string
  notes: string
}

// FieldValidationStatus interface moved to local definition

type FieldStatus = 'idle' | 'checking' | 'valid' | 'error'

interface FieldValidationStatus {
  amount?: FieldStatus
  paymentMethod?: FieldStatus
  paymentDate?: FieldStatus
  reference?: FieldStatus
  checkNumber?: FieldStatus
  bankName?: FieldStatus
  transactionId?: FieldStatus
  last4Digits?: FieldStatus
  accountNumber?: FieldStatus
  notes?: FieldStatus
}

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
  { value: 'CHECK', label: 'Check', icon: Banknote },
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
  { value: 'WIRE_TRANSFER', label: 'Wire Transfer', icon: Globe },
  { value: 'ONLINE', label: 'Online Payment', icon: Laptop },
]

const MINIMUM_PAYMENT_AMOUNT = 0.01
const MAXIMUM_PAYMENT_AGE_DAYS = 365
const CHECK_NUMBER_PATTERN = /^\d{4,10}$/
const BANK_REFERENCE_PATTERN = /^[A-Z0-9\-]{6,20}$/i
const CREDIT_CARD_LAST4_PATTERN = /^\d{4}$/
const TRANSACTION_ID_PATTERN = /^[A-Z0-9\-_]{4,30}$/i
const ACCOUNT_NUMBER_PATTERN = /^\d{1,4}$/
const MAX_REFERENCE_LENGTH = 50
const MAX_BANK_NAME_LENGTH = 100
const MAX_TRANSACTION_ID_LENGTH = 50

export function PaymentForm({
  invoiceId,
  customerId: _customerId,
  invoiceNumber,
  customerName,
  totalAmount: _totalAmount,
  balanceAmount,
  currency = 'AED',
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const { formatCurrency } = useCurrency()
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: balanceAmount,
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    checkNumber: '',
    bankName: '',
    accountNumber: '',
    transactionId: '',
    last4Digits: '',
    notes: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [fieldStatus, setFieldStatus] = useState<FieldValidationStatus>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isValidatingReference, setIsValidatingReference] = useState(false)

  // Debounce reference for duplicate checking
  const debouncedReference = useDebounce(formData.reference, 500)

  // Check for duplicate reference
  const checkDuplicateReference = useCallback(async (reference: string) => {
    if (!reference || reference.length < 4) return
    
    setIsValidatingReference(true)
    setFieldStatus(prev => ({ ...prev, reference: 'checking' }))
    
    try {
      // Note: This is a placeholder for actual duplicate check
      // In real implementation, you would check against existing payments
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulate API call
      
      // For now, we'll just mark as valid
      setFieldStatus(prev => ({ ...prev, reference: 'valid' }))
      if (errors.reference?.includes('already exists')) {
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.reference
          return newErrors
        })
      }
    } catch (error) {
      console.error('Error checking reference:', error)
    } finally {
      setIsValidatingReference(false)
    }
  }, [errors.reference])

  // Run reference duplicate check when debounced reference changes
  useEffect(() => {
    if (debouncedReference && ['BANK_TRANSFER', 'WIRE_TRANSFER', 'CHECK'].includes(formData.paymentMethod)) {
      checkDuplicateReference(debouncedReference)
    }
  }, [debouncedReference, formData.paymentMethod, checkDuplicateReference])

  // Initial validation on mount
  useEffect(() => {
    const initialStatus: FieldValidationStatus = {}
    
    // Validate amount
    if (formData.amount && formData.amount > 0) {
      const amountError = validateField('amount', formData.amount)
      initialStatus.amount = amountError ? 'error' as const : 'valid' as const
    }
    
    // Validate payment method
    if (formData.paymentMethod) {
      initialStatus.paymentMethod = 'valid' as const
    }
    
    // Validate payment date
    if (formData.paymentDate) {
      const dateError = validateField('paymentDate', formData.paymentDate)
      initialStatus.paymentDate = dateError ? 'error' as const : 'valid' as const
    }
    
    setFieldStatus(initialStatus)
  }, [])

  // Real-time field validation
  const validateField = useCallback((field: keyof FormErrors, value: unknown): string | null => {
    switch (field) {
      case 'amount':
        const amountValue = value as number
        if (amountValue === null || amountValue === undefined || isNaN(amountValue)) {
          return 'Payment amount is required'
        }
        const currencyError = currencyAmountValidator.safeParse(amountValue)
        if (!currencyError.success) {
          return currencyError.error.errors[0].message
        }
        if (amountValue < MINIMUM_PAYMENT_AMOUNT) {
          return `Minimum payment amount is ${formatCurrency(MINIMUM_PAYMENT_AMOUNT, currency)}`
        }
        if (amountValue > balanceAmount) {
          return `Amount cannot exceed balance of ${formatCurrency(balanceAmount, currency)}`
        }
        return null

      case 'paymentMethod':
        const methodError = validateRequired(value, 'Payment method')
        if (methodError) return methodError
        const validMethods = PAYMENT_METHODS.map(m => m.value)
        if (!validMethods.includes(value as string)) {
          return 'Invalid payment method'
        }
        return null

      case 'paymentDate':
        const dateValue = value as string
        const dateError = validateRequired(dateValue, 'Payment date')
        if (dateError) return dateError
        const paymentDate = new Date(dateValue)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        const minDate = new Date()
        minDate.setDate(minDate.getDate() - MAXIMUM_PAYMENT_AGE_DAYS)
        
        if (isNaN(paymentDate.getTime())) {
          return 'Invalid date format'
        }
        if (paymentDate > today) {
          return 'Payment date cannot be in the future'
        }
        if (paymentDate < minDate) {
          return `Payment date cannot be older than ${MAXIMUM_PAYMENT_AGE_DAYS} days`
        }
        return null

      case 'reference':
        const refValue = value as string
        if (refValue) {
          const lengthError = checkMaxLength(refValue, MAX_REFERENCE_LENGTH, 'Reference')
          if (lengthError) return lengthError
          if (['BANK_TRANSFER', 'WIRE_TRANSFER'].includes(formData.paymentMethod)) {
            if (!BANK_REFERENCE_PATTERN.test(refValue)) {
              return 'Reference must be 6-20 alphanumeric characters (hyphens allowed)'
            }
          }
        }
        return null

      case 'checkNumber':
        if (formData.paymentMethod === 'CHECK') {
          const checkValue = value as string
          const checkError = validateRequired(checkValue, 'Check number')
          if (checkError) return checkError
          if (!CHECK_NUMBER_PATTERN.test(checkValue)) {
            return 'Check number must be 4-10 digits only'
          }
        }
        return null

      case 'bankName':
        if (['BANK_TRANSFER', 'WIRE_TRANSFER'].includes(formData.paymentMethod)) {
          const bankValue = value as string
          const bankError = validateRequired(bankValue, 'Bank name')
          if (bankError) return bankError
          const lengthError = checkMaxLength(bankValue, MAX_BANK_NAME_LENGTH, 'Bank name')
          if (lengthError) return lengthError
        }
        return null

      case 'accountNumber':
        const accountValue = value as string
        if (accountValue && !ACCOUNT_NUMBER_PATTERN.test(accountValue)) {
          return 'Account number must be 1-4 digits'
        }
        return null

      case 'transactionId':
        if (formData.paymentMethod === 'ONLINE') {
          const transValue = value as string
          const transError = validateRequired(transValue, 'Transaction ID')
          if (transError) return transError
          if (!TRANSACTION_ID_PATTERN.test(transValue)) {
            return 'Transaction ID must be 4-30 alphanumeric characters'
          }
          const lengthError = checkMaxLength(transValue, MAX_TRANSACTION_ID_LENGTH, 'Transaction ID')
          if (lengthError) return lengthError
        }
        return null

      case 'last4Digits':
        const last4Value = value as string
        if (last4Value && !CREDIT_CARD_LAST4_PATTERN.test(last4Value)) {
          return 'Must be exactly 4 digits'
        }
        return null

      case 'notes':
        const notesValue = value as string
        if (notesValue) {
          const notesError = notesValidator.safeParse(notesValue)
          if (!notesError.success) {
            return notesError.error.errors[0].message
          }
        }
        return null

      default:
        return null
    }
  }, [formData.paymentMethod, currency, balanceAmount, formatCurrency])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const newStatus: FieldValidationStatus = {}

    // Validate all fields
    const fieldsToValidate: (keyof FormErrors)[] = [
      'amount', 'paymentMethod', 'paymentDate', 'notes'
    ]

    // Add conditional fields based on payment method
    switch (formData.paymentMethod) {
      case 'CHECK':
        fieldsToValidate.push('checkNumber')
        break
      case 'BANK_TRANSFER':
      case 'WIRE_TRANSFER':
        fieldsToValidate.push('reference', 'bankName')
        break
      case 'CREDIT_CARD':
        if (formData.last4Digits) fieldsToValidate.push('last4Digits')
        break
      case 'ONLINE':
        fieldsToValidate.push('transactionId')
        break
    }

    fieldsToValidate.forEach(field => {
      const value = formData[field as keyof PaymentFormData]
      const error = validateField(field, value)
      if (error) {
        newErrors[field] = error
        newStatus[field] = 'error' as const
      } else if (value || field === 'amount') {
        newStatus[field] = 'valid' as const
      }
    })

    setErrors(newErrors)
    setFieldStatus(newStatus)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Prepare payment data based on payment method
      let reference = formData.reference
      const metadata: Record<string, string> = {}

      switch (formData.paymentMethod) {
        case 'CHECK':
          reference = `CHK-${formData.checkNumber}`
          metadata.checkNumber = formData.checkNumber
          if (formData.bankName) metadata.bankName = formData.bankName
          break
          
        case 'BANK_TRANSFER':
        case 'WIRE_TRANSFER':
          metadata.bankName = formData.bankName
          if (formData.accountNumber) metadata.accountNumber = formData.accountNumber
          break
          
        case 'CREDIT_CARD':
          reference = formData.transactionId || reference
          if (formData.last4Digits) metadata.last4Digits = formData.last4Digits
          break
          
        case 'ONLINE':
          reference = formData.transactionId
          break
          
        case 'CASH':
          reference = reference || `CASH-${Date.now()}`
          break
      }

      // Ensure amount is a valid number
      if (!formData.amount || formData.amount <= 0) {
        throw new Error('Invalid payment amount')
      }

      // Ensure payment method is selected
      if (!formData.paymentMethod) {
        throw new Error('Payment method is required')
      }

      // Format payment date to ISO string with time
      let paymentDateTime: string
      if (formData.paymentDate) {
        // formData.paymentDate is in YYYY-MM-DD format from the date input
        const [year, month, day] = formData.paymentDate.split('-').map(Number)
        const date = new Date(year, month - 1, day, 12, 0, 0, 0)
        paymentDateTime = date.toISOString()
      } else {
        paymentDateTime = new Date().toISOString()
      }

      const requestBody = {
        amount: formData.amount!,  // We've already validated it's not null above
        paymentMethod: formData.paymentMethod,
        paymentDate: paymentDateTime,
        reference: reference || undefined,
        notes: formData.notes || undefined,
      }

      console.log('Sending payment request:', requestBody)
      console.log('Request body JSON:', JSON.stringify(requestBody))

      const response = await apiClient<{ data?: { id: string }; success?: boolean; paymentId?: string }>(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Payment API error:', response)
        console.error('Response structure:', {
          ok: response.ok,
          error: response.error,
          errorDetails: response.errorDetails,
          status: response.status,
          data: response.data
        })
        const errorMessage = response.error || 
          (response.errorDetails && response.errorDetails.message) || 
          'Payment failed'
        throw new Error(errorMessage)
      }

      onSuccess()
    } catch (error) {
      console.error('Payment submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAmountChange = (value: string) => {
    const numericValue = value === '' ? null : parseFloat(value)
    setFormData(prev => ({ ...prev, amount: numericValue }))
    
    // Real-time validation
    const error = validateField('amount', numericValue)
    if (error) {
      setErrors(prev => ({ ...prev, amount: error }))
      setFieldStatus(prev => ({ ...prev, amount: 'error' }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.amount
        return newErrors
      })
      setFieldStatus(prev => ({ ...prev, amount: numericValue !== null ? 'valid' : 'idle' }))
    }
  }

  const handleQuickAmount = (percentage: number) => {
    const quickAmount = Math.round((balanceAmount * percentage) / 100 * 100) / 100
    setFormData(prev => ({ ...prev, amount: quickAmount }))
    
    // Validate the new amount
    const error = validateField('amount', quickAmount)
    if (error) {
      setErrors(prev => ({ ...prev, amount: error }))
      setFieldStatus(prev => ({ ...prev, amount: 'error' }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.amount
        return newErrors
      })
      setFieldStatus(prev => ({ ...prev, amount: 'valid' }))
    }
  }

  // Generic field change handler with validation
  const handleFieldChange = useCallback((field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation
    const error = validateField(field as keyof FormErrors, value)
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
      setFieldStatus(prev => ({ ...prev, [field]: 'error' }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as keyof FormErrors]
        return newErrors
      })
      setFieldStatus(prev => ({ ...prev, [field]: value ? 'valid' : 'idle' }))
    }
  }, [validateField])

  const handlePaymentMethodChange = (method: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }))
    
    // Validate payment method
    const error = validateField('paymentMethod', method)
    if (error) {
      setErrors(prev => ({ ...prev, paymentMethod: error }))
      setFieldStatus(prev => ({ ...prev, paymentMethod: 'error' }))
    } else {
      // Clear payment method error and set as valid
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.paymentMethod
        // Also clear method-specific errors
        delete newErrors.reference
        delete newErrors.checkNumber
        delete newErrors.bankName
        delete newErrors.transactionId
        delete newErrors.last4Digits
        delete newErrors.accountNumber
        return newErrors
      })
      setFieldStatus(prev => ({ 
        ...prev, 
        paymentMethod: 'valid' as const,
        // Reset method-specific field statuses
        reference: 'idle' as const,
        checkNumber: 'idle' as const,
        bankName: 'idle' as const,
        transactionId: 'idle' as const,
        last4Digits: 'idle' as const,
        accountNumber: 'idle' as const
      }))
    }
  }

  const getReferencePlaceholder = () => {
    switch (formData.paymentMethod) {
      case 'BANK_TRANSFER':
        return 'Wire reference number (e.g., REF123456)'
      case 'WIRE_TRANSFER':
        return 'Wire transfer reference (e.g., WT123456)'
      case 'CHECK':
        return 'Check number will be used as reference'
      case 'CASH':
        return 'Cash receipt number (optional)'
      case 'CREDIT_CARD':
        return 'Transaction ID (optional)'
      case 'ONLINE':
        return 'Online payment reference'
      default:
        return 'Reference number'
    }
  }

  // Generate receipt number
  const generateReceiptNumber = useCallback(() => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `RCP-${year}${month}${day}-${random}`
  }, [])

  const remainingBalance = Math.round((balanceAmount - (formData.amount || 0)) * 100) / 100

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Record Payment</h1>
        <div className="space-y-1 text-sm text-gray-600">
          <div>Invoice: <span className="font-medium">{invoiceNumber}</span></div>
          <div>Customer: <span className="font-medium">{customerName}</span></div>
          <div>Balance Due: <span className="font-medium text-red-600">{formatCurrency(balanceAmount, currency)}</span></div>
        </div>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Amount Section */}
          <div>
            <Label htmlFor="amount">{`Payment Amount (${currency})`}</Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={MINIMUM_PAYMENT_AMOUNT}
                  max={balanceAmount}
                  value={formData.amount || ''}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="0.00"
                  className={
                    errors.amount 
                      ? 'border-red-500 pr-10' 
                      : fieldStatus.amount === 'valid' 
                        ? 'border-green-500 pr-10' 
                        : ''
                  }
                />
                {fieldStatus.amount === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {fieldStatus.amount === 'valid' && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
                {fieldStatus.amount === 'error' && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                )}
              </div>
              
              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(25)}
                >
                  25%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(50)}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(75)}
                >
                  75%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(100)}
                >
                  100%
                </Button>
              </div>

              <div id="amount-info" className="space-y-1">
                <div className="text-sm text-gray-600">
                  Balance: {formatCurrency(balanceAmount, currency)}
                  {remainingBalance !== balanceAmount && (
                    <span className="ml-2">
                      | Remaining: <span className={remainingBalance === 0 ? 'text-green-600' : 'text-orange-600'}>
                        {formatCurrency(remainingBalance, currency)}
                      </span>
                    </span>
                  )}
                </div>
                {formData.amount && formData.amount > 0 && (
                  <div className="text-sm">
                    {remainingBalance === 0 ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Full payment - invoice will be marked as paid
                      </div>
                    ) : remainingBalance > 0 ? (
                      <div className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        Partial payment - {formatCurrency(remainingBalance, currency)} will remain unpaid
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-blue-600">
                        <AlertCircle className="h-4 w-4" />
                        Overpayment - {formatCurrency(Math.abs(remainingBalance), currency)} will be credited
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {errors.amount && (
                <div id="amount-error" className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.amount}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="flex items-center gap-1">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Select 
                value={formData.paymentMethod} 
                onValueChange={handlePaymentMethodChange}
                disabled={isSubmitting}
              >
                <SelectTrigger 
                  id="paymentMethod" 
                  className={
                    errors.paymentMethod 
                      ? 'border-red-500 pr-10' 
                      : fieldStatus.paymentMethod === 'valid' 
                        ? 'border-green-500 pr-10' 
                        : ''
                  }
                >
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <method.icon className="h-4 w-4" />
                        <span>{method.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldStatus.paymentMethod === 'valid' && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
              )}
              {fieldStatus.paymentMethod === 'error' && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
              )}
            </div>
            {errors.paymentMethod && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.paymentMethod}
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate" className="flex items-center gap-1">
              Payment Date <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleFieldChange('paymentDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min={new Date(Date.now() - MAXIMUM_PAYMENT_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className={
                  errors.paymentDate 
                    ? 'border-red-500 pr-10' 
                    : fieldStatus.paymentDate === 'valid' 
                      ? 'border-green-500 pr-10' 
                      : ''
                }
                disabled={isSubmitting}
              />
              {fieldStatus.paymentDate === 'valid' && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
              {fieldStatus.paymentDate === 'error' && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
              )}
            </div>
            {errors.paymentDate && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.paymentDate}
              </div>
            )}
          </div>

          {/* Method-specific fields */}
          {formData.paymentMethod === 'CHECK' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Check Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkNumber" className="flex items-center gap-1">
                    Check Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="checkNumber"
                      value={formData.checkNumber}
                      onChange={(e) => handleFieldChange('checkNumber', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g., 123456"
                      maxLength={10}
                      className={
                        errors.checkNumber 
                          ? 'border-red-500 pr-10' 
                          : fieldStatus.checkNumber === 'valid' 
                            ? 'border-green-500 pr-10' 
                            : ''
                      }
                      disabled={isSubmitting}
                    />
                    {fieldStatus.checkNumber === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                    {fieldStatus.checkNumber === 'error' && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {errors.checkNumber && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.checkNumber}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName-check">Bank Name</Label>
                  <div className="relative">
                    <Input
                      id="bankName-check"
                      value={formData.bankName}
                      onChange={(e) => handleFieldChange('bankName', e.target.value)}
                      placeholder="e.g., Emirates NBD"
                      maxLength={MAX_BANK_NAME_LENGTH}
                      className={fieldStatus.bankName === 'valid' && formData.bankName ? 'border-green-500 pr-10' : ''}
                      disabled={isSubmitting}
                    />
                    {fieldStatus.bankName === 'valid' && formData.bankName && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'WIRE_TRANSFER') && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                {formData.paymentMethod === 'BANK_TRANSFER' ? <Building2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {formData.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Wire Transfer'} Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference" className="flex items-center gap-1">
                    Reference Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => handleFieldChange('reference', e.target.value.toUpperCase())}
                      placeholder="e.g., REF123456789"
                      maxLength={MAX_REFERENCE_LENGTH}
                      className={
                        errors.reference 
                          ? 'border-red-500 pr-10' 
                          : fieldStatus.reference === 'valid' 
                            ? 'border-green-500 pr-10' 
                            : ''
                      }
                      disabled={isSubmitting}
                    />
                    {fieldStatus.reference === 'checking' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
                      </div>
                    )}
                    {fieldStatus.reference === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                    {fieldStatus.reference === 'error' && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {errors.reference && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.reference}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="flex items-center gap-1">
                    Bank Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => handleFieldChange('bankName', e.target.value)}
                      placeholder="e.g., Emirates NBD"
                      maxLength={MAX_BANK_NAME_LENGTH}
                      className={
                        errors.bankName 
                          ? 'border-red-500 pr-10' 
                          : fieldStatus.bankName === 'valid' 
                            ? 'border-green-500 pr-10' 
                            : ''
                      }
                      disabled={isSubmitting}
                    />
                    {fieldStatus.bankName === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                    {fieldStatus.bankName === 'error' && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {errors.bankName && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.bankName}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number (Last 4 digits)</Label>
                <div className="relative">
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleFieldChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g., 1234"
                    maxLength={4}
                    className={
                      errors.accountNumber 
                        ? 'border-red-500 pr-10' 
                        : fieldStatus.accountNumber === 'valid' && formData.accountNumber
                          ? 'border-green-500 pr-10' 
                          : ''
                    }
                    disabled={isSubmitting}
                  />
                  {fieldStatus.accountNumber === 'valid' && formData.accountNumber && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                  {fieldStatus.accountNumber === 'error' && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                  )}
                </div>
                {errors.accountNumber && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.accountNumber}
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.paymentMethod === 'CREDIT_CARD' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Card Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionId-cc">Transaction ID</Label>
                  <div className="relative">
                    <Input
                      id="transactionId-cc"
                      value={formData.transactionId}
                      onChange={(e) => handleFieldChange('transactionId', e.target.value)}
                      placeholder="e.g., TXN123456"
                      maxLength={MAX_TRANSACTION_ID_LENGTH}
                      className={fieldStatus.transactionId === 'valid' && formData.transactionId ? 'border-green-500 pr-10' : ''}
                      disabled={isSubmitting}
                    />
                    {fieldStatus.transactionId === 'valid' && formData.transactionId && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last4Digits">Card Last 4 Digits</Label>
                  <div className="relative">
                    <Input
                      id="last4Digits"
                      value={formData.last4Digits}
                      onChange={(e) => handleFieldChange('last4Digits', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g., 1234"
                      maxLength={4}
                      className={
                        errors.last4Digits 
                          ? 'border-red-500 pr-10' 
                          : fieldStatus.last4Digits === 'valid' && formData.last4Digits
                            ? 'border-green-500 pr-10' 
                            : ''
                      }
                      disabled={isSubmitting}
                    />
                    {fieldStatus.last4Digits === 'valid' && formData.last4Digits && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                    {fieldStatus.last4Digits === 'error' && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {errors.last4Digits && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.last4Digits}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {formData.paymentMethod === 'ONLINE' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Laptop className="h-4 w-4" />
                Online Payment Details
              </h4>
              <div className="space-y-2">
                <Label htmlFor="transactionId" className="flex items-center gap-1">
                  Transaction ID <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="transactionId"
                    value={formData.transactionId}
                    onChange={(e) => handleFieldChange('transactionId', e.target.value)}
                    placeholder="e.g., PAY123456789"
                    maxLength={MAX_TRANSACTION_ID_LENGTH}
                    className={
                      errors.transactionId 
                        ? 'border-red-500 pr-10' 
                        : fieldStatus.transactionId === 'valid' 
                          ? 'border-green-500 pr-10' 
                          : ''
                    }
                    disabled={isSubmitting}
                  />
                  {fieldStatus.transactionId === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                  {fieldStatus.transactionId === 'error' && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                  )}
                </div>
                {errors.transactionId && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.transactionId}
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.paymentMethod === 'CASH' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Cash Payment Details
              </h4>
              <div className="space-y-2">
                <Label htmlFor="reference-cash">Receipt Number</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="reference-cash"
                      value={formData.reference}
                      onChange={(e) => handleFieldChange('reference', e.target.value)}
                      placeholder="e.g., RCPT-001234 (optional)"
                      maxLength={MAX_REFERENCE_LENGTH}
                      className={fieldStatus.reference === 'valid' && formData.reference ? 'border-green-500 pr-10' : ''}
                      disabled={isSubmitting}
                    />
                    {fieldStatus.reference === 'valid' && formData.reference && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const receiptNumber = generateReceiptNumber()
                      handleFieldChange('reference', receiptNumber)
                    }}
                    disabled={isSubmitting}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reference Field (only show if not already shown in method-specific fields) */}
          {!['CHECK', 'BANK_TRANSFER', 'WIRE_TRANSFER', 'CASH'].includes(formData.paymentMethod) && (
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder={getReferencePlaceholder()}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <div className="relative">
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Additional notes about this payment"
                rows={3}
                maxLength={MAX_NOTES_LENGTH}
                className={
                  errors.notes 
                    ? 'border-red-500' 
                    : fieldStatus.notes === 'valid' && formData.notes
                      ? 'border-green-500' 
                      : ''
                }
                disabled={isSubmitting}
              />
              <div className="absolute right-3 bottom-3 text-xs text-gray-500">
                {formData.notes?.length || 0}/{MAX_NOTES_LENGTH}
              </div>
            </div>
            {errors.notes && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.notes}
              </div>
            )}
          </div>

          {/* Payment Summary */}
          {formData.amount && formData.amount > 0 && (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Balance:</span>
                    <span className="font-medium">{formatCurrency(balanceAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Amount:</span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(formData.amount, currency)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Remaining Balance:</span>
                    <span className={remainingBalance === 0 ? 'text-green-600' : 'text-orange-600'}>
                      {formatCurrency(remainingBalance, currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || Object.keys(errors).length > 0 || !formData.amount || formData.amount <= 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>

          {/* Live regions for form status - commented out until accessibility components are implemented */}
          {/* <ValidationStatus
            errors={Object.values(errors)}
            submitting={isSubmitting}
          />
          
          <LoadingStatus
            loading={isSubmitting}
            loadingMessage="Recording payment"
            completeMessage="Payment recorded successfully"
          />
          
          {submitError && (
            <ErrorStatus
              error={submitError}
              showVisual={true}
              onDismiss={() => setSubmitError(null)}
            />
          )} */}
        </form>
      </CardContent>
    </Card>
  )
}