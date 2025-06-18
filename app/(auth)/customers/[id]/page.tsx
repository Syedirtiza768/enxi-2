'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { CustomerDetailTabs } from '@/components/customers/customer-detail-tabs'
import { apiClient } from '@/lib/api/client'

interface Customer {
  id: string
  customerNumber: string
  name: string
  email: string
  phone?: string
  industry?: string
  website?: string
  address?: string
  taxId?: string
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
  salesCases?: SalesCase[]
}

interface CreditCheck {
  customerId: string
  creditLimit: number
  usedCredit: number
  availableCredit: number
  isWithinLimit: boolean
  outstandingInvoices: number
  overdueAmount: number
}

interface SalesCase {
  id: string
  caseNumber: string
  title: string
  status: 'OPEN' | 'WON' | 'LOST'
  estimatedValue: number
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }): React.JSX.Element {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [creditCheck, setCreditCheck] = useState<CreditCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [newCreditLimit, setNewCreditLimit] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchCustomer()
      fetchCreditCheck()
    } else {
      setError('Invalid customer ID')
      setLoading(false)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCustomer = async (): Promise<void> => {
    if (!id || id === 'undefined') {
      setError('Invalid customer ID')
      setLoading(false)
      return
    }
    
    try {
      const response = await apiClient(`/api/customers/${id}`)
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch customer')
      }
      setCustomer(response.data.data)
    } catch (error) {
      console.error('Error fetching customer:', error)
      setError(error instanceof Error ? error.message : 'Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  const fetchCreditCheck = async (): Promise<void> => {
    if (!id || id === 'undefined') return
    
    try {
      const response = await apiClient(`/api/customers/${id}/credit-check`)
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch credit check')
      }
      setCreditCheck(response.data.data)
    } catch (error) {
      console.error('Error fetching credit check:', error)
    }
  }

  const handleUpdateCreditLimit = async (): Promise<void> => {
    if (!id || id === 'undefined') return
    
    setError('')
    setSubmitting(true)

    try {
      const response = await apiClient(`/api/customers/${id}/credit-limit`, {
        method: 'PUT',
        body: JSON.stringify({ creditLimit: newCreditLimit })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to update credit limit')
      }

      setShowCreditModal(false)
      fetchCustomer()
      fetchCreditCheck()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString()
  }

  if (!id || id === 'undefined') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-600 text-lg">Invalid customer ID</div>
        <Link
          href="/customers"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Customers
        </Link>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading customer details...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-600 text-lg">{error}</div>
        <Link
          href="/customers"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Customers
        </Link>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-gray-600 text-lg">Customer not found</div>
        <Link
          href="/customers"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Customers
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Customer #{customer.customerNumber}</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/customers"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Customers
          </Link>
          <button
            onClick={(): void => setEditMode(!editMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {editMode ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-2 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Customer Information</h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.email}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.phone || '-'}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Industry</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.industry || '-'}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {customer.website ? (
                    <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                      {customer.website}
                    </a>
                  ) : '-'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.address || '-'}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Tax ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.taxId || '-'}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Currency</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.currency}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.paymentTerms} days</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(customer.createdAt)}</dd>
              </div>
              {customer.lead && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Converted From</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    Lead: {customer.lead.name}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Credit Information */}
        <div className="space-y-6">
          {/* Credit Status Card */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Credit Status</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              {creditCheck && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">Credit Usage</span>
                      <button
                        onClick={(): void => {
                          setNewCreditLimit(customer.creditLimit)
                          setShowCreditModal(true)
                        }}
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        Update Limit
                      </button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          creditCheck.isWithinLimit ? 'bg-green-600' : 'bg-red-600'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (creditCheck.usedCredit / creditCheck.creditLimit) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-sm">
                      <span className="text-gray-600">
                        {formatCurrency(creditCheck.usedCredit, customer.currency)} used
                      </span>
                      <span className="text-gray-600">
                        {formatCurrency(creditCheck.creditLimit, customer.currency)} limit
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Available Credit</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(creditCheck.availableCredit, customer.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Outstanding</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(creditCheck.outstandingInvoices, customer.currency)}
                      </p>
                    </div>
                  </div>

                  {creditCheck.overdueAmount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">
                        Overdue: {formatCurrency(creditCheck.overdueAmount, customer.currency)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          {customer.account && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Account Information</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Account Code</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.account.code}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Current Balance</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatCurrency(customer.account.balance, customer.currency)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales Cases */}
      {customer.salesCases && customer.salesCases.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Sales Cases</h3>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case Number
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customer.salesCases.map((salesCase) => (
                  <tr key={salesCase.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salesCase.caseNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salesCase.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        salesCase.status === 'OPEN' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : salesCase.status === 'WON'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {salesCase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(salesCase.estimatedValue, customer.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Detail Tabs */}
      <CustomerDetailTabs customerId={customer.id} customerCurrency={customer.currency} />

      {/* Credit Limit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Credit Limit</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Credit Limit ({customer.currency})
              </label>
              <input
                type="number"
                value={newCreditLimit}
                onChange={(e): void => setNewCreditLimit(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={(): void => setShowCreditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCreditLimit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}