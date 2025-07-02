'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { WorkflowVisualization } from './workflow-visualization'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [createMode, setCreateMode] = useState<'shipment' | 'invoice' | null>(null)

  const handleCreateShipment = () => {
    router.push(`/shipments/new?salesOrderId=${salesOrder.id}`)
  }

  const handleCreateInvoice = () => {
    router.push(`/invoices/new?salesOrderId=${salesOrder.id}`)
  }

  return (
    <WorkflowVisualization 
      salesOrder={salesOrder}
      onCreateShipment={handleCreateShipment}
      onCreateInvoice={handleCreateInvoice}
    />
  )
}