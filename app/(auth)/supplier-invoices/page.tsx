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
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Edit
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
  }>
  notes?: string
  createdAt: string
  createdBy: string
}

interface SupplierInvoiceStats {
  totalInvoices: number
  draftInvoices: number
  postedInvoices: number
  totalValue: number
  overdueInvoices: number
}

export default function SupplierInvoicesPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [stats, setStats] = useState<SupplierInvoiceStats>({
    totalInvoices: 0,
    draftInvoices: 0,
    postedInvoices: 0,
    totalValue: 0,
    overdueInvoices: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [matchingFilter, setMatchingFilter] = useState('all')

  useEffect(() => {
    fetchSupplierInvoices()
  }, [])

  const fetchSupplierInvoices = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient<{ data: any[] }>('/api/supplier-invoices', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch supplier invoices')
      }
      
      const data = response?.data?.data || []
      setSupplierInvoices(data)
      
      // Calculate stats
      const now = new Date()
      const stats = {
        totalInvoices: data.length,
        draftInvoices: data.filter((inv: SupplierInvoice) => inv.status === 'DRAFT').length,
        postedInvoices: data.filter((inv: SupplierInvoice) => inv.status === 'POSTED').length,
        totalValue: data.reduce((sum: number, inv: SupplierInvoice) => sum + inv.totalAmount, 0),
        overdueInvoices: data.filter((inv: SupplierInvoice) => 
          inv.status === 'POSTED' && new Date(inv.dueDate) < now
        ).length
      }
      setStats(stats)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: SupplierInvoice['status']) => {
    const config = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      POSTED: { label: 'Posted', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    } as const
    
    const { label, className } = config[status as keyof typeof config] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return <Badge className={className}>{label}</Badge>
  }

  const getMatchingBadge = (matchingStatus: SupplierInvoice['matchingStatus']) => {
    const config = {
      FULLY_MATCHED: { label: 'Fully Matched', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      PARTIALLY_MATCHED: { label: 'Partial Match', className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      OVER_MATCHED: { label: 'Over Matched', className: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      UNDER_MATCHED: { label: 'Under Matched', className: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="h-3 w-3" /> },
      PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> }
    } as const
    
    const { label, className, icon } = config[matchingStatus as keyof typeof config] || { 
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

  const filteredSupplierInvoices = Array.isArray(supplierInvoices) ? supplierInvoices.filter(invoice => {
    const matchesSearch = search === '' || 
      invoice.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      invoice.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      invoice.supplier?.code?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    const matchesMatching = matchingFilter === 'all' || invoice.matchingStatus === matchingFilter
    
    return matchesSearch && matchesStatus && matchesMatching
  }) : []

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading supplier invoices...</Text>
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
            <Text size="lg" weight="semibold">Error loading supplier invoices</Text>
            <Text color="secondary">{error}</Text>
          </VStack>
          <Button variant="primary" onClick={fetchSupplierInvoices}>
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
          title="Supplier Invoices"
          description="Manage accounts payable and supplier invoicing"
          centered={false}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus />}
              onClick={() => router.push('/supplier-invoices/new')}
            >
              New Invoice
            </Button>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={5} gap="lg">
            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Invoices</Text>
                    <Text size="xl" weight="bold">{stats.totalInvoices}</Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-lg">
                    <FileText className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Draft Invoices</Text>
                    <Text size="xl" weight="bold">{stats.draftInvoices}</Text>
                  </VStack>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Edit className="h-6 w-6 text-gray-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Posted Invoices</Text>
                    <Text size="xl" weight="bold">{stats.postedInvoices}</Text>
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
                    <Text size="sm" weight="medium" color="secondary">Total Value</Text>
                    <Text size="xl" weight="bold">
                      ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Overdue</Text>
                    <Text size="xl" weight="bold">{stats.overdueInvoices}</Text>
                  </VStack>
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
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
                    placeholder="Search by invoice number, supplier name, or code..."
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
                  <option value="POSTED">Posted</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={matchingFilter}
                  onChange={(e) => setMatchingFilter(e.target.value)}
                  className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[150px]"
                >
                  <option value="all">All Matching</option>
                  <option value="FULLY_MATCHED">Fully Matched</option>
                  <option value="PARTIALLY_MATCHED">Partially Matched</option>
                  <option value="OVER_MATCHED">Over Matched</option>
                  <option value="UNDER_MATCHED">Under Matched</option>
                  <option value="PENDING">Pending</option>
                </select>
              </HStack>
            </CardContent>
          </Card>
        </PageSection>

        {/* Supplier Invoices Table */}
        <PageSection>
          <Card className="overflow-x-auto">
            <CardHeader>
              <CardTitle>Supplier Invoices ({filteredSupplierInvoices.length})</CardTitle>
            </CardHeader>
            {filteredSupplierInvoices.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <FileText className="h-12 w-12 text-[var(--color-neutral-400)]" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No supplier invoices found</Text>
                    <Text color="secondary">
                      {search || statusFilter !== 'all' || matchingFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first supplier invoice to get started'}
                    </Text>
                  </VStack>
                  {!search && statusFilter === 'all' && matchingFilter === 'all' && (
                    <Button
                      variant="primary"
                      leftIcon={<Plus />}
                      onClick={() => router.push('/supplier-invoices/new')}
                    >
                      New Invoice
                    </Button>
                  )}
                </VStack>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matching</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupplierInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.supplier.name}</div>
                          <div className="text-sm text-gray-500">{invoice.supplier.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <VStack gap="xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </div>
                          {getDueDateStatus(invoice.dueDate, invoice.status)}
                        </VStack>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${invoice.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-500">{invoice.currency}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{getMatchingBadge(invoice.matchingStatus)}</TableCell>
                      <TableCell>
                        <HStack gap="xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/supplier-invoices/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/supplier-invoices/${invoice.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
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