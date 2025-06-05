'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api/client'
import { DollarSign, Search, Eye, Receipt } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  paymentDate: string
  description: string
  invoice: {
    id: string
    invoiceNumber: string
    customer: {
      id: string
      name: string
    }
  }
  createdAt: string
}

interface Customer {
  id: string
  name: string
  email: string
  currentBalance: number
  creditLimit: number
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [paymentsResponse, customersResponse] = await Promise.all([
        apiClient('/api/payments', { method: 'GET' }),
        apiClient('/api/customers', { method: 'GET' })
      ])
      
      // Handle payments response
      if (paymentsResponse.ok && paymentsResponse.data) {
        const paymentsData = paymentsResponse.data.data || paymentsResponse.data
        setPayments(Array.isArray(paymentsData) ? paymentsData : [])
      } else {
        console.error('Failed to load payments:', paymentsResponse.error)
        setPayments([])
      }
      
      // Handle customers response
      if (customersResponse.ok && customersResponse.data) {
        const customersData = customersResponse.data.data || customersResponse.data
        setCustomers(Array.isArray(customersData) ? customersData : [])
      } else {
        console.error('Failed to load customers:', customersResponse.error)
        setCustomers([])
      }
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPaymentMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      'bank_transfer': 'bg-blue-100 text-blue-800',
      'credit_card': 'bg-green-100 text-green-800',
      'check': 'bg-yellow-100 text-yellow-800',
      'cash': 'bg-gray-100 text-gray-800',
      'wire_transfer': 'bg-purple-100 text-purple-800',
    }
    return colors[method] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'check': 'Check',
      'cash': 'Cash',
      'wire_transfer': 'Wire Transfer',
      'ach': 'ACH',
      'paypal': 'PayPal',
    }
    return labels[method] || method
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = (payment.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (payment.invoice?.invoiceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (payment.invoice?.customer?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesPaymentMethod = !paymentMethodFilter || paymentMethodFilter === 'all' || payment.paymentMethod === paymentMethodFilter
    const matchesCustomer = !customerFilter || customerFilter === 'all' || payment.invoice?.customer?.id === customerFilter
    
    return matchesSearch && matchesPaymentMethod && matchesCustomer
  })

  const totalPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const paymentMethods = [...new Set(payments.map(p => p.paymentMethod))]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Payments</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading payments...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-gray-600">Manage customer payments and transaction history</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/customers">
              <Eye className="w-4 h-4 mr-2" />
              Customer Ledgers
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPayments)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Payment</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPayments / (filteredPayments.length || 1))}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Customers</p>
                <p className="text-2xl font-bold">{new Set(filteredPayments.map(p => p.invoice?.customer.id)).size}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search payments, invoices, or customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>
                      {getPaymentMethodLabel(method)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <Link 
                          href={`/customers/${payment.invoice?.customer.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {payment.invoice?.customer.name || 'Unknown'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/invoices/${payment.invoice?.id}`}
                          className="text-blue-600 hover:underline font-mono"
                        >
                          {payment.invoice?.invoiceNumber || 'N/A'}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {payment.description}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentMethodColor(payment.paymentMethod)}>
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/customers/${payment.invoice?.customer.id}#payments`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}