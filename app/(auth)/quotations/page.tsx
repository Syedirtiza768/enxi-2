'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, RefreshCw, Download, FileText, Send, Eye, Edit } from 'lucide-react'
import { PageLayout, PageHeader, PageSection, VStack, Button, Card, CardContent, CardHeader, CardTitle, Grid } from '@/components/design-system'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'

interface QuotationItem {
  id: string
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount?: number
  taxRate?: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface Quotation {
  id: string
  quotationNumber: string
  salesCase: {
    id: string
    caseNumber: string
    customer: {
      id: string
      name: string
    }
  }
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  validUntil: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  createdAt: string
  items: QuotationItem[]
}

interface SalesCase {
  id: string
  caseNumber: string
  customer: {
    name: string
  }
}

interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  limit?: number
}

export default function QuotationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // State management
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [salesCaseFilter, setSalesCaseFilter] = useState('')
  const [dateRangeFilter, setDateRangeFilter] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 20
  
  // Selection for bulk operations
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([])
  const [hoveredQuotation, setHoveredQuotation] = useState<string | null>(null)
  
  // Reference data
  const [salesCases, setSalesCases] = useState<SalesCase[]>([])

  // Fetch quotations from API
  const fetchQuotations = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      })
      
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (salesCaseFilter) params.append('salesCaseId', salesCaseFilter)
      if (dateRangeFilter) params.append('dateRange', dateRangeFilter)

      const response = await apiClient(`/api/quotations?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load quotations')
      }

      const quotationsData = response.data?.data || response.data || []
      setQuotations(Array.isArray(quotationsData) ? quotationsData : [])
      setTotalItems(response.data?.total || quotationsData.length || 0)
      setTotalPages(Math.ceil((response.data?.total || quotationsData.length || 0) / limit))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotations')
      console.error('Error fetching quotations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch sales cases for filter
  const fetchSalesCases = async () => {
    try {
      const response = await apiClient('/api/sales-cases', {
        method: 'GET'
      })
      if (response.ok) {
        const salesCasesData = response.data?.data || response.data || []
        setSalesCases(Array.isArray(salesCasesData) ? salesCasesData : [])
      }
    } catch (error) {
      console.error('Failed to fetch sales cases:', error)
    }
  }

  // Effects
  useEffect(() => {
    fetchSalesCases()
  }, [])

  useEffect(() => {
    fetchQuotations()
  }, [currentPage, search, statusFilter, salesCaseFilter, dateRangeFilter])

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusBadge = (status: Quotation['status'], validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date() && status === 'SENT'
    
    if (isExpired) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Expired</span>
    }

    const statusConfig = {
      DRAFT: { text: 'Draft', className: 'bg-gray-100 text-gray-800' },
      SENT: { text: 'Sent', className: 'bg-blue-100 text-blue-800' },
      ACCEPTED: { text: 'Accepted', className: 'bg-green-100 text-green-800' },
      REJECTED: { text: 'Rejected', className: 'bg-red-100 text-red-800' },
      EXPIRED: { text: 'Expired', className: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status]
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.text}
      </span>
    )
  }

  // Event handlers
  const handleQuotationSelect = (quotation: Quotation) => {
    router.push(`/quotations/${quotation.id}`)
  }

  const handleCreateNew = () => {
    router.push('/quotations/new')
  }

  const handleEdit = (quotationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/quotations/${quotationId}/edit`)
  }

  const handleSend = async (quotationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await apiClient(`/api/quotations/${quotationId}/send`, {
        method: 'POST'
      })
      if (response.ok) {
        await fetchQuotations() // Refresh list
      }
    } catch (error) {
      console.error('Failed to send quotation:', error)
    }
  }

  const handleExport = () => {
    const csvContent = quotations.map(quote => 
      [
        quote.quotationNumber,
        quote.salesCase.customer.name,
        quote.salesCase.caseNumber,
        quote.status,
        quote.totalAmount,
        quote.validUntil
      ].join(',')
    ).join('\n')

    const header = 'Number,Customer,Sales Case,Status,Total,Valid Until\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'quotations.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Calculate statistics
  const stats = {
    total: totalItems,
    pending: quotations.filter(q => q.status === 'SENT').length,
    accepted: quotations.filter(q => q.status === 'ACCEPTED').length,
    totalValue: quotations.reduce((sum, q) => sum + q.totalAmount, 0)
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader 
          title="Quotations"
          description="Manage quotations and track the sales pipeline"
          centered={false}
          actions={
            <button
              onClick={handleCreateNew}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Quotation
            </button>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={4} gap="lg">
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Quotations</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-semibold text-blue-600">{stats.pending}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Accepted</div>
              <div className="text-2xl font-semibold text-green-600">{stats.accepted}</div>
            </Card>
            <Card className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-2xl font-semibold text-green-600">{formatCurrency(stats.totalValue)}</div>
            </Card>
          </Grid>
        </PageSection>

        {/* Quick Actions */}
        <PageSection>
          <Card className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <FileText className="h-4 w-4 mr-2" />
                Create from Template
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </button>
            </div>
          </Card>
        </PageSection>

        {/* Recent Activity */}
        <PageSection>
          <Card className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
            <p className="text-sm text-gray-500">Recent quotation activities will be displayed here.</p>
          </Card>
        </PageSection>

        {/* Filters and Search */}
        <PageSection>
          <Card className="bg-white p-4 rounded-lg border space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search quotations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  aria-label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              {/* Sales Case Filter */}
              <div>
                <select
                  aria-label="Sales Case"
                  value={salesCaseFilter}
                  onChange={(e) => setSalesCaseFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Sales Cases</option>
                  {salesCases.map(sc => (
                    <option key={sc.id} value={sc.id}>
                      {sc.caseNumber} - {sc.customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <select
                  aria-label="Date Range"
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchQuotations}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedQuotations.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedQuotations.length} quotation{selectedQuotations.length > 1 ? 's' : ''} selected
                </span>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Export Selected
                </button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Send Selected
                </button>
              </div>
            )}
          </Card>
        </PageSection>

        {/* Error Message */}
        {error && (
          <PageSection>
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          </PageSection>
        )}

        {/* Quotations List */}
        <PageSection>
          <Card className="bg-white rounded-lg border">
            {loading && quotations.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading quotations...</p>
                </div>
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <FileText className="mx-auto h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations found</h3>
                <p className="text-gray-500">Create your first quotation to get started</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quotation
                </button>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sales Case
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid Until
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotations.map((quotation) => (
                      <tr
                        key={quotation.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleQuotationSelect(quotation)}
                        onMouseEnter={() => setHoveredQuotation(quotation.id)}
                        onMouseLeave={() => setHoveredQuotation(null)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            aria-label="Select quotation"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {quotation.quotationNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {quotation.salesCase.customer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {quotation.salesCase.caseNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(quotation.status, quotation.validUntil)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(quotation.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(quotation.validUntil).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {hoveredQuotation === quotation.id && (
                            <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                aria-label="View quotation"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => handleEdit(quotation.id, e)}
                                aria-label="Edit quotation"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => handleSend(quotation.id, e)}
                                aria-label="Send quotation"
                                className="text-green-600 hover:text-green-900"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </PageSection>

        {/* Pagination */}
        {totalPages > 1 && (
          <PageSection>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems} quotations
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </PageSection>
        )}
      </VStack>
    </PageLayout>
  )
}