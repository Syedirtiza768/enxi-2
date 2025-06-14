'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Account {
  id: string
  code: string
  name: string
  type: string
  currency: string
}

interface JournalLine {
  id: string
  accountId: string
  description: string
  debitAmount: number
  creditAmount: number
}

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  description: string
  reference?: string
  status: string
  lines: JournalLine[]
  createdAt: string
}

export default function JournalEntriesPage(): React.JSX.Element {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<Omit<JournalLine, 'id'>[]>([
    { accountId: '', description: '', debitAmount: 0, creditAmount: 0 },
    { accountId: '', description: '', debitAmount: 0, creditAmount: 0 }
  ])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchEntries()
    fetchAccounts()
  }, [])

  const fetchEntries = async (): Promise<void> => {
    try {
      const response = await fetch('/api/accounting/journal-entries')
      if (!response.ok) throw new Error('Failed to fetch entries')
      const data = await response.json()
      setEntries(data.data || [])
    } catch (error) {
      console.error('Failed to fetch entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async (): Promise<void> => {
    try {
      const response = await fetch('/api/accounting/accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')
      const data = await response.json()
      setAccounts(data.data || [])
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const addLine = (): void => {
    setLines([...lines, { accountId: '', description: '', debitAmount: 0, creditAmount: 0 }])
  }

  const removeLine = (index: number): void => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const updateLine = (index: number, field: keyof typeof lines[0], value: string | number): void => {
    const updatedLines = [...lines]
    updatedLines[index] = { ...updatedLines[index], [field]: value }
    setLines(updatedLines)
  }

  const calculateTotals = (): void => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0)
    const totalCredit = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0)
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 }
  }

  const handleSubmit = async (e: React.FormEvent): void => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { isBalanced } = calculateTotals()
    if (!isBalanced) {
      setError('Journal entry must be balanced (debits must equal credits)')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          description,
          reference,
          currency: 'USD',
          lines: lines.filter(line => line.accountId && (line.debitAmount > 0 || line.creditAmount > 0))
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create journal entry')
      }

      setShowForm(false)
      resetForm()
      fetchEntries()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to create journal entry')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = (): void => {
    setDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setReference('')
    setLines([
      { accountId: '', description: '', debitAmount: 0, creditAmount: 0 },
      { accountId: '', description: '', debitAmount: 0, creditAmount: 0 }
    ])
    setError('')
  }

  const postEntry = async (entryId: string): void => {
    try {
      const response = await fetch(`/api/accounting/journal-entries/${entryId}/post`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to post entry')
      fetchEntries()
    } catch (error) {
      console.error('Failed to post entry:', error)
    }
  }

  const { totalDebit, totalCredit, isBalanced } = calculateTotals()

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Journal Entries</h2>
        <button
          onClick={(): void => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'New Entry'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Create Journal Entry</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e): void => setDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e): void => setDescription(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e): void => setReference(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Journal Lines</label>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Add Line
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Debit
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credit
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <select
                            value={line.accountId}
                            onChange={(e): void => updateLine(index, 'accountId', e.target.value)}
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Select Account</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e): void => updateLine(index, 'description', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.debitAmount || ''}
                            onChange={(e): void => updateLine(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.creditAmount || ''}
                            onChange={(e): void => updateLine(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {lines.length > 2 && (
                            <button
                              type="button"
                              onClick={(): void => removeLine(index)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-medium">
                      <td colSpan={2} className="px-3 py-2 text-right">Totals:</td>
                      <td className="px-3 py-2 text-right">{totalDebit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{totalCredit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        {isBalanced ? (
                          <span className="text-green-600 text-sm">✓ Balanced</span>
                        ) : (
                          <span className="text-red-600 text-sm">✗ Unbalanced</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
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
                disabled={submitting || !isBalanced}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entry #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.entryNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(entry.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.reference || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    entry.status === 'POSTED' 
                      ? 'bg-green-100 text-green-800'
                      : entry.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {entry.status === 'DRAFT' && (
                    <button
                      onClick={(): void => postEntry(entry.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Post
                    </button>
                  )}
                  <Link
                    href={`/accounting/journal-entries/${entry.id}`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}