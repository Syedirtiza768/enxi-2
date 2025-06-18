import type { SalesCaseMetrics } from '@/lib/services/sales-case.service'
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrency } from '@/lib/contexts/currency-context'

interface Customer {
  id: string
  name: string
  customerNumber: string
}

interface SalesCase {
  id: string
  caseNumber: string
  customer: Customer
  title: string
  description?: string
  status: 'OPEN' | 'WON' | 'LOST' | 'IN_PROGRESS'
  estimatedValue: number
  actualValue: number
  cost: number
  profitMargin: number
  assignedTo?: string
  createdAt: string
  closedAt?: string
}

// SalesCaseMetrics moved to service

export default function SalesCasesPage(): React.JSX.Element {
  const { formatCurrency } = useCurrency()
  
  const [salesCases, setSalesCases] = useState<SalesCase[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [metrics, setMetrics] = useState<SalesCaseMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20
  
  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    title: '',
    description: '',
    estimatedValue: 0,
    assignedTo: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSalesCases()
    fetchCustomers()
    fetchMetrics()
  }, [statusFilter, search, currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, search])

  const fetchSalesCases = async (): Promise<void> => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (search) params.append('search', search)
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())
      
      const response = await fetch(`/api/sales-cases?${params}`)
      if (!response.ok) throw new Error('Failed to fetch sales cases')
      const data = await response.json()
      setSalesCases(data.data || [])
      setTotalPages(data.totalPages || 1)
      setTotalItems(data.total || 0)
    } catch (error) {
      console.error('Error fetching sales cases:', error)
      setError('Failed to load sales cases')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async (): Promise<void> => {
    try {
      const response = await fetch('/api/customers')
      if (!response.ok) throw new Error('Failed to fetch customers')
      const data = await response.json()
      setCustomers(data.data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchMetrics = async (): Promise<void> => {
    try {
      const response = await fetch('/api/sales-cases/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      setMetrics(data.data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent): void => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/sales-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create sales case')
      }

      setShowForm(false)
      resetForm()
      fetchSalesCases()
      fetchMetrics()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = (): void => {
    setFormData({
      customerId: '',
      title: '',
      description: '',
      estimatedValue: 0,
      assignedTo: ''
    })
    setError('')
  }

  // formatCurrency function removed - use useCurrency hook instead

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString()
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800'
      case 'WON':
        return 'bg-green-100 text-green-800'
      case 'LOST':
        return 'bg-red-100 text-red-800'
      case 'IN_PROGRESS':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Cases</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your sales opportunities</p>
        </div>
        <button
          onClick={(): void => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'New Sales Case'}
        </button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Cases</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{(metrics.totalCases ?? 0)}</p>
            <p className="mt-1 text-sm text-gray-600">
              {(metrics.openCases ?? 0)} open
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {(metrics.averageWinRate ?? 0).toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {(metrics.wonCases ?? 0)} won / {(metrics.lostCases ?? 0)} lost
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {formatCurrency(metrics.totalActualValue)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {formatCurrency(metrics.totalEstimatedValue)} estimated
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {(metrics.averageMargin ?? 0).toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {formatCurrency(metrics.totalProfit)} profit
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e): void => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={(): void => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-md ${
              statusFilter === 'ALL' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={(): void => setStatusFilter('OPEN')}
            className={`px-4 py-2 rounded-md ${
              statusFilter === 'OPEN' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Open
          </button>
          <button
            onClick={(): void => setStatusFilter('WON')}
            className={`px-4 py-2 rounded-md ${
              statusFilter === 'WON' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Won
          </button>
          <button
            onClick={(): void => setStatusFilter('LOST')}
            className={`px-4 py-2 rounded-md ${
              statusFilter === 'LOST' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Lost
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Create New Sales Case</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer *</label>
                <select
                  value={formData.customerId}
                  onChange={(e): void => setFormData({ ...formData, customerId: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.customerNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e): void => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Value</label>
                <input
                  type="number"
                  value={formData.estimatedValue}
                  onChange={(e): void => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e): void => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="User ID"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e): void => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={(): void => { setShowForm(false); resetForm() }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Sales Case'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sales Cases Table with Scroll */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        No sales cases found
                      </td>
                    </tr>
                  ) : (
                    salesCases.map((salesCase) => (
                      <tr key={salesCase.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {salesCase.caseNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {salesCase.customer.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">{salesCase.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(salesCase.status)}`}>
                            {salesCase.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {salesCase.status === 'OPEN' 
                              ? `Est: ${formatCurrency(salesCase.estimatedValue)}`
                              : formatCurrency(salesCase.actualValue)
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {salesCase.profitMargin > 0 ? `${(salesCase.profitMargin ?? 0).toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(salesCase.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/sales-cases/${salesCase.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={(): void => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={(): void => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span>
                {' '}to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
                {' '}of{' '}
                <span className="font-medium">{totalItems}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={(): void => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {((): React.ReactNode[] => {
                  const pages: React.ReactNode[] = []
                  const maxPagesToShow = 7
                  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
                  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)
                  
                  if (endPage - startPage < maxPagesToShow - 1) {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1)
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={(): void => setCurrentPage(i)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          i === currentPage
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    )
                  }
                  
                  return pages
                })()}
                
                <button
                  onClick={(): void => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}