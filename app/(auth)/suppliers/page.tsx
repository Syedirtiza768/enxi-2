'use client'

import { useState, useEffect } from 'react'
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
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Supplier {
  id: string
  code: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  taxId?: string
  paymentTerms?: number
  creditLimit?: number
  currency?: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  notes?: string
  balance?: number
  totalPurchases?: number
  lastPurchaseDate?: string
  createdAt: string
}

interface SupplierStats {
  totalSuppliers: number
  activeSuppliers: number
  totalPurchaseValue: number
  averagePaymentTerm: number
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stats, setStats] = useState<SupplierStats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalPurchaseValue: 0,
    averagePaymentTerm: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient('/api/suppliers', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers')
      }
      
      const data = response.data?.data || []
      setSuppliers(data)
      
      // Calculate stats
      const stats = {
        totalSuppliers: data.length,
        activeSuppliers: Array.isArray(data) ? data.filter((s: Supplier) => s.status === 'ACTIVE').length : 0,
        totalPurchaseValue: Array.isArray(data) ? data.reduce((sum: number, s: Supplier) => sum + (s.totalPurchases || 0), 0) : 0,
        averagePaymentTerm: Array.isArray(data) && data.length > 0 ? data.reduce((sum: number, s: Supplier) => sum + (s.paymentTerms || 0), 0) / data.length : 0
      }
      setStats(stats)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return
    }

    try {
      const response = await apiClient(`/api/suppliers/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchSuppliers()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusBadge = (status: Supplier['status']) => {
    const config = {
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800' },
      INACTIVE: { label: 'Inactive', className: 'bg-gray-100 text-gray-800' },
      BLOCKED: { label: 'Blocked', className: 'bg-red-100 text-red-800' }
    }
    
    const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return <Badge className={className}>{label}</Badge>
  }

  const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier => {
    const matchesSearch = search === '' || 
      supplier.name?.toLowerCase().includes(search.toLowerCase()) ||
      supplier.code?.toLowerCase().includes(search.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(search.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) : []

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Building2 className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading suppliers...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Building2 className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading suppliers</Text>
            <Text color="secondary">{error}</Text>
          </VStack>
          <Button variant="primary" onClick={fetchSuppliers}>
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
          title="Suppliers"
          description="Manage your suppliers and vendors"
          centered={false}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus />}
              onClick={() => window.location.href = '/suppliers/new'}
            >
              Add Supplier
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
                    <Text size="sm" weight="medium" color="secondary">Total Suppliers</Text>
                    <Text size="2xl" weight="bold">{stats.totalSuppliers}</Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-lg">
                    <Building2 className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Active Suppliers</Text>
                    <Text size="2xl" weight="bold">{stats.activeSuppliers}</Text>
                  </VStack>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Purchase Value</Text>
                    <Text size="2xl" weight="bold">
                      ${stats.totalPurchaseValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </VStack>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Avg. Payment Terms</Text>
                    <Text size="2xl" weight="bold">{Math.round(stats.averagePaymentTerm)} days</Text>
                  </VStack>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
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
                    placeholder="Search by name, code, email, or contact..."
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
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </HStack>
            </CardContent>
          </Card>
        </PageSection>

        {/* Suppliers Table */}
        <PageSection>
          <Card variant="elevated" className="overflow-hidden">
            <CardHeader>
              <CardTitle>Suppliers ({filteredSuppliers.length})</CardTitle>
            </CardHeader>
            {filteredSuppliers.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <Building2 className="h-12 w-12 text-[var(--color-neutral-400)]" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No suppliers found</Text>
                    <Text color="secondary">
                      {search || statusFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Add your first supplier to get started'}
                    </Text>
                  </VStack>
                  {!search && statusFilter === 'all' && (
                    <Button
                      variant="primary"
                      leftIcon={<Plus />}
                      onClick={() => window.location.href = '/suppliers/new'}
                    >
                      Add Supplier
                    </Button>
                  )}
                </VStack>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.contactPerson && (
                            <div className="text-sm text-gray-500">{supplier.contactPerson}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <VStack gap="xs">
                          {supplier.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                        </VStack>
                      </TableCell>
                      <TableCell>
                        {supplier.city && supplier.country && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {supplier.city}, {supplier.country}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {supplier.creditLimit ? 
                          `$${supplier.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
                          '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {supplier.balance ? 
                          `$${supplier.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
                          '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                      <TableCell>
                        <HStack gap="xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = `/suppliers/${supplier.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(supplier.id)}
                            className="text-[var(--color-semantic-error-600)]"
                          >
                            <Trash2 className="h-4 w-4" />
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