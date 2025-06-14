'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  VStack, 
  HStack, 
  Input, 
  Textarea, 
  Button, 
  Select, 
  Text, 
  Card, 
  CardContent,
  Grid
} from '@/components/design-system'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  AlertTriangle, 
 
  DollarSign, 
  Calendar, 
  CreditCard,
  FileText
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface Supplier {
  id: string
  name: string
  code: string
  supplierNumber: string
  currency?: string
  paymentTerms?: string
}

interface SupplierInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  currency: string
  status: string
}

interface Account {
  id: string
  accountNumber: string
  accountName: string
  accountType: string
}

interface SupplierPaymentFormData {
  supplierId: string
  supplierInvoiceId?: string
  amount: number
  paymentDate: string
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'CASH' | 'WIRE_TRANSFER'
  reference?: string
  notes?: string
  currency: string
  exchangeRate?: number
  bankAccountId: string
}

interface SupplierPaymentFormProps {
  supplierPayment?: SupplierPaymentFormData & { id: string }
  preSelectedSupplierId?: string
  preSelectedInvoiceId?: string
  onSuccess?: () => void
}

export function SupplierPaymentForm({ 
  supplierPayment, 
  preSelectedSupplierId,
  preSelectedInvoiceId,
  onSuccess 
}: SupplierPaymentFormProps) {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null)
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  
  const [formData, setFormData] = useState<SupplierPaymentFormData>({
    supplierId: supplierPayment?.supplierId || preSelectedSupplierId || '',
    supplierInvoiceId: supplierPayment?.supplierInvoiceId || preSelectedInvoiceId || undefined,
    amount: supplierPayment?.amount || 0,
    paymentDate: supplierPayment?.paymentDate ? new Date(supplierPayment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    paymentMethod: supplierPayment?.paymentMethod || 'BANK_TRANSFER',
    reference: supplierPayment?.reference || '',
    notes: supplierPayment?.notes || '',
    currency: supplierPayment?.currency || 'USD',
    exchangeRate: supplierPayment?.exchangeRate || 1.0,
    bankAccountId: supplierPayment?.bankAccountId || ''
  })

  const fetchSupplier = useCallback(async (supplierId: string) => {
    try {
      const response = await apiClient<Supplier>(`/api/suppliers/${supplierId}`, { method: 'GET' })
      if (response.ok && response.data) {
        const supplier = response.data
        setSelectedSupplier(supplier)
        
        if (!formData.currency && supplier.currency) {
          setFormData(prev => ({
            ...prev,
            currency: supplier.currency
          }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch supplier:', error)
    }
  }, [formData.currency])

  useEffect(() => {
    Promise.all([
      fetchSuppliers(),
      fetchBankAccounts()
    ])
    
    if (formData.supplierId) {
      fetchSupplier(formData.supplierId)
      fetchSupplierInvoices(formData.supplierId)
    }
  }, [formData.supplierId])

  useEffect(() => {
    if (formData.supplierId && formData.supplierId !== selectedSupplier?.id) {
      fetchSupplier(formData.supplierId)
      fetchSupplierInvoices(formData.supplierId)
    }
  }, [fetchSupplier, formData.supplierId, selectedSupplier?.id])

  useEffect(() => {
    if (formData.supplierInvoiceId) {
      const invoice = supplierInvoices.find(inv => inv.id === formData.supplierInvoiceId)
      setSelectedInvoice(invoice || null)
      if (invoice && formData.amount === 0) {
        setFormData(prev => ({
          ...prev,
          amount: invoice.balanceAmount,
          currency: invoice.currency
        }))
      }
    } else {
      setSelectedInvoice(null)
    }
  }, [formData.supplierInvoiceId, formData.amount, supplierInvoices])

  const fetchSuppliers = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: Supplier[]; total?: number } | Supplier[]>('/api/suppliers?status=active', { method: 'GET' })
      if (response.ok && response.data) {
        const suppliersData = response.data
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : (suppliersData.data || []))
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }


  const fetchSupplierInvoices = async (supplierId: string) => {
    try {
      const response = await apiClient<{ data: SupplierInvoice[]; total?: number } | SupplierInvoice[]>(`/api/supplier-invoices?supplierId=${supplierId}&status=POSTED`, { method: 'GET' })
      if (response.ok && response.data) {
        const invoicesData = response.data
        const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData.data || [])
        // Filter to show only invoices with outstanding balance
        const unpaidInvoices = invoices.filter((inv: SupplierInvoice) => inv.balanceAmount > 0.01)
        setSupplierInvoices(unpaidInvoices)
      }
    } catch (error) {
      console.error('Failed to fetch supplier invoices:', error)
    }
  }

  const fetchBankAccounts = async (): Promise<number> => {
    try {
      const response = await apiClient<{ data: Account[]; total?: number } | Account[]>('/api/accounting/accounts?type=ASSET&subType=BANK', { method: 'GET' })
      if (response.ok && response.data) {
        const accountsData = response.data
        setBankAccounts(Array.isArray(accountsData) ? accountsData : (accountsData.data || []))
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form
      if (!formData.supplierId || !formData.amount || !formData.paymentMethod || !formData.bankAccountId) {
        throw new Error('Supplier, amount, payment method, and bank account are required')
      }

      if (formData.amount <= 0) {
        throw new Error('Payment amount must be greater than 0')
      }

      if (selectedInvoice && formData.amount > selectedInvoice.balanceAmount) {
        throw new Error(`Payment amount cannot exceed invoice balance of ${formatCurrency(selectedInvoice.balanceAmount)}`)
      }

      const url = supplierPayment ? `/api/supplier-payments/${supplierPayment.id}` : '/api/supplier-payments'
      const method = supplierPayment ? 'PUT' : 'POST'

      const response = await apiClient<{ success: boolean; paymentId?: string }>(url, {
        method,
        body: JSON.stringify({
          ...formData,
          supplierInvoiceId: formData.supplierInvoiceId || null
        })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to save supplier payment')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/supplier-payments')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to process payment')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess()
    } else {
      router.back()
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    supplier.code.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    supplier.supplierNumber.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  const getOverdueStatus = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return <Badge className="bg-red-100 text-red-800">Overdue ({Math.abs(diffDays)} days)</Badge>
    } else if (diffDays <= 7) {
      return <Badge className="bg-yellow-100 text-yellow-800">Due Soon ({diffDays} days)</Badge>
    }
    return null
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap="xl">
        {error && (
          <Card variant="outlined" className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <HStack gap="sm" align="center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <Text color="error">{error}</Text>
              </HStack>
            </CardContent>
          </Card>
        )}

        {/* Supplier Selection */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Supplier Information</Text>
              
              <Grid cols={2} gap="lg">
                <VStack gap="sm">
                  <Text size="sm" weight="medium">Supplier *</Text>
                  <VStack gap="xs">
                    <Input
                      placeholder="Search suppliers..."
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      leftIcon={<Search />}
                    />
                    <Select
                      value={formData.supplierId}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                      required
                    >
                      <option value="">Select supplier...</option>
                      {filteredSuppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.code})
                        </option>
                      ))}
                    </Select>
                  </VStack>
                </VStack>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Currency</Text>
                  <Select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </VStack>
              </Grid>

              {selectedSupplier && (
                <Card variant="outlined" className="bg-blue-50">
                  <CardContent className="p-4">
                    <HStack gap="lg" justify="between">
                      <VStack gap="xs">
                        <Text size="sm" weight="medium">Supplier Details</Text>
                        <Text size="sm" color="secondary">
                          {selectedSupplier.supplierNumber} | Payment Terms: {selectedSupplier.paymentTerms || 'Net 30'}
                        </Text>
                      </VStack>
                      <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                    </HStack>
                  </CardContent>
                </Card>
              )}
            </VStack>
          </CardContent>
        </Card>

        {/* Invoice Selection (Optional) */}
        {formData.supplierId && (
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="lg">
                <HStack gap="sm" align="center">
                  <FileText className="h-5 w-5" />
                  <Text size="lg" weight="semibold">Invoice Selection (Optional)</Text>
                </HStack>
                
                <Text size="sm" color="secondary">
                  Select an invoice to pay, or leave blank for a prepayment
                </Text>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Invoice</Text>
                  <Select
                    value={formData.supplierInvoiceId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierInvoiceId: e.target.value || undefined }))}
                  >
                    <option value="">No specific invoice (prepayment)</option>
                    {supplierInvoices.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - Balance: ${formatCurrency(invoice.balanceAmount)}
                      </option>
                    ))}
                  </Select>
                </VStack>

                {selectedInvoice && (
                  <Card variant="outlined" className="bg-green-50">
                    <CardContent className="p-4">
                      <Grid cols={3} gap="md">
                        <VStack gap="xs">
                          <Text size="sm" weight="medium">Invoice Total</Text>
                          <Text weight="semibold">
                            ${formatCurrency(selectedInvoice.totalAmount)} {selectedInvoice.currency}
                          </Text>
                        </VStack>
                        <VStack gap="xs">
                          <Text size="sm" weight="medium">Amount Paid</Text>
                          <Text weight="semibold">
                            ${formatCurrency(selectedInvoice.paidAmount)}
                          </Text>
                        </VStack>
                        <VStack gap="xs">
                          <Text size="sm" weight="medium">Balance Due</Text>
                          <Text weight="semibold" className="text-green-700">
                            ${formatCurrency(selectedInvoice.balanceAmount)}
                          </Text>
                        </VStack>
                      </Grid>
                      
                      <VStack gap="xs" className="mt-3">
                        <HStack gap="sm" align="center">
                          <Calendar className="h-4 w-4" />
                          <Text size="sm">
                            Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                          </Text>
                          {getOverdueStatus(selectedInvoice.dueDate)}
                        </HStack>
                      </VStack>
                    </CardContent>
                  </Card>
                )}
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Payment Details */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="lg">
              <HStack gap="sm" align="center">
                <CreditCard className="h-5 w-5" />
                <Text size="lg" weight="semibold">Payment Details</Text>
              </HStack>
              
              <Grid cols={2} gap="lg">
                <VStack gap="sm">
                  <Text size="sm" weight="medium">Payment Amount *</Text>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    leftIcon={<DollarSign />}
                  />
                  {selectedInvoice && formData.amount > 0 && (
                    <HStack gap="sm" className="mt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          amount: selectedInvoice.balanceAmount 
                        }))}
                      >
                        Pay Full Balance (${formatCurrency(selectedInvoice.balanceAmount)})
                      </Button>
                    </HStack>
                  )}
                </VStack>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Payment Method *</Text>
                  <Select
                    value={formData.paymentMethod}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    required
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHECK">Check</option>
                    <option value="WIRE_TRANSFER">Wire Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CASH">Cash</option>
                  </Select>
                </VStack>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Payment Date *</Text>
                  <Input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                    required
                  />
                </VStack>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Bank Account *</Text>
                  <Select
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountId: e.target.value }))}
                    required
                  >
                    <option value="">Select bank account...</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountNumber} - {account.accountName}
                      </option>
                    ))}
                  </Select>
                </VStack>
              </Grid>

              <Grid cols={2} gap="lg">
                <VStack gap="sm">
                  <Text size="sm" weight="medium">Reference</Text>
                  <Input
                    value={formData.reference || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Check number, wire reference, etc."
                  />
                </VStack>

                {formData.currency !== 'USD' && (
                  <VStack gap="sm">
                    <Text size="sm" weight="medium">Exchange Rate</Text>
                    <Input
                      type="number"
                      value={formData.exchangeRate || 1}
                      onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) || 1 }))}
                      placeholder="1.0"
                      min="0"
                      step="0.0001"
                    />
                  </VStack>
                )}
              </Grid>

              <VStack gap="sm">
                <Text size="sm" weight="medium">Notes</Text>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any notes or comments"
                  rows={3}
                />
              </VStack>
            </VStack>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        {formData.amount > 0 && (
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="lg">
                <Text size="lg" weight="semibold">Payment Summary</Text>
                
                <Grid cols={2} gap="lg">
                  <Card variant="outlined">
                    <CardContent className="p-4">
                      <VStack gap="xs">
                        <Text size="sm" color="secondary">Payment Amount</Text>
                        <Text size="xl" weight="bold">
                          ${formatCurrency(formData.amount)} {formData.currency}
                        </Text>
                      </VStack>
                    </CardContent>
                  </Card>

                  {formData.currency !== 'USD' && formData.exchangeRate && formData.exchangeRate !== 1 && (
                    <Card variant="outlined">
                      <CardContent className="p-4">
                        <VStack gap="xs">
                          <Text size="sm" color="secondary">USD Equivalent</Text>
                          <Text size="xl" weight="bold">
                            {formatCurrency((Number(formData.amount || 0) * Number(formData.exchangeRate || 1)))} USD
                          </Text>
                        </VStack>
                      </CardContent>
                    </Card>
                  )}
                </Grid>
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Form Actions */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <HStack gap="md" justify="end">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading || formData.amount <= 0}
              >
                {loading ? 'Processing...' : supplierPayment ? 'Update Payment' : 'Process Payment'}
              </Button>
            </HStack>
          </CardContent>
        </Card>
      </VStack>
    </form>
  )
}