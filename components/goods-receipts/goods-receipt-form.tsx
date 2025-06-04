'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VStack, HStack, Input, Textarea, Button, Select, Text, Card, CardContent } from '@/components/design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface PurchaseOrder {
  id: string
  orderNumber: string
  supplier: {
    name: string
    code: string
  }
  orderDate: string
  expectedDeliveryDate?: string
  status: string
  currency: string
  items: Array<{
    id: string
    itemId: string
    item: {
      name: string
      code: string
      unitOfMeasure: {
        symbol: string
      }
    }
    quantity: number
    quantityReceived: number
    unitPrice: number
    totalPrice: number
  }>
}

interface GoodsReceiptItem {
  purchaseOrderItemId: string
  item?: {
    name: string
    code: string
    unitOfMeasure: {
      symbol: string
    }
  }
  orderedQuantity: number
  quantityReceived: number
  quantityRejected: number
  unitCost: number
  qualityStatus: 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED'
  rejectionReason?: string
  notes?: string
}

interface GoodsReceiptFormData {
  purchaseOrderId: string
  receiptNumber?: string
  receivedDate: string
  receivedBy: string
  items: GoodsReceiptItem[]
  notes?: string
  totalReceived: number
}

interface GoodsReceiptFormProps {
  goodsReceipt?: GoodsReceiptFormData & { id: string }
  onSuccess?: () => void
}

export function GoodsReceiptForm({ goodsReceipt, onSuccess }: GoodsReceiptFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [poSearch, setPoSearch] = useState('')
  
  const [formData, setFormData] = useState<GoodsReceiptFormData>({
    purchaseOrderId: goodsReceipt?.purchaseOrderId || '',
    receiptNumber: goodsReceipt?.receiptNumber || '',
    receivedDate: goodsReceipt?.receivedDate ? new Date(goodsReceipt.receivedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    receivedBy: goodsReceipt?.receivedBy || '',
    items: goodsReceipt?.items || [],
    notes: goodsReceipt?.notes || '',
    totalReceived: goodsReceipt?.totalReceived || 0
  })

  useEffect(() => {
    fetchPurchaseOrders()
    if (goodsReceipt?.purchaseOrderId) {
      fetchPurchaseOrder(goodsReceipt.purchaseOrderId)
    }
  }, [])

  useEffect(() => {
    if (formData.purchaseOrderId && !selectedPO) {
      fetchPurchaseOrder(formData.purchaseOrderId)
    }
  }, [formData.purchaseOrderId])

  useEffect(() => {
    calculateTotal()
  }, [formData.items])

  const fetchPurchaseOrders = async () => {
    try {
      const response = await apiClient('/api/purchase-orders?status=CONFIRMED', { method: 'GET' })
      if (response.ok) {
        setPurchaseOrders(response.data?.data || [])
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    }
  }

  const fetchPurchaseOrder = async (poId: string) => {
    try {
      const response = await apiClient(`/api/purchase-orders/${poId}`, { method: 'GET' })
      if (response.ok) {
        const po = response.data
        setSelectedPO(po)
        
        // Initialize receipt items from PO items
        if (!goodsReceipt) {
          const receiptItems: GoodsReceiptItem[] = po.items.map((item: any) => ({
            purchaseOrderItemId: item.id,
            item: item.item,
            orderedQuantity: item.quantity,
            quantityReceived: item.quantity - (item.quantityReceived || 0), // Remaining quantity
            quantityRejected: 0,
            unitCost: item.unitPrice,
            qualityStatus: 'ACCEPTED' as const,
            notes: ''
          }))
          
          setFormData(prev => ({
            ...prev,
            items: receiptItems,
            receivedBy: prev.receivedBy || 'current-user-id' // Should get from auth context
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error)
    }
  }

  const calculateTotal = () => {
    const total = formData.items.reduce((sum, item) => 
      sum + (item.quantityReceived * item.unitCost), 0
    )
    setFormData(prev => ({ ...prev, totalReceived: total }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePOChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const poId = e.target.value
    setFormData(prev => ({ ...prev, purchaseOrderId: poId, items: [] }))
    setSelectedPO(null)
    if (poId) {
      fetchPurchaseOrder(poId)
    }
  }

  const updateItem = (index: number, field: keyof GoodsReceiptItem, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Auto-update quality status based on rejection
    if (field === 'quantityRejected') {
      const item = updatedItems[index]
      if (item.quantityRejected > 0 && item.quantityReceived > 0) {
        item.qualityStatus = 'PARTIALLY_ACCEPTED'
      } else if (item.quantityRejected > 0 && item.quantityReceived === 0) {
        item.qualityStatus = 'REJECTED'
      } else {
        item.qualityStatus = 'ACCEPTED'
      }
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }))
  }

  const generateReceiptNumber = () => {
    const prefix = 'GR'
    const timestamp = Date.now().toString().slice(-4)
    setFormData(prev => ({ ...prev, receiptNumber: `${prefix}-${timestamp}` }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate that we have items to receive
      const hasValidItems = formData.items.some(item => item.quantityReceived > 0)
      if (!hasValidItems) {
        throw new Error('At least one item must have a received quantity greater than 0')
      }

      const url = goodsReceipt ? `/api/goods-receipts/${goodsReceipt.id}` : '/api/goods-receipts'
      const method = goodsReceipt ? 'PUT' : 'POST'

      const response = await apiClient(url, {
        method,
        body: formData
      })

      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/goods-receipts')
        }
      } else {
        throw new Error(response.data?.error || 'Failed to save goods receipt')
      }
    } catch (err) {
      console.error('Error saving goods receipt:', err)
      setError(err instanceof Error ? err.message : 'Failed to save goods receipt')
    } finally {
      setLoading(false)
    }
  }

  const filteredPOs = purchaseOrders.filter(po =>
    po.orderNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.supplier.name.toLowerCase().includes(poSearch.toLowerCase())
  )

  const getQualityIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'PARTIALLY_ACCEPTED':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

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
              <Text size="lg" weight="semibold">Receipt Information</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Purchase Order *
                  </label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search by PO number or supplier..."
                      value={poSearch}
                      onChange={(e) => setPoSearch(e.target.value)}
                      leftIcon={<Search />}
                      fullWidth
                    />
                    <Select
                      name="purchaseOrderId"
                      value={formData.purchaseOrderId}
                      onChange={handlePOChange}
                      options={[
                        { value: '', label: 'Select Purchase Order' },
                        ...filteredPOs.map(po => ({
                          value: po.id,
                          label: `${po.orderNumber} - ${po.supplier.name}`
                        }))
                      ]}
                      required
                      fullWidth
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Receipt Number
                  </label>
                  <HStack gap="sm">
                    <Input
                      name="receiptNumber"
                      value={formData.receiptNumber}
                      onChange={handleChange}
                      placeholder="GR-0001"
                      fullWidth
                    />
                    {!goodsReceipt && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateReceiptNumber}
                      >
                        Generate
                      </Button>
                    )}
                  </HStack>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Received Date *
                  </label>
                  <Input
                    type="date"
                    name="receivedDate"
                    value={formData.receivedDate}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Received By
                  </label>
                  <Input
                    name="receivedBy"
                    value={formData.receivedBy}
                    onChange={handleChange}
                    placeholder="User ID or name"
                    fullWidth
                  />
                </div>
              </div>

              {selectedPO && (
                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <VStack gap="sm">
                    <Text size="sm" weight="medium">Purchase Order Details</Text>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Text color="secondary">Supplier:</Text>
                        <Text weight="medium">{selectedPO.supplier.name}</Text>
                      </div>
                      <div>
                        <Text color="secondary">Order Date:</Text>
                        <Text weight="medium">{new Date(selectedPO.orderDate).toLocaleDateString()}</Text>
                      </div>
                      <div>
                        <Text color="secondary">Status:</Text>
                        <Text weight="medium">{selectedPO.status}</Text>
                      </div>
                      <div>
                        <Text color="secondary">Currency:</Text>
                        <Text weight="medium">{selectedPO.currency}</Text>
                      </div>
                    </div>
                  </VStack>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any notes about this receipt..."
                  rows={3}
                  fullWidth
                />
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Items */}
        {formData.items.length > 0 && (
          <Card variant="elevated">
            <CardContent>
              <VStack gap="lg">
                <Text size="lg" weight="semibold">Items to Receive</Text>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Notes</TableHead>
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
                          {item.orderedQuantity} {item.item?.unitOfMeasure?.symbol}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.quantityReceived}
                            onChange={(e) => updateItem(index, 'quantityReceived', parseFloat(e.target.value) || 0)}
                            min="0"
                            max={item.orderedQuantity}
                            step="0.01"
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.quantityRejected}
                            onChange={(e) => updateItem(index, 'quantityRejected', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <HStack gap="xs" align="center">
                            {getQualityIcon(item.qualityStatus)}
                            <Select
                              value={item.qualityStatus}
                              onChange={(e) => updateItem(index, 'qualityStatus', e.target.value)}
                              options={[
                                { value: 'ACCEPTED', label: 'Accepted' },
                                { value: 'PARTIALLY_ACCEPTED', label: 'Partial' },
                                { value: 'REJECTED', label: 'Rejected' }
                              ]}
                              className="w-32"
                            />
                          </HStack>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.notes || ''}
                            onChange={(e) => updateItem(index, 'notes', e.target.value)}
                            placeholder="Notes..."
                            className="w-32"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="pt-4 border-t border-[var(--border-primary)]">
                  <HStack justify="end">
                    <div className="text-right">
                      <Text size="lg" weight="bold">
                        Total Received: ${formData.totalReceived.toFixed(2)}
                      </Text>
                    </div>
                  </HStack>
                </div>
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <HStack gap="md" justify="end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/goods-receipts')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !formData.purchaseOrderId || formData.items.length === 0}
          >
            {loading ? 'Saving...' : goodsReceipt ? 'Update Receipt' : 'Create Receipt'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )
}