'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  PageLayout, 
  PageHeader, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Badge,
  Card,
  CardContent
} from '@/components/design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  Building2,
  FileText,
  User,
  CheckCircle,
  AlertTriangle,
  Download
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
      email?: string
      phone?: string
    }
    orderDate: string
    expectedDeliveryDate?: string
  }
  receivedDate: string
  receivedBy: string
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED'
  totalReceived: number
  currency: string
  items: Array<{
    id: string
    purchaseOrderItemId: string
    item: {
      id: string
      name: string
      code: string
      unitOfMeasure: {
        symbol: string
      }
    }
    orderedQuantity: number
    quantityReceived: number
    quantityRejected: number
    unitCost: number
    qualityStatus: 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED'
    rejectionReason?: string
    notes?: string
  }>
  notes?: string
  createdAt: string
  createdBy: string
}

export default function GoodsReceiptDetailPage() {
  const params = useParams()
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [goodsReceipt, setGoodsReceipt] = useState<GoodsReceipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchGoodsReceipt(params.id as string)
    }
  }, [params.id])

  const fetchGoodsReceipt = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient(`/api/goods-receipts/${id}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch goods receipt')
      }
      
      setGoodsReceipt(response.data)
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
    }
    
    const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return <Badge className={className}>{label}</Badge>
  }

  const getQualityBadge = (status: string) => {
    const config = {
      ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      PARTIALLY_ACCEPTED: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-3 w-3" /> }
    }
    
    const { label, className, icon } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800', icon: null }
    
    return (
      <Badge className={`${className} gap-1`}>
        {icon}
        {label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading goods receipt...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error || !goodsReceipt) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading goods receipt</Text>
            <Text color="secondary">{error || 'Goods receipt not found'}</Text>
          </VStack>
          <Button variant="primary" onClick={() => router.push('/goods-receipts')}>
            Back to Goods Receipts
          </Button>
        </VStack>
      </PageLayout>
    )
  }

  const totalRejected = goodsReceipt.items.reduce((sum, item) => sum + item.quantityRejected, 0)
  const hasQualityIssues = totalRejected > 0

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title={`Goods Receipt: ${goodsReceipt.receiptNumber}`}
          description={`Received on ${new Date(goodsReceipt.receivedDate).toLocaleDateString()}`}
          centered={false}
          actions={
            <HStack gap="md">
              <Button
                variant="outline"
                leftIcon={<ArrowLeft />}
                onClick={() => router.push('/goods-receipts')}
              >
                Back
              </Button>
              
              <Button
                variant="outline"
                leftIcon={<Download />}
                onClick={() => window.print()}
              >
                Print
              </Button>
            </HStack>
          }
        />

        {/* Receipt Summary */}
        <VStack gap="lg">
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="lg">
                <HStack justify="between" align="center">
                  <Text size="lg" weight="semibold">Receipt Information</Text>
                  {getStatusBadge(goodsReceipt.status)}
                </HStack>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <VStack gap="sm">
                    <HStack gap="sm" align="center">
                      <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
                      <Text size="sm" color="secondary">Purchase Order</Text>
                    </HStack>
                    <div>
                      <Text weight="medium">{goodsReceipt.purchaseOrder.orderNumber}</Text>
                      <Text size="sm" color="secondary">
                        Order Date: {new Date(goodsReceipt.purchaseOrder.orderDate).toLocaleDateString()}
                      </Text>
                    </div>
                  </VStack>

                  <VStack gap="sm">
                    <HStack gap="sm" align="center">
                      <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                      <Text size="sm" color="secondary">Supplier</Text>
                    </HStack>
                    <div>
                      <Text weight="medium">{goodsReceipt.purchaseOrder.supplier.name}</Text>
                      <Text size="sm" color="secondary">{goodsReceipt.purchaseOrder.supplier.code}</Text>
                    </div>
                  </VStack>

                  <VStack gap="sm">
                    <HStack gap="sm" align="center">
                      <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
                      <Text size="sm" color="secondary">Received Date</Text>
                    </HStack>
                    <Text weight="medium">
                      {new Date(goodsReceipt.receivedDate).toLocaleDateString()}
                    </Text>
                  </VStack>

                  <VStack gap="sm">
                    <HStack gap="sm" align="center">
                      <User className="h-4 w-4 text-[var(--text-secondary)]" />
                      <Text size="sm" color="secondary">Received By</Text>
                    </HStack>
                    <Text weight="medium">{goodsReceipt.receivedBy}</Text>
                  </VStack>
                </div>

                {/* Quality Issues Alert */}
                {hasQualityIssues && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <HStack gap="sm" align="center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <Text weight="medium" className="text-yellow-800 dark:text-yellow-200">
                          Quality Issues Detected
                        </Text>
                        <Text size="sm" className="text-yellow-700 dark:text-yellow-300">
                          {totalRejected} item(s) were rejected during receipt
                        </Text>
                      </div>
                    </HStack>
                  </div>
                )}

                {/* Contact Information */}
                {(goodsReceipt.purchaseOrder.supplier.email || goodsReceipt.purchaseOrder.supplier.phone) && (
                  <div className="pt-4 border-t border-[var(--border-primary)]">
                    <Text size="sm" weight="medium" color="secondary" className="mb-2">Supplier Contact</Text>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {goodsReceipt.purchaseOrder.supplier.email && (
                        <Text>{goodsReceipt.purchaseOrder.supplier.email}</Text>
                      )}
                      {goodsReceipt.purchaseOrder.supplier.phone && (
                        <Text>{goodsReceipt.purchaseOrder.supplier.phone}</Text>
                      )}
                    </div>
                  </div>
                )}

                {goodsReceipt.notes && (
                  <div className="pt-4 border-t border-[var(--border-primary)]">
                    <Text size="sm" weight="medium" color="secondary" className="mb-2">Notes</Text>
                    <Text size="sm">{goodsReceipt.notes}</Text>
                  </div>
                )}
              </VStack>
            </CardContent>
          </Card>

          {/* Received Items */}
          <Card variant="elevated">
            <CardContent className="p-0">
              <div className="p-6 border-b border-[var(--border-primary)]">
                <Text size="lg" weight="semibold">Received Items</Text>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Quality Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goodsReceipt.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item.name}</div>
                          <div className="text-sm text-gray-500">{item.item.code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.orderedQuantity} {item.item.unitOfMeasure.symbol}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-green-600">
                          {item.quantityReceived} {item.item.unitOfMeasure.symbol}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantityRejected > 0 ? (
                          <div className="font-medium text-red-600">
                            {item.quantityRejected} {item.item.unitOfMeasure.symbol}
                          </div>
                        ) : (
                          <div className="text-gray-400">0</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(item.quantityReceived * item.unitCost).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getQualityBadge(item.qualityStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {item.rejectionReason && (
                            <div className="text-sm text-red-600 mb-1">
                              <strong>Rejection:</strong> {item.rejectionReason}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-sm text-gray-600">{item.notes}</div>
                          )}
                          {!item.rejectionReason && !item.notes && '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="p-6 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="max-w-md ml-auto">
                  <VStack gap="sm">
                    <HStack justify="between">
                      <Text>Total Received Value:</Text>
                      <Text size="lg" weight="bold" className="text-[var(--color-brand-primary-600)]">
                        ${goodsReceipt.totalReceived.toFixed(2)} {goodsReceipt.currency}
                      </Text>
                    </HStack>
                    
                    {hasQualityIssues && (
                      <HStack justify="between" className="text-red-600">
                        <Text size="sm">Items with Issues:</Text>
                        <Text size="sm" weight="medium">{totalRejected} items</Text>
                      </HStack>
                    )}
                  </VStack>
                </div>
              </div>
            </CardContent>
          </Card>
        </VStack>
      </VStack>
    </PageLayout>
  )
}