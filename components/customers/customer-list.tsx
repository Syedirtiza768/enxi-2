'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Mail, 
  Phone, 
  Building2, 
  CreditCard, 
  Calendar, 
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Download,
  Upload,
  Globe,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils/format'

// Types
interface Customer {
  id: string
  customerNumber: string
  name: string
  email: string
  phone?: string
  industry?: string
  website?: string
  address?: string
  taxId?: string
  currency: string
  creditLimit: number
  paymentTerms: number
  account?: {
    id: string
    balance: number
  }
  createdAt: string
  updatedAt: string
  _count?: {
    salesCases: number
    invoices: number
  }
  lastActivity?: string
}

interface CustomerStats {
  total: number
  active: number
  inactive: number
  totalCreditLimit: number
  totalOutstanding: number
}

export function CustomerList() {
  const router = useRouter()
  const { toast } = useToast()
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CustomerStats | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [hasOutstandingFilter, setHasOutstandingFilter] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  // Selection
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    customerId?: string
    customerName?: string
  }>({ open: false })

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', pageSize.toString())
      
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (currencyFilter) params.append('currency', currencyFilter)
      if (industryFilter) params.append('industry', industryFilter)
      if (hasOutstandingFilter) params.append('hasOutstanding', 'true')
      
      const response = await apiClient<{
        data: Customer[]
        total: number
        stats?: CustomerStats
      }>(`/api/customers?${params.toString()}`)
      
      if (response.ok && response.data) {
        setCustomers(response.data.data || [])
        setTotalItems(response.data.total || 0)
        setStats(response.data.stats || null)
      } else {
        throw new Error(response.error || 'Failed to fetch customers')
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError('Failed to load customers. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery, statusFilter, currencyFilter, industryFilter, hasOutstandingFilter])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Handlers
  const handleDelete = async (customerId: string) => {
    try {
      const response = await apiClient(`/api/customers/${customerId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: 'Customer deleted',
          description: 'The customer has been deleted successfully.',
        })
        fetchCustomers()
      } else {
        throw new Error(response.error || 'Failed to delete customer')
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Could not delete the customer.',
        variant: 'destructive',
      })
    }
    setDeleteDialog({ open: false })
  }

  const handleBulkExport = async () => {
    try {
      const customerIds = selectedCustomers.size > 0 
        ? Array.from(selectedCustomers)
        : customers.map(c => c.id)
      
      const response = await apiClient('/api/customers/export', {
        method: 'POST',
        body: JSON.stringify({ ids: customerIds }),
      })
      
      if (response.ok) {
        toast({
          title: 'Export started',
          description: 'Your customer data is being exported.',
        })
      }
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export customer data.',
        variant: 'destructive',
      })
    }
  }

  const handleBulkDelete = async () => {
    try {
      const response = await apiClient('/api/customers/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedCustomers) }),
      })
      
      if (response.ok) {
        toast({
          title: 'Customers deleted',
          description: `${selectedCustomers.size} customers have been deleted.`,
        })
        setSelectedCustomers(new Set())
        fetchCustomers()
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Could not delete customers.',
        variant: 'destructive',
      })
    }
  }

  const getOutstandingBadge = (account?: { balance: number }) => {
    if (!account || account.balance === 0) {
      return <Badge variant="outline" className="bg-green-50">No Outstanding</Badge>
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700">
        {formatCurrency(account.balance)}
      </Badge>
    )
  }

  const columns: ColumnDef<Customer>[] = [
    createSelectionColumn<Customer>(),
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.customerNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            {row.original.email}
          </div>
          {row.original.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {row.original.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'industry',
      header: 'Industry',
      cell: ({ row }) => row.original.industry || '-',
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.currency}</Badge>
      ),
    },
    {
      accessorKey: 'creditLimit',
      header: 'Credit Limit',
      cell: ({ row }) => formatCurrency(row.original.creditLimit, row.original.currency),
    },
    {
      accessorKey: 'account.balance',
      header: 'Outstanding',
      cell: ({ row }) => getOutstandingBadge(row.original.account),
    },
    {
      accessorKey: 'paymentTerms',
      header: 'Payment Terms',
      cell: ({ row }) => `${row.original.paymentTerms} days`,
    },
    {
      id: 'activity',
      header: 'Activity',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            {row.original._count?.salesCases || 0} cases
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            {row.original._count?.invoices || 0} invoices
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    createActionsColumn<Customer>((customer) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}/edit`)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/sales-cases/new?customerId=${customer.id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Sales Case
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/invoices/new?customerId=${customer.id}`)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Create Invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialog({ 
              open: true, 
              customerId: customer.id, 
              customerName: customer.name 
            })}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )),
  ]

  // Get unique values for filters
  const availableCurrencies = [...new Set(customers.map(c => c.currency))].filter(Boolean)
  const availableIndustries = [...new Set(customers.map(c => c.industry))].filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer relationships</p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credit</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCreditLimit)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        error={error}
        pagination={{
          page,
          pageSize,
          total: totalItems,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
        }}
        search={{
          value: searchQuery,
          placeholder: 'Search customers by name, email, or number...',
          onChange: setSearchQuery,
        }}
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="active">With Outstanding</SelectItem>
                <SelectItem value="inactive">No Outstanding</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All currencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Currencies</SelectItem>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Industries</SelectItem>
                {availableIndustries.map(industry => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasOutstanding"
                checked={hasOutstandingFilter}
                onCheckedChange={(checked) => setHasOutstandingFilter(!!checked)}
              />
              <label
                htmlFor="hasOutstanding"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Has outstanding balance
              </label>
            </div>
          </div>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => router.push('/customers/import')}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={() => router.push('/customers/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </>
        }
        onRefresh={fetchCustomers}
        onExport={handleBulkExport}
        onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
        bulkActions={{
          selectedRows: selectedCustomers,
          onSelectRow: (row, selected) => {
            const newSet = new Set(selectedCustomers)
            if (selected) {
              newSet.add(row.id)
            } else {
              newSet.delete(row.id)
            }
            setSelectedCustomers(newSet)
          },
          onSelectAll: (selected) => {
            if (selected) {
              setSelectedCustomers(new Set(customers.map(c => c.id)))
            } else {
              setSelectedCustomers(new Set())
            }
          },
          actions: (
            <>
              <Button size="sm" variant="outline" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ),
        }}
        emptyState={{
          icon: <Building2 className="mx-auto h-12 w-12 text-gray-300" />,
          title: 'No customers found',
          description: 'Get started by adding your first customer',
          action: (
            <Button onClick={() => router.push('/customers/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          ),
        }}
        showColumnVisibility
        showSorting
        stickyHeader
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog.customerName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteDialog.customerId && handleDelete(deleteDialog.customerId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}