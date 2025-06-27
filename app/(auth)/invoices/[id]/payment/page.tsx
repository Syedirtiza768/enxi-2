'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Calendar, DollarSign } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrencyFormatter } from '@/lib/contexts/currency-context'

interface Invoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  customer: {
    id: string
    name: string
  }
}

export default function RecordPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { format: formatCurrency } = useCurrencyFormatter()
  const [isLoading, setIsLoading] = useState(false)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER' as const,
    reference: '',
    notes: ''
  })

  // Fetch invoice data
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const resolvedParams = await params
        const response = await apiClient<Invoice>(`/api/invoices/${resolvedParams.id}`)
        
        // Check if it's an error response
        if ('error' in response) {
          console.error('Failed to fetch invoice:', response.error)
          return
        }
        
        // Extract data from successful response
        const invoiceData = response.data || response
        console.log('Invoice response:', invoiceData)
        setInvoice(invoiceData)
        // Default to full balance amount
        if (invoiceData.balanceAmount !== undefined && invoiceData.balanceAmount !== null) {
          setPaymentData(prev => ({ ...prev, amount: invoiceData.balanceAmount.toString() }))
        }
      } catch (error) {
        console.error('Failed to fetch invoice:', error)
      }
    }
    fetchInvoice()
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoice) return
    
    setIsLoading(true)
    try {
      const payloadData = {
        ...paymentData,
        amount: parseFloat(paymentData.amount)
      }
      console.log('Submitting payment:', payloadData)
      
      const response = await apiClient(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(payloadData)
      })

      console.log('Payment response:', response)

      // Check if it's an error response
      if (response && typeof response === 'object' && 'error' in response) {
        throw new Error(response.error || 'Failed to record payment')
      }

      // Check if response has data property
      const paymentData = response.data || response
      console.log('Payment created:', paymentData)

      // Success - redirect to invoice page
      alert('Payment recorded successfully!')
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      console.error('Error recording payment:', error)
      alert(error instanceof Error ? error.message : 'Failed to record payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const paymentAmount = parseFloat(paymentData.amount) || 0
  const isValidAmount = paymentAmount > 0 && paymentAmount <= invoice.balanceAmount

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoice
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Record Payment</h1>
        <p className="mt-1 text-sm text-gray-600">
          Record a payment for invoice {invoice.invoiceNumber}
        </p>
      </div>

      {/* Invoice Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="font-medium">{invoice.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Invoice Number</p>
            <p className="font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Balance Due</p>
            <p className="font-medium text-red-600">{formatCurrency(invoice.balanceAmount)}</p>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Payment Details</h2>
        
        <div className="space-y-6">
          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Payment Amount
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                required
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                max={invoice.balanceAmount}
              />
            </div>
            {!isValidAmount && paymentData.amount && (
              <p className="mt-1 text-sm text-red-600">
                Amount must be between $0.01 and ${invoice.balanceAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">
              <Calendar className="inline h-4 w-4 mr-1" />
              Payment Date
            </label>
            <input
              type="date"
              id="paymentDate"
              name="paymentDate"
              required
              value={paymentData.paymentDate}
              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
              <CreditCard className="inline h-4 w-4 mr-1" />
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              required
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="PAYPAL">PayPal</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Reference */}
          <div>
            <label htmlFor="reference" className="block text-sm font-medium text-gray-700">
              Reference Number
            </label>
            <input
              type="text"
              id="reference"
              name="reference"
              value={paymentData.reference}
              onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Transaction ID, cheque number, etc."
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional payment details..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !isValidAmount}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}