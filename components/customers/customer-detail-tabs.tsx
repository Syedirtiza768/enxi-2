'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { CustomerLedger } from '@/components/payments/customer-ledger'
import { format } from 'date-fns'
import Link from 'next/link'
import { Eye, FileText, DollarSign } from 'lucide-react'

interface CustomerDetailTabsProps {
  customerId: string
  customerCurrency: string
}

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  paymentDate: string
  description: string
  invoice: {
    id: string
    invoiceNumber: string
    totalAmount: number
  }
  createdAt: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
}

export function CustomerDetailTabs({ customerId, customerCurrency }: CustomerDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('payments')
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments()
    } else if (activeTab === 'invoices') {
      fetchInvoices()
    }
  }, [activeTab, customerId])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const response = await apiClient(`/api/payments?customerId=${customerId}`, { method: 'GET' })
      if (response.ok && response.data) {
        const paymentsData = response.data.data || response.data
        setPayments(Array.isArray(paymentsData) ? paymentsData : [])
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const response = await apiClient(`/api/invoices?customerId=${customerId}&status=open`, { method: 'GET' })
      if (response.ok && response.data) {
        const invoicesData = response.data.data || response.data
        setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: customerCurrency
    }).format(amount)
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      case 'SENT':
        return 'bg-blue-100 text-blue-800'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return '🏦'
      case 'credit_card':
        return '💳'
      case 'check':
        return '📝'
      case 'cash':
        return '💵'
      default:
        return '💰'
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="invoices">Open Invoices</TabsTrigger>
      </TabsList>

      <TabsContent value="payments" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>All payments received from this customer</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No payments found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Link 
                          href={`/invoices/${payment.invoice.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {payment.invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          {payment.paymentMethod.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/invoices/${payment.invoice.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ledger" className="mt-4">
        <CustomerLedger 
          customerId={customerId} 
          customerName="" 
          currentBalance={0}
        />
      </TabsContent>

      <TabsContent value="invoices" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Open Invoices</CardTitle>
            <CardDescription>Unpaid and partially paid invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No open invoices</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link 
                          href={`/invoices/${invoice.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={getInvoiceStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.paidAmount)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.totalAmount - invoice.paidAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/invoices/${invoice.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/invoices/${invoice.id}/payments`}>
                              <DollarSign className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}