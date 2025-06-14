'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api/client'
import { Plus, Package, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrency } from '@/lib/contexts/currency-context'
import type { InventoryItem } from '@/lib/types'

interface Item {
  id: string
  code: string
  name: string
  description?: string
  unitOfMeasure: {
    id: string
    code: string
    name: string
  }
  currentStock?: number
}

// Extended StockMovement type with relations
interface StockMovementWithDetails {
  id: string
  movementNumber: string
  movementDate: Date | string
  movementType: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'OPENING'
  quantity: number
  unitCost?: number | null
  totalCost?: number | null
  referenceNumber?: string | null
  notes?: string | null
  createdBy: string
  createdAt: Date | string
  item: {
    id: string
    code: string
    name: string
  }
  unitOfMeasure: {
    id: string
    code: string
    name: string
  }
  // Custom fields stored in notes
  customer?: string
}

export default function StockOutPage() {
  const { formatCurrency } = useCurrency()
  const [items, setItems] = useState<Item[]>([])
  const [recentMovements, setRecentMovements] = useState<StockMovementWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    itemId: '',
    quantity: '',
    movementDate: format(new Date(), 'yyyy-MM-dd'),
    customer: '',
    referenceNumber: '',
    notes: ''
  })
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchItems()
    fetchRecentMovements()
  }, [])

  const fetchItems = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: any[] }>('/api/inventory/items', { method: 'GET' })
      if (response.ok && response.data) {
        const itemsData = response.data?.data || response.data || []
        setItems(Array.isArray(itemsData) ? itemsData : [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchRecentMovements = async (): Promise<void> => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'STOCK_OUT',
        limit: '50'
      })
      const response = await apiClient<{ movements: StockMovementWithDetails[] }>(`/api/inventory/stock-movements?${params}`, {
        method: 'GET'
      })
      if (response.ok && response.data) {
        // Parse customer from notes if available
        const movements = response.data.movements.map((m: StockMovementWithDetails) => ({
          ...m,
          customer: m.notes?.split('|')[0]?.replace('Customer:', '').trim()
        }))
        setRecentMovements(movements)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleItemSelect = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    setSelectedItem(item || null)
    setFormData({ ...formData, itemId })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.itemId || !formData.quantity) {
      setFormError('Please select an item and enter quantity')
      return
    }

    const quantity = parseFloat(formData.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      setFormError('Quantity must be a positive number')
      return
    }

    // Check if there's enough stock
    if (selectedItem && selectedItem.currentStock !== undefined && quantity > selectedItem.currentStock) {
      setFormError(`Insufficient stock. Available: ${selectedItem.currentStock}`)
      return
    }

    try {
      const response = await apiClient('/api/inventory/stock-movements', {
        method: 'POST',
        body: JSON.stringify({
          itemId: formData.itemId,
          movementType: 'STOCK_OUT',
          movementDate: formData.movementDate,
          quantity: quantity,
          unitOfMeasureId: selectedItem?.unitOfMeasure.id,
          referenceNumber: formData.referenceNumber || undefined,
          // Store customer in notes field
          notes: [
            formData.customer ? `Customer:${formData.customer}` : '',
            formData.notes
          ].filter(Boolean).join(' | ') || undefined
        })
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({
          itemId: '',
          quantity: '',
          movementDate: format(new Date(), 'yyyy-MM-dd'),
          customer: '',
          referenceNumber: '',
          notes: ''
        })
        setSelectedItem(null)
        fetchItems() // Refresh to get updated stock levels
        fetchRecentMovements()
      } else {
        setFormError(response.error || 'Failed to create stock movement')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const filteredItems = items.filter(item => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.code.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Out</h1>
          <p className="text-gray-600">Record stock issues for sales and consumption</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Stock Out
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Issues</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentMovements.filter(m => 
                format(new Date(m.movementDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Stock out transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentMovements.filter(m => {
                const moveDate = new Date(m.movementDate)
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return moveDate >= weekAgo
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Stock issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter(item => 
                item.currentStock !== undefined && item.currentStock < 10
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Need replenishment</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Out Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Record Stock Out</CardTitle>
                <CardDescription>Enter details for outgoing stock</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="item">Item *</Label>
                    <Select value={formData.itemId} onValueChange={handleItemSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            type="text"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{item.code} - {item.name}</span>
                              {item.currentStock !== undefined && (
                                <Badge 
                                  variant={item.currentStock < 10 ? "destructive" : "outline"} 
                                  className="ml-2"
                                >
                                  Stock: {item.currentStock}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="0.00"
                      />
                      {selectedItem && (
                        <p className="text-sm text-gray-500">
                          Unit: {selectedItem.unitOfMeasure.name}
                          {selectedItem.currentStock !== undefined && (
                            <span className="ml-2">
                              (Available: {selectedItem.currentStock})
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="movementDate">Date *</Label>
                      <Input
                        id="movementDate"
                        type="date"
                        value={formData.movementDate}
                        onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer/Department</Label>
                      <Input
                        id="customer"
                        type="text"
                        value={formData.customer}
                        onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                        placeholder="Customer or department name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referenceNumber">Reference Number</Label>
                      <Input
                        id="referenceNumber"
                        type="text"
                        value={formData.referenceNumber}
                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                        placeholder="Order or request number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this stock issue"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setFormError('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Record Stock Out
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Issues</CardTitle>
          <CardDescription>Latest stock out transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading recent movements...</div>
          ) : recentMovements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No stock issues recorded yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Movement #</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Customer/Dept</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{format(new Date(movement.movementDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">{movement.movementNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{movement.item.code}</p>
                        <p className="text-sm text-gray-500">{movement.item.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{movement.customer || movement.notes?.split('|')[0]?.replace('Customer:', '').trim() || '-'}</TableCell>
                    <TableCell>{movement.referenceNumber || '-'}</TableCell>
                    <TableCell className="text-right">{movement.quantity}</TableCell>
                    <TableCell>{movement.createdBy || 'System'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}