'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { ExpenseManager } from './expense-manager'
import { format } from 'date-fns'
import Link from 'next/link'
import { FileText, DollarSign } from 'lucide-react'

interface SalesCaseDetailTabsProps {
  salesCaseId: string
  salesCaseCurrency: string
  salesCaseStatus: string
  onStatusChange?: () => void
}

interface Quotation {
  id: string
  quotationNumber: string
  version: number
  totalAmount: number
  status: string
  createdAt: string
  validUntil: string
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
}

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  paidAmount: number
  status: string
  salesOrder?: {
    id: string
    orderNumber: string
  }
}

interface SalesCaseSummary {
  totalQuotations: number
  totalOrders: number
  totalInvoiced: number
  totalPaid: number
  totalExpenses: number
  estimatedProfit: number
  actualProfit: number
  profitMargin: number
  revenue: number
  fifoCost: number
}

export function SalesCaseDetailTabs({ 
  salesCaseId, 
  salesCaseCurrency, 
  salesCaseStatus: _salesCaseStatus,
  onStatusChange: _onStatusChange 
}: SalesCaseDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('quotations')
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<SalesCaseSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchQuotations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient<{ data: Quotation[]; total?: number } | Quotation[]>(`/api/quotations?salesCaseId=${salesCaseId}`, { method: 'GET' })
      if (response.ok && response.data) {
        const responseData = response.data
        const quotationsData = Array.isArray(responseData) ? responseData : (responseData.data || [])
        setQuotations(Array.isArray(quotationsData) ? quotationsData : [])
      }
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }, [salesCaseId])

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient<{ data: Invoice[]; total?: number } | Invoice[]>(`/api/invoices?salesCaseId=${salesCaseId}`, { method: 'GET' })
      if (response.ok && response.data) {
        const responseData = response.data
        const invoicesData = Array.isArray(responseData) ? responseData : (responseData.data || [])
        setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
      }
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }, [salesCaseId])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient<{ data: SalesCaseSummary; total?: number } | SalesCaseSummary>(`/api/sales-cases/${salesCaseId}/summary`, { method: 'GET' })
      if (response.ok && response.data) {
        const responseData = response.data
        setSummary(Array.isArray(responseData) ? responseData[0] : (responseData.data || responseData))
      }
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }, [salesCaseId])

  useEffect(() => {
    if (activeTab === 'quotations') {
      fetchQuotations()
    } else if (activeTab === 'invoices') {
      fetchInvoices()
    } else if (activeTab === 'profitability') {
      fetchSummary()
    }
  }, [activeTab, salesCaseId, fetchQuotations, fetchInvoices, fetchSummary])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salesCaseCurrency
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'SENT':
        return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-800'
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleExpenseUpdate = () => {
    if (activeTab === 'profitability') {
      fetchSummary()
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="quotations">Quotations</TabsTrigger>
        <TabsTrigger value="expenses">Expenses</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="profitability">Profitability</TabsTrigger>
      </TabsList>

      <TabsContent value="quotations" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Quotations</CardTitle>
                <CardDescription>All quotations for this sales case</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/quotations/new?salesCaseId=${salesCaseId}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  New Quotation
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading quotations...</div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No quotations created yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">
                        <Link 
                          href={`/quotations/${quotation.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {quotation.quotationNumber}
                        </Link>
                      </TableCell>
                      <TableCell>v{quotation.version}</TableCell>
                      <TableCell>{format(new Date(quotation.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(quotation.validUntil), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(quotation.status)}>
                          {quotation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(quotation.totalAmount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/quotations/${quotation.id}`}>
                            View
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

      <TabsContent value="expenses" className="mt-4">
        <ExpenseManager 
          salesCaseId={salesCaseId} 
          salesCaseCurrency={salesCaseCurrency}
          onExpenseUpdate={handleExpenseUpdate}
        />
      </TabsContent>

      <TabsContent value="invoices" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Invoices & Payments</CardTitle>
            <CardDescription>All invoices generated from this sales case</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No invoices generated yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
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
                      <TableCell>
                        {invoice.salesOrder ? (
                          <Link 
                            href={`/sales-orders/${invoice.salesOrder.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {invoice.salesOrder.orderNumber}
                          </Link>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
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
                              View
                            </Link>
                          </Button>
                          {invoice.totalAmount > invoice.paidAmount && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/invoices/${invoice.id}/payments`}>
                                <DollarSign className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
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

      <TabsContent value="profitability" className="mt-4">
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="text-center py-8">Loading profitability data...</CardContent>
            </Card>
          ) : summary ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(summary.revenue || 0)}</p>
                    <p className="text-xs text-gray-500 mt-1">From delivered items</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency((summary.fifoCost || 0) + (summary.totalExpenses || 0))}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      FIFO: {formatCurrency(summary.fifoCost || 0)} + Expenses: {formatCurrency(summary.totalExpenses || 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${(summary.actualProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.actualProfit || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Margin: {summary.profitMargin ? summary.profitMargin.toFixed(1) : '0.0'}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Profitability Analysis</CardTitle>
                  <CardDescription>
                    Revenue - (FIFO Cost + Expenses) = Profit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Revenue Breakdown</h4>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Total Quotations:</dt>
                            <dd>{summary.totalQuotations || 0}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Total Orders:</dt>
                            <dd>{summary.totalOrders || 0}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Total Invoiced:</dt>
                            <dd>{formatCurrency(summary.totalInvoiced || 0)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Total Paid:</dt>
                            <dd className="font-medium">{formatCurrency(summary.totalPaid || 0)}</dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Cost Analysis</h4>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">FIFO Cost:</dt>
                            <dd>{formatCurrency(summary.fifoCost || 0)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Expenses:</dt>
                            <dd>{formatCurrency(summary.totalExpenses || 0)}</dd>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <dt className="text-gray-700 font-medium">Total Cost:</dt>
                            <dd className="font-medium">{formatCurrency((summary.fifoCost || 0) + (summary.totalExpenses || 0))}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Profitability</p>
                          <p className={`text-3xl font-bold ${(summary.actualProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(summary.actualProfit || 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Profit Margin</p>
                          <p className={`text-3xl font-bold ${(summary.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {summary.profitMargin ? summary.profitMargin.toFixed(1) : '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                No profitability data available
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}