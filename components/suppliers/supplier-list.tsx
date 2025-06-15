'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Trash2, 
  Filter,
  Download,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { SupplierForm } from './supplier-form'

interface Supplier {
  id: string
  code: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  currency?: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  paymentTerms?: number
  creditLimit?: number
  category?: string
  createdAt: string
  updatedAt: string
  _count?: {
    purchaseOrders: number
    invoices: number
  }
}

interface SupplierListProps {
  onSelect?: (supplier: Supplier) => void
  selectable?: boolean
  embedded?: boolean
}

export function SupplierList({ onSelect, selectable = false, embedded = false }: SupplierListProps): React.JSX.Element {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient<{ data: Supplier[]; total?: number } | Supplier[]>('/api/suppliers', { method: 'GET' })
      if (response.ok) {
        const responseData = response?.data
        const suppliersData = Array.isArray(responseData) ? responseData : (responseData?.data || [])
        setSuppliers(suppliersData)
      } else {
        throw new Error('Failed to fetch suppliers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSupplier = async (supplierId: string): void => {
    if (!confirm('Are you sure you want to delete this supplier?')) return

    try {
      const response = await apiClient(`/api/suppliers/${supplierId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchSuppliers()
      } else {
        throw new Error('Failed to delete supplier')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete supplier')
    }
  }

  const getStatusBadge = (status: string): JSX.Element => {
    const statusConfig = {
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800' },
      INACTIVE: { label: 'Inactive', className: 'bg-gray-100 text-gray-800' },
      BLOCKED: { label: 'Blocked', className: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getCategoryBadge = (category?: string): JSX.Element | null => {
    if (!category) return null
    const categoryConfig = {
      MANUFACTURER: { label: 'Manufacturer', className: 'bg-blue-100 text-blue-800' },
      DISTRIBUTOR: { label: 'Distributor', className: 'bg-purple-100 text-purple-800' },
      SERVICE_PROVIDER: { label: 'Service Provider', className: 'bg-orange-100 text-orange-800' },
      CONTRACTOR: { label: 'Contractor', className: 'bg-yellow-100 text-yellow-800' },
      CONSULTANT: { label: 'Consultant', className: 'bg-pink-100 text-pink-800' },
      LOGISTICS: { label: 'Logistics', className: 'bg-indigo-100 text-indigo-800' }
    }
    const config = categoryConfig[category as keyof typeof categoryConfig]
    return config ? <Badge className={config.className}>{config.label}</Badge> : <Badge>{category}</Badge>
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || supplier.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleSupplierFormSuccess = (): void => {
    setShowSupplierForm(false)
    setSelectedSupplier(null)
    fetchSuppliers()
  }

  const openSupplierForm = (mode: 'create' | 'edit' | 'view', supplier?: Supplier): void => {
    setFormMode(mode)
    setSelectedSupplier(supplier || null)
    setShowSupplierForm(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <Button onClick={fetchSuppliers} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const containerClass = embedded ? "space-y-4" : "container mx-auto p-6 space-y-6"

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Suppliers</h1>
            <p className="text-gray-600">Manage your supplier information and relationships</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={(): void => openSupplierForm('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search suppliers by name, code, email, or contact person..."
                  value={searchTerm}
                  onChange={(e): void => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e): void => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Suppliers ({filteredSuppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-500">No suppliers found</p>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={(): void => setSearchTerm('')}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow 
                      key={supplier.id}
                      className={selectable ? "cursor-pointer hover:bg-gray-50" : ""}
                      onClick={selectable ? (): void => onSelect?.(supplier) : undefined}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          <div className="text-sm text-gray-500">{supplier.code}</div>
                          {supplier.contactPerson && (
                            <div className="text-xs text-gray-400">{supplier.contactPerson}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.city || supplier.country ? (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-3 w-3 mr-1" />
                            {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getCategoryBadge(supplier.category)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(supplier.status)}
                      </TableCell>
                      <TableCell>
                        {supplier.creditLimit ? (
                          <div className="flex items-center text-sm">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {formatCurrency(supplier.creditLimit)} {supplier.currency}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.paymentTerms ? (
                          <span className="text-sm">{supplier.paymentTerms} days</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!selectable && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(): void => openSupplierForm('view', supplier)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(): void => openSupplierForm('edit', supplier)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(): void => handleDeleteSupplier(supplier.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Form Dialog */}
      <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create Supplier' : 
               formMode === 'edit' ? 'Edit Supplier' : 'View Supplier'}
            </DialogTitle>
          </DialogHeader>
          <SupplierForm
            supplier={selectedSupplier}
            onSuccess={handleSupplierFormSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}