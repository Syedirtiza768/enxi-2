'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { IncomeStatement } from '@/lib/types/accounting.types'

export default function IncomeStatementPage() {
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Default to current month
  const currentDate = new Date()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  const [fromDate, setFromDate] = useState(firstDayOfMonth.toISOString().split('T')[0])
  const [toDate, setToDate] = useState(lastDayOfMonth.toISOString().split('T')[0])
  const [currency, setCurrency] = useState('USD')

  const fetchIncomeStatement = async (): Promise<void> => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        currency
      })
      
      const response = await fetch(`/api/accounting/reports/income-statement?${params}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch income statement')
      }
      
      const data = await response.json()
      setIncomeStatement(data.data)
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch income statement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncomeStatement()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault()
    fetchIncomeStatement()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0.0%'
    return ((value / total) * 100).toFixed(1) + '%'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Income Statement</h2>
        <p className="text-gray-600">Profit and loss statement for a period</p>
      </div>

      <form onSubmit={handleGenerateReport} className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
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

      {incomeStatement && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Income Statement
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              For the period from {new Date(incomeStatement.startDate).toLocaleDateString()} to {new Date(incomeStatement.endDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">Currency: {currency}</p>
          </div>

          <div className="px-6 py-4">
            {/* Income Section */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">INCOME</h4>
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-200">
                  {incomeStatement.income.accounts.map((account) => (
                    <tr key={account.accountCode}>
                      <td className="py-2 text-sm text-gray-900">{account.accountName}</td>
                      <td className="py-2 text-sm text-right text-gray-900">
                        {formatCurrency(account.balance)}
                      </td>
                      <td className="py-2 text-sm text-right text-gray-500">
                        {formatPercentage(account.balance, incomeStatement.totalIncome)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2 text-sm font-medium text-gray-900">Total Income</td>
                    <td className="py-2 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(incomeStatement.totalIncome)}
                    </td>
                    <td className="py-2 text-sm text-right font-medium text-gray-500">
                      100.0%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expenses Section */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">EXPENSES</h4>
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-200">
                  {incomeStatement.expenses.accounts.map((account) => (
                    <tr key={account.accountCode}>
                      <td className="py-2 text-sm text-gray-900">{account.accountName}</td>
                      <td className="py-2 text-sm text-right text-gray-900">
                        {formatCurrency(account.balance)}
                      </td>
                      <td className="py-2 text-sm text-right text-gray-500">
                        {formatPercentage(account.balance, incomeStatement.totalIncome)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2 text-sm font-medium text-gray-900">Total Expenses</td>
                    <td className="py-2 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(incomeStatement.totalExpenses)}
                    </td>
                    <td className="py-2 text-sm text-right font-medium text-gray-500">
                      {formatPercentage(incomeStatement.totalExpenses, incomeStatement.totalIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net Income */}
            <div className="border-t-4 border-gray-800 pt-4">
              <table className="min-w-full">
                <tbody>
                  <tr>
                    <td className="py-2 text-lg font-bold text-gray-900">
                      NET INCOME {incomeStatement.netIncome < 0 ? '(LOSS)' : ''}
                    </td>
                    <td className={`py-2 text-lg text-right font-bold ${
                      incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(incomeStatement.netIncome)}
                    </td>
                    <td className="py-2 text-sm text-right font-medium text-gray-500">
                      {formatPercentage(incomeStatement.netIncome, incomeStatement.totalIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Metrics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Gross Margin</p>
                <p className="text-lg font-semibold">
                  {incomeStatement.totalIncome > 0 
                    ? formatPercentage(incomeStatement.netIncome, incomeStatement.totalIncome)
                    : '0.0%'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Operating Ratio</p>
                <p className="text-lg font-semibold">
                  {incomeStatement.totalIncome > 0
                    ? formatPercentage(incomeStatement.totalExpenses, incomeStatement.totalIncome)
                    : '0.0%'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Period Days</p>
                <p className="text-lg font-semibold">
                  {Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !incomeStatement && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">Generate an income statement to view profitability</p>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Link
          href="/accounting"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Accounting
        </Link>
        {incomeStatement && (
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