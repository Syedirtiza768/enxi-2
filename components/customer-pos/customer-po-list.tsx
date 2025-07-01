'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  FileText, 
  Eye, 
  CheckCircle, 
  Clock,
  Package,
  TrendingUp,
  MoreVertical,
  Download,
  Check
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrencyFormatter } from '@/lib/contexts/currency-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface CustomerPO {
  id: string
  poNumber: string
  customer: {
    id: string
    name: string
    email: string
  }
  quotation?: {
    id: string
    quotationNumber: string
  } | null
  salesCase?: {
    id: string
    caseNumber: string
    title: string
  } | null
  poDate: string
  poAmount: number
  currency: string
  isAccepted: boolean
  acceptedAt?: string
  salesOrder?: {
    id: string
    orderNumber: string
    status: string
  } | null
  attachmentUrl?: string
  notes?: string
  createdAt: string
}

interface POStats {
  total: number
  pending: number
  accepted: number
  totalValue: number
  acceptedValue: number
}

export function CustomerPOList() {
  const router = useRouter()
  const { format } = useCurrencyFormatter()
  
  // State management
  const [pos, setPOs] = useState<CustomerPO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<POStats | null>(null)
  
  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRangeFilter, setDateRangeFilter] = useState('30')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  // Selection for bulk operations
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set())

  // Fetch customer POs from API
  const fetchPOs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })
      
      if (search) params.append('search', search)
      if (statusFilter && statusFilter !== 'all') {
        params.append('isAccepted', statusFilter === 'accepted' ? 'true' : 'false')
      }
      if (dateRangeFilter && dateRangeFilter !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRangeFilter))
        params.append('dateFrom', daysAgo.toISOString())
      }

      const response = await apiClient<CustomerPO[] | { data: CustomerPO[], total: number }>(`/api/customer-pos?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load customer POs')
      }

      const responseData = response?.data
      if (Array.isArray(responseData)) {
        // Direct array response
        setPOs(responseData)
        setTotalItems(responseData.length)
        // Calculate stats from data
        const calculatedStats = {
          total: responseData.length,
          pending: responseData.filter(po => !po.isAccepted).length,
          accepted: responseData.filter(po => po.isAccepted).length,
          totalValue: responseData.reduce((sum, po) => sum + po.poAmount, 0),
          acceptedValue: responseData.filter(po => po.isAccepted).reduce((sum, po) => sum + po.poAmount, 0)
        }
        setStats(calculatedStats)
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        // Paginated response
        setPOs(responseData.data || [])
        setTotalItems(responseData.total || responseData.data.length)
        // Calculate stats from data
        const calculatedStats = {
          total: responseData.total || responseData.data.length,
          pending: responseData.data.filter(po => !po.isAccepted).length,
          accepted: responseData.data.filter(po => po.isAccepted).length,
          totalValue: responseData.data.reduce((sum, po) => sum + po.poAmount, 0),
          acceptedValue: responseData.data.filter(po => po.isAccepted).reduce((sum, po) => sum + po.poAmount, 0)
        }
        setStats(calculatedStats)
      } else {
        setPOs([])
        setTotalItems(0)
        setStats(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer POs')
      console.error('Error fetching customer POs:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, search, statusFilter, dateRangeFilter])

  // Effects
  useEffect(() => {
    fetchPOs()
  }, [fetchPOs])

  const formatCurrency = (amount: number) => {
    return format(amount)
  }

  const getStatusBadge = (po: CustomerPO) => {
    if (po.isAccepted) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Accepted
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    }
  }

  // Event handlers
  const handleAccept = async (poId: string) => {
    try {
      const response = await apiClient(`/api/customer-pos/${poId}/accept`, {
        method: 'POST'
      })
      if (response.ok) {
        toast({
          title: 'PO accepted',
          description: 'Customer PO has been accepted and sales order created',
        })
        await fetchPOs()
      }
    } catch (error) {
      toast({
        title: 'Accept failed',
        description: 'Could not accept the customer PO',
        variant: 'destructive',
      })
    }
  }

  const handleBulkExport = async () => {
    try {
      const csvContent = pos
        .filter(po => selectedPOs.has(po.id))
        .map(po => 
          [
            po.poNumber,
            po.customer.name,
            po.quotation?.quotationNumber || '',
            formatCurrency(po.poAmount),
            po.isAccepted ? 'Accepted' : 'Pending',
            po.salesOrder?.orderNumber || '',
            new Date(po.poDate).toLocaleDateString()
          ].join(',')
        ).join('\n')

      const header = 'PO Number,Customer,Quotation,Amount,Status,Sales Order,PO Date\n'
      const blob = new Blob([header + csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'customer-pos.csv'
      link.click()
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Export completed',
        description: `${selectedPOs.size} POs exported successfully`,
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export POs',
        variant: 'destructive',
      })
    }
  }

  const columns: ColumnDef<CustomerPO>[] = [
    createSelectionColumn<CustomerPO>(),
    {
      accessorKey: 'poNumber',
      header: 'PO Number',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('poNumber')}</div>
          {row.original.salesCase && (
            <div className="text-sm text-gray-500">Case: {row.original.salesCase.caseNumber}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'customer.name',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customer.name}</div>
          <div className="text-sm text-gray-500">{row.original.customer.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'quotation.quotationNumber',
      header: 'Quotation',
      cell: ({ row }) => row.original.quotation?.quotationNumber || '-',
    },
    {
      accessorKey: 'poAmount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="font-medium">{formatCurrency(row.getValue('poAmount'))}</div>
      ),
    },
    {
      accessorKey: 'isAccepted',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original),
    },
    {
      accessorKey: 'salesOrder',
      header: 'Sales Order',
      cell: ({ row }) => {
        const salesOrder = row.original.salesOrder
        if (!salesOrder) return '-'
        return (
          <div>
            <div className="font-medium">{salesOrder.orderNumber}</div>
            <div className="text-sm text-gray-500">{salesOrder.status}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'poDate',
      header: 'PO Date',
      cell: ({ row }) => new Date(row.getValue('poDate')).toLocaleDateString(),
    },
    createActionsColumn<CustomerPO>((po) => (
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
          <DropdownMenuItem onClick={() => router.push(`/customer-pos/${po.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {!po.isAccepted && (
            <DropdownMenuItem onClick={() => handleAccept(po.id)}>
              <Check className="mr-2 h-4 w-4" />
              Accept PO
            </DropdownMenuItem>
          )}
          {po.attachmentUrl && (
            <DropdownMenuItem onClick={() => window.open(po.attachmentUrl, '_blank')}>
              <Download className="mr-2 h-4 w-4" />
              Download Attachment
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
          <h1 className="text-2xl font-bold tracking-tight">Customer Purchase Orders</h1>
          <p className="text-muted-foreground">Manage customer POs and track order confirmations</p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total POs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.acceptedValue)}</p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={pos}
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
          placeholder: 'Search POs...',
          onChange: setSearch,
        }}
        filters={
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        actions={
          <Button onClick={() => router.push('/customer-pos/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        }
        onRefresh={fetchPOs}
        onRowClick={(po) => router.push(`/customer-pos/${po.id}`)}
        bulkActions={{
          selectedRows: selectedPOs,
          onSelectRow: (row, selected) => {
            const newSet = new Set(selectedPOs)
            if (selected) {
              newSet.add(row.id)
            } else {
              newSet.delete(row.id)
            }
            setSelectedPOs(newSet)
          },
          onSelectAll: (selected) => {
            if (selected) {
              setSelectedPOs(new Set(pos.map(po => po.id)))
            } else {
              setSelectedPOs(new Set())
            }
          },
          actions: (
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
          ),
        }}
        emptyState={{
          icon: <FileText className="mx-auto h-12 w-12 text-gray-300" />,
          title: 'No customer POs found',
          description: 'Create your first customer PO to get started',
          action: (
            <Button onClick={() => router.push('/customer-pos/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create PO
            </Button>
          ),
        }}
        showColumnVisibility
        showSorting
        stickyHeader
      />
    </div>
  )
}