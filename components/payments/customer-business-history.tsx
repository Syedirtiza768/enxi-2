'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'

interface CustomerBusinessHistoryProps {
  customerId: string
  onViewLedger?: (customerId: string) => void
  onRecordPayment?: (customerId: string) => void
  onCreateInvoice?: (customerId: string) => void
}

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  createdAt: string
  creditLimit: number
  currentBalance: number
  industry?: string
  leadSource?: string
}

interface BusinessMetrics {
  totalRevenue: number
  totalInvoices: number
  totalPayments: number
  averagePaymentDays: number
  creditUtilization: number
  relationshipMonths: number
  lastPaymentDate: string
  lastInvoiceDate: string
  paymentReliability: number
}

interface ActivityEvent {
  id: number
  type: 'invoice_created' | 'payment_received' | 'credit_limit_updated' | 'customer_created'
  date: string
  description: string
  amount: number | null
  status: 'pending' | 'completed'
}

interface PaymentTrends {
  monthlyData: {
    month: string
    revenue: number
    invoices: number
    avgDays: number
  }[]
  agingBreakdown: {
    current: number
    days30: number
    days60: number
    days90Plus: number
  }
}

export function CustomerBusinessHistory({
  customerId,
  onViewLedger,
  onRecordPayment,
  onCreateInvoice,
}: CustomerBusinessHistoryProps): React.JSX.Element {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [activityTimeline, setActivityTimeline] = useState<ActivityEvent[]>([])
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrends | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomerBusinessData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [
        customerResponse, 
        metricsResponse, 
        timelineResponse, 
        trendsResponse
      ] = await Promise.all([
        apiClient<Customer>(`/api/customers/${customerId}`),
        apiClient<BusinessMetrics>(`/api/customers/${customerId}/business-metrics`),
        apiClient<ActivityEvent[]>(`/api/customers/${customerId}/activity-timeline`),
        apiClient<PaymentTrends>(`/api/customers/${customerId}/payment-trends`)
      ])
      
      setCustomer(customerResponse.data as Customer)
      setBusinessMetrics(metricsResponse.data as BusinessMetrics)
      setActivityTimeline(timelineResponse.data as ActivityEvent[])
      setPaymentTrends(trendsResponse.data as PaymentTrends)
    } catch (err) {
      console.error('Error loading customer data:', err)
      setError('Error loading customer data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadCustomerBusinessData()
  }, [loadCustomerBusinessData])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`
  }

  const getActivityIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'invoice_created':
        return '📄'
      case 'payment_received':
        return '💰'
      case 'credit_limit_updated':
        return '📈'
      case 'customer_created':
        return '👤'
      default:
        return '📋'
    }
  }

  const getActivityTypeLabel = (type: string): void => {
    switch (type) {
      case 'invoice_created':
        return 'Invoice Created'
      case 'payment_received':
        return 'Payment Received'
      case 'credit_limit_updated':
        return 'Credit Updated'
      case 'customer_created':
        return 'Account Created'
      default:
        return type
    }
  }

  const getRiskLevel = (): void => {
    if (!businessMetrics) return 'Unknown'
    
    const { paymentReliability, creditUtilization } = businessMetrics
    
    if (paymentReliability >= 0.8 && creditUtilization <= 0.5) {
      return 'Low Risk'
    } else if (paymentReliability >= 0.6 && creditUtilization <= 0.75) {
      return 'Medium Risk'
    } else {
      return 'High Risk'
    }
  }

  const getPaymentPattern = (): void => {
    if (!businessMetrics) return 'Unknown'
    
    const { averagePaymentDays } = businessMetrics
    
    if (averagePaymentDays <= 15) {
      return 'Excellent'
    } else if (averagePaymentDays <= 30) {
      return 'Consistent'
    } else if (averagePaymentDays <= 45) {
      return 'Slow'
    } else {
      return 'Concerning'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading customer business history...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!customer || !businessMetrics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Customer data not found</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Customer Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Business History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{customer.name}</h3>
                <p className="text-gray-600">{customer.email}</p>
                {customer.phone && <p className="text-gray-600">{customer.phone}</p>}
                {customer.industry && (
                  <Badge variant="outline" className="mt-2">{customer.industry}</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer Since</p>
                  <p className="font-medium">{formatDate(customer.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Relationship</p>
                  <p className="font-medium">{businessMetrics.relationshipMonths} months</p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(businessMetrics.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="text-2xl font-bold">{businessMetrics.totalInvoices}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Payment Days</p>
                <p className="text-lg font-semibold">{businessMetrics.averagePaymentDays} days</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Credit Utilization</p>
                <p className="text-lg font-semibold">{formatPercentage(businessMetrics.creditUtilization)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Credit Risk</p>
                <Badge 
                  variant={getRiskLevel() === 'Low Risk' ? 'default' : getRiskLevel() === 'Medium Risk' ? 'secondary' : 'destructive'}
                  className="mt-1"
                >
                  {getRiskLevel()}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Payment Pattern</p>
                <Badge 
                  variant={getPaymentPattern() === 'Excellent' || getPaymentPattern() === 'Consistent' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {getPaymentPattern()}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Payment Reliability</p>
                <p className="text-lg font-semibold">{formatPercentage(businessMetrics.paymentReliability)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                onClick={(): void => onViewLedger?.(customerId)}
                className="w-full"
                variant="outline"
              >
                View Ledger
              </Button>
              <Button 
                onClick={(): void => onRecordPayment?.(customerId)}
                className="w-full"
                variant="outline"
              >
                Record Payment
              </Button>
              <Button 
                onClick={(): void => onCreateInvoice?.(customerId)}
                className="w-full"
              >
                Create Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityTimeline.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline">{getActivityTypeLabel(activity.type)}</Badge>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(activity.date)}</p>
                    </div>
                    {activity.amount && (
                      <p className="font-semibold">{formatCurrency(activity.amount)}</p>
                    )}
                  </div>
                  <p className="mt-2">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Trends & Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-medium">Monthly Performance</h4>
              {paymentTrends?.monthlyData.map((month) => (
                <div key={month.month} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">
                    {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(month.revenue)}</p>
                    <p className="text-xs text-gray-500">{month.invoices} invoices</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Aging Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Aging Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentTrends && (
                <>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm">Current</span>
                    <span className="font-medium">{formatCurrency(paymentTrends.agingBreakdown.current)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm">1-30 Days</span>
                    <span className="font-medium">{formatCurrency(paymentTrends.agingBreakdown.days30)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm">31-60 Days</span>
                    <span className="font-medium">{formatCurrency(paymentTrends.agingBreakdown.days60)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm">60+ Days</span>
                    <span className="font-medium text-red-600">{formatCurrency(paymentTrends.agingBreakdown.days90Plus)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}