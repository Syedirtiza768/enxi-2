'use client'

import { useState } from 'react'
import { 
  CheckCircle, 
  Clock, 
  Package, 
  FileText, 
  CreditCard, 
  AlertCircle,
  Truck,
  Warehouse
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api/client'

interface WorkflowStatusProps {
  salesOrder: {
    id: string
    orderNumber: string
    status: string
    items: Array<{
      id: string
      itemCode: string
      description: string
      quantity: number
      quantityReserved: number
      quantityShipped: number
      quantityInvoiced: number
    }>
    shipments?: Array<{
      id: string
      shipmentNumber: string
      status: string
    }>
    invoices?: Array<{
      id: string
      invoiceNumber: string
      status: string
      totalAmount: number
    }>
  }
}

export function WorkflowStatus({ salesOrder }: WorkflowStatusProps) {
  const [_loading, _setLoading] = useState(false)
  const [approving, setApproving] = useState(false)

  const getStatusIcon = (completed: boolean, pending: boolean = false) => {
    if (completed) return <CheckCircle className="w-5 h-5 text-green-600" />
    if (pending) return <Clock className="w-5 h-5 text-yellow-600" />
    return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
  }

  const getStatusColor = (completed: boolean, pending: boolean = false) => {
    if (completed) return 'text-green-600'
    if (pending) return 'text-yellow-600'
    return 'text-gray-400'
  }

  const handleApproveOrder = async (): Promise<void> => {
    setApproving(true)
    try {
      const response = await api.post(`/api/sales-orders/${salesOrder.id}/approve`, {
        notes: 'Approved via workflow interface'
      })

      if (response.ok) {
        // Refresh the page or update state
        window.location.reload()
      } else {
        console.error('Failed to approve order:', response.error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setApproving(false)
    }
  }

  // Calculate workflow status
  const isApproved = ['APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'COMPLETED'].includes(salesOrder.status)
  const isProcessing = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'COMPLETED'].includes(salesOrder.status)
  const isShipped = ['SHIPPED', 'DELIVERED', 'INVOICED', 'COMPLETED'].includes(salesOrder.status)
  const isDelivered = ['DELIVERED', 'INVOICED', 'COMPLETED'].includes(salesOrder.status)
  const isInvoiced = ['INVOICED', 'COMPLETED'].includes(salesOrder.status)
  const isCompleted = salesOrder.status === 'COMPLETED'

  const totalReserved = salesOrder.items.reduce((sum, item) => sum + item.quantityReserved, 0)
  const totalQuantity = salesOrder.items.reduce((sum, item) => sum + item.quantity, 0)
  const stockAllocated = totalReserved > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sales Workflow Status</span>
          <Badge className={`${
            isCompleted ? 'bg-green-100 text-green-800' :
            isProcessing ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {salesOrder.status.replace('_', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Approval */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(isApproved, salesOrder.status === 'PENDING')}
          <div className="flex-1">
            <h4 className={`font-medium ${getStatusColor(isApproved, salesOrder.status === 'PENDING')}`}>
              Order Approval
            </h4>
            <p className="text-sm text-gray-600">
              {isApproved ? 'Order has been approved' : 'Awaiting approval'}
            </p>
          </div>
          {!isApproved && salesOrder.status === 'PENDING' && (
            <Button
              onClick={handleApproveOrder}
              loading={approving}
              size="sm"
              className="ml-auto"
            >
              Approve Order
            </Button>
          )}
        </div>

        {/* Stock Allocation */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(stockAllocated && isApproved, isApproved && !stockAllocated)}
          <div className="flex-1">
            <h4 className={`font-medium ${getStatusColor(stockAllocated && isApproved, isApproved && !stockAllocated)}`}>
              Stock Allocation
            </h4>
            <p className="text-sm text-gray-600">
              {stockAllocated 
                ? `${totalReserved} of ${totalQuantity} items reserved`
                : isApproved 
                  ? 'Stock allocation in progress...'
                  : 'Pending order approval'
              }
            </p>
          </div>
          <Warehouse className="w-5 h-5 text-gray-400" />
        </div>

        {/* Order Processing */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(isProcessing, isApproved && !isProcessing)}
          <div className="flex-1">
            <h4 className={`font-medium ${getStatusColor(isProcessing, isApproved && !isProcessing)}`}>
              Order Processing
            </h4>
            <p className="text-sm text-gray-600">
              {isProcessing 
                ? 'Order is being processed'
                : isApproved 
                  ? 'Ready for processing'
                  : 'Awaiting stock allocation'
              }
            </p>
          </div>
          <Package className="w-5 h-5 text-gray-400" />
        </div>

        {/* Shipment */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(isShipped, isProcessing && !isShipped)}
          <div className="flex-1">
            <h4 className={`font-medium ${getStatusColor(isShipped, isProcessing && !isShipped)}`}>
              Shipment
            </h4>
            <p className="text-sm text-gray-600">
              {salesOrder.shipments?.length 
                ? `${salesOrder.shipments.length} shipment(s) created`
                : isProcessing 
                  ? 'Shipment being prepared'
                  : 'Awaiting processing'
              }
            </p>
          </div>
          <Truck className="w-5 h-5 text-gray-400" />
        </div>

        {/* Delivery */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(isDelivered, isShipped && !isDelivered)}
          <div className="flex-1">
            <h4 className={`font-medium ${getStatusColor(isDelivered, isShipped && !isDelivered)}`}>
              Delivery
            </h4>
            <p className="text-sm text-gray-600">
              {isDelivered 
                ? 'Order delivered to customer'
                : isShipped 
                  ? 'In transit to customer'
                  : 'Awaiting shipment'
              }
            </p>
          </div>
        </div>

        {/* Invoicing */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(isInvoiced, isDelivered && !isInvoiced)}
          <div className="flex-1">
            <h4 className={`font-medium ${getStatusColor(isInvoiced, isDelivered && !isInvoiced)}`}>
              Invoicing
            </h4>
            <p className="text-sm text-gray-600">
              {salesOrder.invoices?.length 
                ? `${salesOrder.invoices.length} invoice(s) generated`
                : isDelivered 
                  ? 'Auto-generating invoice...'
                  : 'Awaiting delivery'
              }
            </p>
          </div>
          <FileText className="w-5 h-5 text-gray-400" />
        </div>

        {/* Payment & Completion */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(isCompleted, isInvoiced && !isCompleted)}
          <div className="flex-1">
            <h4 className={`font-medium ${getStatusColor(isCompleted, isInvoiced && !isCompleted)}`}>
              Payment & Completion
            </h4>
            <p className="text-sm text-gray-600">
              {isCompleted 
                ? 'Order completed successfully'
                : isInvoiced 
                  ? 'Awaiting payment'
                  : 'Awaiting invoicing'
              }
            </p>
          </div>
          <CreditCard className="w-5 h-5 text-gray-400" />
        </div>

        {/* Workflow Summary */}
        {salesOrder.status === 'ON_HOLD' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Order is on hold due to insufficient stock. Stock will be allocated when inventory becomes available.
              </p>
            </div>
          </div>
        )}

        {isApproved && stockAllocated && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Automated workflow active: Order will automatically progress through shipment → delivery → invoicing as each stage completes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}