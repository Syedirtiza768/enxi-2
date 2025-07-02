'use client'

import React from 'react'
import { 
  CheckCircle, Clock, Package, FileText, CreditCard, 
  AlertCircle, Truck, XCircle, ArrowRight, Plus,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface WorkflowStep {
  id: string
  label: string
  status: 'completed' | 'active' | 'pending' | 'skipped'
  icon: React.ReactNode
  description?: string
  action?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  metadata?: {
    count?: number
    items?: Array<{
      id: string
      number: string
      status: string
      link?: string
    }>
  }
}

interface WorkflowVisualizationProps {
  salesOrder: {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    shipments?: Array<{
      id: string
      shipmentNumber: string
      status: string
      shippedAt?: string
      deliveredAt?: string
    }>
    invoices?: Array<{
      id: string
      invoiceNumber: string
      status: string
      totalAmount: number
      balanceAmount: number
    }>
  }
  onCreateShipment?: () => void
  onCreateInvoice?: () => void
}

export function WorkflowVisualization({ 
  salesOrder, 
  onCreateShipment, 
  onCreateInvoice 
}: WorkflowVisualizationProps) {
  const router = useRouter()

  // Determine workflow steps based on order status and data
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = []

    // 1. Order Created
    steps.push({
      id: 'created',
      label: 'Order Created',
      status: 'completed',
      icon: <CheckCircle className="w-5 h-5" />,
      description: `Order ${salesOrder.orderNumber} created`
    })

    // 2. Order Approval
    const isApproved = ['APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'COMPLETED'].includes(salesOrder.status)
    steps.push({
      id: 'approved',
      label: 'Order Approved',
      status: isApproved ? 'completed' : salesOrder.status === 'PENDING' ? 'active' : 'skipped',
      icon: <CheckCircle className="w-5 h-5" />,
      description: isApproved ? 'Order has been approved' : 'Awaiting approval',
      action: salesOrder.status === 'PENDING' ? {
        label: 'Approve Order',
        onClick: () => console.log('Approve order')
      } : undefined
    })

    // 3. Shipment
    const hasShipments = salesOrder.shipments && salesOrder.shipments.length > 0
    const allShipped = salesOrder.shipments?.every(s => ['SHIPPED', 'DELIVERED'].includes(s.status))
    const someShipped = salesOrder.shipments?.some(s => ['SHIPPED', 'DELIVERED'].includes(s.status))
    
    steps.push({
      id: 'shipment',
      label: 'Shipment',
      status: hasShipments 
        ? (allShipped ? 'completed' : 'active')
        : (isApproved ? 'pending' : 'skipped'),
      icon: <Truck className="w-5 h-5" />,
      description: hasShipments 
        ? `${salesOrder.shipments.length} shipment(s) created`
        : 'Ready for shipment',
      action: isApproved && (!hasShipments || !allShipped) ? {
        label: hasShipments ? 'Create Another Shipment' : 'Create Shipment',
        onClick: onCreateShipment || (() => router.push(`/shipments/new?salesOrderId=${salesOrder.id}`))
      } : undefined,
      metadata: hasShipments ? {
        count: salesOrder.shipments.length,
        items: salesOrder.shipments.map(s => ({
          id: s.id,
          number: s.shipmentNumber,
          status: s.status,
          link: `/shipments/${s.id}`
        }))
      } : undefined
    })

    // 4. Delivery
    const allDelivered = salesOrder.shipments?.every(s => s.status === 'DELIVERED')
    const someDelivered = salesOrder.shipments?.some(s => s.status === 'DELIVERED')
    
    steps.push({
      id: 'delivery',
      label: 'Delivery',
      status: allDelivered 
        ? 'completed' 
        : someDelivered 
          ? 'active' 
          : hasShipments 
            ? 'pending' 
            : 'skipped',
      icon: <Package className="w-5 h-5" />,
      description: allDelivered 
        ? 'All items delivered'
        : someDelivered
          ? 'Partial delivery completed'
          : 'Awaiting delivery'
    })

    // 5. Invoice
    const hasInvoices = salesOrder.invoices && salesOrder.invoices.length > 0
    const totalInvoiced = salesOrder.invoices?.reduce((sum, inv) => sum + inv.totalAmount, 0) || 0
    const fullyInvoiced = totalInvoiced >= salesOrder.totalAmount * 0.99 // Allow small rounding differences
    
    steps.push({
      id: 'invoice',
      label: 'Invoice',
      status: hasInvoices 
        ? (fullyInvoiced ? 'completed' : 'active')
        : 'pending',
      icon: <FileText className="w-5 h-5" />,
      description: hasInvoices 
        ? `${salesOrder.invoices.length} invoice(s) created`
        : 'Ready for invoicing',
      action: !fullyInvoiced ? {
        label: hasInvoices ? 'Create Another Invoice' : 'Create Invoice',
        onClick: onCreateInvoice || (() => router.push(`/invoices/new?salesOrderId=${salesOrder.id}`))
      } : undefined,
      metadata: hasInvoices ? {
        count: salesOrder.invoices.length,
        items: salesOrder.invoices.map(i => ({
          id: i.id,
          number: i.invoiceNumber,
          status: i.status,
          link: `/invoices/${i.id}`
        }))
      } : undefined
    })

    // 6. Payment
    const totalPaid = salesOrder.invoices?.reduce((sum, inv) => sum + (inv.totalAmount - inv.balanceAmount), 0) || 0
    const fullyPaid = totalPaid >= salesOrder.totalAmount * 0.99
    const partiallyPaid = totalPaid > 0
    
    steps.push({
      id: 'payment',
      label: 'Payment',
      status: fullyPaid 
        ? 'completed' 
        : partiallyPaid 
          ? 'active' 
          : hasInvoices 
            ? 'pending' 
            : 'skipped',
      icon: <CreditCard className="w-5 h-5" />,
      description: fullyPaid 
        ? 'Payment completed'
        : partiallyPaid
          ? `Partial payment received`
          : 'Awaiting payment'
    })

    // Handle cancelled status
    if (salesOrder.status === 'CANCELLED') {
      // Mark all pending/active steps as skipped
      steps.forEach(step => {
        if (step.status === 'pending' || step.status === 'active') {
          step.status = 'skipped'
        }
      })
    }

    return steps
  }

  const steps = getWorkflowSteps()

  const getStepColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'active': return 'text-blue-600 bg-blue-50 border-blue-200 animate-pulse'
      case 'pending': return 'text-gray-400 bg-gray-50 border-gray-200'
      case 'skipped': return 'text-gray-300 bg-gray-50 border-gray-100'
    }
  }

  const getConnectorColor = (fromStatus: WorkflowStep['status'], toStatus: WorkflowStep['status']) => {
    if (fromStatus === 'completed' && (toStatus === 'completed' || toStatus === 'active')) {
      return 'bg-green-500'
    }
    if (fromStatus === 'completed' && toStatus === 'pending') {
      return 'bg-gray-300'
    }
    return 'bg-gray-200'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order Workflow</span>
          <Badge className={`${
            salesOrder.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            salesOrder.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {salesOrder.status.replace('_', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Workflow Steps */}
        <div className="relative">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Step */}
              <div className="flex items-start gap-4 mb-8">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStepColor(step.status)}`}>
                  {step.icon}
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    step.status === 'completed' ? 'text-gray-900' :
                    step.status === 'active' ? 'text-blue-900' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  
                  {/* Metadata */}
                  {step.metadata?.items && (
                    <div className="mt-2 space-y-1">
                      {step.metadata.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.number}
                          </Badge>
                          <span className="text-xs text-gray-500">{item.status}</span>
                          {item.link && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1"
                              onClick={() => router.push(item.link!)}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Action */}
                  {step.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={step.action.onClick}
                      disabled={step.action.disabled}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {step.action.label}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="absolute left-5 top-10 bottom-0 w-0.5">
                  <div className={`h-full ${getConnectorColor(step.status, steps[index + 1].status)}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status Messages */}
        {salesOrder.status === 'ON_HOLD' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Order is on hold. Please resolve any issues before proceeding.
              </p>
            </div>
          </div>
        )}

        {salesOrder.status === 'CANCELLED' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">
                This order has been cancelled and cannot be processed further.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}