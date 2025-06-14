'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  Truck, 
  Clock, 
  CheckCircle, 
  XCircle,
  Edit,
  Send,
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
} from 'lucide-react'

interface ShipmentDetailProps {
  shipmentId: string
}

interface ShipmentItem {
  id: string
  itemCode: string
  description: string
  quantityShipped: number
  item: {
    name: string
    unitPrice: number
  }
}

interface Shipment {
  id: string
  shipmentNumber: string
  status: string
  carrier?: string
  trackingNumber?: string
  shippingMethod?: string
  shipToAddress: string
  shipFromAddress?: string
  createdAt: string
  shippedAt?: string
  deliveredAt?: string
  createdBy: string
  shippedBy?: string
  deliveredBy?: string
  salesOrder: {
    id: string
    orderNumber: string
    salesCase: {
      customer: {
        name: string
        email: string
        phone?: string
      }
    }
  }
  items: ShipmentItem[]
}

export function ShipmentDetail({ shipmentId }: ShipmentDetailProps): React.JSX.Element {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const { user } = useAuth()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDeliverDialog, setShowDeliverDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showEditTrackingDialog, setShowEditTrackingDialog] = useState(false)

  // Form states
  const [cancelReason, setCancelReason] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [trackingData, setTrackingData] = useState({
    carrier: '',
    trackingNumber: '',
    shippingMethod: '',
  })

  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<Shipment>(`/api/shipments/${shipmentId}`)
      if (response.ok && response.data) {
        setShipment(response.data)
        // Initialize tracking data
        setTrackingData({
          carrier: response.data.carrier || '',
          trackingNumber: response.data.trackingNumber || '',
          shippingMethod: response.data.shippingMethod || '',
        })
      } else {
        throw new Error(response.error || 'Failed to fetch shipment')
      }
    } catch (err) {
      console.error('Error fetching shipment:', err)
      setError('Error loading shipment. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [shipmentId])

  useEffect(() => {
    fetchShipment()
  }, [shipmentId, fetchShipment])

  const handleConfirmShipment = async (): Promise<void> => {
    if (!user) return

    try {
      setActionLoading(true)
      const response = await api.post(`/api/shipments/${shipmentId}/confirm`, {
        shippedBy: user.id,
      })
      if (response.ok && response.data) {
        setShipment(response.data)
      } else {
        throw new Error(response.error || 'Failed to confirm shipment')
      }
      setShowConfirmDialog(false)
    } catch (err) {
      console.error('Error confirming shipment:', err)
      alert('Error confirming shipment. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeliverShipment = async (): Promise<unknown> => {
    if (!user) return

    try {
      setActionLoading(true)
      const response = await api.post(`/api/shipments/${shipmentId}/deliver`, {
        deliveredBy: user.id,
        deliveryNotes,
        recipientName,
      })
      if (response.ok && response.data) {
        setShipment(response.data)
      } else {
        throw new Error(response.error || 'Failed to deliver shipment')
      }
      setShowDeliverDialog(false)
      setDeliveryNotes('')
      setRecipientName('')
    } catch (err) {
      console.error('Error delivering shipment:', err)
      alert('Error marking shipment as delivered. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelShipment = async (): Promise<unknown> => {
    if (!user || !cancelReason.trim()) return

    try {
      setActionLoading(true)
      const response = await api.post(`/api/shipments/${shipmentId}/cancel`, {
        cancelledBy: user.id,
        reason: cancelReason.trim(),
      })
      if (response.ok && response.data) {
        setShipment(response.data)
      } else {
        throw new Error(response.error || 'Failed to cancel shipment')
      }
      setShowCancelDialog(false)
      setCancelReason('')
    } catch (err) {
      console.error('Error cancelling shipment:', err)
      alert('Error cancelling shipment. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateTracking: () => Promise<void>= async(): void => {
    try {
      setActionLoading(true)
      const response = await api.put(`/api/shipments/${shipmentId}`, trackingData)
      if (response.ok && response.data) {
        setShipment(response.data)
      } else {
        throw new Error(response.error || 'Failed to update tracking')
      }
      setShowEditTrackingDialog(false)
    } catch (err) {
      console.error('Error updating tracking:', err)
      alert('Error updating tracking information. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusIcon = (status: string): void => {
    switch (status) {
      case 'PREPARING':
        return <Clock className="w-5 h-5" />
      case 'READY':
        return <Package className="w-5 h-5" />
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return <Truck className="w-5 h-5" />
      case 'DELIVERED':
        return <CheckCircle className="w-5 h-5" />
      case 'CANCELLED':
        return <XCircle className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string): void => {
    switch (status) {
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-800'
      case 'READY':
        return 'bg-blue-100 text-blue-800'
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string): void => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const canConfirm = shipment?.status === 'PREPARING' || shipment?.status === 'READY'
  const canDeliver = shipment?.status === 'SHIPPED' || shipment?.status === 'IN_TRANSIT'
  const canCancel = shipment?.status === 'PREPARING' || shipment?.status === 'READY'
  const canEdit = shipment?.status === 'PREPARING' || shipment?.status === 'READY'

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading shipment...</span>
      </div>
    )
  }

  if (error || !shipment) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error || 'Shipment not found'}
            <Button 
              onClick={fetchShipment} 
              className="ml-4"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={(): void => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shipment.shipmentNumber}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={`${getStatusColor(shipment.status)} flex items-center gap-1`}>
                {getStatusIcon(shipment.status)}
                {shipment.status}
              </Badge>
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">Created {formatDate(shipment.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {canEdit && (
            <Dialog open={showEditTrackingDialog} onOpenChange={setShowEditTrackingDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Tracking
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Tracking Information</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="carrier">Carrier</Label>
                    <Input
                      id="carrier"
                      value={trackingData.carrier}
                      onChange={(e): void => setTrackingData(prev => ({
                        ...prev,
                        carrier: e.target.value
                      }))}
                      placeholder="FedEx, UPS, DHL, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="trackingNumber">Tracking Number</Label>
                    <Input
                      id="trackingNumber"
                      value={trackingData.trackingNumber}
                      onChange={(e): void => setTrackingData(prev => ({
                        ...prev,
                        trackingNumber: e.target.value
                      }))}
                      placeholder="Enter tracking number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingMethod">Shipping Method</Label>
                    <Input
                      id="shippingMethod"
                      value={trackingData.shippingMethod}
                      onChange={(e): void => setTrackingData(prev => ({
                        ...prev,
                        shippingMethod: e.target.value
                      }))}
                      placeholder="Ground, Express, etc."
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={(): void => setShowEditTrackingDialog(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateTracking}
                      disabled={actionLoading}
                    >
                      Update Tracking
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {canConfirm && (
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Confirm Shipment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Shipment</DialogTitle>
                </DialogHeader>
                <p>Are you sure you want to confirm this shipment? This will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Mark the shipment as shipped</li>
                  <li>Deduct inventory quantities</li>
                  <li>Update the sales order status</li>
                </ul>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={(): void => setShowConfirmDialog(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmShipment}
                    disabled={actionLoading}
                  >
                    Confirm
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {canDeliver && (
            <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Delivered
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark Shipment as Delivered</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                    <Input
                      id="recipientName"
                      value={recipientName}
                      onChange={(e): void => setRecipientName(e.target.value)}
                      placeholder="Who received the package?"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryNotes">Delivery Notes (Optional)</Label>
                    <Textarea
                      id="deliveryNotes"
                      value={deliveryNotes}
                      onChange={(e): void => setDeliveryNotes(e.target.value)}
                      placeholder="Left at front door, signed by John, etc."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={(): void => setShowDeliverDialog(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleDeliverShipment}
                      disabled={actionLoading}
                    >
                      Mark as Delivered
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {canCancel && (
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Shipment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel This Shipment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cancelReason">Cancellation Reason *</Label>
                    <Textarea
                      id="cancelReason"
                      value={cancelReason}
                      onChange={(e): void => setCancelReason(e.target.value)}
                      placeholder="Please provide a reason for cancellation..."
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={(): void => setShowCancelDialog(false)}
                      disabled={actionLoading}
                    >
                      Keep Shipment
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleCancelShipment}
                      disabled={actionLoading || !cancelReason.trim()}
                    >
                      Cancel Shipment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sales Order</Label>
                  <p className="font-medium">{shipment.salesOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer</Label>
                  <p className="font-medium">{shipment.salesOrder.salesCase.customer.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Items */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipment.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemCode}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantityShipped}</TableCell>
                      <TableCell className="text-right">
                        ${formatCurrency(item.item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${formatCurrency((item.quantityShipped * item.item.unitPrice))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-gray-500">{formatDate(shipment.createdAt)}</p>
                  </div>
                </div>
                
                {shipment.shippedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Truck className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Shipped</p>
                      <p className="text-sm text-gray-500">{formatDate(shipment.shippedAt)}</p>
                    </div>
                  </div>
                )}
                
                {shipment.deliveredAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Delivered</p>
                      <p className="text-sm text-gray-500">{formatDate(shipment.deliveredAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Shipping Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-500">Carrier</Label>
                <p className="font-medium">{shipment.carrier || 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Tracking Number</Label>
                <p className="font-medium">{shipment.trackingNumber || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Shipping Method</Label>
                <p className="font-medium">{shipment.shippingMethod || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{shipment.shipToAddress}</p>
            </CardContent>
          </Card>

          {/* Customer Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-500">Name</Label>
                <p className="font-medium">{shipment.salesOrder.salesCase.customer.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="font-medium">{shipment.salesOrder.salesCase.customer.email}</p>
                </div>
              </div>
              {shipment.salesOrder.salesCase.customer.phone && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{shipment.salesOrder.salesCase.customer.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}