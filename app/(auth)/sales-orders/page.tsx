'use client'

import React, { useState, useEffect } from 'react'
import { 
  PageLayout,
  PageHeader,
  PageSection,
  VStack,
  HStack,
  Grid,
  Card,
  CardContent,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Badge
} from '@/components/design-system'
import { 
  Plus, Search, Package, Clock, CheckCircle, 
  XCircle, AlertCircle, ChevronRight 
} from 'lucide-react'
import { useCurrency } from '@/lib/contexts/currency-context'
import { ExportButton } from '@/components/export/export-button'

interface SalesOrder {
  id: string
  orderNumber: string
  salesCase: {
    id: string
    caseNumber: string
    title: string
    customer: {
      id: string
      name: string
      email: string
    }
  }
  quotation?: {
    id: string
    quotationNumber: string
  } | null
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'INVOICED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  customerPO?: string
  totalAmount: number
  createdAt: string
  promisedDate?: string
}

export default function SalesOrdersPage() {
  
  const { formatCurrency } = useCurrency()
const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState('30')

  // Fetch sales orders
  useEffect(() => {
    const fetchOrders = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (statusFilter && statusFilter !== 'all') {
          params.append('status', statusFilter)
        }
        if (dateFilter !== 'all') {
          const daysAgo = new Date()
          daysAgo.setDate(daysAgo.getDate() - parseInt(dateFilter))
          params.append('dateFrom', daysAgo.toISOString())
        }

        const response = await fetch(`/api/sales-orders?${params}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to load sales orders')
        }

        const data = await response.json()
        // Handle different response formats
        const ordersArray = Array.isArray(data) ? data : (data.data || data.orders || [])
        setOrders(ordersArray)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales orders')
        console.error('Error fetching sales orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [statusFilter, dateFilter])

  // Ensure orders is always an array
  const safeOrders = Array.isArray(orders) ? orders : []

  // Filter orders by search
  const filteredOrders = safeOrders.filter(order => {
    if (!search) return true
    
    const searchLower = search.toLowerCase()
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      (order.salesCase?.customer?.name?.toLowerCase().includes(searchLower) || false) ||
      (order.salesCase?.caseNumber?.toLowerCase().includes(searchLower) || false) ||
      (order.customerPO?.toLowerCase().includes(searchLower) || false)
    )
  })

  // Calculate statistics
  const stats = {
    total: safeOrders.length,
    approved: safeOrders.filter(o => o.status === 'APPROVED').length,
    processing: safeOrders.filter(o => o.status === 'PROCESSING').length,
    delivered: safeOrders.filter(o => o.status === 'DELIVERED').length,
    totalValue: safeOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  }

  const getStatusIcon = (status: SalesOrder['status']) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />
      case 'PROCESSING': return <Package className="h-4 w-4" />
      case 'SHIPPED': return <Package className="h-4 w-4" />
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />
      case 'INVOICED': return <CheckCircle className="h-4 w-4" />
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />
      case 'CANCELLED': return <XCircle className="h-4 w-4" />
      case 'ON_HOLD': return <AlertCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: SalesOrder['status']) => {
    const statusConfig = {
      PENDING: { text: 'Pending', variant: 'secondary' as const },
      APPROVED: { text: 'Approved', variant: 'primary' as const },
      PROCESSING: { text: 'Processing', variant: 'warning' as const },
      SHIPPED: { text: 'Shipped', variant: 'info' as const },
      DELIVERED: { text: 'Delivered', variant: 'success' as const },
      INVOICED: { text: 'Invoiced', variant: 'info' as const },
      COMPLETED: { text: 'Completed', variant: 'success' as const },
      CANCELLED: { text: 'Cancelled', variant: 'error' as const },
      ON_HOLD: { text: 'On Hold', variant: 'warning' as const }
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { text: status, variant: 'secondary' as const }
    return (
      <Badge variant={config.variant} size="sm" className="gap-1">
        {getStatusIcon(status)}
        {config.text}
      </Badge>
    )
  }

  // formatCurrency function removed - use useCurrency hook instead

  const formatDate = (date: string | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading sales orders...</Text>
        </VStack>
      </PageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <XCircle className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Heading as="h3">Error loading sales orders</Heading>
            <Text color="secondary">{error}</Text>
          </VStack>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader
          title="Sales Orders"
          description="Manage and track customer orders"
          centered={false}
          actions={
            <div className="flex gap-2">
              <ExportButton 
                dataType="sales-orders" 
                defaultFilters={{
                  status: statusFilter === 'all' ? undefined : statusFilter
                }}
              />
              <Button
                variant="primary"
                leftIcon={<Plus />}
                onClick={() => window.location.href = '/sales-orders/new'}
              >
                New Order
              </Button>
            </div>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={3} gap="lg">
          <Card variant="elevated" padding="lg">
            <CardContent>
              <HStack justify="between" align="center" className="mb-4">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Total Orders</Text>
                  <Text size="xl" weight="bold">{stats.total}</Text>
                </VStack>
                <div className="p-3 bg-[var(--color-neutral-100)] dark:bg-[var(--color-neutral-800)] rounded-[var(--radius-lg)]">
                  <Package className="h-6 w-6 text-[var(--color-neutral-600)]" />
                </div>
              </HStack>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardContent>
              <HStack justify="between" align="center" className="mb-4">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Approved</Text>
                  <Text size="xl" weight="bold">{stats.approved}</Text>
                </VStack>
                <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-[var(--radius-lg)]">
                  <CheckCircle className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                </div>
              </HStack>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardContent>
              <HStack justify="between" align="center" className="mb-4">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Processing</Text>
                  <Text size="xl" weight="bold">{stats.processing}</Text>
                </VStack>
                <div className="p-3 bg-[var(--color-semantic-warning-100)] dark:bg-[var(--color-semantic-warning-900)] rounded-[var(--radius-lg)]">
                  <Clock className="h-6 w-6 text-[var(--color-semantic-warning-600)]" />
                </div>
              </HStack>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardContent>
              <HStack justify="between" align="center" className="mb-4">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Delivered</Text>
                  <Text size="xl" weight="bold">{stats.delivered}</Text>
                </VStack>
                <div className="p-3 bg-[var(--color-semantic-success-100)] dark:bg-[var(--color-semantic-success-900)] rounded-[var(--radius-lg)]">
                  <CheckCircle className="h-6 w-6 text-[var(--color-semantic-success-600)]" />
                </div>
              </HStack>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardContent>
              <HStack justify="between" align="center" className="mb-4">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Total Value</Text>
                  <Text size="xl" weight="bold">{formatCurrency(stats.totalValue)}</Text>
                </VStack>
                <div className="p-3 bg-[var(--color-semantic-success-100)] dark:bg-[var(--color-semantic-success-900)] rounded-[var(--radius-lg)]">
                  <Package className="h-6 w-6 text-[var(--color-semantic-success-600)]" />
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
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search />}
                  fullWidth
                />
              </div>

              <div className="sm:w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'APPROVED', label: 'Approved' },
                    { value: 'PROCESSING', label: 'Processing' },
                    { value: 'SHIPPED', label: 'Shipped' },
                    { value: 'DELIVERED', label: 'Delivered' },
                    { value: 'INVOICED', label: 'Invoiced' },
                    { value: 'COMPLETED', label: 'Completed' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                    { value: 'ON_HOLD', label: 'On Hold' },
                  ]}
                  fullWidth
                />
              </div>

              <div className="sm:w-48">
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  options={[
                    { value: '7', label: 'Last 7 days' },
                    { value: '30', label: 'Last 30 days' },
                    { value: '90', label: 'Last 90 days' },
                    { value: 'all', label: 'All time' },
                  ]}
                  fullWidth
                />
              </div>
            </HStack>
          </CardContent>
          </Card>
        </PageSection>

        {/* Orders List */}
        <PageSection>
          <Card variant="elevated" className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <CardContent className="py-12">
              <VStack gap="lg" align="center">
                <Package className="h-12 w-12 text-[var(--color-neutral-400)]" />
                <VStack gap="sm" align="center">
                  <Heading as="h3" size="md">No sales orders</Heading>
                  <Text color="secondary">
                    {search || statusFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Get started by creating a new sales order'}
                  </Text>
                </VStack>
                {!search && statusFilter === 'all' && (
                  <Button
                    variant="primary"
                    leftIcon={<Plus />}
                    onClick={() => window.location.href = '/sales-orders/new'}
                  >
                    New Order
                  </Button>
                )}
              </VStack>
            </CardContent>
          ) : (
          <table className="min-w-full divide-y divide-[var(--border-primary)]">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Sales Case
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Customer PO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Promised Date
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--bg-primary)] divide-y divide-[var(--border-primary)]">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors duration-[var(--transition-fast)]"
                  onClick={() => window.location.href = `/sales-orders/${order.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{order.orderNumber}</div>
                    {order.quotation && (
                      <div className="text-xs text-[var(--text-tertiary)]">From {order.quotation.quotationNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--text-primary)]">{order.salesCase?.customer?.name || '-'}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{order.salesCase?.customer?.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--text-primary)]">{order.salesCase?.caseNumber || '-'}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{order.salesCase?.title || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {order.customerPO || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {formatDate(order.promisedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          </Card>
        </PageSection>
      </VStack>
    </PageLayout>
  )
}