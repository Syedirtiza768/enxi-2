import type { FormErrors } from '@/lib/types'
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { Download, History, RotateCcw, AlertCircle, CheckCircle, Printer, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
  sendReceipt: boolean
  receiptEmail: string
}

// FormErrors moved to common types

interface PaymentHistory {
  id: string
  paymentNumber: string
  amount: number
  paymentDate: string
  paymentMethod: string
  reference: string | null
  status: 'COMPLETED' | 'PENDING' | 'REVERSED'
  reversedAt?: string
  reversedBy?: string
  createdAt: string
  createdBy: string
}

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { value: 'CHECK', label: 'Check', icon: '📄' },
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: '💳' },
  { value: 'WIRE_TRANSFER', label: 'Wire Transfer', icon: '🌐' },
  { value: 'ONLINE', label: 'Online Payment', icon: '💻' },
]

const MINIMUM_PAYMENT_AMOUNT = 0.01
const MAXIMUM_PAYMENT_AGE_DAYS = 365
const CHECK_NUMBER_PATTERN = /^\d{4,10}$/
const BANK_REFERENCE_PATTERN = /^[A-Z0-9]{6,20}$/
const CREDIT_CARD_LAST4_PATTERN = /^\d{4}$/

export function PaymentFormEnhanced({
  invoiceId,
  customerId,
  invoiceNumber,
  customerName,
  totalAmount,
  balanceAmount,
  currency = 'AED',
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const { formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState('payment')
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
    sendReceipt: true,
    receiptEmail: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showReversalDialog, setShowReversalDialog] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null)
  const [reversalNotes, setReversalNotes] = useState('')

  useEffect(() => {
    if (activeTab === 'history') {
      loadPaymentHistory()
    }
  }, [activeTab])

  const loadPaymentHistory = async (): Promise<void> => {
    setLoadingHistory(true)
    try {
      const response = await apiClient<{ data: any }>(`/api/invoices/${invoiceId}/payments`)
      if (response.ok && response?.data) {
        setPaymentHistory(response?.data)
      }
    } catch (error) {
      console.error('Failed to load payment history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Amount validation
    if (formData.amount === null || formData.amount === undefined || isNaN(formData.amount)) {
      newErrors.amount = 'Amount is required'
    } else if (formData.amount < MINIMUM_PAYMENT_AMOUNT) {
      newErrors.amount = `Minimum payment amount is ${formatCurrency(MINIMUM_PAYMENT_AMOUNT, currency)}`
    } else if (formData.amount > balanceAmount) {
      newErrors.amount = `Amount cannot exceed balance of ${formatCurrency(balanceAmount, currency)}`
    }

    // Payment method validation
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required'
    }

    // Payment date validation
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required'
    } else {
      const paymentDate = new Date(formData.paymentDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      
      const minDate = new Date()
      minDate.setDate(minDate.getDate() - MAXIMUM_PAYMENT_AGE_DAYS)
      
      if (paymentDate > today) {
        newErrors.paymentDate = 'Payment date cannot be in the future'
      } else if (paymentDate < minDate) {
        newErrors.paymentDate = `Payment date cannot be older than ${MAXIMUM_PAYMENT_AGE_DAYS} days`
      }
    }

    // Payment method specific validations
    switch (formData.paymentMethod) {
      case 'CHECK':
        if (!formData.checkNumber) {
          newErrors.checkNumber = 'Check number is required'
        } else if (!CHECK_NUMBER_PATTERN.test(formData.checkNumber)) {
          newErrors.checkNumber = 'Check number must be 4-10 digits'
        }
        break

      case 'BANK_TRANSFER':
        if (!formData.reference) {
          newErrors.reference = 'Bank transfer reference is required'
        } else if (!BANK_REFERENCE_PATTERN.test(formData.reference)) {
          newErrors.reference = 'Reference must be 6-20 alphanumeric characters'
        }
        if (!formData.bankName) {
          newErrors.bankName = 'Bank name is required'
        }
        break

      case 'WIRE_TRANSFER':
        if (!formData.reference) {
          newErrors.reference = 'Wire transfer reference is required'
        }
        if (!formData.bankName) {
          newErrors.bankName = 'Bank name is required'
        }
        break

      case 'CREDIT_CARD':
        if (formData.last4Digits && !CREDIT_CARD_LAST4_PATTERN.test(formData.last4Digits)) {
          newErrors.last4Digits = 'Must be exactly 4 digits'
        }
        break

      case 'ONLINE':
        if (!formData.transactionId) {
          newErrors.transactionId = 'Transaction ID is required'
        }
        break
    }

    // Receipt email validation
    if (formData.sendReceipt && formData.receiptEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(formData.receiptEmail)) {
        newErrors.receiptEmail = 'Invalid email address'
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
      // Prepare payment data based on payment method
      const paymentData: any = {
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.paymentDate,
        notes: formData.notes,
      }

      // Add method-specific fields
      switch (formData.paymentMethod) {
        case 'CHECK':
          paymentData.reference = `CHK-${formData.checkNumber}`
          paymentData.metadata = { checkNumber: formData.checkNumber }
          break
        case 'BANK_TRANSFER':
        case 'WIRE_TRANSFER':
          paymentData.reference = formData.reference
          paymentData.metadata = { 
            bankName: formData.bankName,
            accountNumber: formData.accountNumber 
          }
          break
        case 'CREDIT_CARD':
          paymentData.reference = formData.transactionId
          paymentData.metadata = { last4Digits: formData.last4Digits }
          break
        case 'ONLINE':
          paymentData.reference = formData.transactionId
          break
        case 'CASH':
          paymentData.reference = formData.reference || `CASH-${Date.now()}`
          break
      }

      const response = await apiClient<{ data: any }>(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Payment failed')
      }

      // Generate and send receipt if requested
      if (formData.sendReceipt) {
        await generateAndSendReceipt(response?.data.id)
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateAndSendReceipt = async (paymentId: string) => {
    try {
      await apiClient(`/api/payments/${paymentId}/receipt`, {
        method: 'POST',
        body: JSON.stringify({
          email: formData.receiptEmail || undefined,
          format: 'pdf'
        })
      })
    } catch (error) {
      console.error('Failed to generate receipt:', error)
    }
  }

  const handleReversalSubmit = async (): Promise<unknown> => {
    if (!selectedPayment) return

    try {
      const response = await apiClient<{ data: any }>(`/api/payments/${selectedPayment.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ notes: reversalNotes })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Reversal failed')
      }

      setShowReversalDialog(false)
      setSelectedPayment(null)
      setReversalNotes('')
      loadPaymentHistory()
    } catch (error) {
      console.error('Error reversing payment:', error)
    }
  }

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const response = await apiClient<{ data: any }>(`/api/payments/${paymentId}/receipt`)
      if (response.ok && response?.data) {
        // Handle receipt download
        window.open(response?.data.url, '_blank')
      }
    } catch (error) {
      console.error('Failed to download receipt:', error)
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    const methodConfig = PAYMENT_METHODS.find(m => m.value === method)
    return methodConfig?.icon || '💰'
  }

  const remainingBalance = balanceAmount - (formData.amount || 0)

  return (
    <>
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Payment Processing</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Invoice: <span className="font-medium">{invoiceNumber}</span></span>
              <span>Customer: <span className="font-medium">{customerName}</span></span>
            </div>
            <div className="flex justify-between">
              <span>Total Amount: <span className="font-medium">{formatCurrency(totalAmount, currency)}</span></span>
              <span>Balance Due: <span className="font-medium text-red-600">{formatCurrency(balanceAmount, currency)}</span></span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payment">New Payment</TabsTrigger>
              <TabsTrigger value="history">Payment History</TabsTrigger>
            </TabsList>

            <TabsContent value="payment" className="space-y-6">
              <form onSubmit={handleSubmit} role="form" className="space-y-6">
                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.value }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.paymentMethod === method.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{method.icon}</div>
                        <div className="text-sm font-medium">{method.label}</div>
                      </button>
                    ))}
                  </div>
                  {errors.paymentMethod && (
                    <div className="text-sm text-red-600">{errors.paymentMethod}</div>
                  )}
                </div>

                {/* Amount Section */}
                <div className="space-y-3">
                  <Label htmlFor="amount">Payment Amount * ({currency})</Label>
                  <div className="space-y-2">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min={MINIMUM_PAYMENT_AMOUNT}
                      max={balanceAmount}
                      value={formData.amount || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value)
                        setFormData(prev => ({ ...prev, amount: value }))
                      }}
                      className={errors.amount ? 'border-red-500' : ''}
                    />
                    
                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2">
                      {[25, 50, 75, 100].map(percentage => (
                        <Button
                          key={percentage}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const amount = (balanceAmount * percentage) / 100
                            setFormData(prev => ({ ...prev, amount }))
                          }}
                        >
                          {percentage}%
                        </Button>
                      ))}
                    </div>

                    {formData.amount !== null && formData.amount > 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Payment Amount:</span>
                          <span className="font-medium">{formatCurrency(formData.amount, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Remaining Balance:</span>
                          <span className={`font-medium ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {formatCurrency(remainingBalance, currency)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {errors.amount && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.amount}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    min={new Date(Date.now() - MAXIMUM_PAYMENT_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className={errors.paymentDate ? 'border-red-500' : ''}
                  />
                  {errors.paymentDate && (
                    <div className="text-sm text-red-600">{errors.paymentDate}</div>
                  )}
                </div>

                {/* Method-specific fields */}
                {formData.paymentMethod === 'CHECK' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">Check Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkNumber">Check Number *</Label>
                        <Input
                          id="checkNumber"
                          value={formData.checkNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, checkNumber: e.target.value }))}
                          placeholder="e.g., 123456"
                          className={errors.checkNumber ? 'border-red-500' : ''}
                        />
                        {errors.checkNumber && (
                          <div className="text-sm text-red-600">{errors.checkNumber}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          value={formData.bankName}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                          placeholder="e.g., Emirates NBD"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'WIRE_TRANSFER') && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">Bank Transfer Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reference">Reference Number *</Label>
                        <Input
                          id="reference"
                          value={formData.reference}
                          onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                          placeholder="e.g., REF123456789"
                          className={errors.reference ? 'border-red-500' : ''}
                        />
                        {errors.reference && (
                          <div className="text-sm text-red-600">{errors.reference}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name *</Label>
                        <Input
                          id="bankName"
                          value={formData.bankName}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                          placeholder="e.g., Emirates NBD"
                          className={errors.bankName ? 'border-red-500' : ''}
                        />
                        {errors.bankName && (
                          <div className="text-sm text-red-600">{errors.bankName}</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number (Last 4 digits)</Label>
                      <Input
                        id="accountNumber"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="e.g., ****1234"
                        maxLength={4}
                      />
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'CREDIT_CARD' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">Credit Card Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="transactionId">Transaction ID</Label>
                        <Input
                          id="transactionId"
                          value={formData.transactionId}
                          onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                          placeholder="e.g., TXN123456"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last4Digits">Card Last 4 Digits</Label>
                        <Input
                          id="last4Digits"
                          value={formData.last4Digits}
                          onChange={(e) => setFormData(prev => ({ ...prev, last4Digits: e.target.value }))}
                          placeholder="e.g., 1234"
                          maxLength={4}
                          className={errors.last4Digits ? 'border-red-500' : ''}
                        />
                        {errors.last4Digits && (
                          <div className="text-sm text-red-600">{errors.last4Digits}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'ONLINE' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">Online Payment Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">Transaction ID *</Label>
                      <Input
                        id="transactionId"
                        value={formData.transactionId}
                        onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                        placeholder="e.g., PAY123456789"
                        className={errors.transactionId ? 'border-red-500' : ''}
                      />
                      {errors.transactionId && (
                        <div className="text-sm text-red-600">{errors.transactionId}</div>
                      )}
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'CASH' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">Cash Payment Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="reference">Receipt Number</Label>
                      <Input
                        id="reference"
                        value={formData.reference}
                        onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                        placeholder="e.g., RCPT-001234"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Payment Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this payment"
                    rows={3}
                  />
                </div>

                {/* Receipt Options */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendReceipt"
                      checked={formData.sendReceipt}
                      onChange={(e) => setFormData(prev => ({ ...prev, sendReceipt: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="sendReceipt" className="cursor-pointer">
                      Generate and send payment receipt
                    </Label>
                  </div>
                  {formData.sendReceipt && (
                    <div className="space-y-2">
                      <Label htmlFor="receiptEmail">Receipt Email (optional)</Label>
                      <Input
                        id="receiptEmail"
                        type="email"
                        value={formData.receiptEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, receiptEmail: e.target.value }))}
                        placeholder="customer@example.com"
                        className={errors.receiptEmail ? 'border-red-500' : ''}
                      />
                      {errors.receiptEmail && (
                        <div className="text-sm text-red-600">{errors.receiptEmail}</div>
                      )}
                    </div>
                  )}
                </div>

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
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Processing Payment...' : 'Process Payment'}
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
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {loadingHistory ? (
                <div className="text-center py-8">Loading payment history...</div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No payments recorded yet</div>
              ) : (
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <Card key={payment.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getPaymentMethodIcon(payment.paymentMethod)}</span>
                            <span className="font-medium">{payment.paymentNumber}</span>
                            <Badge variant={payment.status === 'REVERSED' ? 'destructive' : 'default'}>
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>{formatCurrency(payment.amount, currency)}</div>
                            <div>{new Date(payment.paymentDate).toLocaleDateString()}</div>
                            {payment.reference && <div>Ref: {payment.reference}</div>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                            {payment.reversedAt && (
                              <span className="text-red-600">
                                {' • Reversed ' + formatDistanceToNow(new Date(payment.reversedAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReceipt(payment.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {payment.status === 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setShowReversalDialog(true)
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Reversal Dialog */}
      <AlertDialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reverse this payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                <div>Payment: {selectedPayment.paymentNumber}</div>
                <div>Amount: {formatCurrency(selectedPayment.amount, currency)}</div>
                <div>Date: {new Date(selectedPayment.paymentDate).toLocaleDateString()}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reversalNotes">Reversal Reason *</Label>
                <Textarea
                  id="reversalNotes"
                  value={reversalNotes}
                  onChange={(e) => setReversalNotes(e.target.value)}
                  placeholder="Please provide a reason for reversing this payment"
                  rows={3}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowReversalDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReversalSubmit}
              disabled={!reversalNotes.trim()}
            >
              Reverse Payment
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}