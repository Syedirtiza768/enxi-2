'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { 
  DataTable,
  ColumnDef,
  createActionsColumn,
} from '@/components/ui/data-table'
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  Eye,
  Download,
  Mail,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils/format'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Shipment {
  id: string
  shipmentNumber: string
  status: string
  carrier?: string
  trackingNumber?: string
  createdAt: string
  shippedAt?: string
  deliveredAt?: string
  salesOrder: {
    orderNumber: string
    salesCase: {
      customer: {
        name: string
      }
    }
  }
  items: Array<{
    id: string
    itemCode: string
    description: string
    quantityShipped: number
  }>
}

interface ShipmentListResponse {
  data: Shipment[]
  total: number
  page: number
  limit: number
}

export function ShipmentList(): React.JSX.Element {
  const router = useRouter()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', pageSize.toString())

      if (statusFilter) {
        params.append('status', statusFilter)
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await apiClient<ShipmentListResponse>(`/api/shipments?${params.toString()}`)
      
      if (response.ok && response.data) {
        setShipments(response.data.data || [])
        setTotal(response.data.total || 0)
      } else if (!response.ok) {
        console.error('API Error:', response.error)
        throw new Error(response.error || 'Failed to fetch shipments')
      } else {
        console.error('Invalid shipments response:', response)
        setShipments([])
        setTotal(0)
      }
    } catch (err) {
      console.error('Error fetching shipments:', err)
      setError('Error loading shipments. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, searchTerm])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PREPARING':
        return <Clock className="w-4 h-4" />
      case 'READY':
        return <Package className="w-4 h-4" />
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return <Truck className="w-4 h-4" />
      case 'DELIVERED':
        return <CheckCircle className="w-4 h-4" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-800'
      case 'READY':
        return 'bg-blue-100 text-blue-800'
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRowClick = (shipment: Shipment) => {
    router.push(`/shipments/${shipment.id}`)
  }

  const handleCreateShipment = () => {
    router.push('/shipments/new')
  }

  const handleExport = async () => {
    try {
      const response = await apiClient('/api/shipments/export', {
        method: 'POST',
        body: JSON.stringify({ status: statusFilter }),
      })
      
      if (response.ok) {
        console.log('Export initiated')
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const columns: ColumnDef<Shipment>[] = [
    {
      accessorKey: 'shipmentNumber',
      header: 'Shipment #',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('shipmentNumber')}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge className={`${getStatusColor(status)} flex items-center gap-1 w-fit`}>
            {getStatusIcon(status)}
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'salesOrder.salesCase.customer.name',
      header: 'Customer',
      cell: ({ row }) => (
        <div>{row.original.salesOrder?.salesCase?.customer?.name || '-'}</div>
      ),
    },
    {
      accessorKey: 'salesOrder.orderNumber',
      header: 'Order #',
      cell: ({ row }) => (
        <div>{row.original.salesOrder?.orderNumber || '-'}</div>
      ),
    },
    {
      accessorKey: 'carrier',
      header: 'Carrier',
      cell: ({ row }) => (
        <div>
          <div>{row.original.carrier || '-'}</div>
          {row.original.trackingNumber && (
            <div className="text-sm text-gray-500">
              {row.original.trackingNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.items || []
        const totalQty = items.reduce((sum, item) => sum + item.quantityShipped, 0)
        return (
          <div>
            <div className="text-sm">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500">
              {totalQty} total qty
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.getValue('createdAt')),
    },
    {
      accessorKey: 'shippedAt',
      header: 'Shipped',
      cell: ({ row }) => {
        const shippedAt = row.getValue('shippedAt') as string | undefined
        return shippedAt ? formatDate(shippedAt) : '-'
      },
    },
    createActionsColumn<Shipment>((shipment) => (
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
          <DropdownMenuItem onClick={() => router.push(`/shipments/${shipment.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`/api/shipments/${shipment.id}/label`, '_blank')}>
            <Download className="mr-2 h-4 w-4" />
            Download Label
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => console.log('Send notification', shipment.id)}
            disabled={shipment.status !== 'SHIPPED'}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send Notification
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )),
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Shipments</h1>
          <p className="text-muted-foreground">Manage and track your shipments</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={shipments}
        loading={loading}
        error={error}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
        }}
        search={{
          value: searchTerm,
          placeholder: 'Search by shipment number, order number, or customer...',
          onChange: setSearchTerm,
        }}
        filters={
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <Button onClick={handleCreateShipment}>
            <Plus className="w-4 h-4 mr-2" />
            Create Shipment
          </Button>
        }
        onRefresh={fetchShipments}
        onExport={handleExport}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />,
          title: 'No shipments found',
          description: 'Get started by creating your first shipment',
          action: (
            <Button 
              onClick={handleCreateShipment}
              variant="outline"
            >
              Create First Shipment
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