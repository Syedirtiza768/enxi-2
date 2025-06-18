'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createExpenseSchema, type CreateExpenseData } from '@/lib/validators/sales-case.validator'
import { apiClient } from '@/lib/api/client'
import { format } from 'date-fns'
import { Plus, Check, X, AlertCircle } from 'lucide-react'

interface CaseExpense {
  id: string
  description: string
  amount: number
  currency: string
  category: string
  expenseDate: string
  needsApproval: boolean
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  createdAt: string
  createdBy: string
}

interface ExpenseManagerProps {
  salesCaseId: string
  salesCaseCurrency: string
  onExpenseUpdate?: () => void
}

const expenseCategories = [
  'Diagnostic Services',
  'Engine Parts',
  'Labor - Technician',
  'Labor - Specialist',
  'Travel - Service Call',
  'Equipment Rental',
  'Subcontractor Services',
  'Expedited Shipping',
  'Warranty Parts',
  'Emergency Response',
  'Testing & Analysis',
  'Certification Fees',
  'Environmental Disposal',
  'Other'
]

export function ExpenseManager({ salesCaseId, salesCaseCurrency, onExpenseUpdate }: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState<CaseExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<CreateExpenseData>({
    description: '',
    amount: 0,
    currency: salesCaseCurrency,
    category: '',
    expenseDate: new Date().toISOString(),
    needsApproval: false
  })

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient<{ data: any[] }>(`/api/sales-cases/${salesCaseId}/expenses`, { method: 'GET' })
      if (response.ok && response?.data) {
        const expensesData = response?.data.data || response?.data
        setExpenses(Array.isArray(expensesData) ? expensesData : [])
      }
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }, [salesCaseId])

  useEffect(() => {
    fetchExpenses()
  }, [salesCaseId, fetchExpenses])

  const handleChange = (field: keyof CreateExpenseData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)

    try {
      // Validate form data
      const validatedData = createExpenseSchema.parse(formData)
      
      // Submit to API
      const response = await apiClient(`/api/sales-cases/${salesCaseId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(validatedData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create expense')
      }

      // Success
      setShowAddDialog(false)
      setFormData({
        description: '',
        amount: 0,
        currency: salesCaseCurrency,
        category: '',
        expenseDate: new Date().toISOString(),
        needsApproval: false
      })
      fetchExpenses()
      if (onExpenseUpdate) onExpenseUpdate()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errors' in error) {
        // Zod validation errors
        const fieldErrors: Record<string, string> = {}
        const zodError = error as { errors: { path: (string | number)[]; message: string }[] }
        zodError.errors.forEach((err: { path: (string | number)[]; message: string }) => {
          if (err.path[0]) {
            fieldErrors[err.path[0]] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setErrors({ general: error instanceof Error ? error.message : 'Failed to create expense' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (expenseId: string) => {
    try {
      const response = await apiClient(`/api/expenses/${expenseId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ 
          approvedBy: 'current-user', // TODO: Get from auth context
          approvalNotes: 'Approved via UI'
        })
      })

      if (response.ok) {
        fetchExpenses()
        if (onExpenseUpdate) onExpenseUpdate()
      }
} catch (error) {
      console.error('Error:', error);
    }
    }

  const handleReject = async (expenseId: string, reason: string) => {
    try {
      const response = await apiClient(`/api/expenses/${expenseId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ 
          rejectedBy: 'current-user', // TODO: Get from auth context
          rejectionReason: reason
        })
      })

      if (response.ok) {
        fetchExpenses()
        if (onExpenseUpdate) onExpenseUpdate()
      }
} catch (error) {
      console.error('Error:', error);
    }
    }

  const formatCurrency = (amount: number, currency: string = salesCaseCurrency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getStatusBadge = (expense: CaseExpense) => {
    if (!expense.needsApproval) {
      return <Badge className="bg-green-100 text-green-800">No Approval Needed</Badge>
    }

    switch (expense.approvalStatus) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
    }
  }

  const totalExpenses = expenses.reduce((sum, exp) => {
    // Only count approved expenses or those that don't need approval
    if (!exp.needsApproval || exp.approvalStatus === 'APPROVED') {
      return sum + exp.amount
    }
    return sum
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Expenses</h3>
          <p className="text-sm text-gray-500">
            Total: {formatCurrency(totalExpenses)} (approved only)
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Record an expense for this sales case
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errors.general}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                  disabled={submitting}
                >
                  <SelectTrigger 
                    id="category" 
                    className={errors.category ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className={errors.description ? 'border-red-500' : ''}
                  disabled={submitting}
                  rows={2}
                  placeholder="Describe the expense..."
                />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                    className={errors.amount ? 'border-red-500' : ''}
                    disabled={submitting}
                  />
                  {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Date</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate ? formData.expenseDate.split('T')[0] : ''}
                    onChange={(e) => handleChange('expenseDate', e.target.value + 'T00:00:00.000Z')}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="needsApproval"
                  checked={formData.needsApproval}
                  onChange={(e) => handleChange('needsApproval', e.target.checked)}
                  disabled={submitting}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="needsApproval" className="text-sm">
                  Requires approval
                </Label>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            No expenses recorded yet
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.expenseDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>
                      {expense.description}
                      {expense.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">
                          Rejected: {expense.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(expense)}</TableCell>
                    <TableCell>
                      {expense.needsApproval && expense.approvalStatus === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleApprove(expense.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              const reason = window.prompt('Rejection reason:')
                              if (reason) handleReject(expense.id, reason)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}