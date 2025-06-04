'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PageLayout,
  PageHeader,
  PageSection,
  VStack,
  HStack,
  Grid,
  Button,
  Input,
  Badge,
  Text
} from '@/components/design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  DollarSign,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Eye,
  Send,
  Package
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  supplier: {
    id: string
    name: string
    code: string
  }
  orderDate: string
  expectedDeliveryDate?: string
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  subtotal: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  currency: string
  notes?: string
  items: Array<{
    id: string
    itemId: string
    item: {
      name: string
      code: string
    }
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  createdAt: string
  createdBy: string
}

interface PurchaseOrderStats {
  totalOrders: number
  draftOrders: number
  pendingOrders: number
  totalValue: number
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [stats, setStats] = useState<PurchaseOrderStats>({
    totalOrders: 0,
    draftOrders: 0,
    pendingOrders: 0,
    totalValue: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const fetchPurchaseOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient('/api/purchase-orders', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch purchase orders')
      }
      
      const data = response.data?.data || []
      setPurchaseOrders(data)
      
      // Calculate stats
      const stats = {
        totalOrders: data.length,
        draftOrders: Array.isArray(data) ? data.filter((po: PurchaseOrder) => po.status === 'DRAFT').length : 0,
        pendingOrders: Array.isArray(data) ? data.filter((po: PurchaseOrder) => ['SENT', 'CONFIRMED'].includes(po.status)).length : 0,
        totalValue: Array.isArray(data) ? data.reduce((sum: number, po: PurchaseOrder) => sum + po.totalAmount, 0) : 0
      }
      setStats(stats)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      setError(error instanceof Error ? error.message : 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSendPO = async (id: string) => {
    try {
      const response = await apiClient(`/api/purchase-orders/${id}/send`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchPurchaseOrders()
      }
    } catch (error) {
      console.error('Error sending purchase order:', error)
    }
  }

  const handleApprovePO = async (id: string) => {
    try {
      const response = await apiClient(`/api/purchase-orders/${id}/approve`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchPurchaseOrders()
      }
    } catch (error) {
      console.error('Error approving purchase order:', error)
    }
  }

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    const config = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-800' },
      CONFIRMED: { label: 'Confirmed', className: 'bg-yellow-100 text-yellow-800' },
      PARTIALLY_RECEIVED: { label: 'Partially Received', className: 'bg-orange-100 text-orange-800' },
      RECEIVED: { label: 'Received', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    }
    
    const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return <Badge className={className}>{label}</Badge>
  }

  const getStatusIcon = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'DRAFT':
        return <Clock className="h-4 w-4 text-gray-600" />
      case 'SENT':
        return <Send className="h-4 w-4 text-blue-600" />
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-yellow-600" />
      case 'PARTIALLY_RECEIVED':
        return <Package className="h-4 w-4 text-orange-600" />
      case 'RECEIVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const filteredPurchaseOrders = Array.isArray(purchaseOrders) ? purchaseOrders.filter(po => {
    const matchesSearch = search === '' || 
      po.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.code?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) : []

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading purchase orders...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading purchase orders</Text>
            <Text color="secondary">{error}</Text>
          </VStack>
          <Button variant="primary" onClick={fetchPurchaseOrders}>
            Try Again
          </Button>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader
          title="Purchase Orders"
          description="Manage purchase orders and supplier procurement"
          centered={false}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus />}
              onClick={() => router.push('/purchase-orders/new')}
            >
              New Purchase Order
            </Button>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={4} gap="lg">
            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Orders</Text>
                    <Text size="2xl" weight="bold">{stats.totalOrders}</Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-lg">
                    <FileText className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Draft Orders</Text>
                    <Text size="2xl" weight="bold">{stats.draftOrders}</Text>
                  </VStack>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Clock className="h-6 w-6 text-gray-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Pending Orders</Text>
                    <Text size="2xl" weight="bold">{stats.pendingOrders}</Text>
                  </VStack>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Value</Text>
                    <Text size="2xl" weight="bold">
                      ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>
          </Grid>
        </PageSection>

        {/* Filters */}
        <PageSection>
          <Card variant="elevated" padding="lg">
            <CardContent>
              <HStack gap="md" className="flex-col sm:flex-row">
                <div className="flex-1">
                  <Input
                    placeholder="Search by PO number, supplier name, or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    leftIcon={<Search />}
                    fullWidth
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[150px]"
                >
                  <option value="all">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </HStack>
            </CardContent>
          </Card>
        </PageSection>

        {/* Purchase Orders Table */}
        <PageSection>
          <Card variant="elevated" className="overflow-hidden">
            <CardHeader>
              <CardTitle>Purchase Orders ({filteredPurchaseOrders.length})</CardTitle>
            </CardHeader>
            {filteredPurchaseOrders.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <FileText className="h-12 w-12 text-[var(--color-neutral-400)]" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No purchase orders found</Text>
                    <Text color="secondary">
                      {search || statusFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Create your first purchase order to get started'}
                    </Text>
                  </VStack>
                  {!search && statusFilter === 'all' && (
                    <Button
                      variant="primary"
                      leftIcon={<Plus />}
                      onClick={() => router.push('/purchase-orders/new')}
                    >
                      New Purchase Order
                    </Button>
                  )}
                </VStack>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{po.supplier.name}</div>
                          <div className="text-sm text-gray-500">{po.supplier.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(po.orderDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {po.expectedDeliveryDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${po.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-500">{po.currency}</div>
                      </TableCell>
                      <TableCell>
                        <HStack gap="xs" align="center">
                          {getStatusIcon(po.status)}
                          {getStatusBadge(po.status)}
                        </HStack>
                      </TableCell>
                      <TableCell>
                        <HStack gap="xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/purchase-orders/${po.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {po.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/purchase-orders/${po.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendPO(po.id)}
                                className="text-blue-600"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {po.status === 'SENT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprovePO(po.id)}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </HStack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </PageSection>
      </VStack>
    </PageLayout>
  )
}