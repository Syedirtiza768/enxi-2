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
  FileText, 
  Edit, 
  Send, 
  CheckCircle, 
  Download,
  Calendar,
  Building2,
  Package,
  DollarSign
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  supplier: {
    id: string
    name: string
    code: string
    email?: string
    phone?: string
    address?: string
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
      id: string
      name: string
      code: string
      unitOfMeasure: {
        symbol: string
      }
    }
    quantity: number
    unitPrice: number
    totalPrice: number
    notes?: string
  }>
  createdAt: string
  createdBy: string
}

export default function PurchaseOrderDetailPage() {
  
  const { formatCurrency } = useCurrency()
const params = useParams()
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchPurchaseOrder(params.id as string)
    }
  }, [params.id])

  const fetchPurchaseOrder = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient<PurchaseOrder>(`/api/purchase-orders/${id}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch purchase order')
      }
      
      if (response?.data) {
        setPurchaseOrder(response?.data)
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch purchase order')
    } finally {
      setLoading(false)
    }
  }

  const handleSendPO = async (): Promise<unknown> => {
    if (!purchaseOrder) return
    
    setActionLoading(true)
    try {
      const response = await apiClient<{ success: boolean }>(`/api/purchase-orders/${purchaseOrder.id}/send`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchPurchaseOrder(purchaseOrder.id)
      }
} catch (error) {
      console.error('Error:', error);
      setActionLoading(false)
    }
  }

  const handleApprovePO = async (): Promise<unknown> => {
    if (!purchaseOrder) return
    
    setActionLoading(true)
    try {
      const response = await apiClient<{ success: boolean }>(`/api/purchase-orders/${purchaseOrder.id}/approve`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchPurchaseOrder(purchaseOrder.id)
      }
} catch (error) {
      console.error('Error:', error);
      setActionLoading(false)
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
    } as const
    
    const { label, className } = config[status as keyof typeof config] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return <Badge className={className}>{label}</Badge>
  }

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading purchase order...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error || !purchaseOrder) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading purchase order</Text>
            <Text color="secondary">{error || 'Purchase order not found'}</Text>
          </VStack>
          <Button variant="primary" onClick={() => router.push('/purchase-orders')}>
            Back to Purchase Orders
          </Button>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title={`Purchase Order: ${purchaseOrder.orderNumber}`}
          description={`Order placed on ${new Date(purchaseOrder.orderDate).toLocaleDateString()}`}
          centered={false}
          actions={
            <HStack gap="md">
              <Button
                variant="outline"
                leftIcon={<ArrowLeft />}
                onClick={() => router.push('/purchase-orders')}
              >
                Back
              </Button>
              
              {purchaseOrder.status === 'DRAFT' && (
                <>
                  <Button
                    variant="outline"
                    leftIcon={<Edit />}
                    onClick={() => router.push(`/purchase-orders/${purchaseOrder.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<Send />}
                    onClick={handleSendPO}
                    disabled={actionLoading}
                  >
                    Send to Supplier
                  </Button>
                </>
              )}
              
              {purchaseOrder.status === 'SENT' && (
                <Button
                  variant="primary"
                  leftIcon={<CheckCircle />}
                  onClick={handleApprovePO}
                  disabled={actionLoading}
                >
                  Mark as Confirmed
                </Button>
              )}
              
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

        {/* Order Summary */}
        <VStack gap="lg">
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="lg">
                <HStack justify="between" align="center">
                  <Text size="lg" weight="semibold">Order Information</Text>
                  {getStatusBadge(purchaseOrder.status)}
                </HStack>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <VStack gap="sm">
                    <HStack gap="sm" align="center">
                      <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                      <Text size="sm" color="secondary">Supplier</Text>
                    </HStack>
                    <div>
                      <Text weight="medium">{purchaseOrder.supplier.name}</Text>
                      <Text size="sm" color="secondary">{purchaseOrder.supplier.code}</Text>
                    </div>
                  </VStack>

                  <VStack gap="sm">
                    <HStack gap="sm" align="center">
                      <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
                      <Text size="sm" color="secondary">Order Date</Text>
                    </HStack>
                    <Text weight="medium">
                      {new Date(purchaseOrder.orderDate).toLocaleDateString()}
                    </Text>
                  </VStack>

                  {purchaseOrder.expectedDeliveryDate && (
                    <VStack gap="sm">
                      <HStack gap="sm" align="center">
                        <Package className="h-4 w-4 text-[var(--text-secondary)]" />
                        <Text size="sm" color="secondary">Expected Delivery</Text>
                      </HStack>
                      <Text weight="medium">
                        {new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString()}
                      </Text>
                    </VStack>
                  )}

                  <VStack gap="sm">
                    <HStack gap="sm" align="center">
                      <DollarSign className="h-4 w-4 text-[var(--text-secondary)]" />
                      <Text size="sm" color="secondary">Total Amount</Text>
                    </HStack>
                    <Text size="lg" weight="bold" className="text-[var(--color-brand-primary-600)]">
                      ${purchaseOrder.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {purchaseOrder.currency}
                    </Text>
                  </VStack>
                </div>

                {/* Supplier Contact Information */}
                {(purchaseOrder.supplier.email || purchaseOrder.supplier.phone || purchaseOrder.supplier.address) && (
                  <div className="pt-4 border-t border-[var(--border-primary)]">
                    <Text size="sm" weight="medium" color="secondary" className="mb-2">Supplier Contact</Text>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {purchaseOrder.supplier.email && (
                        <Text>{purchaseOrder.supplier.email}</Text>
                      )}
                      {purchaseOrder.supplier.phone && (
                        <Text>{purchaseOrder.supplier.phone}</Text>
                      )}
                      {purchaseOrder.supplier.address && (
                        <Text>{purchaseOrder.supplier.address}</Text>
                      )}
                    </div>
                  </div>
                )}

                {purchaseOrder.notes && (
                  <div className="pt-4 border-t border-[var(--border-primary)]">
                    <Text size="sm" weight="medium" color="secondary" className="mb-2">Notes</Text>
                    <Text size="sm">{purchaseOrder.notes}</Text>
                  </div>
                )}
              </VStack>
            </CardContent>
          </Card>

          {/* Items */}
          <Card variant="elevated">
            <CardContent className="p-0">
              <div className="p-6 border-b border-[var(--border-primary)]">
                <Text size="lg" weight="semibold">Order Items</Text>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item.name}</div>
                          <div className="text-sm text-gray-500">{item.item.code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.item.unitOfMeasure.symbol}
                      </TableCell>
                      <TableCell className="text-right">
                        ${formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${formatCurrency(item.totalPrice)}
                      </TableCell>
                      <TableCell>
                        {item.notes || '-'}
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
                      <Text>Subtotal:</Text>
                      <Text weight="medium">${formatCurrency(purchaseOrder.subtotal)}</Text>
                    </HStack>
                    {purchaseOrder.taxAmount > 0 && (
                      <HStack justify="between">
                        <Text>Tax:</Text>
                        <Text weight="medium">${formatCurrency(purchaseOrder.taxAmount)}</Text>
                      </HStack>
                    )}
                    {purchaseOrder.shippingAmount > 0 && (
                      <HStack justify="between">
                        <Text>Shipping:</Text>
                        <Text weight="medium">${formatCurrency(purchaseOrder.shippingAmount)}</Text>
                      </HStack>
                    )}
                    <div className="pt-2 border-t border-[var(--border-primary)]">
                      <HStack justify="between">
                        <Text size="lg" weight="bold">Total:</Text>
                        <Text size="lg" weight="bold" className="text-[var(--color-brand-primary-600)]">
                          ${formatCurrency(purchaseOrder.totalAmount)} {purchaseOrder.currency}
                        </Text>
                      </HStack>
                    </div>
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