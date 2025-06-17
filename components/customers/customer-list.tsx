'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Download, 
  Upload, 
  Mail, 
  Phone, 
  Building2, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Globe,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { cn } from '@/lib/utils'

// UI Components
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

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

interface FilterOptions {
  status: 'all' | 'active' | 'inactive'
  currency: string
  industry: string
  hasOutstanding: boolean
  dateRange: {
    from?: string
    to?: string
  }
}

interface SortOptions {
  field: keyof Customer | 'balance' | 'outstandingAmount'
  direction: 'asc' | 'desc'
}

interface PaginationOptions {
  page: number
  limit: number
  total: number
}

export function CustomerList(): JSX.Element {
  const router = useRouter()
  const { toast } = useToast()
  
  // State Management
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    totalCreditLimit: 0,
    totalOutstanding: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean
    customers: Customer[]
    single: boolean
  }>({ show: false, customers: [], single: false })

  // Filters and Sorting
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    currency: '',
    industry: '',
    hasOutstanding: false,
    dateRange: {}
  })
  
  const [sort, setSort] = useState<SortOptions>({
    field: 'createdAt',
    direction: 'desc'
  })
  
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    limit: 20,
    total: 0
  })

  // Available filter options
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([])
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([])

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Load customers with filters
  const loadCustomers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    else setRefreshing(true)
    
    try {
      const queryParams = new URLSearchParams()
      
      // Search
      if (debouncedSearchTerm) {
        queryParams.append('search', debouncedSearchTerm)
      }
      
      // Filters
      if (filters.currency) {
        queryParams.append('currency', filters.currency)
      }
      if (filters.industry) {
        queryParams.append('industry', filters.industry)
      }
      if (filters.status !== 'all') {
        queryParams.append('status', filters.status)
      }
      if (filters.hasOutstanding) {
        queryParams.append('hasOutstanding', 'true')
      }
      if (filters.dateRange.from) {
        queryParams.append('dateFrom', filters.dateRange.from)
      }
      if (filters.dateRange.to) {
        queryParams.append('dateTo', filters.dateRange.to)
      }
      
      // Sorting
      queryParams.append('sortBy', sort.field)
      queryParams.append('sortOrder', sort.direction)
      
      // Pagination
      queryParams.append('page', pagination.page.toString())
      queryParams.append('limit', pagination.limit.toString())

      const response = await apiClient<{ data: any }>(`/api/customers?${queryParams.toString()}`)
      
      if (response.ok && response?.data) {
        const data = response?.data
        setCustomers(data.customers || data.data || [])
        setStats(data.stats || stats)
        setPagination(prev => ({
          ...prev,
          total: data.total || data.pagination?.total || 0
        }))
        
        // Extract unique values for filters
        if (data.customers || data.data) {
          const customerData = data.customers || data.data
          const currencies = [...new Set(customerData.map((c: Customer) => c.currency).filter(Boolean))]
          const industries = [...new Set(customerData.map((c: Customer) => c.industry).filter(Boolean))]
          setAvailableCurrencies(currencies)
          setAvailableIndustries(industries)
        }
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load customers. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedSearchTerm, filters, sort, pagination.page, pagination.limit, stats])

  // Load customers when dependencies change
  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle sorting
  const handleSort = (field: keyof Customer | 'balance' | 'outstandingAmount') => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  // Handle customer selection
  const handleSelectCustomer = (customerId: string, selected: boolean) => {
    setSelectedCustomers(prev => {
      const newSelection = new Set(prev)
      if (selected) {
        newSelection.add(customerId)
      } else {
        newSelection.delete(customerId)
      }
      return newSelection
    })
  }

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedCustomers(new Set(customers.map(c => c.id)))
    } else {
      setSelectedCustomers(new Set())
    }
  }

  // Delete customer(s)
  const handleDelete = async (customerIds: string[] = []) => {
    try {
      setLoading(true)
      
      const idsToDelete = customerIds.length > 0 ? customerIds : Array.from(selectedCustomers)
      
      for (const id of idsToDelete) {
        await apiClient(`/api/customers/${id}`, {
          method: 'DELETE'
        })
      }
      
      toast({
        title: 'Success',
        description: `${idsToDelete.length} customer(s) deleted successfully`
      })
      
      setSelectedCustomers(new Set())
      setDeleteConfirmation({ show: false, customers: [], single: false })
      await loadCustomers()
    } catch (error) {
      console.error('Error deleting customers:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete customers. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Bulk credit limit change (placeholder for future implementation)
  const handleBulkCreditLimitChange = async () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Bulk credit limit updates will be available in a future update.'
    })
  }

  // Export customers
  const handleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const customerIds = selectedCustomers.size > 0 
        ? Array.from(selectedCustomers) 
        : customers.map(c => c.id)
      
      const response = await apiClient<{ data: any }>('/api/customers/export', {
        method: 'POST',
        body: JSON.stringify({ 
          customerIds, 
          format,
          includeBalances: true
        })
      })
      
      if (response.ok) {
        // Handle file download
        const blob = new Blob([response?.data], { 
          type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.${format === 'csv' ? 'csv' : 'xlsx'}`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: 'Success',
          description: `Customers exported successfully as ${format.toUpperCase()}`
        })
      }
    } catch (error) {
      console.error('Error exporting customers:', error)
      toast({
        title: 'Error',
        description: 'Failed to export customers. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  // Get status badge
  const getStatusBadge = (customer: Customer) => {
    const hasOutstanding = customer.account && customer.account.balance > 0
    const overLimit = customer.account && customer.account.balance > customer.creditLimit
    
    if (overLimit) {
      return <Badge variant="destructive">Over Limit</Badge>
    }
    if (hasOutstanding) {
      return <Badge className="bg-yellow-100 text-yellow-800">Outstanding</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>
  }

  // Get activity indicator
  const getActivityIndicator = (customer: Customer) => {
    if (!customer.lastActivity) {
      return <Clock className="h-4 w-4 text-gray-400" />
    }
    
    const daysSince = Math.floor(
      (new Date().getTime() - new Date(customer.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSince < 7) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    } else if (daysSince < 30) {
      return <Clock className="h-4 w-4 text-yellow-500" />
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  // Memoized filtered and sorted customers
  const processedCustomers = useMemo(() => {
    return customers
  }, [customers])

  // Pagination calculations
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const startItem = (pagination.page - 1) * pagination.limit + 1
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database and track business relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadCustomers(false)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={loading || customers.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button 
            size="sm"
            onClick={() => router.push('/customers/new')}
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All customers in database
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {customers.filter(c => c.account && c.account.balance > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Customers with pending payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Limit</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCreditLimit)}</div>
            <p className="text-xs text-muted-foreground">
              Total approved credit
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Pending payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Credit Limit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.total > 0 ? stats.totalCreditLimit / stats.total : 0)
            </div>
            <p className="text-xs text-muted-foreground">
              Per active customer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, email, or customer number..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            {/* View Mode Toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-l-none"
              >
                Cards
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                value={filters.status}
                onValueChange={(value: 'all' | 'active' | 'inactive') => 
                  handleFilterChange('status', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">With Outstanding</SelectItem>
                  <SelectItem value="inactive">No Outstanding</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.currency}
                onValueChange={(value) => handleFilterChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by currency" />
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
              
              <Select
                value={filters.industry}
                onValueChange={(value) => handleFilterChange('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by industry" />
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
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasOutstanding"
                  checked={filters.hasOutstanding}
                  onCheckedChange={(checked) => 
                    handleFilterChange('hasOutstanding', !!checked)
                  }
                />
                <label 
                  htmlFor="hasOutstanding" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Has Outstanding Balance
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCustomers.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {selectedCustomers.size} customer(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkCreditLimitChange()}
                >
                  Update Credit Limits
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                >
                  <Download className="h-4 w-4" />
                  Export Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmation({
                    show: true,
                    customers: customers.filter(c => selectedCustomers.has(c.id)),
                    single: false
                  })}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomers(new Set())}
                >
                  <X className="h-4 w-4" />
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                {loading ? 'Loading customers...' : `Showing ${startItem}-${endItem} of ${pagination.total} customers`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={pagination.limit.toString()}
                onValueChange={(value) => setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={customers.length > 0 && selectedCustomers.size === customers.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all customers"
                      />
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-medium"
                      >
                        Customer
                        {sort.field === 'name' && (
                          sort.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                        {sort.field !== 'name' && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('currency')}
                        className="h-auto p-0 font-medium"
                      >
                        Financial
                        {sort.field === 'currency' && (
                          sort.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                        {sort.field !== 'currency' && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('createdAt')}
                        className="h-auto p-0 font-medium"
                      >
                        Created
                        {sort.field === 'createdAt' && (
                          sort.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                        {sort.field !== 'createdAt' && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <div className="flex items-center space-x-4">
                            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-gray-200 rounded animate-pulse" />
                              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                        <p className="text-gray-500 mb-4">
                          {searchTerm || showFilters 
                            ? 'Try adjusting your search or filters'
                            : 'Get started by adding your first customer'
                          }
                        </p>
                        {!searchTerm && !showFilters && (
                          <Button onClick={() => router.push('/customers/new')}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Customer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                            aria-label={`Select ${customer.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {getActivityIndicator(customer)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Link 
                                  href={`/customers/${customer.id}`}
                                  className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                >
                                  {customer.name}
                                </Link>
                                {customer._count && customer._count.salesCases > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {customer._count.salesCases} cases
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.customerNumber}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              <a 
                                href={`mailto:${customer.email}`}
                                className="text-blue-600 hover:underline truncate max-w-48"
                              >
                                {customer.email}
                              </a>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                <a href={`tel:${customer.phone}`} className="hover:underline">
                                  {customer.phone}
                                </a>
                              </div>
                            )}
                            {customer.website && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Globe className="h-3 w-3 mr-1 text-gray-400" />
                                <a 
                                  href={customer.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate max-w-32"
                                >
                                  Website
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.industry && (
                              <Badge variant="outline" className="text-xs">
                                {customer.industry}
                              </Badge>
                            )}
                            {customer.address && (
                              <div className="flex items-center text-xs text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span className="truncate max-w-32">{customer.address}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {customer.currency} {formatCurrency(customer.creditLimit, customer.currency)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Credit Limit
                            </div>
                            {customer.account && (
                              <div className="text-xs">
                                Balance: {formatCurrency(customer.account.balance, customer.currency)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(customer)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {customer.paymentTerms} day terms
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${customer.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${customer.id}/edit`}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Customer
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/sales-cases/new?customerId=${customer.id}`}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  New Sales Case
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteConfirmation({
                                  show: true,
                                  customers: [customer],
                                  single: true
                                })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Customer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Cards View */
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : customers.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || showFilters 
                      ? 'Try adjusting your search or filters'
                      : 'Get started by adding your first customer'
                    }
                  </p>
                  {!searchTerm && !showFilters && (
                    <Button onClick={() => router.push('/customers/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  )}
                </div>
              ) : (
                customers.map((customer) => (
                  <Card key={customer.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                            aria-label={`Select ${customer.name}`}
                          />
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base">
                              <Link 
                                href={`/customers/${customer.id}`}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {customer.name}
                              </Link>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1">
                              {getActivityIndicator(customer)}
                              <span>{customer.customerNumber}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(customer)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${customer.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${customer.id}/edit`}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Customer
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/sales-cases/new?customerId=${customer.id}`}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  New Sales Case
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteConfirmation({
                                  show: true,
                                  customers: [customer],
                                  single: true
                                })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Customer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                            <a 
                              href={`mailto:${customer.email}`}
                              className="text-blue-600 hover:underline truncate"
                            >
                              {customer.email}
                            </a>
                          </div>
                          {customer.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                              <a href={`tel:${customer.phone}`} className="hover:underline">
                                {customer.phone}
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatCurrency(customer.creditLimit, customer.currency)}
                            </div>
                            <div className="text-xs text-gray-500">Credit Limit</div>
                          </div>
                          {customer.account && (
                            <div className="text-right space-y-1">
                              <div className={cn(
                                "font-medium",
                                customer.account.balance > 0 ? "text-yellow-600" : "text-green-600"
                              )}>
                                {formatCurrency(customer.account.balance, customer.currency)}
                              </div>
                              <div className="text-xs text-gray-500">Outstanding</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                          </div>
                          {customer.industry && (
                            <Badge variant="outline" className="text-xs">
                              {customer.industry}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
          
          {/* Pagination */}
          {!loading && pagination.total > pagination.limit && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {startItem} to {endItem} of {pagination.total} customers
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + Math.max(1, pagination.page - 2)
                    if (page > totalPages) return null
                    return (
                      <Button
                        key={page}
                        variant={page === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={pagination.page === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.show} onOpenChange={(open) => 
        setDeleteConfirmation(prev => ({ ...prev, show: open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteConfirmation.single ? 'Delete Customer' : 'Delete Customers'}
            </DialogTitle>
            <DialogDescription>
              {deleteConfirmation.single 
                ? `Are you sure you want to delete "${deleteConfirmation.customers[0]?.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${deleteConfirmation.customers.length} customers? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({ show: false, customers: [], single: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(deleteConfirmation.customers.map(c => c.id))}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}