'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { PaymentForm } from './payment-form'

interface CustomerLedgerProps {
  customerId: string
}

interface Customer {
  id: string
  name: string
  email: string
  creditLimit: number
  currentBalance: number
}

interface Transaction {
  id: string
  type: 'invoice' | 'payment' | 'credit_note'
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
}

export function CustomerLedger({ customerId }: CustomerLedgerProps) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  
  // Filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [transactionType, setTransactionType] = useState('')

  useEffect(() => {
    loadCustomerData()
  }, [customerId, loadCustomerData])

  const loadCustomerData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [customerResponse, transactionsResponse] = await Promise.all([
        apiClient.get(`/api/customers/${customerId}`),
        apiClient.get(`/api/customers/${customerId}/transactions`)
      ])
      
      setCustomer(customerResponse.data)
      setTransactions(transactionsResponse.data)
    } catch (err) {
      console.error('Error loading customer data:', err)
      setError('Error loading customer data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [customerId])

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

  const getAvailableCredit = () => {
    if (!customer) return 0
    return customer.creditLimit - customer.currentBalance
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'Invoice'
      case 'payment':
        return 'Payment'
      case 'credit_note':
        return 'Credit Note'
      default:
        return type
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'destructive'
      case 'payment':
        return 'default'
      case 'credit_note':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const filteredTransactions = Array.isArray(transactions) ? transactions
    .filter(transaction => {
      if (fromDate && new Date(transaction.date) < new Date(fromDate)) return false
      if (toDate && new Date(transaction.date) > new Date(toDate)) return false
      if (transactionType && transaction.type !== transactionType) return false
      return true
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">Customer not found</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showPaymentForm) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Record New Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm
              // We'll need to create a mock invoice for general payments
              invoiceId="general-payment"
              customerId={customer.id}
              invoiceNumber="General Payment"
              customerName={customer.name}
              totalAmount={customer.currentBalance}
              balanceAmount={customer.currentBalance}
              onSuccess={() => {
                setShowPaymentForm(false)
                loadCustomerData() // Reload data after payment
              }}
              onCancel={() => setShowPaymentForm(false)}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Customer Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Customer</Label>
              <div className="text-lg font-semibold">{customer.name}</div>
              <div className="text-sm text-gray-600">{customer.email}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Current Balance</Label>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(customer.currentBalance)}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Credit Limit</Label>
              <div className="text-lg font-semibold">
                {formatCurrency(customer.creditLimit)}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Available Credit</Label>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(getAvailableCredit())}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger id="transactionType">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="invoice">Invoices</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                    <SelectItem value="credit_note">Credit Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPaymentForm(true)}
                className="whitespace-nowrap"
              >
                Record Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>
                        <Badge variant={getTransactionTypeColor(transaction.type)}>
                          {getTransactionTypeLabel(transaction.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{transaction.reference}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="text-right">
                        {transaction.debit > 0 && formatCurrency(transaction.debit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.credit > 0 && formatCurrency(transaction.credit)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.balance)}
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