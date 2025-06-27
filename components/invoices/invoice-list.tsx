'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  FileText, 
  Send, 
  Eye, 
  Edit, 
  Receipt,
  Download,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrencyFormatter } from '@/lib/contexts/currency-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  DataTable,
  ColumnDef,
  createSelectionColumn,
  createActionsColumn,
} from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
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

interface InvoiceStats {
  total: number
  outstanding: number
  overdue: number
  totalOutstanding: number
}

export function InvoiceList() {
  const router = useRouter()
  const { format } = useCurrencyFormatter()
  
  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  
  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [dateRangeFilter, setDateRangeFilter] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  // Selection for bulk operations
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  
  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)

  // Fetch invoices from API
  const fetchInvoices = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })
      
      if (search) params.append('search', search)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)
      if (customerFilter && customerFilter !== 'all') params.append('customerId', customerFilter)
      if (dateRangeFilter && dateRangeFilter !== 'all') params.append('dateRange', dateRangeFilter)
      if (overdueOnly) params.append('overdue', 'true')

      const response = await apiClient<Invoice[] | { data: Invoice[], total: number, stats?: InvoiceStats }>(`/api/invoices?${params}`, {
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
        // Calculate stats from data
        const calculatedStats = {
          total: responseData.length,
          outstanding: responseData.filter(i => i.balanceAmount > 0).length,
          overdue: responseData.filter(i => {
            const isOverdue = new Date(i.dueDate) < new Date() && i.balanceAmount > 0
            return isOverdue
          }).length,
          totalOutstanding: responseData.reduce((sum, i) => sum + i.balanceAmount, 0)
        }
        setStats(calculatedStats)
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        // Paginated response
        setInvoices(responseData.data || [])
        setTotalItems(responseData.total || responseData.data.length)
        if ('stats' in responseData && responseData.stats) {
          setStats(responseData.stats)
        } else {
          // Calculate stats from data
          const calculatedStats = {
            total: responseData.total || responseData.data.length,
            outstanding: responseData.data.filter(i => i.balanceAmount > 0).length,
            overdue: responseData.data.filter(i => {
              const isOverdue = new Date(i.dueDate) < new Date() && i.balanceAmount > 0
              return isOverdue
            }).length,
            totalOutstanding: responseData.data.reduce((sum, i) => sum + i.balanceAmount, 0)
          }
          setStats(calculatedStats)
        }
      } else {
        setInvoices([])
        setTotalItems(0)
        setStats(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, search, statusFilter, typeFilter, customerFilter, dateRangeFilter, overdueOnly])

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
  }, [fetchInvoices])

  const formatCurrency = (amount: number) => {
    return format(amount)
  }

  const getStatusBadge = (status: Invoice['status'], dueDate: string, balanceAmount: number) => {
    // Check if overdue
    const isOverdue = new Date(dueDate) < new Date() && balanceAmount > 0 && 
                     ['SENT', 'VIEWED', 'PARTIAL'].includes(status)
    
    const statusConfig = {
      DRAFT: { text: 'Draft', color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> },
      SENT: { text: 'Sent', color: 'bg-blue-100 text-blue-800', icon: <Send className="h-3 w-3" /> },
      VIEWED: { text: 'Viewed', color: 'bg-indigo-100 text-indigo-800', icon: <Eye className="h-3 w-3" /> },
      PARTIAL: { text: 'Partial', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      PAID: { text: 'Paid', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      OVERDUE: { text: 'Overdue', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3 w-3" /> },
      CANCELLED: { text: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
      REFUNDED: { text: 'Refunded', color: 'bg-purple-100 text-purple-800', icon: <DollarSign className="h-3 w-3" /> }
    }

    const displayStatus = isOverdue ? 'OVERDUE' : status
    const config = statusConfig[displayStatus as keyof typeof statusConfig]
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.text}
      </Badge>
    )
  }

  const getTypeLabel = (type: Invoice['type']) => {
    const typeLabels = {
      SALES: 'Sales',
      CREDIT_NOTE: 'Credit Note',
      DEBIT_NOTE: 'Debit Note',
      PROFORMA: 'Proforma'
    }
    return typeLabels[type]
  }

  // Event handlers
  const handleSend = async (invoiceId: string) => {
    try {
      const response = await apiClient(`/api/invoices/${invoiceId}/send`, {
        method: 'POST'
      })
      if (response.ok) {
        toast({
          title: 'Invoice sent',
          description: 'Invoice has been sent to the customer',
        })
        await fetchInvoices()
      }
    } catch (error) {
      toast({
        title: 'Send failed',
        description: 'Could not send the invoice',
        variant: 'destructive',
      })
    }
  }

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice)
    setShowPaymentModal(true)
  }

  const handleBulkExport = async () => {
    try {
      const csvContent = invoices
        .filter(invoice => selectedInvoices.has(invoice.id))
        .map(invoice => 
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
      
      toast({
        title: 'Export completed',
        description: `${selectedInvoices.size} invoices exported successfully`,
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export invoices',
        variant: 'destructive',
      })
    }
  }

  const handleBulkSend = async () => {
    try {
      const response = await apiClient('/api/invoices/bulk-send', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedInvoices) }),
      })
      
      if (response.ok) {
        toast({
          title: 'Invoices sent',
          description: `${selectedInvoices.size} invoices have been sent`,
        })
        setSelectedInvoices(new Set())
        await fetchInvoices()
      }
    } catch (error) {
      toast({
        title: 'Send failed',
        description: 'Could not send invoices',
        variant: 'destructive',
      })
    }
  }

  const columns: ColumnDef<Invoice>[] = [
    createSelectionColumn<Invoice>(),
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('invoiceNumber')}</div>
      ),
    },
    {
      accessorKey: 'customer.name',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customer.name}</div>
          {row.original.salesOrder && (
            <div className="text-sm text-gray-500">SO: {row.original.salesOrder.orderNumber}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => getTypeLabel(row.getValue('type')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(
        row.getValue('status'), 
        row.original.dueDate, 
        row.original.balanceAmount
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total',
      cell: ({ row }) => (
        <div className="font-medium">{formatCurrency(row.getValue('totalAmount'))}</div>
      ),
    },
    {
      accessorKey: 'paidAmount',
      header: 'Paid',
      cell: ({ row }) => formatCurrency(row.getValue('paidAmount')),
    },
    {
      accessorKey: 'balanceAmount',
      header: 'Balance',
      cell: ({ row }) => {
        const balance = row.getValue('balanceAmount') as number
        return (
          <div className={balance > 0 ? 'text-red-600 font-medium' : ''}>
            {formatCurrency(balance)}
          </div>
        )
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const dueDate = row.getValue('dueDate') as string
        const isOverdue = new Date(dueDate) < new Date() && row.original.balanceAmount > 0
        return (
          <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : ''}`}>
            {new Date(dueDate).toLocaleDateString()}
            {isOverdue && <AlertCircle className="h-4 w-4" />}
          </div>
        )
      },
    },
    createActionsColumn<Invoice>((invoice) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
            disabled={invoice.status !== 'DRAFT'}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleSend(invoice.id)}
            disabled={invoice.status !== 'DRAFT'}
          >
            <Send className="mr-2 h-4 w-4" />
            Send Invoice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          {invoice.balanceAmount > 0 && invoice.status !== 'DRAFT' && (
            <DropdownMenuItem onClick={() => handleRecordPayment(invoice)}>
              <Receipt className="mr-2 h-4 w-4" />
              Record Payment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage invoices and track payments</p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">{stats.outstanding}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        error={error}
        pagination={{
          page: currentPage,
          pageSize,
          total: totalItems,
          onPageChange: setCurrentPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setCurrentPage(1)
          },
        }}
        search={{
          value: search,
          placeholder: 'Search invoices...',
          onChange: setSearch,
        }}
        filters={
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="VIEWED">Viewed</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                  <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                  <SelectItem value="PROFORMA">Proforma</SelectItem>
                </SelectContent>
              </Select>

              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
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

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="overdueOnly"
                checked={overdueOnly}
                onCheckedChange={(checked) => setOverdueOnly(!!checked)}
              />
              <label htmlFor="overdueOnly" className="ml-2 text-sm text-gray-700">
                Show Overdue Only
              </label>
            </div>
          </div>
        }
        actions={
          <Button onClick={() => router.push('/invoices/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        }
        onRefresh={fetchInvoices}
        onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
        bulkActions={{
          selectedRows: selectedInvoices,
          onSelectRow: (row, selected) => {
            const newSet = new Set(selectedInvoices)
            if (selected) {
              newSet.add(row.id)
            } else {
              newSet.delete(row.id)
            }
            setSelectedInvoices(newSet)
          },
          onSelectAll: (selected) => {
            if (selected) {
              setSelectedInvoices(new Set(invoices.map(i => i.id)))
            } else {
              setSelectedInvoices(new Set())
            }
          },
          actions: (
            <>
              <Button size="sm" variant="outline" onClick={handleBulkSend}>
                <Send className="h-4 w-4 mr-2" />
                Send Selected
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
            </>
          ),
        }}
        emptyState={{
          icon: <FileText className="mx-auto h-12 w-12 text-gray-300" />,
          title: 'No invoices found',
          description: 'Create your first invoice to get started',
          action: (
            <Button onClick={() => router.push('/invoices/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          ),
        }}
        showColumnVisibility
        showSorting
        stickyHeader
      />

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
    </div>
  )
}