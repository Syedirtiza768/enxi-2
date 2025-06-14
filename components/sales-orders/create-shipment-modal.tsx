'use client'

import React, { useState } from 'react'
import { X, Truck, Package, Calendar, MapPin, Info } from 'lucide-react'
import { useCurrency } from '@/lib/contexts/currency-context'

interface SalesOrderItem {
  id: string
  itemCode: string
  description: string
  quantity: number
  shippedQuantity?: number
}

interface CreateShipmentModalProps {
  isOpen: boolean
  onClose: () => void
  order: {
    id: string
    orderNumber: string
    shippingAddress?: string
    items: SalesOrderItem[]
  }
  onCreateShipment: (data: any) => Promise<void>
}

export function CreateShipmentModal({ isOpen, onClose, order, onCreateShipment }: CreateShipmentModalProps) {
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    shipmentDate: new Date().toISOString().split('T')[0],
    carrier: '',
    trackingNumber: '',
    shippingAddress: order.shippingAddress || '',
    notes: '',
    items: order.items.map(item => ({
      orderItemId: item.id,
      itemCode: item.itemCode,
      description: item.description,
      orderedQuantity: item.quantity,
      shippedQuantity: item.shippedQuantity || 0,
      quantityToShip: Math.min(item.quantity - (item.shippedQuantity || 0), item.quantity)
    }))
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleItemQuantityChange = (index: number, value: string) => {
    const quantity = parseInt(value) || 0
    const maxQuantity = formData.items[index].orderedQuantity - formData.items[index].shippedQuantity
    
    const updatedItems = [...formData.items]
    updatedItems[index].quantityToShip = Math.min(Math.max(0, quantity), maxQuantity)
    
    setFormData(prev => ({ ...prev, items: updatedItems }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.shipmentDate) {
      newErrors.shipmentDate = 'Shipment date is required'
    }
    
    if (!formData.carrier.trim()) {
      newErrors.carrier = 'Carrier is required'
    }
    
    if (!formData.shippingAddress.trim()) {
      newErrors.shippingAddress = 'Shipping address is required'
    }
    
    const hasItemsToShip = formData.items.some(item => item.quantityToShip > 0)
    if (!hasItemsToShip) {
      newErrors.items = 'At least one item must have quantity to ship'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    try {
      const shipmentData = {
        salesOrderId: order.id,
        shipmentDate: new Date(formData.shipmentDate).toISOString(),
        carrier: formData.carrier,
        trackingNumber: formData.trackingNumber,
        shippingAddress: formData.shippingAddress,
        notes: formData.notes,
        items: formData.items
          .filter(item => item.quantityToShip > 0)
          .map(item => ({
            orderItemId: item.orderItemId,
            quantity: item.quantityToShip
          }))
      }
      
      await onCreateShipment(shipmentData)
      onClose()
    } catch (error) {
      console.error('Error creating shipment:', error)
      alert('Failed to create shipment')
    } finally {
      setLoading(false)
    }
  }

  const isPartialShipment = formData.items.some(item => 
    item.quantityToShip < (item.orderedQuantity - item.shippedQuantity)
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Create Shipment for {order.orderNumber}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {isPartialShipment && (
                <div className="mb-4 rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <Info className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        This will be a partial shipment. Not all items will be shipped in full.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="shipmentDate" className="block text-sm font-medium text-gray-700">
                    Shipment Date <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="date"
                      id="shipmentDate"
                      name="shipmentDate"
                      value={formData.shipmentDate}
                      onChange={handleInputChange}
                      className={`block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.shipmentDate ? 'border-red-300' : ''
                      }`}
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.shipmentDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.shipmentDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="carrier" className="block text-sm font-medium text-gray-700">
                    Carrier <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="carrier"
                    name="carrier"
                    value={formData.carrier}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                      errors.carrier ? 'border-red-300' : ''
                    }`}
                  >
                    <option value="">Select carrier</option>
                    <option value="FedEx">FedEx</option>
                    <option value="UPS">UPS</option>
                    <option value="DHL">DHL</option>
                    <option value="USPS">USPS</option>
                    <option value="Own Fleet">Own Fleet</option>
                    <option value="Customer Pickup">Customer Pickup</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.carrier && (
                    <p className="mt-1 text-sm text-red-600">{errors.carrier}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    id="trackingNumber"
                    name="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Optional"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                    Shipping Address <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <textarea
                      id="shippingAddress"
                      name="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={handleInputChange}
                      rows={3}
                      className={`block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.shippingAddress ? 'border-red-300' : ''
                      }`}
                    />
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.shippingAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.shippingAddress}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Shipment Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Special instructions, handling notes, etc."
                  />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Items to Ship</h4>
                {errors.items && (
                  <p className="mb-2 text-sm text-red-600">{errors.items}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ordered
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Already Shipped
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity to Ship
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.items.map((item, index) => {
                        const remaining = item.orderedQuantity - item.shippedQuantity
                        return (
                          <tr key={item.orderItemId}>
                            <td className="px-3 py-4 text-sm">
                              <div className="font-medium text-gray-900">{item.itemCode}</div>
                              <div className="text-gray-500">{item.description}</div>
                            </td>
                            <td className="px-3 py-4 text-sm text-center text-gray-900">
                              {item.orderedQuantity}
                            </td>
                            <td className="px-3 py-4 text-sm text-center text-gray-900">
                              {item.shippedQuantity}
                            </td>
                            <td className="px-3 py-4 text-sm text-center text-gray-900">
                              {remaining}
                            </td>
                            <td className="px-3 py-4 text-sm text-center">
                              <input
                                type="number"
                                value={item.quantityToShip}
                                onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                                min="0"
                                max={remaining}
                                className="w-20 rounded-md border-gray-300 text-center focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                disabled={remaining === 0}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:ml-3 sm:w-auto disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Package className="h-4 w-4 mr-2 animate-pulse" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Create Shipment
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}