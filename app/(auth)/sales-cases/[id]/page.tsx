'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SalesCaseDetailTabs } from '@/components/sales-cases/sales-case-detail-tabs'
import { apiClient } from '@/lib/api/client'
import { ChevronRight } from 'lucide-react'

interface Customer {
  id: string
  name: string
  customerNumber: string
  email: string
  currency: string
}

interface SalesCase {
  id: string
  caseNumber: string
  customer: Customer
  title: string
  description?: string
  status: 'NEW' | 'QUOTING' | 'PO_RECEIVED' | 'DELIVERED' | 'CLOSED'
  result?: 'WON' | 'LOST'
  estimatedValue: number
  actualValue: number
  cost: number
  profitMargin: number
  assignedTo?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  quotations: Record<string, unknown>[]
}

interface TimelineEvent {
  type: string
  action: string
  timestamp: string
  userId: string
  data: Record<string, unknown>
}

// Status transition rules
const statusTransitions: Record<string, string[]> = {
  NEW: ['QUOTING', 'CLOSED'],
  QUOTING: ['PO_RECEIVED', 'CLOSED'],
  PO_RECEIVED: ['DELIVERED', 'CLOSED'],
  DELIVERED: ['CLOSED'],
  CLOSED: []
}

export default function SalesCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const _router = useRouter()
  const [salesCase, setSalesCase] = useState<SalesCase | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [_editMode, _setEditMode] = useState(false)
  
  // Close modal state
  const [closeData, setCloseData] = useState({
    status: 'WON' as 'WON' | 'LOST',
    actualValue: 0,
    cost: 0
  })
  
  // Status transition state
  const [newStatus, setNewStatus] = useState('')
  
  // Assign modal state
  const [assignedTo, setAssignedTo] = useState('')
  
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSalesCase()
    fetchTimeline()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSalesCase = async () => {
    try {
      const response = await apiClient(`/api/sales-cases/${id}`, { method: 'GET' })
      if (!response.ok) throw new Error('Failed to fetch sales case')
      const data = response.data.data || response.data
      setSalesCase(data)
      setCloseData({
        status: 'WON',
        actualValue: data.estimatedValue,
        cost: 0
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeline = async () => {
    try {
      const response = await apiClient(`/api/sales-cases/${id}/timeline`, { method: 'GET' })
      if (!response.ok) throw new Error('Failed to fetch timeline')
      const data = response.data.data || response.data
      setTimeline(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleStatusTransition = async () => {
    if (!newStatus) return
    
    setError('')
    setSubmitting(true)

    try {
      const response = await apiClient(`/api/sales-cases/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to update status')
      }

      setShowStatusModal(false)
      fetchSalesCase()
      fetchTimeline()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseSalesCase = async () => {
    setError('')
    setSubmitting(true)

    try {
      const response = await apiClient(`/api/sales-cases/${id}/close`, {
        method: 'POST',
        body: JSON.stringify(closeData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to close sales case')
      }

      setShowCloseModal(false)
      fetchSalesCase()
      fetchTimeline()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignSalesCase = async () => {
    setError('')
    setSubmitting(true)

    try {
      const response = await apiClient(`/api/sales-cases/${id}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedTo })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to assign sales case')
      }

      setShowAssignModal(false)
      fetchSalesCase()
      fetchTimeline()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salesCase?.customer.currency || 'USD'
    }).format(amount)
  }

  const _formatDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-gray-100 text-gray-800'
      case 'QUOTING':
        return 'bg-blue-100 text-blue-800'
      case 'PO_RECEIVED':
        return 'bg-purple-100 text-purple-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'CLOSED':
        return salesCase?.result === 'WON' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NEW': return 'New'
      case 'QUOTING': return 'Quoting'
      case 'PO_RECEIVED': return 'PO Received'
      case 'DELIVERED': return 'Delivered'
      case 'CLOSED': return salesCase?.result ? `Closed - ${salesCase.result}` : 'Closed'
      default: return status
    }
  }

  const calculateProfit = () => {
    return closeData.actualValue - closeData.cost
  }

  const calculateMargin = () => {
    return closeData.actualValue > 0 
      ? ((closeData.actualValue - closeData.cost) / closeData.actualValue) * 100 
      : 0
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!salesCase) {
    return <div className="text-center py-12">Sales case not found</div>
  }

  const availableTransitions = statusTransitions[salesCase.status] || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{salesCase.title}</h1>
          <div className="mt-1 flex items-center space-x-4">
            <span className="text-sm text-gray-500">Case #{salesCase.caseNumber}</span>
            <Badge className={getStatusColor(salesCase.status)}>
              {getStatusLabel(salesCase.status)}
            </Badge>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/sales-cases"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Sales Cases
          </Link>
          {salesCase.status !== 'CLOSED' && (
            <>
              {availableTransitions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowStatusModal(true)}
                >
                  Change Status
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(true)}
              >
                Assign
              </Button>
              <Button
                onClick={() => setShowCloseModal(true)}
                variant={salesCase.status === 'DELIVERED' ? 'default' : 'destructive'}
              >
                Close Case
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Flow */}
      {salesCase.status !== 'CLOSED' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge className={salesCase.status === 'NEW' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}>
                New
              </Badge>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Badge className={salesCase.status === 'QUOTING' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}>
                Quoting
              </Badge>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Badge className={salesCase.status === 'PO_RECEIVED' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}>
                PO Received
              </Badge>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Badge className={salesCase.status === 'DELIVERED' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}>
                Delivered
              </Badge>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Badge className="bg-gray-200 text-gray-600">
                Closed
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Customer</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link href={`/customers/${salesCase.customer.id}`} className="text-blue-600 hover:text-blue-500">
                      {salesCase.customer.name} ({salesCase.customer.customerNumber})
                    </Link>
                  </dd>
                </div>
                {salesCase.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{salesCase.description}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                  <dd className="mt-1 text-sm text-gray-900">{salesCase.assignedTo || 'Unassigned'}</dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateTime(salesCase.createdAt)}</dd>
                  </div>
                  {salesCase.closedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Closed</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDateTime(salesCase.closedAt)}</dd>
                    </div>
                  )}
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-mb-8">
                  {timeline.map((event, eventIdx) => (
                    <li key={eventIdx}>
                      <div className="relative pb-8">
                        {eventIdx !== timeline.length - 1 && (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                              <span className="text-xs text-white font-medium">
                                {event.type === 'audit' ? 'A' : 'Q'}
                              </span>
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-gray-500">
                                {event.action} by {event.userId}
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              {formatDateTime(event.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estimated Value</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(salesCase.estimatedValue)}
                  </dd>
                </div>
                {salesCase.status === 'CLOSED' && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Actual Value</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {formatCurrency(salesCase.actualValue)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Cost</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {formatCurrency(salesCase.cost)}
                      </dd>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <dt className="text-sm font-medium text-gray-500">Profit</dt>
                      <dd className="mt-1 text-lg font-semibold text-green-600">
                        {formatCurrency(salesCase.actualValue - salesCase.cost)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Margin</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {salesCase.profitMargin.toFixed(1)}%
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Tabs */}
      <SalesCaseDetailTabs 
        salesCaseId={salesCase.id} 
        salesCaseCurrency={salesCase.customer.currency}
        salesCaseStatus={salesCase.status}
        onStatusChange={fetchSalesCase}
      />

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <Select
                  value={newStatus}
                  onValueChange={setNewStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransitions.map(status => (
                      <SelectItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Current:</strong> {getStatusLabel(salesCase.status)}
                  {newStatus && (
                    <>
                      <br />
                      <strong>New:</strong> {getStatusLabel(newStatus)}
                    </>
                  )}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusTransition}
                disabled={submitting || !newStatus}
              >
                {submitting ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Case Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Close Sales Case</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
                <select
                  value={closeData.status}
                  onChange={(e) => setCloseData({ ...closeData, status: e.target.value as 'WON' | 'LOST' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Actual Value</label>
                <input
                  type="number"
                  value={closeData.actualValue}
                  onChange={(e) => setCloseData({ ...closeData, actualValue: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost</label>
                <input
                  type="number"
                  value={closeData.cost}
                  onChange={(e) => setCloseData({ ...closeData, cost: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded-md p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Profit:</span>
                  <span className="font-medium">{formatCurrency(calculateProfit())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Margin:</span>
                  <span className="font-medium">{calculateMargin().toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCloseModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloseSalesCase}
                disabled={submitting}
              >
                {submitting ? 'Closing...' : 'Close Case'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Case Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Sales Case</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign To (User ID)</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Enter user ID"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignSalesCase}
                disabled={submitting}
              >
                {submitting ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}