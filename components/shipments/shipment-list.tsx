'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiClient } from '@/lib/api/client'
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

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
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      if (statusFilter) {
        params.append('status', statusFilter)
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const data = await apiClient<ShipmentListResponse>(`/api/shipments?${params.toString()}`)
      
      if (data && data.data) {
        setShipments(data.data || [])
        setTotal(data.total || 0)
      } else {
        throw new Error('Failed to fetch shipments')
      }
    } catch (err) {
      console.error('Error fetching shipments:', err)
      setError('Error loading shipments. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm, limit])

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleRowClick = (shipmentId: string) => {
    router.push(`/shipments/${shipmentId}`)
  }

  const handleCreateShipment = () => {
    router.push('/shipments/new')
  }

  const totalPages = Math.ceil(total / limit)

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error}
            <Button 
              onClick={fetchShipments} 
              className="ml-4"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Shipments</h1>
        <Button onClick={handleCreateShipment}>
          <Plus className="w-4 h-4 mr-2" />
          Create Shipment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by shipment number, order number, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <option value="">All Statuses</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="SHIPPED">Shipped</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment List */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading shipments...</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No shipments found</p>
              <Button 
                onClick={handleCreateShipment}
                className="mt-4"
                variant="outline"
              >
                Create First Shipment
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Shipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow
                      key={shipment.id}
                      onClick={() => handleRowClick(shipment.id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">
                        {shipment.shipmentNumber}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(shipment.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(shipment.status)}
                          {shipment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {shipment.salesOrder?.salesCase?.customer?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {shipment.salesOrder?.orderNumber || '-'}
                      </TableCell>
                      <TableCell>
                        {shipment.carrier || '-'}
                        {shipment.trackingNumber && (
                          <div className="text-sm text-gray-500">
                            {shipment.trackingNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {shipment.items?.length || 0} item{(shipment.items?.length || 0) !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {shipment.items?.reduce((sum, item) => sum + item.quantityShipped, 0) || 0} total qty
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(shipment.createdAt)}
                      </TableCell>
                      <TableCell>
                        {shipment.shippedAt ? formatDate(shipment.shippedAt) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}