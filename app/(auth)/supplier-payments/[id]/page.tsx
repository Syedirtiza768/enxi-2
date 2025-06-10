'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  PageLayout,
  PageHeader,
  _PageSection,
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
  DollarSign,
  Calendar,
  Building2,
  CreditCard,
  FileText,
  Receipt,
  Banknote,
  AlertTriangle
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface SupplierPayment {
  id: string
  paymentNumber: string
  supplierId: string
  supplier: {
    name: string
    code: string
    supplierNumber: string
    email?: string
    phone?: string
    address?: string
  }
  supplierInvoiceId?: string
  supplierInvoice?: {
    invoiceNumber: string
    invoiceDate: string
    dueDate: string
    totalAmount: number
    paidAmount: number
    balanceAmount: number
    status: string
  }
  amount: number
  paymentDate: string
  paymentMethod: string
  reference?: string
  notes?: string
  currency: string
  exchangeRate: number
  baseAmount: number
  journalEntry?: {
    id: string
    reference: string
    description: string
    lines: Array<{
      id: string
      description: string
      debitAmount: number
      creditAmount: number
      account: {
        accountNumber: string
        accountName: string
        type: string
      }
    }>
  }
  createdAt: string
  createdBy: string
}

export default function SupplierPaymentDetailPage() {
  
  const { formatCurrency } = useCurrency()
const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const paymentId = params.id as string

  const [payment, setPayment] = useState<SupplierPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (paymentId) {
      fetchPayment()
    }
  }, [fetchPayment, paymentId])

  const fetchPayment = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient(`/api/supplier-payments/${paymentId}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error(response.data?.error || 'Failed to fetch supplier payment')
      }
      
      setPayment(response.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  const getPaymentMethodBadge = (method: string) => {
    const config = {
      BANK_TRANSFER: { label: 'Bank Transfer', className: 'bg-blue-100 text-blue-800' },
      CHECK: { label: 'Check', className: 'bg-green-100 text-green-800' },
      WIRE_TRANSFER: { label: 'Wire Transfer', className: 'bg-purple-100 text-purple-800' },
      CREDIT_CARD: { label: 'Credit Card', className: 'bg-orange-100 text-orange-800' },
      CASH: { label: 'Cash', className: 'bg-gray-100 text-gray-800' }
    }
    
    const { label, className } = config[method as keyof typeof config] || { 
      label: method, 
      className: 'bg-gray-100 text-gray-800' 
    }
    
    return <Badge className={className}>{label}</Badge>
  }

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <DollarSign className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading supplier payment...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error || !payment) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <DollarSign className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading supplier payment</Text>
            <Text color="secondary">{error || 'Supplier payment not found'}</Text>
          </VStack>
          <Button variant="primary" onClick={() => router.push('/supplier-payments')}>
            Back to Payments
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
          title={`Payment ${payment.paymentNumber}`}
          description={`Payment to ${payment.supplier.name}`}
          centered={false}
          actions={
            <HStack gap="sm">
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft />}
                onClick={() => router.push('/supplier-payments')}
              >
                Back to Payments
              </Button>
              
              <Button
                variant="ghost"
                leftIcon={<Edit />}
                onClick={() => router.push(`/supplier-payments/${payment.id}/edit`)}
              >
                Edit
              </Button>
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

        {/* Payment Overview */}
        <Grid cols={4} gap="lg">
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <DollarSign className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Payment Amount</Text>
                </HStack>
                <Text size="xl" weight="bold">
                  ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payment.currency}
                </Text>
                {payment.currency !== 'USD' && (
                  <Text size="sm" color="secondary">
                    ${formatCurrency(payment.baseAmount)} USD (Rate: {payment.exchangeRate})
                  </Text>
                )}
              </VStack>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <CreditCard className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Payment Method</Text>
                </HStack>
                {getPaymentMethodBadge(payment.paymentMethod)}
              </VStack>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <Calendar className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Payment Date</Text>
                </HStack>
                <Text weight="semibold">
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </Text>
              </VStack>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <FileText className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                  <Text size="sm" weight="medium" color="secondary">Type</Text>
                </HStack>
                {payment.supplierInvoice ? (
                  <Badge className="bg-green-100 text-green-800">Invoice Payment</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800">Prepayment</Badge>
                )}
              </VStack>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Details */}
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
                  <Text weight="semibold">{payment.supplier.name}</Text>
                  <Text size="sm" color="secondary">{payment.supplier.code} | {payment.supplier.supplierNumber}</Text>
                </VStack>
                
                {payment.supplier.email && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Email</Text>
                    <Text>{payment.supplier.email}</Text>
                  </VStack>
                )}
                
                {payment.supplier.phone && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Phone</Text>
                    <Text>{payment.supplier.phone}</Text>
                  </VStack>
                )}
                
                {payment.supplier.address && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Address</Text>
                    <Text>{payment.supplier.address}</Text>
                  </VStack>
                )}
              </VStack>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VStack gap="md">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Payment Number</Text>
                  <Text weight="semibold">{payment.paymentNumber}</Text>
                </VStack>
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Payment Date</Text>
                  <Text>{new Date(payment.paymentDate).toLocaleDateString()}</Text>
                </VStack>
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Currency</Text>
                  <Text>{payment.currency}</Text>
                </VStack>
                
                {payment.reference && (
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Reference</Text>
                    <Text>{payment.reference}</Text>
                  </VStack>
                )}
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Created</Text>
                  <Text size="sm" color="secondary">
                    {new Date(payment.createdAt).toLocaleDateString()} at {new Date(payment.createdAt).toLocaleTimeString()}
                  </Text>
                </VStack>
              </VStack>
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Information (if applicable) */}
        {payment.supplierInvoice && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Related Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Grid cols={4} gap="lg">
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Invoice Number</Text>
                  <Text weight="semibold">{payment.supplierInvoice.invoiceNumber}</Text>
                </VStack>
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Invoice Total</Text>
                  <Text weight="semibold">
                    ${formatCurrency(payment.supplierInvoice.totalAmount)}
                  </Text>
                </VStack>
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Total Paid</Text>
                  <Text weight="semibold">
                    ${formatCurrency(payment.supplierInvoice.paidAmount)}
                  </Text>
                </VStack>
                
                <VStack gap="xs">
                  <Text size="sm" weight="medium" color="secondary">Remaining Balance</Text>
                  <Text weight="semibold" className={payment.supplierInvoice.balanceAmount > 0 ? 'text-orange-600' : 'text-green-600'}>
                    ${formatCurrency(payment.supplierInvoice.balanceAmount)}
                  </Text>
                </VStack>
              </Grid>
              
              <HStack gap="md" className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/supplier-invoices/${payment.supplierInvoiceId}`)}
                >
                  View Invoice
                </Button>
              </HStack>
            </CardContent>
          </Card>
        )}

        {/* Journal Entry */}
        {payment.journalEntry && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Accounting Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VStack gap="lg">
                <HStack gap="lg">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Journal Entry</Text>
                    <Text weight="semibold">{payment.journalEntry.reference}</Text>
                  </VStack>
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Description</Text>
                    <Text>{payment.journalEntry.description}</Text>
                  </VStack>
                </HStack>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payment.journalEntry.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <VStack gap="xs">
                            <Text weight="medium">{line.account.accountNumber}</Text>
                            <Text size="sm" color="secondary">{line.account.accountName}</Text>
                          </VStack>
                        </TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell className="text-right">
                          {line.debitAmount > 0 ? `$${formatCurrency(line.debitAmount)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.creditAmount > 0 ? `$${formatCurrency(line.creditAmount)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {payment.notes && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>{payment.notes}</Text>
            </CardContent>
          </Card>
        )}
      </VStack>
    </PageLayout>
  )
}