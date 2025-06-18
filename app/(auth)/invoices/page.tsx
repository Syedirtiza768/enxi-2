'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Download, FileText, Send, Eye, Edit, Receipt } from 'lucide-react'
import { PageLayout, PageHeader, PageSection, VStack, Grid, Card } from '@/components/design-system'
import { apiClient } from '@/lib/api/client'
import { useCurrencyFormatter } from '@/lib/contexts/currency-context'
import { PaymentForm } from '@/components/payments/payment-form'

interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    id: string
    name: string
    email: string
  }
  salesOrder?: {
    id: string
    orderNumber: string
  }
  type: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA'
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  invoiceDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentTerms: string
  createdAt: string
}

interface Customer {
  id: string
  name: string
}


export default function InvoicesPage() {
  const { format } = useCurrencyFormatter()
  
  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [dateRangeFilter, setDateRangeFilter] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 20
  
  // Selection for bulk operations
  const [_selectedInvoices, _setSelectedInvoices] = useState<string[]>([])
  const [hoveredInvoice, setHoveredInvoice] = useState<string | null>(null)
  
  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)

  // Fetch invoices from API
  const fetchInvoices = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      })
      
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)
      if (customerFilter) params.append('customerId', customerFilter)
      if (dateRangeFilter) params.append('dateRange', dateRangeFilter)
      if (overdueOnly) params.append('overdue', 'true')

      const response = await apiClient<Invoice[] | { data: Invoice[], total: number }>(`/api/invoices?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load invoices')
      }

      const responseData = response?.data
      if (Array.isArray(responseData)) {
        // Direct array response
        setInvoices(responseData)
        setTotalItems(responseData.length)
        setTotalPages(Math.ceil(responseData.length / limit))
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        // Paginated response
        setInvoices(responseData.data || [])
        setTotalItems(responseData.total || responseData.data.length)
        setTotalPages(Math.ceil((responseData.total || responseData.data.length) / limit))
      } else {
        setInvoices([])
        setTotalItems(0)
        setTotalPages(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch customers for filter
  const fetchCustomers = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: Customer[] }>('/api/customers', {
        method: 'GET'
      })
      if (response.ok) {
        const customersData = response?.data?.data || response?.data || []
        setCustomers(Array.isArray(customersData) ? customersData : [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Effects
  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    fetchInvoices()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, statusFilter, typeFilter, customerFilter, dateRangeFilter, overdueOnly])

  // Helper functions - Use the global currency formatter
  const formatCurrency = (amount: number) => {
    return format(amount)
  }

  const getStatusBadge = (status: Invoice['status'], dueDate: string, balanceAmount: number) => {
    // Check if overdue
    const isOverdue = new Date(dueDate) < new Date() && balanceAmount > 0 && 
                     ['SENT', 'VIEWED', 'PARTIAL'].includes(status)
    
    if (isOverdue) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Overdue</span>
    }

    const statusConfig = {
      DRAFT: { text: 'Draft', className: 'bg-gray-100 text-gray-800' },
      SENT: { text: 'Sent', className: 'bg-blue-100 text-blue-800' },
      VIEWED: { text: 'Viewed', className: 'bg-indigo-100 text-indigo-800' },
      PARTIAL: { text: 'Partial', className: 'bg-yellow-100 text-yellow-800' },
      PAID: { text: 'Paid', className: 'bg-green-100 text-green-800' },
      OVERDUE: { text: 'Overdue', className: 'bg-red-100 text-red-800' },
      CANCELLED: { text: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
      REFUNDED: { text: 'Refunded', className: 'bg-purple-100 text-purple-800' }
    } as const

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.text}
      </span>
    )
  }

  const getTypeLabel = (type: Invoice['type']) => {
    const typeLabels = {
      SALES: 'Sales',
      CREDIT_NOTE: 'Credit Note',
      DEBIT_NOTE: 'Debit Note',
      PROFORMA: 'Proforma'
    } as const
    return typeLabels[type as keyof typeof typeLabels]
  }

  // Event handlers
  const handleInvoiceSelect = (invoice: Invoice) => {
    window.location.href = `/invoices/${invoice.id}`
  }

  const handleCreateNew = () => {
    window.location.href = '/invoices/new'
  }

  const handleEdit = (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `/invoices/${invoiceId}/edit`
  }

  const handleSend = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await apiClient(`/api/invoices/${invoiceId}/send`, {
        method: 'POST'
      })
      if (response.ok) {
        await fetchInvoices() // Refresh list
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleRecordPayment = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedInvoiceForPayment(invoice)
    setShowPaymentModal(true)
  }

  const handleExport = () => {
    const csvContent = invoices.map(invoice => 
      [
        invoice.invoiceNumber,
        invoice.customer.name,
        invoice.type,
        invoice.status,
        formatCurrency(invoice.totalAmount),
        formatCurrency(invoice.paidAmount),
        formatCurrency(invoice.balanceAmount),
        invoice.dueDate
      ].join(',')
    ).join('\n')

    const header = 'Invoice Number,Customer,Type,Status,Total Amount,Paid Amount,Balance,Due Date\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'invoices.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Calculate statistics
  const stats = {
    total: totalItems,
    outstanding: invoices.filter(i => i.balanceAmount > 0).length,
    overdue: invoices.filter(i => {
      const isOverdue = new Date(i.dueDate) < new Date() && i.balanceAmount > 0
      return isOverdue
    }).length,
    totalOutstanding: invoices.reduce((sum, i) => sum + i.balanceAmount, 0)
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader 
          title="Invoices"
          description="Manage invoices and track payments"
          centered={false}
          actions={
            <button
              onClick={handleCreateNew}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </button>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={4} gap="lg">
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Invoices</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Outstanding</div>
              <div className="text-2xl font-semibold text-orange-600">{stats.outstanding}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-2xl font-semibold text-red-600">{stats.overdue}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Outstanding</div>
              <div className="text-2xl font-semibold text-red-600">{formatCurrency(stats.totalOutstanding)}</div>
            </Card>
          </Grid>
        </PageSection>

        {/* Quick Actions */}
        <PageSection>
          <Card className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <FileText className="h-4 w-4 mr-2" />
                Create from Sales Order
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </button>
            </div>
          </Card>
        </PageSection>

        {/* Filters and Search */}
        <PageSection>
          <Card className="bg-white p-4 rounded-lg border space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  aria-label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="VIEWED">Viewed</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  aria-label="Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="SALES">Sales</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="DEBIT_NOTE">Debit Note</option>
                  <option value="PROFORMA">Proforma</option>
                </select>
              </div>

              {/* Customer Filter */}
              <div>
                <select
                  aria-label="Customer"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Customers</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <select
                  aria-label="Date Range"
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchInvoices}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>

            {/* Overdue Filter */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="overdueOnly"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="overdueOnly" className="ml-2 text-sm text-gray-700">
                Show Overdue Only
              </label>
            </div>

            {/* Bulk Actions */}
            {_selectedInvoices.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {_selectedInvoices.length} invoice{_selectedInvoices.length > 1 ? 's' : ''} selected
                </span>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Send Selected
                </button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Export Selected
                </button>
              </div>
            )}
          </Card>
        </PageSection>

        {/* Error Message */}
        {error && (
          <PageSection>
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          </PageSection>
        )}

        {/* Invoices List */}
        <PageSection>
          <Card className="bg-white rounded-lg border">
            {loading && invoices.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading invoices...</p>
                </div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <FileText className="mx-auto h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-500">Create your first invoice to get started</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleInvoiceSelect(invoice)}
                        onMouseEnter={() => setHoveredInvoice(invoice.id)}
                        onMouseLeave={() => setHoveredInvoice(null)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.customer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getTypeLabel(invoice.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(invoice.status, invoice.dueDate, invoice.balanceAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.paidAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.balanceAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {hoveredInvoice === invoice.id && (
                            <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                aria-label="View invoice"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => handleEdit(invoice.id, e)}
                                aria-label="Edit invoice"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => handleSend(invoice.id, e)}
                                aria-label="Send invoice"
                                className="text-green-600 hover:text-green-900"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                              {invoice.balanceAmount > 0 && invoice.status !== 'DRAFT' && (
                                <button
                                  onClick={(e) => handleRecordPayment(invoice, e)}
                                  aria-label="Record payment"
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Receipt className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </PageSection>

        {/* Payment Modal */}
        {showPaymentModal && selectedInvoiceForPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                <div className="p-6">
                  <PaymentForm
                    invoiceId={selectedInvoiceForPayment.id}
                    customerId={selectedInvoiceForPayment.customer.id}
                    invoiceNumber={selectedInvoiceForPayment.invoiceNumber}
                    customerName={selectedInvoiceForPayment.customer.name}
                    totalAmount={selectedInvoiceForPayment.totalAmount}
                    balanceAmount={selectedInvoiceForPayment.balanceAmount}
                    onSuccess={() => {
                      setShowPaymentModal(false)
                      setSelectedInvoiceForPayment(null)
                      // Refresh invoice list to show updated payment status
                      fetchInvoices()
                    }}
                    onCancel={() => {
                      setShowPaymentModal(false)
                      setSelectedInvoiceForPayment(null)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <PageSection>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems} invoices
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </PageSection>
        )}
      </VStack>
    </PageLayout>
  )
}