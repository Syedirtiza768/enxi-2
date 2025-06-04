'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShipmentForm } from '@/components/shipments/shipment-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, ArrowLeft } from 'lucide-react'

export default function NewShipmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdFromParams = searchParams.get('orderId')
  
  const [salesOrderId, setSalesOrderId] = useState(orderIdFromParams || '')
  const [showForm, setShowForm] = useState(!!orderIdFromParams)

  const handleOrderSubmit = () => {
    if (salesOrderId.trim()) {
      setShowForm(true)
    }
  }

  const handleShipmentCreated = (shipment: any) => {
    router.push(`/shipments/${shipment.id}`)
  }

  const handleCancel = () => {
    if (showForm && !orderIdFromParams) {
      setShowForm(false)
      setSalesOrderId('')
    } else {
      router.back()
    }
  }

  if (showForm && salesOrderId) {
    return (
      <ShipmentForm
        salesOrderId={salesOrderId}
        onSuccess={handleShipmentCreated}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Shipment</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Select Sales Order</h2>
              <p className="text-gray-600">
                Enter the sales order ID to create a shipment from approved orders.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesOrderId">Sales Order ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="salesOrderId"
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  placeholder="Enter sales order ID"
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleOrderSubmit()
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleOrderSubmit}
                disabled={!salesOrderId.trim()}
                className="flex-1"
              >
                Continue
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Need to find an order?{' '}
                <button
                  onClick={() => router.push('/sales-orders')}
                  className="text-blue-600 hover:underline"
                >
                  Browse Sales Orders
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}