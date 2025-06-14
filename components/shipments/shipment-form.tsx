'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { 
  Package, 
  AlertCircle,
  Check,
  User,
  MapPin,
  FileText,
} from 'lucide-react'

interface ShipmentFormProps {
  salesOrderId: string
  onSuccess?: (shipment: Record<string, unknown>) => void
  onCancel?: () => void
}

interface SalesOrderItem {
  id: string
  itemCode: string
  description: string
  quantity: number
  quantityShipped: number
  item: {
    name: string
  }
}

interface SalesOrder {
  id: string
  orderNumber: string
  status: string
  shippingAddress: string
  salesCase: {
    customer: {
      name: string
      email: string
    }
  }
  items: SalesOrderItem[]
}

interface SelectedItem {
  salesOrderItemId: string
  quantity: number
}

export function ShipmentForm({ salesOrderId, onSuccess, onCancel }: ShipmentFormProps): React.JSX.Element {
  const { user } = useAuth()
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({})
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippingMethod, setShippingMethod] = useState('')
  const [shipFromAddress, setShipFromAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const fetchSalesOrder = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<SalesOrder>(`/api/sales-orders/${salesOrderId}`)
      if (response.ok && response.data) {
        setSalesOrder(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch sales order')
      }

        // Check if order is approved
        if (response.data.status !== 'APPROVED') {
          setError('Order must be approved before creating shipment')
        }
    } catch (err) {
      console.error('Error fetching sales order:', err)
      setError('Error loading order. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [salesOrderId])

  useEffect(() => {
    fetchSalesOrder()
  }, [fetchSalesOrder])

  const getAvailableQuantity = (item: SalesOrderItem): void => {
    return item.quantity - item.quantityShipped
  }

  const getShippableItems = (): void => {
    if (!salesOrder) return []
    return salesOrder.items.filter(item => getAvailableQuantity(item) > 0)
  }

  const handleItemSelection = (itemId: string, selected: boolean): void => {
    if (selected) {
      const item = salesOrder?.items.find(i => i.id === itemId)
      if (item) {
        const availableQty = getAvailableQuantity(item)
        setSelectedItems(prev => ({
          ...prev,
          [itemId]: {
            salesOrderItemId: itemId,
            quantity: availableQty, // Default to full available quantity
          },
        }))
      }
    } else {
      setSelectedItems(prev => {
        const newSelected = { ...prev }
        delete newSelected[itemId]
        return newSelected
      })
    }

    // Clear validation error for this item
    if (validationErrors[itemId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[itemId]
        return newErrors
      })
    }
  }

  const handleQuantityChange = (itemId: string, quantity: number): void => {
    const item = salesOrder?.items.find(i => i.id === itemId)
    if (!item) return

    const availableQty = getAvailableQuantity(item)
    
    if (quantity > availableQty) {
      setValidationErrors(prev => ({
        ...prev,
        [itemId]: `Cannot exceed remaining quantity (${availableQty})`,
      }))
    } else if (quantity <= 0) {
      setValidationErrors(prev => ({
        ...prev,
        [itemId]: 'Quantity must be greater than 0',
      }))
    } else {
      // Clear validation error
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[itemId]
        return newErrors
      })
    }

    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity,
      },
    }))
  }

  const validateForm = (): void => {
    const errors: Record<string, string> = {}

    // Check if at least one item is selected
    if (Object.keys(selectedItems).length === 0) {
      errors.general = 'Please select at least one item to ship'
      setValidationErrors(errors)
      return false
    }

    // Validate quantities
    let hasQuantityError = false
    Object.entries(selectedItems).forEach(([itemId, selectedItem]) => {
      const item = salesOrder?.items.find(i => i.id === itemId)
      if (item) {
        const availableQty = getAvailableQuantity(item)
        if (selectedItem.quantity <= 0) {
          errors[itemId] = 'Quantity must be greater than 0'
          hasQuantityError = true
        } else if (selectedItem.quantity > availableQty) {
          errors[itemId] = `Cannot exceed remaining quantity (${availableQty})`
          hasQuantityError = true
        }
      }
    })

    if (hasQuantityError) {
      setValidationErrors(errors)
      return false
    }

    setValidationErrors({})
    return true
  }

  const handleSubmit = async (): Promise<unknown> => {
    if (!user || !salesOrder || !validateForm()) return

    try {
      setSaving(true)

      const shipmentData = {
        salesOrderId,
        items: Object.values(selectedItems),
        carrier: carrier.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        shippingMethod: shippingMethod.trim() || undefined,
        shipFromAddress: shipFromAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        createdBy: user.id,
      }

      const response = await api.post('/api/shipments', shipmentData)
      if (!response.ok) {
        throw new Error(response.error || 'Failed to create shipment')
      }
      const shipment = response.data
      
      if (onSuccess) {
        onSuccess(shipment)
      }
    } catch (err) {
      console.error('Error creating shipment:', err)
      setError('Error creating shipment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading order...</span>
      </div>
    )
  }

  if (error || !salesOrder) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
            {onCancel && (
              <Button onClick={onCancel} variant="outline">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const shippableItems = getShippableItems()
  const hasNoShippableItems = shippableItems.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Shipment</h1>
      </div>

      {hasNoShippableItems ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No items available for shipment</p>
              <p className="text-sm text-gray-500 mb-4">
                All items in this order have already been shipped.
              </p>
              {onCancel && (
                <Button onClick={onCancel} variant="outline">
                  Go Back
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Order Number</Label>
                  <p className="font-medium">{salesOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer</Label>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{salesOrder.salesCase.customer.name}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <p className="font-medium text-green-600">{salesOrder.status}</p>
                </div>
              </div>
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-500">Shipping Address</Label>
                <div className="flex items-start space-x-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <p className="text-sm">{salesOrder.shippingAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Item Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Items to Ship</CardTitle>
            </CardHeader>
            <CardContent>
              {validationErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm">{validationErrors.general}</span>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Ship</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Ship Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shippableItems.map((item) => {
                    const isSelected = selectedItems[item.id]
                    const availableQty = getAvailableQuantity(item)
                    const hasError = !!validationErrors[item.id]

                    return (
                      <TableRow key={item.id} className={hasError ? 'bg-red-50' : ''}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={(e): void => handleItemSelection(item.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label={`Select ${item.itemCode}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.itemCode}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.quantityShipped}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{availableQty}</span>
                          <span className="text-sm text-gray-500"> remaining</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isSelected ? (
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="1"
                                max={availableQty}
                                value={isSelected.quantity}
                                onChange={(e): void => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                className={`w-20 text-right ${hasError ? 'border-red-300' : ''}`}
                                aria-label={`Quantity for ${item.itemCode}`}
                              />
                              {hasError && (
                                <p className="text-xs text-red-600">{validationErrors[item.id]}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input
                    id="carrier"
                    value={carrier}
                    onChange={(e): void => setCarrier(e.target.value)}
                    placeholder="FedEx, UPS, DHL, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e): void => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingMethod">Shipping Method</Label>
                  <Input
                    id="shippingMethod"
                    value={shippingMethod}
                    onChange={(e): void => setShippingMethod(e.target.value)}
                    placeholder="Ground, Express, Overnight, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="shipFromAddress">Ship From Address (Optional)</Label>
                  <Input
                    id="shipFromAddress"
                    value={shipFromAddress}
                    onChange={(e): void => setShipFromAddress(e.target.value)}
                    placeholder="Warehouse or shipping location"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e): void => setNotes(e.target.value)}
                  placeholder="Additional notes about this shipment..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={saving || Object.keys(selectedItems).length === 0}
              className="min-w-[120px]"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Shipment
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}