'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react'

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
  account: Account
  description: string
  debitAmount: number
  creditAmount: number
  currency: string
  exchangeRate: number
  baseDebitAmount: number
  baseCreditAmount: number
}

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  description: string
  reference?: string
  currency: string
  exchangeRate: number
  status: 'DRAFT' | 'POSTED' | 'CANCELLED'
  postedBy?: string
  postedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  lines: JournalLine[]
}

interface JournalEntryDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function JournalEntryDetailPage({ params }: JournalEntryDetailPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadJournalEntry()
  }, [resolvedParams.id])

  const loadJournalEntry = async () => {
    try {
      setLoading(true)
      const response = await apiClient(`/api/accounting/journal-entries/${resolvedParams.id}`, {
        method: 'GET'
      })

      if (response.ok && response.data) {
        const entryData = response.data.data || response.data
        setJournalEntry(entryData)
      } else {
        setError('Failed to load journal entry')
      }
    } catch (error) {
      console.error('Error loading journal entry:', error)
      setError('Error loading journal entry')
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async () => {
    if (!journalEntry || journalEntry.status !== 'DRAFT') return

    try {
      setProcessing(true)
      const response = await apiClient(`/api/accounting/journal-entries/${resolvedParams.id}/post`, {
        method: 'POST'
      })

      if (response.ok) {
        await loadJournalEntry() // Reload to get updated status
      } else {
        setError('Failed to post journal entry')
      }
    } catch (error) {
      console.error('Error posting journal entry:', error)
      setError('Error posting journal entry')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!journalEntry || journalEntry.status !== 'DRAFT') return

    try {
      setProcessing(true)
      const response = await apiClient(`/api/accounting/journal-entries/${resolvedParams.id}/cancel`, {
        method: 'POST'
      })

      if (response.ok) {
        await loadJournalEntry() // Reload to get updated status
      } else {
        setError('Failed to cancel journal entry')
      }
    } catch (error) {
      console.error('Error cancelling journal entry:', error)
      setError('Error cancelling journal entry')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'POSTED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateTotals = () => {
    if (!journalEntry?.lines) return { totalDebit: 0, totalCredit: 0 }
    
    const totalDebit = journalEntry.lines.reduce((sum, line) => sum + line.debitAmount, 0)
    const totalCredit = journalEntry.lines.reduce((sum, line) => sum + line.creditAmount, 0)
    
    return { totalDebit, totalCredit }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Journal Entry</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading journal entry...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !journalEntry) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Journal Entry</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-600">
              {error || 'Journal entry not found'}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { totalDebit, totalCredit } = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/accounting/journal-entries')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journal Entries
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Journal Entry {journalEntry.entryNumber}</h1>
            <p className="text-gray-600">{formatDate(journalEntry.date)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(journalEntry.status)}>
            {journalEntry.status}
          </Badge>
          {journalEntry.status === 'DRAFT' && (
            <>
              <Button 
                onClick={handlePost} 
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {processing ? 'Posting...' : 'Post Entry'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleCancel} 
                disabled={processing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel Entry
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Entry Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Entry Number</label>
              <p className="text-lg font-mono">{journalEntry.entryNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Date</label>
              <p className="text-lg">{formatDate(journalEntry.date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Description</label>
              <p className="text-lg">{journalEntry.description}</p>
            </div>
            {journalEntry.reference && (
              <div>
                <label className="text-sm font-medium text-gray-600">Reference</label>
                <p className="text-lg font-mono">{journalEntry.reference}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Currency</label>
              <p className="text-lg">{journalEntry.currency}</p>
            </div>
            {journalEntry.exchangeRate !== 1 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Exchange Rate</label>
                <p className="text-lg">{journalEntry.exchangeRate}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <div className="mt-1">
                <Badge className={getStatusColor(journalEntry.status)}>
                  {journalEntry.status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Created</label>
              <p className="text-sm">{formatDateTime(journalEntry.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Last Updated</label>
              <p className="text-sm">{formatDateTime(journalEntry.updatedAt)}</p>
            </div>
            {journalEntry.postedAt && (
              <div>
                <label className="text-sm font-medium text-gray-600">Posted</label>
                <p className="text-sm">{formatDateTime(journalEntry.postedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Journal Lines */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntry.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{line.account.code}</div>
                        <div className="text-sm text-gray-600">{line.account.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>{line.description || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Totals Row */}
                <TableRow className="border-t-2 border-gray-300 bg-gray-50 font-medium">
                  <TableCell colSpan={2} className="text-right">
                    <strong>Totals:</strong>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <strong>{formatCurrency(totalDebit)}</strong>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <strong>{formatCurrency(totalCredit)}</strong>
                  </TableCell>
                </TableRow>
                
                {/* Balance Check */}
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                      <span className="text-green-600 font-medium">
                        ✓ Entry is balanced
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">
                        ✗ Entry is not balanced (Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))})
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}