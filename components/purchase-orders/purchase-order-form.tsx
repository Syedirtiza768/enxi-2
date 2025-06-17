'use client'

import type { Item } from '@/components/inventory/item-list'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { VStack, HStack, Input, Textarea, Button, Select, Text, Card, CardContent } from '@/components/design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Search, AlertCircle, CheckCircle2, ShieldCheck, Clock, Package } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { TaxRateSelector } from '@/components/tax/tax-rate-selector'
import { useDefaultTaxRate } from '@/hooks/use-default-tax-rate'
import { 
  MAX_CODE_LENGTH, 
  MAX_ADDRESS_LENGTH, 
  MAX_NOTES_LENGTH,
  validateRequired,
  validatePercentage,
  validateCurrency,
  SUPPORTED_CURRENCIES
} from '@/lib/validators/common.validator'

interface Supplier {
  id: string
  name: string
  code: string
  currency: string
  paymentTerms: number
}

// Item moved to inventory types

interface PurchaseOrderItem {
  id?: string
  itemId: string
  item?: Item
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  taxRateId?: string
  totalPrice: number
  notes?: string
}

interface PurchaseOrderFormData {
  orderNumber: string
  supplierId: string
  orderDate: string
  expectedDeliveryDate?: string
  deliveryAddress?: string
  deliveryInstructions?: string
  currency: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvalNotes?: string
  approvedBy?: string
  approvedDate?: string
  paymentTerms?: string
  shippingMethod?: string
  incoterms?: string
  notes?: string
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  discountAmount?: number
  discountPercentage?: number
}

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrderFormData & { id: string }
  onSuccess?: () => void
}

export function PurchaseOrderForm({ purchaseOrder, onSuccess }: PurchaseOrderFormProps) {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const { formatCurrency } = useCurrency()
  const { defaultRate } = useDefaultTaxRate({ taxType: 'PURCHASE' })
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
    deliveryAddress: purchaseOrder?.deliveryAddress || '',
    deliveryInstructions: purchaseOrder?.deliveryInstructions || '',
    currency: purchaseOrder?.currency || 'AED',
    status: purchaseOrder?.status || 'DRAFT',
    approvalStatus: purchaseOrder?.approvalStatus,
    approvalNotes: purchaseOrder?.approvalNotes || '',
    approvedBy: purchaseOrder?.approvedBy || '',
    approvedDate: purchaseOrder?.approvedDate || '',
    paymentTerms: purchaseOrder?.paymentTerms || '',
    shippingMethod: purchaseOrder?.shippingMethod || '',
    incoterms: purchaseOrder?.incoterms || '',
    notes: purchaseOrder?.notes || '',
    items: purchaseOrder?.items || [],
    subtotal: purchaseOrder?.subtotal || 0,
    taxAmount: purchaseOrder?.taxAmount || 0,
    shippingAmount: purchaseOrder?.shippingAmount || 0,
    totalAmount: purchaseOrder?.totalAmount || 0,
    discountAmount: purchaseOrder?.discountAmount || 0,
    discountPercentage: purchaseOrder?.discountPercentage || 0
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [fieldStatus, setFieldStatus] = useState<Record<string, 'idle' | 'valid' | 'error'>>({})
  const [approvalThreshold, setApprovalThreshold] = useState(50000) // Default approval threshold
  const [isValidatingPONumber, setIsValidatingPONumber] = useState(false)

  useEffect(() => {
    const fetchSuppliers = async (): Promise<void> => {
      try {
        const response = await apiClient<{ data: Supplier[]; total?: number } | Supplier[]>('/api/suppliers?status=ACTIVE', { method: 'GET' })
        if (response.ok && response?.data) {
          const suppliersData = response?.data
          const suppliers = Array.isArray(suppliersData) ? suppliersData : (suppliersData.data || [])
          setSuppliers(suppliers)
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      }
    }

    const fetchItems = async (): Promise<void> => {
      try {
        const response = await apiClient<{ data: Item[]; total?: number } | Item[]>('/api/items', { method: 'GET' })
        if (response.ok && response?.data) {
          const itemsData = response?.data
          const items = Array.isArray(itemsData) ? itemsData : (itemsData.data || [])
          setItems(items)
        }
      } catch (error) {
        console.error('Error fetching items:', error)
      }
    }

    fetchSuppliers()
    fetchItems()
  }, [])

  const calculateTotals = useCallback(() => {
    let subtotal = 0
    let itemTaxTotal = 0
    
    formData.items.forEach(item => {
      const itemSubtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
      const discountAmount = itemSubtotal * (Number(item.discount || 0) / 100)
      const afterDiscount = itemSubtotal - discountAmount
      const itemTax = afterDiscount * (Number(item.taxRate || 0) / 100)
      
      subtotal += itemSubtotal
      itemTaxTotal += itemTax
    })
    
    // Apply overall discount
    let discountAmount = 0
    if (formData.discountPercentage) {
      discountAmount = subtotal * (Number(formData.discountPercentage || 0) / 100)
    } else if (formData.discountAmount) {
      discountAmount = Number(formData.discountAmount || 0)
    }
    
    const totalAmount = subtotal - discountAmount + itemTaxTotal + Number(formData.shippingAmount || 0)
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      discountAmount,
      taxAmount: itemTaxTotal,
      totalAmount
    }))
  }, [formData.items, formData.shippingAmount, formData.discountAmount, formData.discountPercentage])

  useEffect(() => {
    calculateTotals()
  }, [calculateTotals])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Clear validation error when field is modified
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    }

    // Update form data
    const numericFields = ['taxAmount', 'shippingAmount', 'discountAmount', 'discountPercentage']
    const newValue = numericFields.includes(name) ? (value ? parseFloat(value) : 0) : value
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))

    // Real-time validation
    let error: string | null = null
    let status: 'idle' | 'valid' | 'error' = 'idle'

    switch (name) {
      case 'orderNumber':
        if (value) {
          error = await validatePONumber(value)
          status = error ? 'error' : 'valid'
        }
        break
      
      case 'supplierId':
        if (!value) {
          error = 'Supplier is required'
          status = 'error'
        } else {
          status = 'valid'
        }
        break
      
      case 'orderDate':
        if (!value) {
          error = 'Order date is required'
          status = 'error'
        } else {
          const orderDate = new Date(value)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (orderDate > today) {
            error = 'Order date cannot be in the future'
            status = 'error'
          } else {
            status = 'valid'
          }
        }
        break
      
      case 'expectedDeliveryDate':
        if (value && formData.orderDate) {
          const orderDate = new Date(formData.orderDate)
          const deliveryDate = new Date(value)
          if (deliveryDate < orderDate) {
            error = 'Expected delivery date cannot be before order date'
            status = 'error'
          } else {
            status = 'valid'
          }
        }
        break
      
      case 'deliveryAddress':
        if (value && value.length > MAX_ADDRESS_LENGTH) {
          error = `Delivery address must be less than ${MAX_ADDRESS_LENGTH} characters`
          status = 'error'
        } else if (value) {
          status = 'valid'
        }
        break
      
      case 'deliveryInstructions':
        if (value && value.length > MAX_NOTES_LENGTH) {
          error = `Delivery instructions must be less than ${MAX_NOTES_LENGTH} characters`
          status = 'error'
        } else if (value) {
          status = 'valid'
        }
        break
      
      case 'notes':
        if (value && value.length > MAX_NOTES_LENGTH) {
          error = `Notes must be less than ${MAX_NOTES_LENGTH} characters`
          status = 'error'
        } else if (value) {
          status = 'valid'
        }
        break
      
      case 'shippingAmount':
        const shippingError = validateCurrency(parseFloat(value) || 0)
        if (shippingError) {
          error = shippingError
          status = 'error'
        } else {
          status = 'valid'
        }
        break
      
      case 'discountPercentage':
        if (value) {
          const discountError = validatePercentage(parseFloat(value))
          if (discountError) {
            error = discountError
            status = 'error'
          } else {
            status = 'valid'
          }
        }
        break
      
      case 'discountAmount':
        const amount = parseFloat(value) || 0
        if (amount < 0) {
          error = 'Discount amount cannot be negative'
          status = 'error'
        } else if (amount > formData.subtotal) {
          error = 'Discount amount cannot exceed subtotal'
          status = 'error'
        } else if (value) {
          status = 'valid'
        }
        break
    }

    // Update validation state
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }))
      setFieldStatus(prev => ({ ...prev, [name]: 'error' }))
    } else {
      setFieldStatus(prev => ({ ...prev, [name]: status }))
    }
  }

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierId = e.target.value
    const supplier = suppliers.find(s => s.id === supplierId)
    
    setFormData(prev => ({
      ...prev,
      supplierId,
      currency: supplier?.currency || 'AED'
    }))

    // Update validation state
    if (!supplierId) {
      setValidationErrors(prev => ({ ...prev, supplierId: 'Supplier is required' }))
      setFieldStatus(prev => ({ ...prev, supplierId: 'error' }))
    } else {
      setValidationErrors(prev => {
        const { supplierId: _, ...rest } = prev
        return rest
      })
      setFieldStatus(prev => ({ ...prev, supplierId: 'valid' }))
    }
  }

  const addItem = (item: Item) => {
    const unitPrice = item.standardCost || 0
    const newItem: PurchaseOrderItem = {
      itemId: item.id,
      item,
      quantity: 1,
      unitPrice,
      discount: 0,
      taxRate: defaultRate?.rate || 0,
      taxRateId: defaultRate?.id,
      totalPrice: unitPrice,
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
    
    // Recalculate total price considering discount and tax
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'taxRate') {
      const item = updatedItems[index]
      const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
      const discountAmount = subtotal * (Number(item.discount || 0) / 100)
      const afterDiscount = subtotal - discountAmount
      const taxAmount = afterDiscount * (Number(item.taxRate || 0) / 100)
      updatedItems[index].totalPrice = afterDiscount + taxAmount
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

  const validatePONumber = async (poNumber: string): Promise<string | null> => {
    if (!poNumber.trim()) return 'PO number is required'
    if (poNumber.length > MAX_CODE_LENGTH) return `PO number must be less than ${MAX_CODE_LENGTH} characters`
    
    // Pattern validation for PO number
    if (!/^[A-Z0-9\-_]+$/i.test(poNumber)) {
      return 'PO number can only contain letters, numbers, hyphens, and underscores'
    }

    // Check uniqueness (only for new POs)
    if (!purchaseOrder) {
      setIsValidatingPONumber(true)
      try {
        const response = await apiClient<{ data: any }>(`/api/purchase-orders/check-number?number=${encodeURIComponent(poNumber)}`, {
          method: 'GET'
        })
        if (!response.ok || response?.data?.exists) {
          return 'This PO number already exists'
        }
      } catch (error) {
        console.error('Error checking PO number:', error)
      } finally {
        setIsValidatingPONumber(false)
      }
    }

    return null
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    const newFieldStatus: Record<string, 'idle' | 'valid' | 'error'> = {}

    // Required fields
    const poNumberError = validateRequired(formData.orderNumber.trim(), 'PO number')
    if (poNumberError) {
      errors.orderNumber = poNumberError
      newFieldStatus.orderNumber = 'error'
    } else if (formData.orderNumber.length > MAX_CODE_LENGTH) {
      errors.orderNumber = `PO number must be less than ${MAX_CODE_LENGTH} characters`
      newFieldStatus.orderNumber = 'error'
    } else {
      newFieldStatus.orderNumber = 'valid'
    }

    const supplierError = validateRequired(formData.supplierId, 'Supplier')
    if (supplierError) {
      errors.supplierId = supplierError
      newFieldStatus.supplierId = 'error'
    } else {
      newFieldStatus.supplierId = 'valid'
    }

    const orderDateError = validateRequired(formData.orderDate, 'Order date')
    if (orderDateError) {
      errors.orderDate = orderDateError
      newFieldStatus.orderDate = 'error'
    } else {
      // Check if order date is not in the future
      const orderDate = new Date(formData.orderDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (orderDate > today) {
        errors.orderDate = 'Order date cannot be in the future'
        newFieldStatus.orderDate = 'error'
      } else {
        newFieldStatus.orderDate = 'valid'
      }
    }

    if (formData.items.length === 0) {
      errors.items = 'At least one item is required'
    }

    // Date validation
    if (formData.expectedDeliveryDate) {
      const orderDate = new Date(formData.orderDate)
      const deliveryDate = new Date(formData.expectedDeliveryDate)
      if (deliveryDate < orderDate) {
        errors.expectedDeliveryDate = 'Expected delivery date cannot be before order date'
        newFieldStatus.expectedDeliveryDate = 'error'
      } else {
        newFieldStatus.expectedDeliveryDate = 'valid'
      }
    }

    // Address validation
    if (formData.deliveryAddress && formData.deliveryAddress.length > MAX_ADDRESS_LENGTH) {
      errors.deliveryAddress = `Delivery address must be less than ${MAX_ADDRESS_LENGTH} characters`
      newFieldStatus.deliveryAddress = 'error'
    } else if (formData.deliveryAddress) {
      newFieldStatus.deliveryAddress = 'valid'
    }

    // Notes validation
    if (formData.notes && formData.notes.length > MAX_NOTES_LENGTH) {
      errors.notes = `Notes must be less than ${MAX_NOTES_LENGTH} characters`
      newFieldStatus.notes = 'error'
    } else if (formData.notes) {
      newFieldStatus.notes = 'valid'
    }

    if (formData.deliveryInstructions && formData.deliveryInstructions.length > MAX_NOTES_LENGTH) {
      errors.deliveryInstructions = `Delivery instructions must be less than ${MAX_NOTES_LENGTH} characters`
      newFieldStatus.deliveryInstructions = 'error'
    } else if (formData.deliveryInstructions) {
      newFieldStatus.deliveryInstructions = 'valid'
    }

    // Item validation
    formData.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
      }
      if (item.unitPrice < 0) {
        errors[`item_${index}_price`] = 'Unit price cannot be negative'
      }
      const discountError = validatePercentage(item.discount || 0)
      if (discountError) {
        errors[`item_${index}_discount`] = discountError
      }
    })

    // Financial validation
    const shippingError = validateCurrency(formData.shippingAmount)
    if (shippingError) {
      errors.shippingAmount = shippingError
      newFieldStatus.shippingAmount = 'error'
    } else {
      newFieldStatus.shippingAmount = 'valid'
    }

    if (formData.discountPercentage) {
      const discountError = validatePercentage(formData.discountPercentage)
      if (discountError) {
        errors.discountPercentage = discountError
        newFieldStatus.discountPercentage = 'error'
      } else {
        newFieldStatus.discountPercentage = 'valid'
      }
    }

    if (formData.discountAmount && formData.discountAmount < 0) {
      errors.discountAmount = 'Discount amount cannot be negative'
      newFieldStatus.discountAmount = 'error'
    } else if (formData.discountAmount && formData.discountAmount > formData.subtotal) {
      errors.discountAmount = 'Discount amount cannot exceed subtotal'
      newFieldStatus.discountAmount = 'error'
    } else if (formData.discountAmount) {
      newFieldStatus.discountAmount = 'valid'
    }

    setValidationErrors(errors)
    setFieldStatus(newFieldStatus)
    return Object.keys(errors).length === 0
  }

  const checkApprovalRequired = (): boolean => {
    return formData.totalAmount > approvalThreshold && formData.status !== 'APPROVED'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setError('Please fix the validation errors before submitting')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if approval is required
      let finalStatus = formData.status
      if (checkApprovalRequired() && formData.status === 'DRAFT') {
        finalStatus = 'PENDING_APPROVAL'
      }

      const url = purchaseOrder ? `/api/purchase-orders/${purchaseOrder.id}` : '/api/purchase-orders'
      const method = purchaseOrder ? 'PUT' : 'POST'

      const response = await apiClient<{ success: boolean; purchaseOrderId?: string }>(url, {
        method,
        body: { ...formData, status: finalStatus }
      })

      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/purchase-orders')
        }
      } else {
        throw new Error(response.error || 'Failed to save purchase order')
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

        {/* Approval Status */}
        {formData.approvalStatus && (
          <Card variant="elevated" className={`border-2 ${
            formData.approvalStatus === 'APPROVED' ? 'border-green-500 bg-green-50' :
            formData.approvalStatus === 'REJECTED' ? 'border-red-500 bg-red-50' :
            'border-yellow-500 bg-yellow-50'
          }`}>
            <CardContent>
              <HStack justify="between" align="center">
                <HStack gap="md" align="center">
                  {formData.approvalStatus === 'APPROVED' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {formData.approvalStatus === 'REJECTED' && <AlertCircle className="h-5 w-5 text-red-600" />}
                  {formData.approvalStatus === 'PENDING' && <Clock className="h-5 w-5 text-yellow-600" />}
                  <VStack gap="xs">
                    <Text weight="semibold">
                      {formData.approvalStatus === 'APPROVED' && 'Purchase Order Approved'}
                      {formData.approvalStatus === 'REJECTED' && 'Purchase Order Rejected'}
                      {formData.approvalStatus === 'PENDING' && 'Pending Approval'}
                    </Text>
                    {formData.approvedBy && (
                      <Text size="sm" color="secondary">
                        by {formData.approvedBy} on {new Date(formData.approvedDate!).toLocaleDateString()}
                      </Text>
                    )}
                  </VStack>
                </HStack>
                {formData.totalAmount > approvalThreshold && formData.status === 'DRAFT' && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Requires Approval
                  </Badge>
                )}
              </HStack>
              {formData.approvalNotes && (
                <Card variant="outlined" className="mt-3">
                  <CardContent className="p-3">
                    <Text size="sm" weight="medium">Approval Notes:</Text>
                    <Text size="sm" color="secondary">{formData.approvalNotes}</Text>
                  </CardContent>
                </Card>
              )}
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
                    PO Number <span className="text-red-500">*</span>
                  </label>
                  <HStack gap="sm">
                    <div className="relative flex-1">
                      <Input
                        name="orderNumber"
                        value={formData.orderNumber}
                        onChange={handleChange}
                        placeholder="PO-001"
                        required
                        fullWidth
                        maxLength={MAX_CODE_LENGTH}
                        className={`pr-10 ${
                          validationErrors.orderNumber ? 'border-red-500' : 
                          fieldStatus.orderNumber === 'valid' ? 'border-green-500' : ''
                        }`}
                      />
                      {fieldStatus.orderNumber === 'valid' && !isValidatingPONumber && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                      {isValidatingPONumber && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
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
                  <div className="flex justify-between items-start mt-1">
                    {validationErrors.orderNumber ? (
                      <Text size="sm" color="error">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.orderNumber}
                        </HStack>
                      </Text>
                    ) : (
                      <div />
                    )}
                    {formData.orderNumber && (
                      <Text size="xs" color="secondary" className="ml-auto">
                        {formData.orderNumber.length}/{MAX_CODE_LENGTH}
                      </Text>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
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
                      className={`pr-10 ${
                        validationErrors.supplierId ? 'border-red-500' : 
                        fieldStatus.supplierId === 'valid' ? 'border-green-500' : ''
                      }`}
                    />
                    {fieldStatus.supplierId === 'valid' && (
                      <CheckCircle2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none" />
                    )}
                  </div>
                  {validationErrors.supplierId && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.supplierId}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Order Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      name="orderDate"
                      value={formData.orderDate}
                      onChange={handleChange}
                      required
                      fullWidth
                      max={new Date().toISOString().split('T')[0]}
                      className={`pr-10 ${
                        validationErrors.orderDate ? 'border-red-500' : 
                        fieldStatus.orderDate === 'valid' ? 'border-green-500' : ''
                      }`}
                    />
                    {fieldStatus.orderDate === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {validationErrors.orderDate && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.orderDate}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expected Delivery Date
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      name="expectedDeliveryDate"
                      value={formData.expectedDeliveryDate}
                      onChange={handleChange}
                      fullWidth
                      min={formData.orderDate}
                      className={`pr-10 ${
                        validationErrors.expectedDeliveryDate ? 'border-red-500' : 
                        fieldStatus.expectedDeliveryDate === 'valid' ? 'border-green-500' : ''
                      }`}
                    />
                    {fieldStatus.expectedDeliveryDate === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {validationErrors.expectedDeliveryDate && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.expectedDeliveryDate}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency
                  </label>
                  <div className="relative">
                    <Select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      options={SUPPORTED_CURRENCIES.map(currency => ({
                        value: currency,
                        label: `${currency} - ${currency === 'AED' ? 'UAE Dirham' :
                          currency === 'USD' ? 'US Dollar' :
                          currency === 'EUR' ? 'Euro' :
                          currency === 'GBP' ? 'British Pound' :
                          currency === 'SAR' ? 'Saudi Riyal' :
                          currency === 'QAR' ? 'Qatari Riyal' :
                          currency === 'KWD' ? 'Kuwaiti Dinar' :
                          currency === 'BHD' ? 'Bahraini Dinar' :
                          currency === 'OMR' ? 'Omani Rial' : currency}`
                      }))}
                      fullWidth
                      className="pr-10"
                    />
                    {formData.currency && (
                      <CheckCircle2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none" />
                    )}
                  </div>
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
                      { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                      { value: 'APPROVED', label: 'Approved' },
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
            </VStack>
          </CardContent>
        </Card>

        {/* Delivery & Shipping Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <HStack gap="sm" align="center">
                <Package className="h-5 w-5" />
                <Text size="lg" weight="semibold">Delivery & Shipping Information</Text>
              </HStack>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Terms
                  </label>
                  <Select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Select payment terms' },
                      { value: 'NET_30', label: 'Net 30 Days' },
                      { value: 'NET_45', label: 'Net 45 Days' },
                      { value: 'NET_60', label: 'Net 60 Days' },
                      { value: 'NET_90', label: 'Net 90 Days' },
                      { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
                      { value: '2_10_NET_30', label: '2/10 Net 30' },
                      { value: 'COD', label: 'Cash on Delivery' },
                      { value: 'PREPAID', label: 'Prepaid' }
                    ]}
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Shipping Method
                  </label>
                  <Select
                    name="shippingMethod"
                    value={formData.shippingMethod}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Select shipping method' },
                      { value: 'AIR_FREIGHT', label: 'Air Freight' },
                      { value: 'SEA_FREIGHT', label: 'Sea Freight' },
                      { value: 'LAND_FREIGHT', label: 'Land Freight' },
                      { value: 'EXPRESS_COURIER', label: 'Express Courier' },
                      { value: 'LOCAL_DELIVERY', label: 'Local Delivery' },
                      { value: 'PICKUP', label: 'Pickup' }
                    ]}
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Incoterms
                  </label>
                  <Select
                    name="incoterms"
                    value={formData.incoterms}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Select incoterms' },
                      { value: 'EXW', label: 'EXW - Ex Works' },
                      { value: 'FCA', label: 'FCA - Free Carrier' },
                      { value: 'CPT', label: 'CPT - Carriage Paid To' },
                      { value: 'CIP', label: 'CIP - Carriage and Insurance Paid To' },
                      { value: 'DAP', label: 'DAP - Delivered at Place' },
                      { value: 'DPU', label: 'DPU - Delivered at Place Unloaded' },
                      { value: 'DDP', label: 'DDP - Delivered Duty Paid' },
                      { value: 'FAS', label: 'FAS - Free Alongside Ship' },
                      { value: 'FOB', label: 'FOB - Free on Board' },
                      { value: 'CFR', label: 'CFR - Cost and Freight' },
                      { value: 'CIF', label: 'CIF - Cost, Insurance and Freight' }
                    ]}
                    fullWidth
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <Input
                      name="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={handleChange}
                      placeholder="Enter delivery address"
                      fullWidth
                      maxLength={MAX_ADDRESS_LENGTH}
                      className={`pr-10 ${
                        validationErrors.deliveryAddress ? 'border-red-500' : 
                        fieldStatus.deliveryAddress === 'valid' ? 'border-green-500' : ''
                      }`}
                    />
                    {fieldStatus.deliveryAddress === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex justify-between items-start mt-1">
                    {validationErrors.deliveryAddress ? (
                      <Text size="sm" color="error">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.deliveryAddress}
                        </HStack>
                      </Text>
                    ) : (
                      <div />
                    )}
                    {formData.deliveryAddress && (
                      <Text size="xs" color="secondary" className="ml-auto">
                        {formData.deliveryAddress.length}/{MAX_ADDRESS_LENGTH}
                      </Text>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Delivery Instructions
                  </label>
                  <Textarea
                    name="deliveryInstructions"
                    value={formData.deliveryInstructions}
                    onChange={handleChange}
                    placeholder="Special delivery instructions, contact person, etc."
                    rows={2}
                    fullWidth
                    maxLength={MAX_NOTES_LENGTH}
                    className={`${
                      validationErrors.deliveryInstructions ? 'border-red-500' : 
                      fieldStatus.deliveryInstructions === 'valid' ? 'border-green-500' : ''
                    }`}
                  />
                  <div className="flex justify-between items-start mt-1">
                    {validationErrors.deliveryInstructions ? (
                      <Text size="sm" color="error">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.deliveryInstructions}
                        </HStack>
                      </Text>
                    ) : (
                      <div />
                    )}
                    {formData.deliveryInstructions && (
                      <Text size="xs" color="secondary" className="ml-auto">
                        {formData.deliveryInstructions.length}/{MAX_NOTES_LENGTH}
                      </Text>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional Notes
                </label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes for this purchase order..."
                  rows={3}
                  fullWidth
                  maxLength={MAX_NOTES_LENGTH}
                  className={`${
                    validationErrors.notes ? 'border-red-500' : 
                    fieldStatus.notes === 'valid' ? 'border-green-500' : ''
                  }`}
                />
                <div className="flex justify-between items-start mt-1">
                  {validationErrors.notes ? (
                    <Text size="sm" color="error">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.notes}
                      </HStack>
                    </Text>
                  ) : (
                    <div />
                  )}
                  {formData.notes && (
                    <Text size="xs" color="secondary" className="ml-auto">
                      {formData.notes.length}/{MAX_NOTES_LENGTH}
                    </Text>
                  )}
                </div>
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
                                    {formatCurrency(item.standardCost)} / {item.unitOfMeasure.symbol}
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

              {validationErrors.items && (
                <Card variant="outlined" className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <HStack gap="sm" align="center">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <Text color="error">{validationErrors.items}</Text>
                    </HStack>
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
                      <TableHead className="text-right">Discount %</TableHead>
                      <TableHead className="text-center">Tax</TableHead>
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
                            min="0.01"
                            step="0.01"
                            className={`w-20 text-right ${
                              validationErrors[`item_${index}_quantity`] ? 'border-red-500' : ''
                            }`}
                          />
                          {validationErrors[`item_${index}_quantity`] && (
                            <div className="absolute bg-red-500 text-white text-xs p-1 rounded shadow-lg z-10 mt-1">
                              {validationErrors[`item_${index}_quantity`]}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className={`w-24 text-right ${
                              validationErrors[`item_${index}_price`] ? 'border-red-500' : ''
                            }`}
                          />
                          {validationErrors[`item_${index}_price`] && (
                            <div className="absolute bg-red-500 text-white text-xs p-1 rounded shadow-lg z-10 mt-1">
                              {validationErrors[`item_${index}_price`]}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.01"
                            className={`w-20 text-right ${
                              validationErrors[`item_${index}_discount`] ? 'border-red-500' : ''
                            }`}
                          />
                          {validationErrors[`item_${index}_discount`] && (
                            <div className="absolute bg-red-500 text-white text-xs p-1 rounded shadow-lg z-10 mt-1">
                              {validationErrors[`item_${index}_discount`]}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <TaxRateSelector
                            value={item.taxRateId}
                            onChange={(taxRateId, taxRate) => {
                              updateItem(index, 'taxRateId', taxRateId || '')
                              updateItem(index, 'taxRate', taxRate)
                            }}
                            taxType={'PURCHASE'}
                            className="w-full"
                            placeholder="Tax"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalPrice)}
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
                    Discount %
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      name="discountPercentage"
                      value={formData.discountPercentage || ''}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                      fullWidth
                      className={`pr-10 ${
                        validationErrors.discountPercentage ? 'border-red-500' : 
                        fieldStatus.discountPercentage === 'valid' ? 'border-green-500' : ''
                      }`}
                    />
                    {fieldStatus.discountPercentage === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {validationErrors.discountPercentage && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.discountPercentage}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Discount Amount
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      name="discountAmount"
                      value={formData.discountAmount || ''}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      fullWidth
                      disabled={formData.discountPercentage > 0}
                      className={`pr-10 ${
                        validationErrors.discountAmount ? 'border-red-500' : 
                        fieldStatus.discountAmount === 'valid' ? 'border-green-500' : ''
                      }`}
                    />
                    {fieldStatus.discountAmount === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {validationErrors.discountAmount && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.discountAmount}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tax Amount (Calculated)
                  </label>
                  <Input
                    type="number"
                    name="taxAmount"
                    value={formData.taxAmount}
                    disabled
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Shipping Amount
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      name="shippingAmount"
                      value={formData.shippingAmount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      fullWidth
                      className={`pr-10 ${
                        validationErrors.shippingAmount ? 'border-red-500' : 
                        fieldStatus.shippingAmount === 'valid' ? 'border-green-500' : ''
                      }`}
                    />
                    {fieldStatus.shippingAmount === 'valid' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {validationErrors.shippingAmount && (
                    <Text size="sm" color="error" className="mt-1">
                      <HStack gap="xs" align="center">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.shippingAmount}
                      </HStack>
                    </Text>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Total Amount
                  </label>
                  <div className="text-2xl font-bold text-[var(--color-brand-primary-600)]">
                    {formatCurrency(formData.totalAmount)} {formData.currency}
                  </div>
                  {formData.totalAmount > approvalThreshold && (
                    <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Requires Approval (Threshold: {formatCurrency(approvalThreshold)})
                    </Badge>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-primary)]">
                <HStack justify="between">
                  <Text>Subtotal:</Text>
                  <Text weight="medium">{formatCurrency(formData.subtotal)}</Text>
                </HStack>
                {formData.discountAmount > 0 && (
                  <HStack justify="between">
                    <Text>Discount:</Text>
                    <Text weight="medium" className="text-green-600">-{formatCurrency(formData.discountAmount)}</Text>
                  </HStack>
                )}
                <HStack justify="between">
                  <Text>Tax:</Text>
                  <Text weight="medium">{formatCurrency(formData.taxAmount)}</Text>
                </HStack>
                <HStack justify="between">
                  <Text>Shipping:</Text>
                  <Text weight="medium">{formatCurrency(formData.shippingAmount)}</Text>
                </HStack>
                <HStack justify="between" className="pt-2 border-t border-[var(--border-primary)]">
                  <Text size="lg" weight="bold">Total:</Text>
                  <Text size="lg" weight="bold">{formatCurrency(formData.totalAmount)} {formData.currency}</Text>
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
            disabled={
              loading || 
              formData.items.length === 0 || 
              Object.keys(validationErrors).length > 0 ||
              isValidatingPONumber ||
              !formData.orderNumber || 
              !formData.supplierId ||
              !formData.orderDate
            }
          >
            {loading ? 'Saving...' : 
             checkApprovalRequired() && formData.status === 'DRAFT' ? 'Submit for Approval' :
             purchaseOrder ? 'Update Purchase Order' : 'Create Purchase Order'}
          </Button>
        </HStack>
        
        {/* Validation Summary */}
        {Object.keys(validationErrors).length > 0 && (
          <Card variant="outlined" className="border-yellow-300 bg-yellow-50">
            <CardContent className="p-4">
              <VStack gap="sm">
                <HStack gap="sm" align="center">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <Text weight="medium" className="text-yellow-800">
                    Please fix the following issues before submitting:
                  </Text>
                </HStack>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 ml-6">
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </VStack>
            </CardContent>
          </Card>
        )}
      </VStack>
    </form>
  )
}