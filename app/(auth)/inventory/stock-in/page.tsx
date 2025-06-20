'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api/client'
import { Plus, Package, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrency } from '@/lib/contexts/currency-context'

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
  // Custom fields stored in notes or referenceNumber
  supplier?: string
  purchaseRef?: string
}

export default function StockInPage() {
  
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
    unitCost: '',
    movementDate: format(new Date(), 'yyyy-MM-dd'),
    supplier: '',
    purchaseRef: '',
    lotNumber: '',
    expiryDate: '',
    notes: ''
  })
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [formError, setFormError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchItems()
    fetchRecentMovements()
  }, [])

  const fetchItems = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: Item[], total: number }>('/api/inventory/items', { method: 'GET' })
      if (response.ok && response?.data) {
        const itemsData = response.data.data || []
        setItems(itemsData)
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const fetchRecentMovements = async (): Promise<void> => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'STOCK_IN',
        limit: '50'
      })
      const response = await apiClient<{ movements: StockMovementWithDetails[] }>(`/api/inventory/stock-movements?${params}`, {
        method: 'GET'
      })
      if (response.ok && response?.data) {
        // Parse supplier and purchaseRef from notes if available
        const movements = response?.data.movements.map((m: StockMovementWithDetails) => ({
          ...m,
          supplier: m.notes?.split('|')[0]?.replace('Supplier:', '').trim(),
          purchaseRef: m.notes?.split('|')[1]?.replace('PurchaseRef:', '').trim()
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

    const unitCost = formData.unitCost ? parseFloat(formData.unitCost) : undefined
    if (formData.unitCost && unitCost !== undefined && (isNaN(unitCost) || unitCost < 0)) {
      setFormError('Unit cost must be a non-negative number')
      return
    }

    try {
      const response = await apiClient<StockMovementWithDetails>('/api/inventory/stock-movements', {
        method: 'POST',
        body: JSON.stringify({
          itemId: formData.itemId,
          movementType: 'STOCK_IN',
          movementDate: formData.movementDate,
          quantity: quantity,
          unitCost: unitCost,
          unitOfMeasureId: selectedItem?.unitOfMeasure.id,
          lotNumber: formData.lotNumber || undefined,
          expiryDate: formData.expiryDate || undefined,
          // Store supplier and purchaseRef in notes field
          notes: [
            formData.supplier ? `Supplier:${formData.supplier}` : '',
            formData.purchaseRef ? `PurchaseRef:${formData.purchaseRef}` : '',
            formData.notes
          ].filter(Boolean).join(' | ') || undefined,
          autoCreateLot: true
        })
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({
          itemId: '',
          quantity: '',
          unitCost: '',
          movementDate: format(new Date(), 'yyyy-MM-dd'),
          supplier: '',
          purchaseRef: '',
          lotNumber: '',
          expiryDate: '',
          notes: ''
        })
        setSelectedItem(null)
        setSearch('') // Clear search after successful submission
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

  // formatCurrency function removed - use useCurrency hook instead

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock In</h1>
          <p className="text-gray-600">Record stock receipts from purchases and production</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Stock In
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Receipts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentMovements.filter(m => 
                format(new Date(m.movementDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Stock in transactions</p>
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
            <p className="text-xs text-muted-foreground">Stock receipts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                recentMovements.reduce((sum, m) => sum + (m.totalCost || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Recent stock value</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock In Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Record Stock In</CardTitle>
                <CardDescription>Enter details for incoming stock</CardDescription>
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
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between text-left font-normal"
                        >
                          {selectedItem ? (
                            <span>{selectedItem.code} - {selectedItem.name}</span>
                          ) : (
                            <span className="text-muted-foreground">Select an item</span>
                          )}
                          <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-4" align="start">
                        <div className="space-y-2">
                          <Input
                            type="text"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full"
                          />
                          {search && (
                            <p className="text-sm text-gray-500">
                              Showing {filteredItems.length} of {items.length} items
                            </p>
                          )}
                        </div>
                        <div className="mt-4 max-h-64 overflow-y-auto">
                          {filteredItems.length === 0 ? (
                            <div className="py-6 text-center text-sm text-gray-500">
                              No items found{search && ` matching "${search}"`}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {filteredItems.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className="w-full p-2 text-left hover:bg-gray-100 rounded-md transition-colors"
                                  onClick={() => {
                                    handleItemSelect(item.id)
                                    setOpen(false)
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">{item.code} - {item.name}</div>
                                      {item.description && (
                                        <div className="text-sm text-gray-500">{item.description}</div>
                                      )}
                                    </div>
                                    {item.currentStock !== undefined && (
                                      <Badge variant="outline" className="ml-2">
                                        Stock: {item.currentStock}
                                      </Badge>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
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
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitCost">Unit Cost</Label>
                      <Input
                        id="unitCost"
                        type="number"
                        step="0.01"
                        value={formData.unitCost}
                        onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                        placeholder="0.00"
                      />
                      {formData.quantity && formData.unitCost && !isNaN(parseFloat(formData.quantity)) && !isNaN(parseFloat(formData.unitCost)) && (
                        <p className="text-sm text-gray-500">
                          Total: {formatCurrency(parseFloat(formData.quantity) * parseFloat(formData.unitCost))}
                        </p>
                      )}
                    </div>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        placeholder="Supplier name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchaseRef">Purchase Reference</Label>
                      <Input
                        id="purchaseRef"
                        type="text"
                        value={formData.purchaseRef}
                        onChange={(e) => setFormData({ ...formData, purchaseRef: e.target.value })}
                        placeholder="PO number or reference"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lotNumber">Lot/Batch Number</Label>
                      <Input
                        id="lotNumber"
                        type="text"
                        value={formData.lotNumber}
                        onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                        placeholder="Optional lot number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this stock receipt"
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
                        setSearch('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Record Stock In
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
          <CardTitle>Recent Stock Receipts</CardTitle>
          <CardDescription>Latest stock in transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading recent movements...</div>
          ) : recentMovements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No stock receipts recorded yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Movement #</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
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
                    <TableCell>{movement.supplier || movement.notes?.split('|')[0]?.replace('Supplier:', '').trim() || '-'}</TableCell>
                    <TableCell>{movement.referenceNumber || '-'}</TableCell>
                    <TableCell className="text-right">{movement.quantity}</TableCell>
                    <TableCell className="text-right">
                      {movement.unitCost ? formatCurrency(movement.unitCost) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {movement.totalCost ? formatCurrency(movement.totalCost) : '-'}
                    </TableCell>
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