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
  DollarSign, 
  Calendar, 
  TrendingUp,
  Eye,
  Edit
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface SupplierPayment {
  id: string
  paymentNumber: string
  supplierId: string
  supplier: {
    name: string
    code: string
    supplierNumber: string
  }
  supplierInvoiceId?: string
  supplierInvoice?: {
    invoiceNumber: string
    totalAmount: number
  }
  amount: number
  paymentDate: string
  paymentMethod: string
  reference?: string
  notes?: string
  currency: string
  exchangeRate: number
  baseAmount: number
  createdAt: string
  createdBy: string
}

interface PaymentStats {
  totalPayments: number
  totalAmount: number
  thisMonth: number
  thisMonthAmount: number
  pendingCount: number
}

export default function SupplierPaymentsPage() {
  
  const { formatCurrency } = useCurrency()
const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [payments, setPayments] = useState<SupplierPayment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    thisMonth: 0,
    thisMonthAmount: 0,
    pendingCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient<{ data: any[]; total?: number } | any[]>('/api/supplier-payments', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch supplier payments')
      }
      
      const responseData = response?.data
      const data = Array.isArray(responseData) ? responseData : (responseData?.data || [])
      setPayments(data)
      
      // Calculate stats
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const stats = {
        totalPayments: data.length,
        totalAmount: data.reduce((sum: number, payment: SupplierPayment) => sum + payment.baseAmount, 0),
        thisMonth: data.filter((payment: SupplierPayment) => 
          new Date(payment.paymentDate) >= currentMonthStart
        ).length,
        thisMonthAmount: data
          .filter((payment: SupplierPayment) => new Date(payment.paymentDate) >= currentMonthStart)
          .reduce((sum: number, payment: SupplierPayment) => sum + payment.baseAmount, 0),
        pendingCount: 0 // Supplier payments don't have pending status like invoices
      }
      setStats(stats)
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

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

  const getDateRange = () => {
    const now = new Date()
    switch (dateFilter) {
      case 'today':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        }
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        return {
          from: weekStart,
          to: new Date()
        }
      case 'month':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date()
        }
      default:
        return null
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = search === '' || 
      payment.paymentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      payment.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.supplier?.code?.toLowerCase().includes(search.toLowerCase()) ||
      payment.supplierInvoice?.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(search.toLowerCase())
    
    const matchesPaymentMethod = paymentMethodFilter === 'all' || payment.paymentMethod === paymentMethodFilter
    
    const matchesDate = (() => {
      if (dateFilter === 'all') return true
      const dateRange = getDateRange()
      if (!dateRange) return true
      const paymentDate = new Date(payment.paymentDate)
      return paymentDate >= dateRange.from && paymentDate < dateRange.to
    })()
    
    return matchesSearch && matchesPaymentMethod && matchesDate
  })

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <DollarSign className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading supplier payments...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <DollarSign className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading supplier payments</Text>
            <Text color="secondary">{error}</Text>
          </VStack>
          <Button variant="primary" onClick={fetchPayments}>
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
          title="Supplier Payments"
          description="Manage accounts payable and supplier payment processing"
          centered={false}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus />}
              onClick={() => router.push('/supplier-payments/new')}
            >
              New Payment
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
                    <Text size="sm" weight="medium" color="secondary">Total Payments</Text>
                    <Text size="xl" weight="bold">{stats.totalPayments}</Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-lg">
                    <DollarSign className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Amount</Text>
                    <Text size="xl" weight="bold">
                      ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">This Month</Text>
                    <Text size="xl" weight="bold">{stats.thisMonth}</Text>
                  </VStack>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">This Month Amount</Text>
                    <Text size="xl" weight="bold">
                      ${stats.thisMonthAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
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
                    placeholder="Search by payment number, supplier, invoice, or reference..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    leftIcon={<Search />}
                    fullWidth
                  />
                </div>

                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[150px]"
                >
                  <option value="all">All Methods</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHECK">Check</option>
                  <option value="WIRE_TRANSFER">Wire Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[120px]"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </HStack>
            </CardContent>
          </Card>
        </PageSection>

        {/* Payments Table */}
        <PageSection>
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Supplier Payments ({filteredPayments.length})</CardTitle>
            </CardHeader>
            {filteredPayments.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <DollarSign className="h-12 w-12 text-[var(--color-neutral-400)]" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No supplier payments found</Text>
                    <Text color="secondary">
                      {search || paymentMethodFilter !== 'all' || dateFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first supplier payment to get started'}
                    </Text>
                  </VStack>
                  {!search && paymentMethodFilter === 'all' && dateFilter === 'all' && (
                    <Button
                      variant="primary"
                      leftIcon={<Plus />}
                      onClick={() => router.push('/supplier-payments/new')}
                    >
                      New Payment
                    </Button>
                  )}
                </VStack>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.supplier.name}</div>
                          <div className="text-sm text-gray-500">{payment.supplier.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.supplierInvoice ? (
                          <div>
                            <div className="font-medium">{payment.supplierInvoice.invoiceNumber}</div>
                            <div className="text-sm text-gray-500">
                              {formatCurrency(payment.supplierInvoice.totalAmount)}
                            </div>
                          </div>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Prepayment</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-500">{payment.currency}</div>
                        {payment.currency !== 'USD' && (
                          <div className="text-xs text-gray-400">
                            {formatCurrency(payment.baseAmount)} USD
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getPaymentMethodBadge(payment.paymentMethod)}</TableCell>
                      <TableCell>
                        <div className="max-w-32 truncate">
                          {payment.reference || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <HStack gap="xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/supplier-payments/${payment.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/supplier-payments/${payment.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
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