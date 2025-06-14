'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import type { TrialBalance, TrialBalanceAccount, BalanceSheet, IncomeStatement, AccountBalance } from '@/lib/types/accounting.types'

// Interface moved to central types file

// Interface moved to central types file

export default function TrialBalancePage() {
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [currency, setCurrency] = useState('USD')

  const fetchTrialBalance = async (): Promise<void> => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        asOfDate,
        currency
      })
      
      const response = await fetch(`/api/accounting/reports/trial-balance?${params}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch trial balance')
      }
      
      const data = await response.json()
      setTrialBalance(data.data)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrialBalance()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTrialBalance()
  }

  const groupAccountsByType = (accounts: TrialBalanceAccount[]) => {
    const grouped: Record<string, TrialBalanceAccount[]> = {}
    
    accounts.forEach(account => {
      if (!grouped[account.accountType]) {
        grouped[account.accountType] = []
      }
      grouped[account.accountType].push(account)
    })
    
    return grouped
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Trial Balance Report</h2>
        <p className="text-gray-600">View account balances as of a specific date</p>
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

      {trialBalance && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Trial Balance as of {new Date(trialBalance.asOfDate).toLocaleDateString()}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Currency: {currency}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(groupAccountsByType(trialBalance.accounts)).map(([type, accounts]) => (
                  <React.Fragment key={type}>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-6 py-2 text-sm font-medium text-gray-900">
                        {type}
                      </td>
                    </tr>
                    {accounts.map((account) => (
                      <tr key={account.accountCode}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {account.accountCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {account.accountName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {account.debitBalance > 0 ? account.debitBalance.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {account.creditBalance > 0 ? account.creditBalance.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                <tr className="bg-gray-100 font-medium">
                  <td colSpan={2} className="px-6 py-4 text-sm text-gray-900 text-right">
                    Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {trialBalance.totalDebits.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {trialBalance.totalCredits.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center">
              {trialBalance.isBalanced ? (
                <>
                  <span className="text-green-600 text-sm font-medium">✓ Trial Balance is Balanced</span>
                  <span className="ml-2 text-sm text-gray-500">
                    (Debits = Credits = {trialBalance.totalDebits.toFixed(2)})
                  </span>
                </>
              ) : (
                <>
                  <span className="text-red-600 text-sm font-medium">✗ Trial Balance is NOT Balanced</span>
                  <span className="ml-2 text-sm text-gray-500">
                    (Difference: {Math.abs(trialBalance.totalDebits - trialBalance.totalCredits).toFixed(2)})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !trialBalance && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">Generate a trial balance report to view account balances</p>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Link
          href="/accounting"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Accounting
        </Link>
        {trialBalance && (
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