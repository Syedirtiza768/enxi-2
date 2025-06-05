'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { VStack, HStack, Input, Textarea, Button, Select, Text, Card, CardContent } from '@/components/design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Search } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Supplier {
  id: string
  name: string
  code: string
  currency: string
  paymentTerms: number
}

interface Item {
  id: string
  name: string
  code: string
  standardCost: number
  unitOfMeasure: {
    symbol: string
  }
}

interface PurchaseOrderItem {
  id?: string
  itemId: string
  item?: Item
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
}

interface PurchaseOrderFormData {
  orderNumber: string
  supplierId: string
  orderDate: string
  expectedDeliveryDate?: string
  currency: string
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  notes?: string
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
}

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrderFormData & { id: string }
  onSuccess?: () => void
}

export function PurchaseOrderForm({ purchaseOrder, onSuccess }: PurchaseOrderFormProps) {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [showItemSearch, setShowItemSearch] = useState(false)
  
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    orderNumber: purchaseOrder?.orderNumber || '',
    supplierId: purchaseOrder?.supplierId || '',
    orderDate: purchaseOrder?.orderDate ? new Date(purchaseOrder.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expectedDeliveryDate: purchaseOrder?.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0] : '',
    currency: purchaseOrder?.currency || 'USD',
    status: purchaseOrder?.status || 'DRAFT',
    notes: purchaseOrder?.notes || '',
    items: purchaseOrder?.items || [],
    subtotal: purchaseOrder?.subtotal || 0,
    taxAmount: purchaseOrder?.taxAmount || 0,
    shippingAmount: purchaseOrder?.shippingAmount || 0,
    totalAmount: purchaseOrder?.totalAmount || 0
  })

  useEffect(() => {
    fetchSuppliers()
    fetchItems()
  }, [])

  useEffect(() => {
    calculateTotals()
  }, [calculateTotals])

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient('/api/suppliers', { method: 'GET' })
      if (response.ok) {
        setSuppliers(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await apiClient('/api/inventory/items', { method: 'GET' })
      if (response.ok) {
        setItems(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const calculateTotals = useCallback(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const totalAmount = subtotal + formData.taxAmount + formData.shippingAmount
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      totalAmount
    }))
  }, [formData.items, formData.taxAmount, formData.shippingAmount])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'taxAmount' || name === 'shippingAmount' ? 
        (value ? parseFloat(value) : 0) : 
        value
    }))
  }

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierId = e.target.value
    const supplier = suppliers.find(s => s.id === supplierId)
    
    setFormData(prev => ({
      ...prev,
      supplierId,
      currency: supplier?.currency || 'USD'
    }))
  }

  const addItem = (item: Item) => {
    const newItem: PurchaseOrderItem = {
      itemId: item.id,
      item,
      quantity: 1,
      unitPrice: item.standardCost || 0,
      totalPrice: item.standardCost || 0,
      notes: ''
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
    
    setShowItemSearch(false)
    setItemSearch('')
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const generatePONumber = () => {
    const prefix = 'PO'
    const timestamp = Date.now().toString().slice(-6)
    setFormData(prev => ({ ...prev, orderNumber: `${prefix}-${timestamp}` }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = purchaseOrder ? `/api/purchase-orders/${purchaseOrder.id}` : '/api/purchase-orders'
      const method = purchaseOrder ? 'PUT' : 'POST'

      const response = await apiClient(url, {
        method,
        body: formData
      })

      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/purchase-orders')
        }
      } else {
        throw new Error(response.data?.error || 'Failed to save purchase order')
      }
    } catch (err) {
      console.error('Error saving purchase order:', err)
      setError(err instanceof Error ? err.message : 'Failed to save purchase order')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.code.toLowerCase().includes(itemSearch.toLowerCase())
  )

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap="xl">
        {error && (
          <Card variant="elevated" className="border-[var(--color-semantic-error-200)] bg-[var(--color-semantic-error-50)]">
            <CardContent>
              <Text color="error">{error}</Text>
            </CardContent>
          </Card>
        )}

        {/* Header Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Purchase Order Details</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    PO Number *
                  </label>
                  <HStack gap="sm">
                    <Input
                      name="orderNumber"
                      value={formData.orderNumber}
                      onChange={handleChange}
                      placeholder="PO-001"
                      required
                      fullWidth
                    />
                    {!purchaseOrder && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generatePONumber}
                      >
                        Generate
                      </Button>
                    )}
                  </HStack>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Supplier *
                  </label>
                  <Select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleSupplierChange}
                    options={[
                      { value: '', label: 'Select Supplier' },
                      ...suppliers.map(supplier => ({
                        value: supplier.id,
                        label: `${supplier.name} (${supplier.code})`
                      }))
                    ]}
                    required
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Order Date *
                  </label>
                  <Input
                    type="date"
                    name="orderDate"
                    value={formData.orderDate}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expected Delivery Date
                  </label>
                  <Input
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={handleChange}
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency
                  </label>
                  <Select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    options={[
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'GBP', label: 'GBP - British Pound' },
                      { value: 'CAD', label: 'CAD - Canadian Dollar' }
                    ]}
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { value: 'DRAFT', label: 'Draft' },
                      { value: 'SENT', label: 'Sent' },
                      { value: 'CONFIRMED', label: 'Confirmed' },
                      { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
                      { value: 'RECEIVED', label: 'Received' },
                      { value: 'CANCELLED', label: 'Cancelled' }
                    ]}
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes for this purchase order..."
                  rows={3}
                  fullWidth
                />
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Items */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <HStack justify="between" align="center">
                <Text size="lg" weight="semibold">Items</Text>
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<Plus />}
                  onClick={() => setShowItemSearch(true)}
                >
                  Add Item
                </Button>
              </HStack>

              {showItemSearch && (
                <Card variant="default" className="border-2 border-dashed border-[var(--border-primary)]">
                  <CardContent>
                    <VStack gap="md">
                      <Input
                        placeholder="Search items by name or code..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        leftIcon={<Search />}
                        fullWidth
                      />
                      {itemSearch && (
                        <div className="max-h-48 overflow-y-auto">
                          <VStack gap="xs">
                            {filteredItems.slice(0, 10).map(item => (
                              <div
                                key={item.id}
                                className="p-3 border border-[var(--border-primary)] rounded cursor-pointer hover:bg-[var(--bg-secondary)]"
                                onClick={() => addItem(item)}
                              >
                                <HStack justify="between">
                                  <div>
                                    <Text weight="medium">{item.name}</Text>
                                    <Text size="sm" color="secondary">{item.code}</Text>
                                  </div>
                                  <Text size="sm" color="secondary">
                                    ${item.standardCost.toFixed(2)} / {item.unitOfMeasure.symbol}
                                  </Text>
                                </HStack>
                              </div>
                            ))}
                          </VStack>
                        </div>
                      )}
                      <HStack gap="sm" justify="end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowItemSearch(false)
                            setItemSearch('')
                          }}
                        >
                          Cancel
                        </Button>
                      </HStack>
                    </VStack>
                  </CardContent>
                </Card>
              )}

              {formData.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.item?.name}</div>
                            <div className="text-sm text-gray-500">{item.item?.code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.totalPrice.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.notes || ''}
                            onChange={(e) => updateItem(index, 'notes', e.target.value)}
                            placeholder="Notes..."
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Totals */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Totals</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tax Amount
                  </label>
                  <Input
                    type="number"
                    name="taxAmount"
                    value={formData.taxAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Shipping Amount
                  </label>
                  <Input
                    type="number"
                    name="shippingAmount"
                    value={formData.shippingAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Total Amount
                  </label>
                  <div className="text-2xl font-bold text-[var(--color-brand-primary-600)]">
                    ${formData.totalAmount.toFixed(2)} {formData.currency}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-primary)]">
                <HStack justify="between">
                  <Text>Subtotal:</Text>
                  <Text weight="medium">${formData.subtotal.toFixed(2)}</Text>
                </HStack>
                <HStack justify="between">
                  <Text>Tax:</Text>
                  <Text weight="medium">${formData.taxAmount.toFixed(2)}</Text>
                </HStack>
                <HStack justify="between">
                  <Text>Shipping:</Text>
                  <Text weight="medium">${formData.shippingAmount.toFixed(2)}</Text>
                </HStack>
                <HStack justify="between" className="pt-2 border-t border-[var(--border-primary)]">
                  <Text size="lg" weight="bold">Total:</Text>
                  <Text size="lg" weight="bold">${formData.totalAmount.toFixed(2)}</Text>
                </HStack>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Actions */}
        <HStack gap="md" justify="end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/purchase-orders')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || formData.items.length === 0}
          >
            {loading ? 'Saving...' : purchaseOrder ? 'Update Purchase Order' : 'Create Purchase Order'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )
}