'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface BankTransaction {
  id: string
  date: string
  description: string
  reference: string
  amount: number
  type: 'DEBIT' | 'CREDIT'
  matched: boolean
  matchedPaymentId?: string
}

interface SystemPayment {
  id: string
  paymentNumber: string
  paymentDate: string
  amount: number
  reference: string | null
  paymentMethod: string
  customerName: string
  reconciled: boolean
  reconciledDate?: string
}

interface ReconciliationMatch {
  bankTransactionId: string
  paymentId: string
  confidence: number
  matchType: 'EXACT' | 'PARTIAL' | 'MANUAL'
}

interface BankReconciliationProps {
  bankAccountId?: string
  startDate: string
  endDate: string
  openingBalance: number
  closingBalance: number
}

export function BankReconciliation({
  bankAccountId,
  startDate,
  endDate,
  openingBalance,
  closingBalance
}: BankReconciliationProps) {
  const { formatCurrency } = useCurrency()
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [systemPayments, setSystemPayments] = useState<SystemPayment[]>([])
  const [matches, setMatches] = useState<ReconciliationMatch[]>([])
  const [selectedBankTransaction, setSelectedBankTransaction] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoMatching, setAutoMatching] = useState(false)
  const [reconciling, setReconciling] = useState(false)

  useEffect(() => {
    loadReconciliationData()
  }, [startDate, endDate])

  const loadReconciliationData = async (): Promise<void> => {
    setLoading(true)
    try {
      // Load bank transactions (in real app, this would come from bank API/import)
      const bankParams = new URLSearchParams({
        startDate,
        endDate,
        ...(bankAccountId && { bankAccountId })
      })
      const bankResponse = await apiClient<BankTransaction[] | { data: BankTransaction[] }>(
        `/api/bank-transactions?${bankParams}`
      )
      
      // Load system payments
      const paymentParams = new URLSearchParams({
        startDate,
        endDate,
        paymentMethods: 'BANK_TRANSFER,WIRE_TRANSFER,CHECK',
        reconciled: 'false'
      })
      const paymentsResponse = await apiClient<SystemPayment[] | { data: SystemPayment[] }>(
        `/api/payments?${paymentParams}`
      )

      if (bankResponse.ok && paymentsResponse.ok) {
        const bankData = bankResponse.data
        const paymentsData = paymentsResponse.data
        
        setBankTransactions(
          Array.isArray(bankData) ? bankData : (bankData?.data || [])
        )
        setSystemPayments(
          Array.isArray(paymentsData) ? paymentsData : (paymentsData?.data || [])
        )
      }
    } catch (error) {
      console.error('Failed to load reconciliation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAutoMatch = async (): Promise<void> => {
    setAutoMatching(true)
    try {
      const response = await apiClient<{ matches: ReconciliationMatch[] }>('/api/reconciliation/auto-match', {
        method: 'POST',
        body: JSON.stringify({
          bankTransactions,
          systemPayments,
          matchingRules: {
            allowDateDifference: 3, // days
            allowAmountDifference: 0.01,
            useReference: true,
            useAmount: true
          }
        })
      })

      if (response.ok && response?.data) {
        const matchData = response?.data.matches || []
        setMatches(matchData)
        
        // Update matched status
        const matchedBankIds = new Set(matchData.map((m: ReconciliationMatch) => m.bankTransactionId))
        const matchedPaymentIds = new Set(matchData.map((m: ReconciliationMatch) => m.paymentId))
        
        setBankTransactions(prev => prev.map(t => ({
          ...t,
          matched: matchedBankIds.has(t.id),
          matchedPaymentId: matchData.find((m: ReconciliationMatch) => m.bankTransactionId === t.id)?.paymentId
        })))
        
        setSystemPayments(prev => prev.map(p => ({
          ...p,
          reconciled: matchedPaymentIds.has(p.id)
        })))
      }
    } catch (error) {
      console.error('Auto-matching failed:', error)
    } finally {
      setAutoMatching(false)
    }
  }

  const handleManualMatch = () => {
    if (!selectedBankTransaction || !selectedPayment) return

    const newMatch: ReconciliationMatch = {
      bankTransactionId: selectedBankTransaction,
      paymentId: selectedPayment,
      confidence: 100,
      matchType: 'MANUAL'
    }

    setMatches(prev => [...prev, newMatch])
    
    // Update matched status
    setBankTransactions(prev => prev.map(t => 
      t.id === selectedBankTransaction 
        ? { ...t, matched: true, matchedPaymentId: selectedPayment }
        : t
    ))
    
    setSystemPayments(prev => prev.map(p => 
      p.id === selectedPayment 
        ? { ...p, reconciled: true }
        : p
    ))

    // Clear selections
    setSelectedBankTransaction(null)
    setSelectedPayment(null)
  }

  const handleUnmatch = (match: ReconciliationMatch) => {
    setMatches(prev => prev.filter(m => m !== match))
    
    // Update matched status
    setBankTransactions(prev => prev.map(t => 
      t.id === match.bankTransactionId 
        ? { ...t, matched: false, matchedPaymentId: undefined }
        : t
    ))
    
    setSystemPayments(prev => prev.map(p => 
      p.id === match.paymentId 
        ? { ...p, reconciled: false }
        : p
    ))
  }

  const handleReconcile = async (): Promise<void> => {
    setReconciling(true)
    try {
      const response = await apiClient<{ data: any }>('/api/reconciliation/complete', {
        method: 'POST',
        body: JSON.stringify({
          matches,
          startDate,
          endDate,
          openingBalance,
          closingBalance,
          bankAccountId
        })
      })

      if (response.ok) {
        // Refresh data
        loadReconciliationData()
      }
    } catch (error) {
      console.error('Reconciliation failed:', error)
    } finally {
      setReconciling(false)
    }
  }

  const calculateSummary = () => {
    const totalBankDebits = bankTransactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalBankCredits = bankTransactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalSystemPayments = systemPayments
      .reduce((sum, p) => sum + p.amount, 0)
    
    const matchedBankAmount = bankTransactions
      .filter(t => t.matched && t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const matchedSystemAmount = systemPayments
      .filter(p => p.reconciled)
      .reduce((sum, p) => sum + p.amount, 0)
    
    const unmatchedBankTransactions = bankTransactions.filter(t => !t.matched && t.type === 'CREDIT')
    const unmatchedSystemPayments = systemPayments.filter(p => !p.reconciled)
    
    const calculatedBalance = openingBalance - totalBankDebits + totalBankCredits
    const balanceDifference = closingBalance - calculatedBalance

    return {
      totalBankDebits,
      totalBankCredits,
      totalSystemPayments,
      matchedBankAmount,
      matchedSystemAmount,
      unmatchedBankCount: unmatchedBankTransactions.length,
      unmatchedSystemCount: unmatchedSystemPayments.length,
      calculatedBalance,
      balanceDifference,
      isBalanced: Math.abs(balanceDifference) < 0.01
    }
  }

  const summary = calculateSummary()

  if (loading) {
    return <div className="text-center py-8">Loading reconciliation data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Reconciliation Summary</h3>
          <p className="text-sm text-gray-600">
            Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Opening Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(openingBalance)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Credits</p>
              <p className="text-lg font-semibold text-green-600">+{formatCurrency(summary.totalBankCredits)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Debits</p>
              <p className="text-lg font-semibold text-red-600">-{formatCurrency(summary.totalBankDebits)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Closing Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(closingBalance)}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Calculated Balance</p>
                <p className="font-semibold">{formatCurrency(summary.calculatedBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Difference</p>
                <p className={`font-semibold ${summary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(summary.balanceDifference))}
                </p>
              </div>
              <Badge variant={summary.isBalanced ? 'default' : 'destructive'}>
                {summary.isBalanced ? 'Balanced' : 'Not Balanced'}
              </Badge>
            </div>
          </div>

          {/* Matching Status */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Bank Transactions</span>
                <Badge variant="outline">
                  {bankTransactions.filter(t => t.matched && t.type === 'CREDIT').length} / {bankTransactions.filter(t => t.type === 'CREDIT').length}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">
                {summary.unmatchedBankCount} unmatched credits
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">System Payments</span>
                <Badge variant="outline">
                  {systemPayments.filter(p => p.reconciled).length} / {systemPayments.length}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">
                {summary.unmatchedSystemCount} unreconciled
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={runAutoMatch}
              disabled={autoMatching}
              variant="outline"
            >
              {autoMatching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Matching...
                </>
              ) : (
                'Auto-Match Transactions'
              )}
            </Button>
            <Button
              onClick={handleReconcile}
              disabled={reconciling || !summary.isBalanced || matches.length === 0}
            >
              Complete Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Matching */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bank Transactions */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Bank Transactions</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {bankTransactions
                .filter(t => t.type === 'CREDIT' && !t.matched)
                .map(transaction => (
                  <div
                    key={transaction.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBankTransaction === transaction.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedBankTransaction(transaction.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(transaction.date).toLocaleDateString()}
                          {transaction.reference && ` • ${transaction.reference}`}
                        </p>
                      </div>
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* System Payments */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">System Payments</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {systemPayments
                .filter(p => !p.reconciled)
                .map(payment => (
                  <div
                    key={payment.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPayment === payment.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPayment(payment.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{payment.customerName}</p>
                        <p className="text-xs text-gray-600">
                          {payment.paymentNumber} • {new Date(payment.paymentDate).toLocaleDateString()}
                          {payment.reference && ` • ${payment.reference}`}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Match Button */}
      {selectedBankTransaction && selectedPayment && (
        <div className="flex justify-center">
          <Button onClick={handleManualMatch}>
            Match Selected Transactions
          </Button>
        </div>
      )}

      {/* Matched Transactions */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Matched Transactions</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matches.map((match, index) => {
                const bankTransaction = bankTransactions.find(t => t.id === match.bankTransactionId)
                const payment = systemPayments.find(p => p.id === match.paymentId)
                
                if (!bankTransaction || !payment) return null
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{bankTransaction.description}</span>
                          <span className="mx-2">↔</span>
                          <span className="font-medium">{payment.customerName} ({payment.paymentNumber})</span>
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(bankTransaction.amount)} • 
                          {match.matchType === 'EXACT' ? 'Auto-matched' : 'Manual match'} • 
                          {match.confidence}% confidence
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnmatch(match)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}