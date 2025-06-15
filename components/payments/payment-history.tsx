'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { formatDistanceToNow } from 'date-fns'
import { 
  Download, 
  RotateCcw, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Building2, 
  Banknote,
  Globe,
  Laptop,
  Printer,
  Mail
} from 'lucide-react'

interface PaymentRecord {
  id: string
  paymentNumber: string
  amount: number
  paymentDate: string
  paymentMethod: string
  reference: string | null
  status: 'COMPLETED' | 'PENDING' | 'REVERSED'
  notes: string | null
  metadata?: any
  invoiceNumber?: string
  invoiceId?: string
  reversedAt?: string
  reversedBy?: string
  reversalReason?: string
  createdAt: string
  createdBy: string
  receiptUrl?: string
}

interface PaymentHistoryProps {
  customerId?: string
  invoiceId?: string
  limit?: number
  showActions?: boolean
  onPaymentReverse?: (payment: PaymentRecord) => void
}

export function PaymentHistory({
  customerId,
  invoiceId,
  limit = 50,
  showActions = true,
  onPaymentReverse
}: PaymentHistoryProps) {
  const { formatCurrency } = useCurrency()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null)
  const [sendingReceipt, setSendingReceipt] = useState<string | null>(null)

  useEffect(() => {
    loadPaymentHistory()
  }, [customerId, invoiceId])

  const loadPaymentHistory = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      let endpoint = '/api/payments'
      const params = new URLSearchParams()
      
      if (customerId) params.append('customerId', customerId)
      if (invoiceId) params.append('invoiceId', invoiceId)
      params.append('limit', limit.toString())

      const response = await apiClient<{ data: any }>(`${endpoint}?${params.toString()}`)
      
      if (response.ok && response?.data) {
        setPayments(response?.data)
      } else {
        throw new Error('Failed to load payment history')
      }
    } catch (error) {
      console.error('Error loading payment history:', error)
      setError('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER': return Building2
      case 'WIRE_TRANSFER': return Globe
      case 'CHECK': return Banknote
      case 'CASH': return Banknote
      case 'CREDIT_CARD': return CreditCard
      case 'DEBIT_CARD': return CreditCard
      case 'ONLINE': return Laptop
      default: return DollarSign
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER': return 'Bank Transfer'
      case 'WIRE_TRANSFER': return 'Wire Transfer'
      case 'CHECK': return 'Check'
      case 'CASH': return 'Cash'
      case 'CREDIT_CARD': return 'Credit Card'
      case 'DEBIT_CARD': return 'Debit Card'
      case 'ONLINE': return 'Online Payment'
      default: return method
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default'
      case 'PENDING': return 'secondary'
      case 'REVERSED': return 'destructive'
      default: return 'outline'
    }
  }

  const handleDownloadReceipt = async (payment: PaymentRecord) => {
    setDownloadingReceipt(payment.id)
    try {
      const response = await apiClient<{ data: any }>(`/api/payments/${payment.id}/receipt`)
      if (response.ok && response?.data) {
        // If URL is returned, open in new tab
        if (response?.data.url) {
          window.open(response?.data.url, '_blank')
        }
        // If blob is returned, download directly
        else if (response?.data.blob) {
          const blob = new Blob([response?.data.blob], { type: 'application/pdf' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `payment-receipt-${payment.paymentNumber}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      }
    } catch (error) {
      console.error('Failed to download receipt:', error)
    } finally {
      setDownloadingReceipt(null)
    }
  }

  const handleSendReceipt = async (payment: PaymentRecord) => {
    setSendingReceipt(payment.id)
    try {
      const response = await apiClient<{ data: any }>(`/api/payments/${payment.id}/send-receipt`, {
        method: 'POST'
      })
      if (response.ok) {
        // Show success message
        alert('Receipt sent successfully')
      }
    } catch (error) {
      console.error('Failed to send receipt:', error)
    } finally {
      setSendingReceipt(null)
    }
  }

  const formatPaymentReference = (payment: PaymentRecord) => {
    if (!payment.reference) return null
    
    // Extract check number from reference if it's a check payment
    if (payment.paymentMethod === 'CHECK' && payment.reference.startsWith('CHK-')) {
      return `Check #${payment.reference.substring(4)}`
    }
    
    return payment.reference
  }

  const getPaymentDetails = (payment: PaymentRecord) => {
    const details: string[] = []
    
    if (payment.reference) {
      details.push(formatPaymentReference(payment) || payment.reference)
    }
    
    if (payment.metadata) {
      if (payment.metadata.bankName) {
        details.push(`Bank: ${payment.metadata.bankName}`)
      }
      if (payment.metadata.last4Digits) {
        details.push(`Card: ****${payment.metadata.last4Digits}`)
      }
      if (payment.metadata.accountNumber) {
        details.push(`Account: ****${payment.metadata.accountNumber}`)
      }
    }
    
    return details
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading payment history...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">No payments found</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Payment History</h3>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Payment items */}
          <div className="space-y-6">
            {payments.map((payment, index) => {
              const Icon = getPaymentMethodIcon(payment.paymentMethod)
              const details = getPaymentDetails(payment)
              
              return (
                <div key={payment.id} className="relative flex gap-4">
                  {/* Timeline dot and icon */}
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white border-2 border-gray-200">
                    <Icon className="h-6 w-6 text-gray-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{payment.paymentNumber}</span>
                            <Badge variant={getStatusBadgeVariant(payment.status)}>
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {getPaymentMethodLabel(payment.paymentMethod)}
                            {payment.invoiceNumber && (
                              <span> • Invoice {payment.invoiceNumber}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(payment.amount)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      {details.length > 0 && (
                        <div className="text-sm text-gray-600 mb-2">
                          {details.join(' • ')}
                        </div>
                      )}

                      {/* Notes */}
                      {payment.notes && (
                        <div className="text-sm text-gray-600 italic mb-2">
                          "{payment.notes}"
                        </div>
                      )}

                      {/* Reversal info */}
                      {payment.status === 'REVERSED' && payment.reversedAt && (
                        <div className="text-sm text-red-600 mb-2">
                          Reversed {formatDistanceToNow(new Date(payment.reversedAt), { addSuffix: true })}
                          {payment.reversalReason && ` - ${payment.reversalReason}`}
                        </div>
                      )}

                      {/* Footer with timestamp and actions */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                          {payment.createdBy && ` by ${payment.createdBy}`}
                        </div>
                        
                        {showActions && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadReceipt(payment)}
                              disabled={downloadingReceipt === payment.id}
                            >
                              {downloadingReceipt === payment.id ? (
                                <Printer className="h-4 w-4 animate-pulse" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendReceipt(payment)}
                              disabled={sendingReceipt === payment.id}
                            >
                              {sendingReceipt === payment.id ? (
                                <Mail className="h-4 w-4 animate-pulse" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                            
                            {payment.status === 'COMPLETED' && onPaymentReverse && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onPaymentReverse(payment)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}