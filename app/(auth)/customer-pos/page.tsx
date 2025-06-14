'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Search, FileText, CheckCircle, Clock, 
  XCircle, ChevronRight, Package, DollarSign
} from 'lucide-react'
import { useCurrency } from '@/lib/contexts/currency-context'

interface CustomerPO {
  id: string
  poNumber: string
  customer: {
    id: string
    name: string
    email: string
  }
  quotation: {
    id: string
    quotationNumber: string
  }
  salesCase: {
    id: string
    caseNumber: string
    title: string
  }
  poDate: string
  poAmount: number
  currency: string
  isAccepted: boolean
  acceptedAt?: string
  salesOrder?: {
    id: string
    orderNumber: string
    status: string
  } | null
  attachmentUrl?: string
  notes?: string
  createdAt: string
}

export default function CustomerPOsPage(): React.JSX.Element {
  
  const { formatCurrency } = useCurrency()
const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [pos, setPOs] = useState<CustomerPO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState('30')

  // Fetch customer POs
  useEffect(() => {
    const fetchPOs = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (statusFilter && statusFilter !== 'all') {
          params.append('isAccepted', statusFilter === 'accepted' ? 'true' : 'false')
        }
        if (dateFilter !== 'all') {
          const daysAgo = new Date()
          daysAgo.setDate(daysAgo.getDate() - parseInt(dateFilter))
          params.append('dateFrom', daysAgo.toISOString())
        }

        const response = await fetch(`/api/customer-pos?${params}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to load customer POs')
        }

        const data = await response.json()
        setPOs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer POs')
        console.error('Error fetching customer POs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPOs()
  }, [statusFilter, dateFilter])

  // Filter POs by search
  const filteredPOs = pos.filter(po => {
    if (!search) return true
    
    const searchLower = search.toLowerCase()
    return (
      po.poNumber.toLowerCase().includes(searchLower) ||
      (po.customer?.name?.toLowerCase().includes(searchLower) || false) ||
      (po.salesCase?.caseNumber?.toLowerCase().includes(searchLower) || false) ||
      (po.quotation?.quotationNumber?.toLowerCase().includes(searchLower) || false)
    )
  })

  // Calculate statistics
  const stats = {
    total: pos.length,
    pending: pos.filter(po => !po.isAccepted).length,
    accepted: pos.filter(po => po.isAccepted).length,
    totalValue: pos.reduce((sum, po) => sum + po.poAmount, 0),
    acceptedValue: pos.filter(po => po.isAccepted).reduce((sum, po) => sum + po.poAmount, 0)
  }

  const getStatusBadge = (po: CustomerPO): void => {
    if (po.isAccepted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Accepted
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      )
    }
  }

  // formatCurrency function removed - use useCurrency hook instead

  const formatDate = (date: string): void => {
    return new Date(date).toLocaleDateString()
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading customer POs...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <XCircle className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading customer POs</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customer Purchase Orders</h1>
          <p className="mt-1 text-sm text-gray-600">Manage customer POs and track order confirmations</p>
        </div>
        <button
          onClick={(): void => router.push('/customer-pos/new')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New PO
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total POs</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Accepted</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.accepted}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalValue)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Accepted Value</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.acceptedValue)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search POs..."
                  value={search}
                  onChange={(e): void => setSearch(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e): void => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Status filter"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="sm:w-48">
              <select
                value={dateFilter}
                onChange={(e): void => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* POs List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customer POs</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Get started by recording a new customer PO'}
            </p>
            {!search && statusFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={(): void => router.push('/customer-pos/new')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New PO
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quotation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Date
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPOs.map((po) => (
                <tr 
                  key={po.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={(): void => router.push(`/customer-pos/${po.id}`)}
                  role="row"
                  aria-label={`PO ${po.poNumber}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                    <div className="text-xs text-gray-500">{po.salesCase?.caseNumber || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{po.customer?.name || '-'}</div>
                    <div className="text-xs text-gray-500">{po.customer?.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{po.quotation?.quotationNumber || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(po.poAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(po)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {po.salesOrder ? (
                      <div>
                        <div className="font-medium">{po.salesOrder.orderNumber}</div>
                        <div className="text-xs text-gray-500">{po.salesOrder.status}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(po.poDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}