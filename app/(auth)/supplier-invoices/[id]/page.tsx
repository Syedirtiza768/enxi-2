'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  PageLayout,
  PageHeader,
  VStack,
  HStack,
  Grid,
  Button,
  Text,
  Badge
} from '@/components/design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface SupplierInvoice {
  id: string
  invoiceNumber: string
  supplierId: string
  supplier: {
    name: string
    code: string
    supplierNumber: string
    email?: string
    phone?: string
    address?: string
  }
  invoiceDate: string
  dueDate: string
  status: 'DRAFT' | 'POSTED' | 'CANCELLED'
  matchingStatus: 'FULLY_MATCHED' | 'PARTIALLY_MATCHED' | 'OVER_MATCHED' | 'UNDER_MATCHED' | 'PENDING'
  subtotal: number
  taxAmount: number
  totalAmount: number
  currency: string
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalAmount: number
    taxAmount: number
    account: {
      accountNumber: string
      accountName: string
    }
    goodsReceiptItem: {
      id: string
      goodsReceipt: {
        receiptNumber: string
        receivedDate: string
      }
      item: {
        name: string
        code: string
        unitOfMeasure: {
          symbol: string
        }
      }
    }
  }>
  taxAccount?: {
    accountNumber: string
    accountName: string
  }
  notes?: string
  createdAt: string
  createdBy: string
  createdByUser: {
    name: string
    email: string
  }
}

export default function SupplierInvoiceDetailPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInvoice = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient(`/api/supplier-invoices/${invoiceId}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error(response.data?.error || 'Failed to fetch supplier invoice')
      }
      
      setInvoice(response.data)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const handlePostInvoice = async () => {
    if (!invoice || invoice.status !== 'DRAFT') return

    setActionLoading('post')
    try {
      const response = await apiClient(`/api/supplier-invoices/${invoice.id}/post`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(response.data?.error || 'Failed to post invoice')
      }
      
      await fetchInvoice() // Refresh invoice data
} catch (error) {
      console.error('Error:', error);
      setActionLoading(null)
    }
  }

  const handleCancelInvoice = async () => {
    if (!invoice || invoice.status === 'CANCELLED') return

    if (!confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) {
      return
    }

    setActionLoading('cancel')
    try {
      const response = await apiClient(`/api/supplier-invoices/${invoice.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(response.data?.error || 'Failed to cancel invoice')
      }
      
      await fetchInvoice() // Refresh invoice data
} catch (error) {
      console.error('Error:', error);
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: SupplierInvoice['status']) => {
    const config = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      POSTED: { label: 'Posted', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    }
    
    const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return <Badge className={className}>{label}</Badge>
  }

  const getMatchingBadge = (matchingStatus: SupplierInvoice['matchingStatus']) => {
    const config = {
      FULLY_MATCHED: { label: 'Fully Matched', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      PARTIALLY_MATCHED: { label: 'Partial Match', className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      OVER_MATCHED: { label: 'Over Matched', className: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      UNDER_MATCHED: { label: 'Under Matched', className: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="h-3 w-3" /> },
      PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> }
    }
    
    const { label, className, icon } = config[matchingStatus] || { 
      label: matchingStatus, 
      className: 'bg-gray-100 text-gray-800',
      icon: <Clock className="h-3 w-3" />
    }
    
    return (
      <Badge className={`${className} gap-1`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const getDueDateStatus = (dueDate: string, status: string) => {
    if (status !== 'POSTED') return null
    
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return <Badge className="bg-red-100 text-red-800">Overdue ({Math.abs(diffDays)} days)</Badge>
    } else if (diffDays <= 7) {
      return <Badge className="bg-yellow-100 text-yellow-800">Due Soon ({diffDays} days)</Badge>
    }
    return null
  }

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading supplier invoice...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error || !invoice) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading supplier invoice</Text>
            <Text color="secondary">{error || 'Supplier invoice not found'}</Text>
          </VStack>
          <Button variant="primary" onClick={() => router.push('/supplier-invoices')}>
            Back to Invoices
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
          title={`Invoice ${invoice.invoiceNumber}`}
          description={`Supplier invoice from ${invoice.supplier.name}`}
          centered={false}
          actions={
            <HStack gap="sm">
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft />}
                onClick={() => router.push('/supplier-invoices')}
              >
                Back to Invoices
              </Button>
              
              {invoice.status === 'DRAFT' && (
                <>
                  <Button
                    variant="ghost"
                    leftIcon={<Edit />}
                    onClick={() => router.push(`/supplier-invoices/${invoice.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handlePostInvoice}
                    loading={actionLoading === 'post'}
                    disabled={!!actionLoading}
                  >
                    Post Invoice
                  </Button>
                </>
              )}
              
              {invoice.status !== 'CANCELLED' && (
                <Button
                  variant="ghost"
                  onClick={handleCancelInvoice}
                  loading={actionLoading === 'cancel'}
                  disabled={!!actionLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
            </HStack>
          }
        />

        {error && (
          <Card variant="outlined" className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <HStack gap="sm" align="center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <Text color="error">{error}</Text>
              </HStack>
            </CardContent>
          </Card>
        )}

        {/* Invoice Overview */}
        <Grid cols={4} gap="lg">
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <FileText className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Status</Text>
                </HStack>
                <VStack gap="xs">
                  {getStatusBadge(invoice.status)}
                  {getDueDateStatus(invoice.dueDate, invoice.status)}
                </VStack>
              </VStack>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <CheckCircle className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Matching Status</Text>
                </HStack>
                {getMatchingBadge(invoice.matchingStatus)}
              </VStack>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <Calendar className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Due Date</Text>
                </HStack>
                <Text weight="semibold">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </Text>
              </VStack>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <DollarSign className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Total Amount</Text>
                </HStack>
                <Text size="xl" weight="bold">
                  ${invoice.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {invoice.currency}
                </Text>
              </VStack>
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Details */}
        <Grid cols={2} gap="lg">
          {/* Supplier Information */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VStack gap="md">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Supplier</Text>
                  <Text weight="semibold">{invoice.supplier.name}</Text>
                  <Text size="sm" color="secondary">{invoice.supplier.code} | {invoice.supplier.supplierNumber}</Text>
                </VStack>
                
                {invoice.supplier.email && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Email</Text>
                    <Text>{invoice.supplier.email}</Text>
                  </VStack>
                )}
                
                {invoice.supplier.phone && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Phone</Text>
                    <Text>{invoice.supplier.phone}</Text>
                  </VStack>
                )}
                
                {invoice.supplier.address && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Address</Text>
                    <Text>{invoice.supplier.address}</Text>
                  </VStack>
                )}
              </VStack>
            </CardContent>
          </Card>

          {/* Invoice Information */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VStack gap="md">
                <Grid cols={2} gap="md">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Invoice Date</Text>
                    <Text>{new Date(invoice.invoiceDate).toLocaleDateString()}</Text>
                  </VStack>
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Due Date</Text>
                    <Text>{new Date(invoice.dueDate).toLocaleDateString()}</Text>
                  </VStack>
                </Grid>
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Currency</Text>
                  <Text>{invoice.currency}</Text>
                </VStack>
                
                {invoice.taxAccount && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Tax Account</Text>
                    <Text>{invoice.taxAccount.accountNumber} - {invoice.taxAccount.accountName}</Text>
                  </VStack>
                )}
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Created By</Text>
                  <Text>{invoice.createdByUser.name}</Text>
                  <Text size="sm" color="secondary">
                    {new Date(invoice.createdAt).toLocaleDateString()} at {new Date(invoice.createdAt).toLocaleTimeString()}
                  </Text>
                </VStack>
              </VStack>
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Items */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Goods Receipt</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax Amount</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <VStack gap="xs">
                        <Text weight="medium">{item.description}</Text>
                        <Text size="sm" color="secondary">
                          {item.goodsReceiptItem.item.code} | {item.goodsReceiptItem.item.name}
                        </Text>
                      </VStack>
                    </TableCell>
                    <TableCell>
                      <VStack gap="xs">
                        <Text size="sm" weight="medium">{item.goodsReceiptItem.goodsReceipt.receiptNumber}</Text>
                        <Text size="sm" color="secondary">
                          {new Date(item.goodsReceiptItem.goodsReceipt.receivedDate).toLocaleDateString()}
                        </Text>
                      </VStack>
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.goodsReceiptItem.item.unitOfMeasure.symbol}
                    </TableCell>
                    <TableCell>
                      ${item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${item.taxAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Text weight="medium">
                        ${item.totalAmount.toFixed(2)}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text size="sm">
                        {item.account.accountNumber} - {item.account.accountName}
                      </Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Totals */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={3} gap="lg">
              <VStack gap="xs">
                <Text size="sm" weight="medium" color="secondary">Subtotal</Text>
                <Text size="lg" weight="semibold">
                  ${invoice.subtotal.toFixed(2)}
                </Text>
              </VStack>
              
              <VStack gap="xs">
                <Text size="sm" weight="medium" color="secondary">Tax Amount</Text>
                <Text size="lg" weight="semibold">
                  ${invoice.taxAmount.toFixed(2)}
                </Text>
              </VStack>
              
              <VStack gap="xs">
                <Text size="sm" weight="medium" color="secondary">Total Amount</Text>
                <Text size="xl" weight="bold" className="text-[var(--color-brand-primary-600)]">
                  ${invoice.totalAmount.toFixed(2)} {invoice.currency}
                </Text>
              </VStack>
            </Grid>
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>{invoice.notes}</Text>
            </CardContent>
          </Card>
        )}
      </VStack>
    </PageLayout>
  )
}