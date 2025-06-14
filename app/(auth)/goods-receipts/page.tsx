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
  Package, 
  Calendar, 
  CheckCircle,
  Clock,
  Eye,
  FileText,
  TrendingDown
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface GoodsReceipt {
  id: string
  receiptNumber: string
  purchaseOrderId: string
  purchaseOrder: {
    orderNumber: string
    supplier: {
      name: string
      code: string
    }
  }
  receivedDate: string
  receivedBy: string
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED'
  totalReceived: number
  currency: string
  items: Array<{
    id: string
    quantityReceived: number
    quantityRejected: number
    qualityStatus: 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED'
    item: {
      name: string
      code: string
    }
  }>
  notes?: string
  createdAt: string
  createdBy: string
}

interface GoodsReceiptStats {
  totalReceipts: number
  pendingReceipts: number
  totalValue: number
  rejectedItems: number
}

export default function GoodsReceiptsPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([])
  const [stats, setStats] = useState<GoodsReceiptStats>({
    totalReceipts: 0,
    pendingReceipts: 0,
    totalValue: 0,
    rejectedItems: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchGoodsReceipts()
  }, [])

  const fetchGoodsReceipts = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient<{ data: GoodsReceipt[] }>('/api/goods-receipts', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch goods receipts')
      }
      
      const data = response.data?.data || []
      setGoodsReceipts(data)
      
      // Calculate stats
      const stats = {
        totalReceipts: data.length,
        pendingReceipts: data.filter((gr: GoodsReceipt) => gr.status === 'PENDING').length,
        totalValue: data.reduce((sum: number, gr: GoodsReceipt) => sum + gr.totalReceived, 0),
        rejectedItems: data.reduce((sum: number, gr: GoodsReceipt) => 
          sum + gr.items.reduce((itemSum, item) => itemSum + item.quantityRejected, 0), 0)
      }
      setStats(stats)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: GoodsReceipt['status']) => {
    const config = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      RECEIVED: { label: 'Received', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    } as const
    
    const { label, className } = config[status as keyof typeof config] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return <Badge className={className}>{label}</Badge>
  }

  const getQualityBadge = (qualityStatus: string, rejectedQty: number) => {
    if (qualityStatus === 'REJECTED' || rejectedQty > 0) {
      return <Badge className="bg-red-100 text-red-800">Quality Issues</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
  }

  const filteredGoodsReceipts = Array.isArray(goodsReceipts) ? goodsReceipts.filter(gr => {
    const matchesSearch = search === '' || 
      gr.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      gr.purchaseOrder?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      gr.purchaseOrder?.supplier?.name?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || gr.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) : []

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading goods receipts...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading goods receipts</Text>
            <Text color="secondary">{error}</Text>
          </VStack>
          <Button variant="primary" onClick={fetchGoodsReceipts}>
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
          title="Goods Receipts"
          description="Track and manage incoming shipments from suppliers"
          centered={false}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus />}
              onClick={() => router.push('/goods-receipts/new')}
            >
              New Receipt
            </Button>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={4} gap="lg">
            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Receipts</Text>
                    <Text size="xl" weight="bold">{stats.totalReceipts}</Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-lg">
                    <Package className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Pending Receipts</Text>
                    <Text size="xl" weight="bold">{stats.pendingReceipts}</Text>
                  </VStack>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Value</Text>
                    <Text size="xl" weight="bold">
                      ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Rejected Items</Text>
                    <Text size="xl" weight="bold">{stats.rejectedItems}</Text>
                  </VStack>
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>
          </Grid>
        </PageSection>

        {/* Filters */}
        <PageSection>
          <Card>
            <CardContent>
              <HStack gap="md" className="flex-col sm:flex-row">
                <div className="flex-1">
                  <Input
                    placeholder="Search by receipt number, PO number, or supplier..."
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
                  <option value="PENDING">Pending</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </HStack>
            </CardContent>
          </Card>
        </PageSection>

        {/* Goods Receipts Table */}
        <PageSection>
          <Card className="overflow-x-auto">
            <CardHeader>
              <CardTitle>Goods Receipts ({filteredGoodsReceipts.length})</CardTitle>
            </CardHeader>
            {filteredGoodsReceipts.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <Package className="h-12 w-12 text-[var(--color-neutral-400)]" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No goods receipts found</Text>
                    <Text color="secondary">
                      {search || statusFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Create your first goods receipt to get started'}
                    </Text>
                  </VStack>
                  {!search && statusFilter === 'all' && (
                    <Button
                      variant="primary"
                      leftIcon={<Plus />}
                      onClick={() => router.push('/goods-receipts/new')}
                    >
                      New Receipt
                    </Button>
                  )}
                </VStack>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Quality Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoodsReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receipt.purchaseOrder.orderNumber}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {receipt.items.length} item(s)
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receipt.purchaseOrder.supplier.name}</div>
                          <div className="text-sm text-gray-500">{receipt.purchaseOrder.supplier.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(receipt.receivedDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${receipt.totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-500">{receipt.currency || 'USD'}</div>
                      </TableCell>
                      <TableCell>
                        {getQualityBadge(
                          receipt.items[0]?.qualityStatus || 'ACCEPTED',
                          receipt.items.reduce((sum, item) => sum + item.quantityRejected, 0)
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell>
                        <HStack gap="xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/goods-receipts/${receipt.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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