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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, AlertTriangle, Package } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Supplier {
  id: string
  name: string
  code: string
  supplierNumber: string
  paymentTerms?: string
  currency?: string
}

interface GoodsReceipt {
  id: string
  receiptNumber: string
  supplier: {
    name: string
    code: string
  }
  receivedDate: string
  status: string
  items: Array<{
    id: string
    item: {
      name: string
      code: string
      unitOfMeasure: {
        symbol: string
      }
    }
    quantityReceived: number
    quantityInvoiced: number
    unitCost: number
    totalCost: number
  }>
}

interface Account {
  id: string
  accountNumber: string
  accountName: string
  accountType: string
}

interface SupplierInvoiceItem {
  goodsReceiptItemId: string
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
  accountId: string
  taxAmount: number
  item?: {
    name: string
    code: string
    unitOfMeasure: {
      symbol: string
    }
  }
  availableQuantity?: number
}

interface SupplierInvoiceFormData {
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  currency: string
  items: SupplierInvoiceItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  taxAccountId?: string
  notes?: string
}

interface SupplierInvoiceFormProps {
  supplierInvoice?: SupplierInvoiceFormData & { id: string }
  onSuccess?: () => void
}

export function SupplierInvoiceForm({ supplierInvoice, onSuccess }: SupplierInvoiceFormProps) {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxAccounts, setTaxAccounts] = useState<Account[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  
  const [formData, setFormData] = useState<SupplierInvoiceFormData>({
    supplierId: supplierInvoice?.supplierId || '',
    invoiceNumber: supplierInvoice?.invoiceNumber || '',
    invoiceDate: supplierInvoice?.invoiceDate ? new Date(supplierInvoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: supplierInvoice?.dueDate ? new Date(supplierInvoice.dueDate).toISOString().split('T')[0] : '',
    currency: supplierInvoice?.currency || 'USD',
    items: supplierInvoice?.items || [],
    subtotal: supplierInvoice?.subtotal || 0,
    taxAmount: supplierInvoice?.taxAmount || 0,
    totalAmount: supplierInvoice?.totalAmount || 0,
    taxAccountId: supplierInvoice?.taxAccountId || '',
    notes: supplierInvoice?.notes || ''
  })

  useEffect(() => {
    Promise.all([
      fetchSuppliers(),
      fetchAccounts()
    ])
    
    if (supplierInvoice?.supplierId) {
      fetchSupplier(supplierInvoice.supplierId)
      fetchGoodsReceipts(supplierInvoice.supplierId)
    }
  }, [fetchSupplier, supplierInvoice?.supplierId])

  useEffect(() => {
    if (formData.supplierId && formData.supplierId !== selectedSupplier?.id) {
      fetchSupplier(formData.supplierId)
      fetchGoodsReceipts(formData.supplierId)
    }
  }, [fetchSupplier, formData.supplierId, selectedSupplier?.id])

  useEffect(() => {
    calculateTotals()
  }, [calculateTotals])

  useEffect(() => {
    // Auto-calculate due date based on payment terms
    if (formData.invoiceDate && selectedSupplier?.paymentTerms) {
      const invoiceDate = new Date(formData.invoiceDate)
      const paymentTerms = selectedSupplier.paymentTerms
      
      let daysToAdd = 30 // Default
      if (paymentTerms.includes('Net 15')) daysToAdd = 15
      else if (paymentTerms.includes('Net 30')) daysToAdd = 30
      else if (paymentTerms.includes('Net 45')) daysToAdd = 45
      else if (paymentTerms.includes('Net 60')) daysToAdd = 60
      
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + daysToAdd)
      
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0]
      }))
    }
  }, [formData.invoiceDate, selectedSupplier?.paymentTerms])

  const fetchSuppliers = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: any[] }>('/api/suppliers', { method: 'GET' })
      if (response.ok) {
        setSuppliers(response.data?.data || [])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchSupplier = useCallback(async (supplierId: string) => {
    try {
      const response = await apiClient<{ data: any[] }>(`/api/suppliers/${supplierId}`, { method: 'GET' })
      if (response.ok) {
        const supplier = response.data
        setSelectedSupplier(supplier)
        
        // Update currency if not set
        if (!formData.currency && supplier.currency) {
          setFormData(prev => ({
            ...prev,
            currency: supplier.currency
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching supplier:', error)
    }
  }, [formData.currency])

  const fetchGoodsReceipts = async (supplierId: string) => {
    try {
      const response = await apiClient<{ data: any }>(`/api/goods-receipts?supplierId=${supplierId}&status=RECEIVED`, { method: 'GET' })
      if (response.ok) {
        setGoodsReceipts(response.data?.data || [])
      }
    } catch (error) {
      console.error('Error fetching goods receipts:', error)
    }
  }

  const fetchAccounts = async (): Promise<number> => {
    try {
      const [expenseResponse, taxResponse] = await Promise.all([
        apiClient('/api/accounting/accounts?type=EXPENSE', { method: 'GET' }),
        apiClient('/api/accounting/accounts?type=LIABILITY&subType=TAX_PAYABLE', { method: 'GET' })
      ])
      
      if (expenseResponse.ok) {
        setAccounts(expenseResponse.data?.data || [])
      }
      if (taxResponse.ok) {
        setTaxAccounts(taxResponse.data?.data || [])
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const calculateTotals = useCallback(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0)
    const taxAmount = formData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
    const totalAmount = subtotal + taxAmount
    
    setFormData(prev => ({
      ...prev,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    }))
  }, [formData.items])

  const addGoodsReceiptItem = (goodsReceiptItem: GoodsReceipt['items'][0]) => {
    const newItem: SupplierInvoiceItem = {
      goodsReceiptItemId: goodsReceiptItem.id,
      description: goodsReceiptItem.item.name,
      quantity: goodsReceiptItem.quantityReceived - (goodsReceiptItem.quantityInvoiced || 0),
      unitPrice: goodsReceiptItem.unitCost,
      totalAmount: (goodsReceiptItem.quantityReceived - (goodsReceiptItem.quantityInvoiced || 0)) * goodsReceiptItem.unitCost,
      accountId: accounts.find(acc => acc.accountType === 'EXPENSE')?.id || '',
      taxAmount: 0,
      item: goodsReceiptItem.item,
      availableQuantity: goodsReceiptItem.quantityReceived - (goodsReceiptItem.quantityInvoiced || 0)
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItem = (index: number, field: keyof SupplierInvoiceItem, value: string | number) => {
    setFormData(prev => {
      const updatedItems = [...prev.items]
      const item = { ...updatedItems[index] }
      
      item[field] = value
      
      // Recalculate total amount when quantity or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        item.totalAmount = (item.quantity || 0) * (item.unitPrice || 0)
      }
      
      updatedItems[index] = item
      return { ...prev, items: updatedItems }
    })
  }

  const getAvailableGoodsReceiptItems = () => {
    return (goodsReceipts || []).flatMap(gr => 
      (gr.items || []).filter(item => 
        (item.quantityReceived - (item.quantityInvoiced || 0)) > 0 &&
        !(formData.items || []).some(invoiceItem => invoiceItem.goodsReceiptItemId === item.id)
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form
      if (!formData.supplierId || !formData.invoiceNumber || !formData.invoiceDate || !formData.dueDate) {
        throw new Error('Supplier, invoice number, invoice date, and due date are required')
      }

      if (formData.items.length === 0) {
        throw new Error('At least one invoice item is required')
      }

      // Validate each item
      for (const item of formData.items) {
        if (!item.accountId) {
          throw new Error('All items must have an expense account assigned')
        }
        if (item.quantity <= 0) {
          throw new Error('All items must have quantity greater than 0')
        }
        if (item.unitPrice < 0) {
          throw new Error('Unit price cannot be negative')
        }
      }

      const url = supplierInvoice ? `/api/supplier-invoices/${supplierInvoice.id}` : '/api/supplier-invoices'
      const method = supplierInvoice ? 'PUT' : 'POST'

      const response = await apiClient<{ data: any }>(url, {
        method,
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to save supplier invoice')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/supplier-invoices')
      }
    } catch (err) {
      console.error('Error saving supplier invoice:', err)
      setError(err instanceof Error ? err.message : 'Failed to save supplier invoice')
    } finally {
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

  const filteredSuppliers = (suppliers || []).filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    supplier.code.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    supplier.supplierNumber.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  const availableGRItems = getAvailableGoodsReceiptItems()

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
                      {(filteredSuppliers || []).map(supplier => (
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

        {/* Invoice Details */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Invoice Details</Text>
              
              <Grid cols={2} gap="lg">
                <VStack gap="sm">
                  <Text size="sm" weight="medium">Invoice Number *</Text>
                  <Input
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Enter invoice number"
                    required
                  />
                </VStack>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Tax Account</Text>
                  <Select
                    value={formData.taxAccountId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxAccountId: e.target.value || undefined }))}
                  >
                    <option value="">No tax account</option>
                    {(taxAccounts || []).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountNumber} - {account.accountName}
                      </option>
                    ))}
                  </Select>
                </VStack>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Invoice Date *</Text>
                  <Input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    required
                  />
                </VStack>

                <VStack gap="sm">
                  <Text size="sm" weight="medium">Due Date *</Text>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </VStack>
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

        {/* Available Goods Receipt Items */}
        {formData.supplierId && availableGRItems.length > 0 && (
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="lg">
                <Text size="lg" weight="semibold">Available Items to Invoice</Text>
                <Text size="sm" color="secondary">
                  These items have been received but not yet fully invoiced
                </Text>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Available Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(availableGRItems || []).map(item => {
                      const availableQty = item.quantityReceived - (item.quantityInvoiced || 0)
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <VStack gap="xs">
                              <Text weight="medium">{item.item.name}</Text>
                              <Text size="sm" color="secondary">{item.item.code}</Text>
                            </VStack>
                          </TableCell>
                          <TableCell>
                            {availableQty} {item.item.unitOfMeasure.symbol}
                          </TableCell>
                          <TableCell>
                            ${formatCurrency(item.unitCost)}
                          </TableCell>
                          <TableCell>
                            ${formatCurrency((availableQty * item.unitCost))}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addGoodsReceiptItem(item)}
                            >
                              Add to Invoice
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Invoice Items */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Invoice Items</Text>
              
              {formData.items.length === 0 ? (
                <Card variant="outlined" className="border-dashed">
                  <CardContent className="p-12">
                    <VStack gap="md" align="center">
                      <Package className="h-12 w-12 text-gray-400" />
                      <VStack gap="sm" align="center">
                        <Text weight="medium">No items added</Text>
                        <Text size="sm" color="secondary">
                          Add items from the available goods receipts above
                        </Text>
                      </VStack>
                    </VStack>
                  </CardContent>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Tax Amount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.items || []).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <VStack gap="xs">
                            <Text weight="medium">{item.description}</Text>
                            {item.item && (
                              <Text size="sm" color="secondary">
                                {item.item.code} | Available: {item.availableQuantity} {item.item.unitOfMeasure.symbol}
                              </Text>
                            )}
                          </VStack>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            max={item.availableQuantity}
                            step="0.01"
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.taxAmount}
                            onChange={(e) => updateItem(index, 'taxAmount', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Text weight="medium">
                            ${formatCurrency(item.totalAmount)}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.accountId}
                            onChange={(e) => updateItem(index, 'accountId', e.target.value)}
                            required
                          >
                            <option value="">Select account...</option>
                            {(accounts || []).map(account => (
                              <option key={account.id} value={account.id}>
                                {account.accountNumber} - {account.accountName}
                              </option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </VStack>
          </CardContent>
        </Card>

        {/* Invoice Totals */}
        {formData.items.length > 0 && (
          <Card variant="elevated">
            <CardContent className="p-6">
              <VStack gap="lg">
                <Text size="lg" weight="semibold">Invoice Totals</Text>
                
                <Grid cols={3} gap="lg">
                  <Card variant="outlined">
                    <CardContent className="p-4">
                      <VStack gap="xs">
                        <Text size="sm" color="secondary">Subtotal</Text>
                        <Text size="xl" weight="bold">
                          ${formatCurrency(formData.subtotal)}
                        </Text>
                      </VStack>
                    </CardContent>
                  </Card>

                  <Card variant="outlined">
                    <CardContent className="p-4">
                      <VStack gap="xs">
                        <Text size="sm" color="secondary">Tax Amount</Text>
                        <Text size="xl" weight="bold">
                          ${formatCurrency(formData.taxAmount)}
                        </Text>
                      </VStack>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <VStack gap="xs">
                        <Text size="sm" color="secondary">Total Amount</Text>
                        <Text size="xl" weight="bold" className="text-blue-900">
                          ${formatCurrency(formData.totalAmount)} {formData.currency}
                        </Text>
                      </VStack>
                    </CardContent>
                  </Card>
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
                disabled={loading || formData.items.length === 0}
              >
                {loading ? 'Saving...' : supplierInvoice ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </HStack>
          </CardContent>
        </Card>
      </VStack>
    </form>
  )
}