'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, FileText, CheckCircle, Clock, Edit, Download,
  Calendar, DollarSign, Building, Package, User, ExternalLink
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
  acceptedBy?: string
  salesOrder?: {
    id: string
    orderNumber: string
    status: string
  } | null
  attachmentUrl?: string
  notes?: string
  createdAt: string
}

export default function CustomerPODetailPage(): React.JSX.Element {
  
  const { formatCurrency } = useCurrency()
const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const poId = params.id as string

  const [po, setPO] = useState<CustomerPO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch PO details
  useEffect(() => {
    const fetchPO = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/customer-pos/${poId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Customer PO not found')
          }
          throw new Error('Failed to load customer PO')
        }

        const data = await response.json()
        setPO(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer PO')
        console.error('Error fetching customer PO:', err)
      } finally {
        setLoading(false)
      }
    }

    if (poId) {
      fetchPO()
    }
  }, [poId])

  const handleAccept = async (): Promise<unknown> => {
    if (!confirm('Are you sure you want to accept this PO? This will create a sales order.')) {
      return
    }

    try {
      setActionLoading('accept')
      const response = await fetch(`/api/customer-pos/${poId}/accept`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to accept PO')
      }

      const result = await response.json()
      setPO(result.customerPO)
      
      // Show success message and navigate
      if (result.salesOrder) {
        alert(`PO accepted successfully! Sales Order ${result.salesOrder.orderNumber} has been created.`)
        router.push(`/sales-orders/${result.salesOrder.id}`)
      } else {
        alert('PO accepted successfully!')
      }
    } catch (error) {
      console.error('Error accepting PO:', error)
      alert('Failed to accept PO')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownload = (url: string): void => {
    window.open(url, '_blank')
  }

  const getStatusBadge = (po: CustomerPO): void => {
    if (po.isAccepted) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
          <CheckCircle className="h-4 w-4" />
          Accepted
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
          <Clock className="h-4 w-4" />
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
          <p className="text-gray-600">Loading customer PO...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !po) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <FileText className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Customer PO not found'}
        </h3>
        <button
          onClick={(): void => router.push('/customer-pos')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customer POs
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <button
              onClick={(): void => router.push('/customer-pos')}
              className="flex items-center hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Customer POs
            </button>
            <span>/</span>
            <span className="text-gray-900">{po.poNumber}</span>
          </div>

          {/* Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Customer PO {po.poNumber}
            </h1>
            {getStatusBadge(po)}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            <span>Created on {formatDate(po.createdAt)}</span>
            {po.isAccepted && po.acceptedAt && (
              <>
                <span className="mx-2">•</span>
                <span>Accepted on {formatDate(po.acceptedAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {!po.isAccepted && (
            <>
              <button
                onClick={handleAccept}
                disabled={actionLoading !== null}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {actionLoading === 'accept' ? 'Accepting...' : 'Accept PO'}
              </button>
              
              <button
                onClick={(): void => router.push(`/customer-pos/${poId}/edit`)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Customer Information
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{po.customer.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{po.customer.email}</dd>
              </div>
            </dl>
          </div>

          {/* PO Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Purchase Order Details
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  PO Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(po.poDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  PO Amount
                </dt>
                <dd className="mt-1 text-sm font-gray-900">{formatCurrency(po.poAmount)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Currency</dt>
                <dd className="mt-1 text-sm text-gray-900">{po.currency}</dd>
              </div>
              {po.attachmentUrl && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Attachment</dt>
                  <dd className="mt-1">
                    <button
                      onClick={(): void => handleDownload(po.attachmentUrl!)}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download PO File
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Notes */}
          {po.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notes</h2>
              <p className="text-sm text-gray-900 whitespace-pre-line">{po.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Records */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Related Records</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Quotation</dt>
                <dd className="mt-1">
                  <button
                    onClick={(): void => router.push(`/quotations/${po.quotation.id}`)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {po.quotation.quotationNumber}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </button>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Sales Case</dt>
                <dd className="mt-1">
                  <button
                    onClick={(): void => router.push(`/sales-cases/${po.salesCase.id}`)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {po.salesCase.caseNumber}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </button>
                  <div className="text-sm text-gray-900 mt-1">{po.salesCase.title}</div>
                </dd>
              </div>

              {po.salesOrder && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Package className="h-4 w-4 mr-1" />
                    Sales Order
                  </dt>
                  <dd className="mt-1">
                    <button
                      onClick={(): void => router.push(`/sales-orders/${po.salesOrder!.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {po.salesOrder.orderNumber}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </button>
                    <div className="text-sm text-gray-900 mt-1">{po.salesOrder.status}</div>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Status Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Status</dt>
                <dd className="mt-1">{getStatusBadge(po)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(po.createdAt)}</dd>
              </div>

              {po.isAccepted && po.acceptedAt && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accepted
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(po.acceptedAt)}</dd>
                  </div>

                  {po.acceptedBy && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Accepted By
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">{po.acceptedBy}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}