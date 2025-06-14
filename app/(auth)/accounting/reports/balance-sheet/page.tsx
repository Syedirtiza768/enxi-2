'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AccountBalance {
  id: string
  code: string
  name: string
  type: string
  balance: number
  currency: string
}

interface BalanceSheet {
  asOfDate: string
  currency: string
  assets: AccountBalance[]
  liabilities: AccountBalance[]
  equity: AccountBalance[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  isBalanced: boolean
}

export default function BalanceSheetPage() {
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [currency, setCurrency] = useState('USD')

  const fetchBalanceSheet = async (): Promise<void> => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        asOfDate,
        currency
      })
      
      const response = await fetch(`/api/accounting/reports/balance-sheet?${params}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch balance sheet')
      }
      
      const data = await response.json()
      setBalanceSheet(data.data)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalanceSheet()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBalanceSheet()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Balance Sheet</h2>
        <p className="text-gray-600">Statement of financial position</p>
      </div>

      <form onSubmit={handleGenerateReport} className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">As of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {balanceSheet && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Balance Sheet as of {new Date(balanceSheet.asOfDate).toLocaleDateString()}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Currency: {balanceSheet.currency}</p>
          </div>

          <div className="px-6 py-4">
            {/* Assets Section */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">ASSETS</h4>
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(balanceSheet.assets) ? balanceSheet.assets.map((account) => (
                    <tr key={account.id}>
                      <td className="py-2 text-sm text-gray-900">{account.name}</td>
                      <td className="py-2 text-sm text-right text-gray-900">
                        {formatCurrency(account.balance)}
                      </td>
                    </tr>
                  )) : null}
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2 text-sm font-medium text-gray-900">Total Assets</td>
                    <td className="py-2 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(balanceSheet.totalAssets)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Liabilities Section */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">LIABILITIES</h4>
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(balanceSheet.liabilities) ? balanceSheet.liabilities.map((account) => (
                    <tr key={account.id}>
                      <td className="py-2 text-sm text-gray-900">{account.name}</td>
                      <td className="py-2 text-sm text-right text-gray-900">
                        {formatCurrency(account.balance)}
                      </td>
                    </tr>
                  )) : null}
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2 text-sm font-medium text-gray-900">Total Liabilities</td>
                    <td className="py-2 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(balanceSheet.totalLiabilities)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Equity Section */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">EQUITY</h4>
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(balanceSheet.equity) ? balanceSheet.equity.map((account) => (
                    <tr key={account.id}>
                      <td className="py-2 text-sm text-gray-900">{account.name}</td>
                      <td className="py-2 text-sm text-right text-gray-900">
                        {formatCurrency(account.balance)}
                      </td>
                    </tr>
                  )) : null}
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2 text-sm font-medium text-gray-900">Total Equity</td>
                    <td className="py-2 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(balanceSheet.totalEquity)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Liabilities + Equity */}
            <div className="border-t-4 border-gray-800 pt-4">
              <table className="min-w-full">
                <tbody>
                  <tr>
                    <td className="py-2 text-sm font-bold text-gray-900">
                      TOTAL LIABILITIES + EQUITY
                    </td>
                    <td className="py-2 text-sm text-right font-bold text-gray-900">
                      {formatCurrency(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance Check */}
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              {balanceSheet.isBalanced ? (
                <p className="text-green-600 font-medium">
                  ✓ Balance Sheet is balanced (Assets = Liabilities + Equity)
                </p>
              ) : (
                <p className="text-red-600 font-medium">
                  ✗ Balance Sheet is NOT balanced
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !balanceSheet && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">Generate a balance sheet to view financial position</p>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Link
          href="/accounting"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Accounting
        </Link>
        {balanceSheet && (
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Print Report
          </button>
        )}
      </div>
    </div>
  )
}