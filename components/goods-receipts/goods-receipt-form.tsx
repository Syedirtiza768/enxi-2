'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { VStack, HStack, Input, Textarea, Button, Select, Text, Card, CardContent } from '@/components/design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, AlertTriangle, CheckCircle, Package, AlertCircle, TrendingDown, TrendingUp, CheckCircle2, Loader2, Info } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { 
  validateRequired,
  checkMaxLength,
  MAX_NOTES_LENGTH,
  MAX_CODE_LENGTH,
  nonNegativeNumberValidator,
  pastOrPresentDateValidator
} from '@/lib/validators/common.validator'

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
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const { formatCurrency } = useCurrency()
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

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [discrepancies, setDiscrepancies] = useState<Array<{itemId: string, message: string, severity: 'warning' | 'error'}>>([])
  const [fieldStatus, setFieldStatus] = useState<Record<string, 'valid' | 'error' | 'checking'>>({})
  const [itemFieldStatus, setItemFieldStatus] = useState<Record<string, 'valid' | 'error'>>({})
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPurchaseOrders()
    if (goodsReceipt?.purchaseOrderId) {
      fetchPurchaseOrder(goodsReceipt.purchaseOrderId)
    }
  }, [goodsReceipt?.purchaseOrderId]) // Remove fetchPurchaseOrder from deps to avoid infinite loop

  useEffect(() => {
    if (formData.purchaseOrderId && !selectedPO) {
      fetchPurchaseOrder(formData.purchaseOrderId)
    }
  }, [formData.purchaseOrderId, selectedPO]) // Remove fetchPurchaseOrder from deps

  useEffect(() => {
    calculateTotal()
  }, [formData.items]) // Remove calculateTotal from deps

  // Real-time validation for discrepancies
  useEffect(() => {
    if (formData.items.length > 0) {
      validateForm()
    }
  }, [formData.items, formData.receivedDate, formData.receivedBy, formData.purchaseOrderId])

  const fetchPurchaseOrders = async (): Promise<boolean> => {
    try {
      const response = await apiClient<{ data: any }>('/api/purchase-orders?status=CONFIRMED', { method: 'GET' })
      if (response.ok) {
        setPurchaseOrders(response?.data?.data || [])
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    }
  }

  const fetchPurchaseOrder = useCallback(async (poId: string) => {
    try {
      const response = await apiClient<{ data: any }>(`/api/purchase-orders/${poId}`, { method: 'GET' })
      if (response.ok) {
        const po = response?.data
        setSelectedPO(po)
        
        // Initialize receipt items from PO items
        if (!goodsReceipt) {
          const receiptItems: GoodsReceiptItem[] = po.items.map((item: PurchaseOrder['items'][0]) => ({
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
  }, [goodsReceipt])

  const calculateTotal = useCallback(() => {
    const total = formData.items.reduce((sum, item) => 
      sum + (item.quantityReceived * item.unitCost), 0
    )
    setFormData(prev => ({ ...prev, totalReceived: total }))
  }, [formData.items])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(name))
    
    // Clear validation error when field is modified
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    }

    // Update form data
    setFormData(prev => ({ ...prev, [name]: value }))

    // Real-time validation
    validateField(name, value)
  }

  const handlePOChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const poId = e.target.value
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add('purchaseOrderId'))
    
    // Clear validation error
    if (validationErrors.purchaseOrderId) {
      setValidationErrors(prev => {
        const { purchaseOrderId: _, ...rest } = prev
        return rest
      })
    }
    
    setFormData(prev => ({ ...prev, purchaseOrderId: poId, items: [] }))
    setSelectedPO(null)
    
    // Validate PO selection
    if (!poId) {
      setValidationErrors(prev => ({ ...prev, purchaseOrderId: 'Purchase order is required' }))
      setFieldStatus(prev => ({ ...prev, purchaseOrderId: 'error' }))
    } else {
      setFieldStatus(prev => ({ ...prev, purchaseOrderId: 'valid' }))
      fetchPurchaseOrder(poId)
    }
  }

  const updateItem = (index: number, field: keyof GoodsReceiptItem, value: number | string) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Clear item validation error
    const itemFieldKey = `item_${index}_${field}`
    if (validationErrors[itemFieldKey]) {
      setValidationErrors(prev => {
        const { [itemFieldKey]: _, ...rest } = prev
        return rest
      })
    }
    
    // Auto-update quality status based on rejection
    if (field === 'quantityRejected' || field === 'quantityReceived') {
      const item = updatedItems[index]
      if (item.quantityRejected > 0 && item.quantityReceived > 0) {
        item.qualityStatus = 'PARTIALLY_ACCEPTED'
      } else if (item.quantityRejected > 0 && item.quantityReceived === 0) {
        item.qualityStatus = 'REJECTED'
      } else {
        item.qualityStatus = 'ACCEPTED'
      }
    }
    
    // Validate item field
    validateItemField(index, field, value, updatedItems[index])
    
    setFormData(prev => ({ ...prev, items: updatedItems }))
  }

  const generateReceiptNumber = () => {
    const prefix = 'GR'
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
    const receiptNumber = `${prefix}-${timestamp}-${random}`
    setFormData(prev => ({ ...prev, receiptNumber }))
    validateField('receiptNumber', receiptNumber)
  }

  // Real-time field validation
  const validateField = (name: string, value: any) => {
    let error: string | null = null
    let status: 'valid' | 'error' = 'valid'

    switch (name) {
      case 'purchaseOrderId':
        error = validateRequired(value, 'Purchase order')
        break
      case 'receiptNumber':
        if (value) {
          error = checkMaxLength(value, MAX_CODE_LENGTH, 'Receipt number')
          if (!error && !/^GR-\d{6}-\d{2}$/.test(value)) {
            error = 'Receipt number must follow pattern: GR-XXXXXX-XX'
          }
        }
        break
      case 'receivedDate':
        error = validateRequired(value, 'Received date')
        if (!error && value) {
          const date = new Date(value)
          const result = pastOrPresentDateValidator.safeParse(date)
          if (!result.success) {
            error = 'Received date cannot be in the future'
          }
        }
        break
      case 'receivedBy':
        error = validateRequired(value?.trim(), 'Received by')
        if (!error) {
          error = checkMaxLength(value, MAX_CODE_LENGTH, 'Received by')
        }
        break
      case 'notes':
        error = checkMaxLength(value || '', MAX_NOTES_LENGTH, 'Notes')
        break
    }

    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }))
      status = 'error'
    } else {
      setValidationErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    }

    setFieldStatus(prev => ({ ...prev, [name]: status }))
  }

  // Validate item field
  const validateItemField = (index: number, field: string, value: any, item: GoodsReceiptItem) => {
    let error: string | null = null
    const fieldKey = `item_${index}_${field}`

    switch (field) {
      case 'quantityReceived':
        const receivedQty = Number(value)
        if (receivedQty < 0) {
          error = 'Received quantity cannot be negative'
        } else if ((receivedQty + item.quantityRejected) > item.orderedQuantity) {
          error = 'Total received + rejected cannot exceed ordered quantity'
        }
        break
      case 'quantityRejected':
        const rejectedQty = Number(value)
        if (rejectedQty < 0) {
          error = 'Rejected quantity cannot be negative'
        } else if ((item.quantityReceived + rejectedQty) > item.orderedQuantity) {
          error = 'Total received + rejected cannot exceed ordered quantity'
        }
        break
      case 'notes':
        if (item.qualityStatus === 'REJECTED' && !value?.trim()) {
          error = 'Notes required for rejected items'
        }
        error = error || checkMaxLength(value || '', MAX_NOTES_LENGTH, 'Item notes')
        break
    }

    if (error) {
      setValidationErrors(prev => ({ ...prev, [fieldKey]: error }))
      setItemFieldStatus(prev => ({ ...prev, [fieldKey]: 'error' }))
    } else {
      setValidationErrors(prev => {
        const { [fieldKey]: _, ...rest } = prev
        return rest
      })
      setItemFieldStatus(prev => ({ ...prev, [fieldKey]: 'valid' }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    const newDiscrepancies: Array<{itemId: string, message: string, severity: 'warning' | 'error'}> = []

    // Required fields validation
    const poError = validateRequired(formData.purchaseOrderId, 'Purchase order')
    if (poError) errors.purchaseOrderId = poError

    const dateError = validateRequired(formData.receivedDate, 'Received date')
    if (dateError) {
      errors.receivedDate = dateError
    } else {
      const date = new Date(formData.receivedDate)
      const result = pastOrPresentDateValidator.safeParse(date)
      if (!result.success) {
        errors.receivedDate = 'Received date cannot be in the future'
      }
    }

    const receivedByError = validateRequired(formData.receivedBy?.trim(), 'Received by')
    if (receivedByError) errors.receivedBy = receivedByError

    // Receipt number pattern validation
    if (formData.receiptNumber && !/^GR-\d{6}-\d{2}$/.test(formData.receiptNumber)) {
      errors.receiptNumber = 'Receipt number must follow pattern: GR-XXXXXX-XX'
    }

    // Item validation
    const hasValidItems = formData.items.some(item => item.quantityReceived > 0)
    if (!hasValidItems) {
      errors.items = 'At least one item must have a received quantity greater than 0'
    }

    formData.items.forEach((item, index) => {
      // Quantity validation
      if (item.quantityReceived < 0) {
        errors[`item_${index}_quantityReceived`] = 'Received quantity cannot be negative'
      }
      if (item.quantityRejected < 0) {
        errors[`item_${index}_quantityRejected`] = 'Rejected quantity cannot be negative'
      }
      if ((item.quantityReceived + item.quantityRejected) > item.orderedQuantity) {
        errors[`item_${index}_total`] = 'Total received + rejected cannot exceed ordered quantity'
      }

      // Discrepancy detection
      if (item.quantityReceived < item.orderedQuantity) {
        const percentReceived = (item.quantityReceived / item.orderedQuantity) * 100
        if (percentReceived < 90) {
          newDiscrepancies.push({
            itemId: item.purchaseOrderItemId,
            message: `${item.item?.name || 'Item'}: Under-delivery - Only ${percentReceived.toFixed(0)}% received`,
            severity: percentReceived < 50 ? 'error' : 'warning'
          })
        }
      } else if (item.quantityReceived > item.orderedQuantity) {
        const percentOver = ((item.quantityReceived - item.orderedQuantity) / item.orderedQuantity) * 100
        newDiscrepancies.push({
          itemId: item.purchaseOrderItemId,
          message: `${item.item?.name || 'Item'}: Over-delivery - ${percentOver.toFixed(0)}% more than ordered`,
          severity: percentOver > 10 ? 'error' : 'warning'
        })
      }

      if (item.quantityRejected > 0) {
        const totalReceived = item.quantityReceived + item.quantityRejected
        if (totalReceived > 0) {
          const rejectRate = (item.quantityRejected / totalReceived) * 100
          if (rejectRate > 5) {
            newDiscrepancies.push({
              itemId: item.purchaseOrderItemId,
              message: `${item.item?.name || 'Item'}: High rejection rate - ${rejectRate.toFixed(1)}%`,
              severity: rejectRate > 10 ? 'error' : 'warning'
            })
          }
        }
      }

      // Quality status validation
      if (item.qualityStatus === 'REJECTED' && !item.notes?.trim()) {
        errors[`item_${index}_notes`] = 'Notes required for rejected items'
      }
    })

    setValidationErrors(errors)
    setDiscrepancies(newDiscrepancies)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setError('Please fix the validation errors before submitting')
      return
    }

    // Confirm submission if there are discrepancies
    if (discrepancies.length > 0 && discrepancies.some(d => d.severity === 'error')) {
      const confirmed = window.confirm(
        'There are significant discrepancies in this receipt. Are you sure you want to continue?'
      )
      if (!confirmed) return
    }

    setLoading(true)
    setError(null)

    try {
      const url = goodsReceipt ? `/api/goods-receipts/${goodsReceipt.id}` : '/api/goods-receipts'
      const method = goodsReceipt ? 'PUT' : 'POST'

      const response = await apiClient<{ data: any }>(url, {
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
        throw new Error(response.error || 'Failed to save goods receipt')
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
                    Purchase Order <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search by PO number or supplier..."
                      value={poSearch}
                      onChange={(e) => setPoSearch(e.target.value)}
                      leftIcon={<Search />}
                      fullWidth
                    />
                    <div className="relative">
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
                        className={validationErrors.purchaseOrderId ? 'border-red-500' : ''}
                      />
                      {fieldStatus.purchaseOrderId === 'valid' && formData.purchaseOrderId && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {validationErrors.purchaseOrderId && touchedFields.has('purchaseOrderId') && (
                      <Text size="sm" color="error">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.purchaseOrderId}
                        </HStack>
                      </Text>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Receipt Number
                  </label>
                  <HStack gap="sm">
                    <div className="relative flex-1">
                      <Input
                        name="receiptNumber"
                        value={formData.receiptNumber}
                        onChange={handleChange}
                        placeholder="GR-XXXXXX-XX"
                        fullWidth
                        maxLength={MAX_CODE_LENGTH}
                        className={validationErrors.receiptNumber ? 'border-red-500' : ''}
                      />
                      {fieldStatus.receiptNumber === 'valid' && formData.receiptNumber && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
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
                  {validationErrors.receiptNumber && touchedFields.has('receiptNumber') && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.receiptNumber}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Received Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      name="receivedDate"
                      value={formData.receivedDate}
                      onChange={handleChange}
                      required
                      fullWidth
                      max={new Date().toISOString().split('T')[0]}
                      className={validationErrors.receivedDate ? 'border-red-500' : ''}
                    />
                    {fieldStatus.receivedDate === 'valid' && formData.receivedDate && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  {validationErrors.receivedDate && touchedFields.has('receivedDate') && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.receivedDate}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Received By <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      name="receivedBy"
                      value={formData.receivedBy}
                      onChange={handleChange}
                      placeholder="User ID or name"
                      required
                      fullWidth
                      maxLength={MAX_CODE_LENGTH}
                      className={validationErrors.receivedBy ? 'border-red-500' : ''}
                    />
                    {fieldStatus.receivedBy === 'valid' && formData.receivedBy && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  {validationErrors.receivedBy && touchedFields.has('receivedBy') && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.receivedBy}
                      </HStack>
                    </Text>
                  )}
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
                <div className="relative">
                  <Textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Any notes about this receipt..."
                    rows={3}
                    fullWidth
                    maxLength={MAX_NOTES_LENGTH}
                    className={validationErrors.notes ? 'border-red-500' : ''}
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-gray-500">
                    {formData.notes?.length || 0}/{MAX_NOTES_LENGTH}
                  </div>
                </div>
                {validationErrors.notes && (
                  <Text size="sm" color="error" className="mt-1">
                    <HStack gap="xs" align="center">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.notes}
                    </HStack>
                  </Text>
                )}
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Quality Control Summary */}
        {formData.items.length > 0 && (
          <Card variant="elevated" className="border border-blue-200 bg-blue-50">
            <CardContent>
              <VStack gap="md">
                <HStack gap="sm" align="center">
                  <Package className="h-5 w-5 text-blue-600" />
                  <Text size="lg" weight="semibold">Quality Control Summary</Text>
                </HStack>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <Text size="sm" color="secondary">Total Items</Text>
                    <Text size="lg" weight="bold">{formData.items.length}</Text>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <Text size="sm" color="secondary">Accepted Items</Text>
                    <Text size="lg" weight="bold" className="text-green-600">
                      {formData.items.filter(item => item.qualityStatus === 'ACCEPTED' && item.quantityReceived > 0).length}
                    </Text>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <Text size="sm" color="secondary">Partially Accepted</Text>
                    <Text size="lg" weight="bold" className="text-yellow-600">
                      {formData.items.filter(item => item.qualityStatus === 'PARTIALLY_ACCEPTED').length}
                    </Text>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <Text size="sm" color="secondary">Rejected Items</Text>
                    <Text size="lg" weight="bold" className="text-red-600">
                      {formData.items.filter(item => item.qualityStatus === 'REJECTED').length}
                    </Text>
                  </div>
                </div>
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Discrepancies Alert */}
        {discrepancies.length > 0 && (
          <Card variant="elevated" className={`border-2 ${discrepancies.some(d => d.severity === 'error') ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <CardContent>
              <VStack gap="md">
                <HStack gap="sm" align="center">
                  {discrepancies.some(d => d.severity === 'error') ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  <Text size="lg" weight="semibold">
                    {discrepancies.some(d => d.severity === 'error') ? 'Critical Discrepancies' : 'Receipt Discrepancies Detected'}
                  </Text>
                  <Badge className={discrepancies.some(d => d.severity === 'error') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                    {discrepancies.length} {discrepancies.length === 1 ? 'Issue' : 'Issues'}
                  </Badge>
                </HStack>
                <VStack gap="sm">
                  {discrepancies.map((discrepancy, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${discrepancy.severity === 'error' ? 'bg-red-100 border-red-200' : 'bg-yellow-100 border-yellow-200'}`}>
                      <HStack gap="sm" align="center">
                        {discrepancy.severity === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <Text size="sm" weight="medium" color={discrepancy.severity === 'error' ? 'error' : undefined}>
                          {discrepancy.message}
                        </Text>
                      </HStack>
                    </div>
                  ))}
                </VStack>
                {discrepancies.some(d => d.severity === 'error') && (
                  <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                    <Text size="sm" color="error" weight="medium">
                      ⚠️ Critical discrepancies detected. Review all items before proceeding.
                    </Text>
                  </div>
                )}
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        {formData.items.length > 0 && (
          <Card variant="elevated">
            <CardContent>
              <VStack gap="lg">
                <HStack justify="between" align="center">
                  <Text size="lg" weight="semibold">Items to Receive</Text>
                  {validationErrors.items && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {validationErrors.items}
                    </Badge>
                  )}
                </HStack>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Quality Status</TableHead>
                      <TableHead>Notes & Comments</TableHead>
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
                          <VStack gap="xs" align="end">
                            <div className="relative">
                              <Input
                                type="number"
                                value={item.quantityReceived}
                                onChange={(e) => updateItem(index, 'quantityReceived', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className={`w-24 text-right ${validationErrors[`item_${index}_quantityReceived`] ? 'border-red-500' : ''}`}
                              />
                              {itemFieldStatus[`item_${index}_quantityReceived`] === 'valid' && item.quantityReceived > 0 && (
                                <CheckCircle2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500" />
                              )}
                            </div>
                            {item.quantityReceived < item.orderedQuantity && item.quantityReceived > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {((item.quantityReceived / item.orderedQuantity) * 100).toFixed(0)}%
                              </Badge>
                            )}
                            {validationErrors[`item_${index}_quantityReceived`] && (
                              <Text size="xs" color="error">
                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                Required
                              </Text>
                            )}
                          </VStack>
                        </TableCell>
                        <TableCell className="text-right">
                          <VStack gap="xs" align="end">
                            <div className="relative">
                              <Input
                                type="number"
                                value={item.quantityRejected}
                                onChange={(e) => updateItem(index, 'quantityRejected', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className={`w-24 text-right ${validationErrors[`item_${index}_quantityRejected`] ? 'border-red-500' : ''}`}
                              />
                              {itemFieldStatus[`item_${index}_quantityRejected`] === 'valid' && item.quantityRejected >= 0 && (
                                <CheckCircle2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500" />
                              )}
                            </div>
                            {item.quantityRejected > 0 && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                            {validationErrors[`item_${index}_quantityRejected`] && (
                              <Text size="xs" color="error">
                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                Invalid
                              </Text>
                            )}
                          </VStack>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="relative">
                            <Input
                              type="number"
                              value={item.unitCost}
                              onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-28 text-right"
                            />
                            {item.unitCost > 0 && (
                              <CheckCircle2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <VStack gap="xs" align="start">
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
                                className="w-36"
                              />
                            </HStack>
                            {item.qualityStatus === 'REJECTED' && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                Notes Required
                              </Badge>
                            )}
                            {item.qualityStatus === 'PARTIALLY_ACCEPTED' && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                Mixed Quality
                              </Badge>
                            )}
                          </VStack>
                        </TableCell>
                        <TableCell>
                          <VStack gap="xs">
                            <div className="relative">
                              <Input
                                value={item.notes || ''}
                                onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                placeholder={item.qualityStatus === 'REJECTED' ? 'Required for rejected items' : 'Notes...'}
                                className={`w-40 ${validationErrors[`item_${index}_notes`] ? 'border-red-500' : ''}`}
                                required={item.qualityStatus === 'REJECTED'}
                                maxLength={MAX_NOTES_LENGTH}
                              />
                              {itemFieldStatus[`item_${index}_notes`] === 'valid' && item.notes && (
                                <CheckCircle2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500" />
                              )}
                            </div>
                            {validationErrors[`item_${index}_notes`] && (
                              <Text size="xs" color="error">
                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                {validationErrors[`item_${index}_notes`]}
                              </Text>
                            )}
                            <div className="text-xs text-gray-500">
                              {item.notes?.length || 0}/{MAX_NOTES_LENGTH}
                            </div>
                          </VStack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="pt-4 border-t border-[var(--border-primary)]">
                  <HStack justify="end">
                    <div className="text-right">
                      <Text size="lg" weight="bold">
                        Total Received: ${formatCurrency(formData.totalReceived)}
                      </Text>
                    </div>
                  </HStack>
                </div>
              </VStack>
            </CardContent>
          </Card>
        )}

        {/* Three-Way Matching Summary */}
        {selectedPO && formData.items.length > 0 && (
          <Card variant="elevated" className="border border-purple-200 bg-purple-50">
            <CardContent>
              <VStack gap="md">
                <HStack gap="sm" align="center">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <Text size="lg" weight="semibold">Three-Way Matching Status</Text>
                </HStack>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <Text size="sm" color="secondary">Purchase Order</Text>
                    <HStack gap="xs" align="center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Text size="sm" weight="medium">{selectedPO.orderNumber}</Text>
                    </HStack>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <Text size="sm" color="secondary">Goods Receipt</Text>
                    <HStack gap="xs" align="center">
                      {formData.receiptNumber ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <Text size="sm" weight="medium">{formData.receiptNumber}</Text>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <Text size="sm" weight="medium">Generate Number</Text>
                        </>
                      )}
                    </HStack>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <Text size="sm" color="secondary">Invoice Matching</Text>
                    <HStack gap="xs" align="center">
                      <Info className="h-4 w-4 text-blue-600" />
                      <Text size="sm" weight="medium">Pending Receipt</Text>
                    </HStack>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <Text size="sm" color="secondary" className="mb-2">Matching Summary</Text>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Text color="secondary">Total PO Amount:</Text>
                      <Text weight="medium">{formatCurrency(selectedPO.items.reduce((sum, item) => sum + item.totalPrice, 0))}</Text>
                    </div>
                    <div>
                      <Text color="secondary">Received Amount:</Text>
                      <Text weight="medium">{formatCurrency(formData.totalReceived)}</Text>
                    </div>
                    <div>
                      <Text color="secondary">Variance:</Text>
                      <Text weight="medium" className={formData.totalReceived !== selectedPO.items.reduce((sum, item) => sum + item.totalPrice, 0) ? 'text-yellow-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(formData.totalReceived - selectedPO.items.reduce((sum, item) => sum + item.totalPrice, 0)))}
                      </Text>
                    </div>
                    <div>
                      <Text color="secondary">Status:</Text>
                      <Text weight="medium" className={discrepancies.length === 0 ? 'text-green-600' : 'text-yellow-600'}>
                        {discrepancies.length === 0 ? 'Matched' : 'Variance Detected'}
                      </Text>
                    </div>
                  </div>
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
            disabled={loading || !formData.purchaseOrderId || formData.items.length === 0 || Object.keys(validationErrors).length > 0}
            leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          >
            {loading ? 'Saving...' : goodsReceipt ? 'Update Receipt' : 'Create Receipt'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )
}