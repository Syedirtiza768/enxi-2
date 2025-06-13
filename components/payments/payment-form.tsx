'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface PaymentFormProps {
  invoiceId: string
  customerId: string
  invoiceNumber: string
  customerName: string
  totalAmount: number
  balanceAmount: number
  onSuccess: () => void
  onCancel: () => void
}

interface PaymentFormData {
  amount: number | null
  paymentMethod: string
  paymentDate: string
  reference: string
  notes: string
}

interface FormErrors {
  amount?: string
  paymentMethod?: string
  paymentDate?: string
  reference?: string
  notes?: string
}

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
]

export function PaymentForm({
  invoiceId,
  customerId: _customerId,
  invoiceNumber,
  customerName,
  totalAmount: _totalAmount,
  balanceAmount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const { formatCurrency } = useCurrency()
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: balanceAmount,
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (formData.amount === null || formData.amount === undefined || isNaN(formData.amount)) {
      newErrors.amount = 'Amount is required'
    } else if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be positive'
    } else if (formData.amount > balanceAmount) {
      newErrors.amount = 'Amount cannot exceed balance'
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required'
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required'
    } else {
      const paymentDate = new Date(formData.paymentDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      if (paymentDate > today) {
        newErrors.paymentDate = 'Payment date cannot be in the future'
      }
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
    setSubmitError(null)

    try {
      const response = await apiClient(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          paymentDate: formData.paymentDate,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
        })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Payment failed')
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAmountChange = (value: string) => {
    const numericValue = value === '' ? null : parseFloat(value)
    setFormData(prev => ({ ...prev, amount: numericValue }))
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }))
    }
  }

  const handleQuickAmount = (percentage: number) => {
    const quickAmount = (balanceAmount * percentage) / 100
    setFormData(prev => ({ ...prev, amount: quickAmount }))
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }))
    }
  }

  const handlePaymentMethodChange = (method: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }))
    if (errors.paymentMethod) {
      setErrors(prev => ({ ...prev, paymentMethod: undefined }))
    }
  }

  const getReferencePlaceholder = () => {
    switch (formData.paymentMethod) {
      case 'BANK_TRANSFER':
        return 'Wire reference number'
      case 'CHECK':
        return 'Check number'
      case 'CASH':
        return 'Cash receipt number'
      case 'CREDIT_CARD':
        return 'Transaction ID'
      default:
        return 'Reference number'
    }
  }

  const remainingBalance = balanceAmount - (formData.amount || 0)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">Record Payment</h2>
        <div className="space-y-1 text-sm text-gray-600">
          <div>Invoice: <span className="font-medium">{invoiceNumber}</span></div>
          <div>Customer: <span className="font-medium">{customerName}</span></div>
          <div>Balance Due: <span className="font-medium text-red-600">{formatCurrency(balanceAmount)}</span></div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} role="form" className="space-y-6">
          {/* Amount Section */}
          <div className="space-y-3">
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="space-y-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={balanceAmount}
                value={formData.amount || ''}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={errors.amount ? 'border-red-500' : ''}
                aria-describedby="amount-info amount-error"
              />
              
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

              <div id="amount-info" className="text-sm text-gray-600">
                Balance: {formatCurrency(balanceAmount)}
                {remainingBalance !== balanceAmount && (
                  <span className="ml-2">
                    | Remaining Balance: {formatCurrency(remainingBalance)}
                  </span>
                )}
              </div>
              
              {errors.amount && (
                <div id="amount-error" className="text-sm text-red-600">
                  {errors.amount}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={formData.paymentMethod} onValueChange={handlePaymentMethodChange}>
              <SelectTrigger id="paymentMethod" className={errors.paymentMethod ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <div className="text-sm text-red-600">{errors.paymentMethod}</div>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, paymentDate: e.target.value }))
                if (errors.paymentDate) {
                  setErrors(prev => ({ ...prev, paymentDate: undefined }))
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              className={errors.paymentDate ? 'border-red-500' : ''}
            />
            {errors.paymentDate && (
              <div className="text-sm text-red-600">{errors.paymentDate}</div>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              placeholder={getReferencePlaceholder()}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this payment"
              rows={3}
            />
          </div>

          {submitError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {submitError}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Recording Payment...' : 'Record Payment'}
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
        </form>
      </CardContent>
    </Card>
  )
}