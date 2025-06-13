'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  VStack, 
  HStack, 
  Grid, 
  Button, 
  Text, 
  Badge 
} from '@/components/design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Package, 
  FileText, 
  Receipt,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface ThreeWayMatchingAnalysis {
  purchaseOrder: {
    id: string
    poNumber: string
    supplier: {
      id: string
      name: string
      code: string
    }
    totalAmount: number
    currency: string
    orderDate: string
    expectedDate?: string
  }
  goodsReceipts: Array<{
    id: string
    receiptNumber: string
    receivedDate: string
    status: string
    items: Array<{
      id: string
      itemId: string
      item: {
        code: string
        name: string
      }
      quantityReceived: number
      unitCost: number
      totalCost: number
      qualityStatus: string
    }>
  }>
  supplierInvoices: Array<{
    id: string
    invoiceNumber: string
    invoiceDate: string
    status: string
    matchingStatus: string
    totalAmount: number
    items: Array<{
      id: string
      description: string
      quantity: number
      unitPrice: number
      totalAmount: number
    }>
  }>
  discrepancies: Array<{
    id: string
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    item: {
      id: string
      code: string
      name: string
    }
    description: string
    expectedQuantity?: number
    actualQuantity?: number
    expectedPrice?: number
    actualPrice?: number
    variance?: number
    variancePercentage?: number
    requiresApproval: boolean
  }>
  summary: {
    totalItems: number
    fullyMatched: number
    partiallyMatched: number
    overMatched: number
    underMatched: number
    pendingReview: number
    matchingStatus: string
  }
  analysisDate: string
}

interface ThreeWayMatchingDetailProps {
  purchaseOrderId: string
}

export function ThreeWayMatchingDetail({ purchaseOrderId }: ThreeWayMatchingDetailProps) {
  const { formatCurrency } = useCurrency()
  const [analysis, setAnalysis] = useState<ThreeWayMatchingAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient(`/api/three-way-matching/analyze/${purchaseOrderId}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch three-way matching analysis')
      }

      setAnalysis(response.data)
    } catch (error) {
      console.error('Error fetching analysis:', error)
    } finally {
      setLoading(false)
    }
  }, [purchaseOrderId])

  useEffect(() => {
    if (purchaseOrderId) {
      fetchAnalysis()
    }
  }, [purchaseOrderId, fetchAnalysis])

  const getMatchingStatusBadge = (status: string) => {
    const config = {
      FULLY_MATCHED: { label: 'Fully Matched', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      PARTIALLY_MATCHED: { label: 'Partially Matched', className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      OVER_MATCHED: { label: 'Over Matched', className: 'bg-red-100 text-red-800', icon: <TrendingUp className="h-3 w-3" /> },
      UNDER_MATCHED: { label: 'Under Matched', className: 'bg-orange-100 text-orange-800', icon: <TrendingDown className="h-3 w-3" /> },
      PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      APPROVED_WITH_VARIANCE: { label: 'Approved with Variance', className: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> }
    }
    
    const { label, className, icon } = config[status as keyof typeof config] || { 
      label: status, 
      className: 'bg-gray-100 text-gray-800',
      icon: <Minus className="h-3 w-3" />
    }
    
    return (
      <Badge className={`${className} gap-1`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const getSeverityBadge = (severity: string) => {
    const config = {
      HIGH: { className: 'bg-red-100 text-red-800' },
      MEDIUM: { className: 'bg-yellow-100 text-yellow-800' },
      LOW: { className: 'bg-green-100 text-green-800' }
    }
    
    const { className } = config[severity as keyof typeof config] || { className: 'bg-gray-100 text-gray-800' }
    return <Badge className={className}>{severity}</Badge>
  }

  const getDiscrepancyIcon = (type: string) => {
    const icons = {
      QUANTITY_OVER_MATCH: <TrendingUp className="h-4 w-4 text-red-600" />,
      QUANTITY_UNDER_MATCH: <TrendingDown className="h-4 w-4 text-orange-600" />,
      PRICE_VARIANCE: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      MISSING_GOODS_RECEIPT: <Package className="h-4 w-4 text-red-600" />,
      MISSING_INVOICE: <FileText className="h-4 w-4 text-blue-600" />
    }
    return icons[type as keyof typeof icons] || <AlertTriangle className="h-4 w-4 text-gray-600" />
  }

  const getQualityBadge = (status: string) => {
    const config = {
      ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
      PARTIALLY_ACCEPTED: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800' }
    }
    
    const { label, className } = config[status as keyof typeof config] || { 
      label: status, 
      className: 'bg-gray-100 text-gray-800' 
    }
    
    return <Badge className={className}>{label}</Badge>
  }

  if (loading) {
    return (
      <VStack gap="lg" align="center" className="py-12">
        <Package className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
        <Text color="secondary">Analyzing three-way matching...</Text>
      </VStack>
    )
  }

  if (error || !analysis) {
    return (
      <VStack gap="lg" align="center" className="py-12">
        <AlertTriangle className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
        <VStack gap="sm" align="center">
          <Text size="lg" weight="semibold">Analysis failed</Text>
          <Text color="secondary">{error || 'Unable to perform three-way matching analysis'}</Text>
        </VStack>
        <Button variant="primary" onClick={fetchAnalysis}>
          Retry Analysis
        </Button>
      </VStack>
    )
  }

  return (
    <VStack gap="xl">
      {/* Header */}
      <VStack gap="sm">
        <HStack justify="between" align="center">
          <Text size="2xl" weight="bold">
            Three-Way Matching: {analysis.purchaseOrder.poNumber}
          </Text>
          {getMatchingStatusBadge(analysis.summary.matchingStatus)}
        </HStack>
        <Text color="secondary">
          Analysis performed on {new Date(analysis.analysisDate).toLocaleString()}
        </Text>
      </VStack>

      {/* Purchase Order Overview */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Grid cols={4} gap="lg">
            <VStack gap="xs">
              <Text size="sm" weight="medium" color="secondary">Supplier</Text>
              <Text weight="semibold">{analysis.purchaseOrder.supplier.name}</Text>
              <Text size="sm" color="secondary">{analysis.purchaseOrder.supplier.code}</Text>
            </VStack>
            <VStack gap="xs">
              <Text size="sm" weight="medium" color="secondary">Order Date</Text>
              <Text>{new Date(analysis.purchaseOrder.orderDate).toLocaleDateString()}</Text>
            </VStack>
            <VStack gap="xs">
              <Text size="sm" weight="medium" color="secondary">Expected Date</Text>
              <Text>
                {analysis.purchaseOrder.expectedDate 
                  ? new Date(analysis.purchaseOrder.expectedDate).toLocaleDateString()
                  : 'Not specified'
                }
              </Text>
            </VStack>
            <VStack gap="xs">
              <Text size="sm" weight="medium" color="secondary">Total Amount</Text>
              <Text weight="semibold">
                {formatCurrency(analysis.purchaseOrder.totalAmount)} {analysis.purchaseOrder.currency}
              </Text>
            </VStack>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Grid cols={4} gap="lg">
        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Text size="sm" weight="medium" color="secondary">Fully Matched</Text>
              </HStack>
              <Text size="2xl" weight="bold">{analysis.summary.fullyMatched}</Text>
              <Text size="sm" color="secondary">of {analysis.summary.totalItems} items</Text>
            </VStack>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <TrendingUp className="h-5 w-5 text-red-600" />
                <Text size="sm" weight="medium" color="secondary">Over Matched</Text>
              </HStack>
              <Text size="2xl" weight="bold">{analysis.summary.overMatched}</Text>
            </VStack>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <Text size="sm" weight="medium" color="secondary">Under Matched</Text>
              </HStack>
              <Text size="2xl" weight="bold">{analysis.summary.underMatched}</Text>
            </VStack>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <Text size="sm" weight="medium" color="secondary">Pending Review</Text>
              </HStack>
              <Text size="2xl" weight="bold">{analysis.summary.pendingReview}</Text>
            </VStack>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Analysis */}
      <Tabs defaultValue="discrepancies" className="w-full">
        <TabsList>
          <TabsTrigger value="discrepancies">
            Discrepancies ({analysis.discrepancies.length})
          </TabsTrigger>
          <TabsTrigger value="goods-receipts">
            Goods Receipts ({analysis.goodsReceipts.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({analysis.supplierInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discrepancies">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Matching Discrepancies</CardTitle>
            </CardHeader>
            {analysis.discrepancies.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No discrepancies found</Text>
                    <Text color="secondary">All documents match perfectly</Text>
                  </VStack>
                </VStack>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Approval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.discrepancies.map((discrepancy) => (
                    <TableRow key={discrepancy.id}>
                      <TableCell>
                        <HStack gap="sm" align="center">
                          {getDiscrepancyIcon(discrepancy.type)}
                          <Text size="sm">{discrepancy.type.replace(/_/g, ' ')}</Text>
                        </HStack>
                      </TableCell>
                      <TableCell>
                        <VStack gap="xs">
                          <Text weight="medium">{discrepancy.item.name}</Text>
                          <Text size="sm" color="secondary">{discrepancy.item.code}</Text>
                        </VStack>
                      </TableCell>
                      <TableCell>{getSeverityBadge(discrepancy.severity)}</TableCell>
                      <TableCell>
                        {discrepancy.expectedQuantity && (
                          <Text>{discrepancy.expectedQuantity}</Text>
                        )}
                        {discrepancy.expectedPrice && (
                          <Text>{formatCurrency(discrepancy.expectedPrice)}</Text>
                        )}
                      </TableCell>
                      <TableCell>
                        {discrepancy.actualQuantity && (
                          <Text>{discrepancy.actualQuantity}</Text>
                        )}
                        {discrepancy.actualPrice && (
                          <Text>{formatCurrency(discrepancy.actualPrice)}</Text>
                        )}
                      </TableCell>
                      <TableCell>
                        {discrepancy.variance && discrepancy.variancePercentage && (
                          <VStack gap="xs">
                            <Text weight="medium">
                              {discrepancy.variance > 0 ? '+' : ''}{discrepancy.variance.toFixed(2)}
                            </Text>
                            <Text size="sm" color="secondary">
                              ({discrepancy.variancePercentage.toFixed(1)}%)
                            </Text>
                          </VStack>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate" title={discrepancy.description}>
                          {discrepancy.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {discrepancy.requiresApproval ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Required</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Not Required</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="goods-receipts">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Goods Receipts
              </CardTitle>
            </CardHeader>
            {analysis.goodsReceipts.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <Package className="h-12 w-12 text-gray-400" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No goods receipts found</Text>
                    <Text color="secondary">Items have not been received yet</Text>
                  </VStack>
                </VStack>
              </CardContent>
            ) : (
              <VStack gap="lg">
                {analysis.goodsReceipts.map((receipt) => (
                  <Card key={receipt.id} variant="outlined">
                    <CardHeader>
                      <HStack justify="between" align="center">
                        <VStack gap="xs">
                          <Text weight="semibold">{receipt.receiptNumber}</Text>
                          <Text size="sm" color="secondary">
                            Received: {new Date(receipt.receivedDate).toLocaleDateString()}
                          </Text>
                        </VStack>
                        <Badge className="bg-green-100 text-green-800">{receipt.status}</Badge>
                      </HStack>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Quantity Received</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Quality Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receipt.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <VStack gap="xs">
                                  <Text weight="medium">{item.item.name}</Text>
                                  <Text size="sm" color="secondary">{item.item.code}</Text>
                                </VStack>
                              </TableCell>
                              <TableCell>{item.quantityReceived}</TableCell>
                              <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                              <TableCell>{formatCurrency(item.totalCost)}</TableCell>
                              <TableCell>{getQualityBadge(item.qualityStatus)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </VStack>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Supplier Invoices
              </CardTitle>
            </CardHeader>
            {analysis.supplierInvoices.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <Receipt className="h-12 w-12 text-gray-400" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No invoices found</Text>
                    <Text color="secondary">Supplier has not submitted invoices yet</Text>
                  </VStack>
                </VStack>
              </CardContent>
            ) : (
              <VStack gap="lg">
                {analysis.supplierInvoices.map((invoice) => (
                  <Card key={invoice.id} variant="outlined">
                    <CardHeader>
                      <HStack justify="between" align="center">
                        <VStack gap="xs">
                          <Text weight="semibold">{invoice.invoiceNumber}</Text>
                          <Text size="sm" color="secondary">
                            Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </Text>
                        </VStack>
                        <HStack gap="sm" align="center">
                          <Badge className="bg-blue-100 text-blue-800">{invoice.status}</Badge>
                          {getMatchingStatusBadge(invoice.matchingStatus)}
                        </HStack>
                      </HStack>
                    </CardHeader>
                    <CardContent>
                      <VStack gap="lg">
                        <HStack justify="between" align="center">
                          <Text size="sm" color="secondary">Invoice Total</Text>
                          <Text size="lg" weight="bold">
                            {formatCurrency(invoice.totalAmount)}
                          </Text>
                        </HStack>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Total Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </VStack>
                    </CardContent>
                  </Card>
                ))}
              </VStack>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </VStack>
  )
}