'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageLayout, PageHeader, PageSection, VStack, Button, Grid } from '@/components/design-system'
import { CustomerForm } from '@/components/customers/customer-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, User, CreditCard, Building, Eye } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Customer {
  id: string
  customerNumber: string
  name: string
  email: string
  phone?: string
  industry?: string
  currency: string
  creditLimit: number
  paymentTerms: number
  createdAt: string
  account?: {
    id: string
    code: string
    balance: number
  }
  lead?: {
    id: string
    name: string
  }
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await apiClient('/api/customers', { method: 'GET' })
      if (response.ok && response.data) {
        const customersData = response.data.data || response.data
        setCustomers(Array.isArray(customersData) ? customersData : [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!search.trim()) {
      fetchCustomers()
      return
    }

    setLoading(true)
    try {
      const response = await apiClient(`/api/customers?search=${encodeURIComponent(search)}`, { method: 'GET' })
      if (response.ok && response.data) {
        const customersData = response.data.data || response.data
        setCustomers(Array.isArray(customersData) ? customersData : [])
      }
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerCreated = (customer: any) => {
    setShowForm(false)
    fetchCustomers()
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const filteredCustomers = customers.filter(customer => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.customerNumber.toLowerCase().includes(searchLower) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchLower))
    )
  })

  if (loading && customers.length === 0) {
    return (
      <PageLayout>
        <VStack gap="xl" className="py-6">
          <PageHeader title="Customers" />
          <PageSection>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">Loading customers...</div>
              </CardContent>
            </Card>
          </PageSection>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader 
          title="Customers"
          description="Manage your customer accounts and credit limits"
          centered={false}
          actions={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Customer
            </Button>
          }
        />

        {/* Stats Cards */}
        <PageSection>
          <Grid cols={3} gap="lg">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers.length}</div>
                <p className="text-xs text-muted-foreground">Active accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credit Extended</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    customers.reduce((sum, c) => sum + c.creditLimit, 0),
                    'USD'
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Across all customers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lead Conversions</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers.filter(c => c.lead).length}
                </div>
                <p className="text-xs text-muted-foreground">Converted from leads</p>
              </CardContent>
            </Card>
          </Grid>
        </PageSection>

        {/* Form Dialog */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CustomerForm 
                onSuccess={handleCustomerCreated}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Customer List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search customers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={handleSearch}>
                  Search
                </Button>
              </div>

              {/* Customer Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {search ? 'No customers found matching your search' : 'No customers yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.customerNumber}</TableCell>
                          <TableCell>
                            <Link 
                              href={`/customers/${customer.id}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {customer.name}
                            </Link>
                          </TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>{customer.industry || '-'}</TableCell>
                          <TableCell>{formatCurrency(customer.creditLimit, customer.currency)}</TableCell>
                          <TableCell>
                            {customer.account 
                              ? formatCurrency(customer.account.balance, customer.currency)
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {customer.lead ? (
                              <Badge variant="secondary">Lead</Badge>
                            ) : (
                              <Badge>Direct</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link href={`/customers/${customer.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </VStack>
    </PageLayout>
  )
}