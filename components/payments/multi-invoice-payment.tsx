'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { AlertCircle, Calculator } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  isOverdue: boolean
}

interface PaymentAllocation {
  invoiceId: string
  amount: number
}

interface MultiInvoicePaymentProps {
  customerId: string
  customerName: string
  totalAmount: number
  onSuccess: () => void
  onCancel: () => void
}

export function MultiInvoicePayment({
  customerId,
  customerName,
  totalAmount,
  onSuccess,
  onCancel,
}: MultiInvoicePaymentProps) {
  const { formatCurrency } = useCurrency()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [remainingAmount, setRemainingAmount] = useState(totalAmount)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOutstandingInvoices()
  }, [customerId])

  useEffect(() => {
    const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0)
    setRemainingAmount(Math.round((totalAmount - totalAllocated) * 100) / 100)
  }, [allocations, totalAmount])

  const loadOutstandingInvoices = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: any }>(`/api/customers/${customerId}/invoices?status=outstanding`)
      if (response.ok && response.data) {
        const invoiceData = response.data.map((inv: any) => ({
          ...inv,
          balanceAmount: inv.totalAmount - inv.paidAmount,
          isOverdue: new Date(inv.dueDate) < new Date()
        }))
        setInvoices(invoiceData)
      }
    } catch (error) {
      console.error('Failed to load invoices:', error)
      setError('Failed to load outstanding invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleInvoiceToggle = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId)
      const newAllocations = { ...allocations }
      delete newAllocations[invoiceId]
      setAllocations(newAllocations)
    } else {
      newSelected.add(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const handleAllocationChange = (invoiceId: string, value: string) => {
    const amount = value === '' ? 0 : parseFloat(value)
    if (!isNaN(amount) && amount >= 0) {
      const invoice = invoices.find(inv => inv.id === invoiceId)
      if (invoice && amount <= invoice.balanceAmount) {
        setAllocations(prev => ({ ...prev, [invoiceId]: amount }))
      }
    }
  }

  const autoAllocate = () => {
    let remaining = totalAmount
    const newAllocations: Record<string, number> = {}
    const newSelected = new Set<string>()

    // Sort invoices by due date (oldest first)
    const sortedInvoices = [...invoices].sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )

    for (const invoice of sortedInvoices) {
      if (remaining <= 0) break
      
      const allocation = Math.min(remaining, invoice.balanceAmount)
      if (allocation > 0) {
        newAllocations[invoice.id] = Math.round(allocation * 100) / 100
        newSelected.add(invoice.id)
        remaining -= allocation
      }
    }

    setAllocations(newAllocations)
    setSelectedInvoices(newSelected)
  }

  const allocateProportionally = () => {
    const selectedInvoicesList = invoices.filter(inv => selectedInvoices.has(inv.id))
    if (selectedInvoicesList.length === 0) return

    const totalSelectedBalance = selectedInvoicesList.reduce((sum, inv) => sum + inv.balanceAmount, 0)
    const newAllocations: Record<string, number> = {}

    selectedInvoicesList.forEach(invoice => {
      const proportion = invoice.balanceAmount / totalSelectedBalance
      const allocation = Math.min(totalAmount * proportion, invoice.balanceAmount)
      newAllocations[invoice.id] = Math.round(allocation * 100) / 100
    })

    setAllocations(newAllocations)
  }

  const clearAllocations = () => {
    setAllocations({})
    setSelectedInvoices(new Set())
  }

  const getTotalAllocated = () => {
    return Object.values(allocations).reduce((sum, amount) => sum + amount, 0)
  }

  const isValid = () => {
    const totalAllocated = getTotalAllocated()
    return totalAllocated > 0 && Math.abs(totalAllocated - totalAmount) < 0.01
  }

  if (loading) {
    return <div className="text-center py-8">Loading outstanding invoices...</div>
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <h2 className="text-2xl font-semibold">Allocate Payment</h2>
        <div className="text-sm text-gray-600">
          <div>Customer: <span className="font-medium">{customerName}</span></div>
          <div>Payment Amount: <span className="font-medium">{formatCurrency(totalAmount)}</span></div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Allocation Tools */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={autoAllocate}
          >
            <Calculator className="h-4 w-4 mr-1" />
            Auto-Allocate (FIFO)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={allocateProportionally}
            disabled={selectedInvoices.size === 0}
          >
            Allocate Proportionally
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllocations}
          >
            Clear All
          </Button>
        </div>

        {/* Invoice List */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600 pb-2 border-b">
            <div className="col-span-1"></div>
            <div className="col-span-2">Invoice #</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-3 text-right">Allocation</div>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No outstanding invoices</div>
          ) : (
            invoices.map(invoice => (
              <div key={invoice.id} className="grid grid-cols-12 gap-4 items-center py-2 hover:bg-gray-50 rounded">
                <div className="col-span-1">
                  <Checkbox
                    checked={selectedInvoices.has(invoice.id)}
                    onCheckedChange={() => handleInvoiceToggle(invoice.id)}
                  />
                </div>
                <div className="col-span-2 font-medium">{invoice.invoiceNumber}</div>
                <div className="col-span-2 text-sm">
                  {new Date(invoice.invoiceDate).toLocaleDateString()}
                </div>
                <div className="col-span-2 text-sm">
                  <span className={invoice.isOverdue ? 'text-red-600' : ''}>
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="col-span-2 text-right font-medium">
                  {formatCurrency(invoice.balanceAmount)}
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={invoice.balanceAmount}
                    value={allocations[invoice.id] || ''}
                    onChange={(e) => handleAllocationChange(invoice.id, e.target.value)}
                    disabled={!selectedInvoices.has(invoice.id)}
                    className="text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Payment Amount:</span>
            <span className="font-medium">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Allocated:</span>
            <span className="font-medium">{formatCurrency(getTotalAllocated())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining:</span>
            <span className={`font-medium ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(remainingAmount)}
            </span>
          </div>
        </div>

        {!isValid() && getTotalAllocated() > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The total allocated amount must equal the payment amount.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onSuccess}
            disabled={!isValid()}
            className="flex-1"
          >
            Apply Allocation
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}