'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Save, X, Plus, Trash2, Eye, FileText, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ItemSelectorModal } from '@/components/inventory/item-selector-modal'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface QuotationLine {
  lineNumber: number
  lineDescription: string
  items: QuotationItem[]
}

interface QuotationItem {
  id?: string
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  sortOrder: number
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  unitOfMeasureId?: string
  cost?: number
  discount?: number
  taxRate?: number
  taxRateId?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  availabilityStatus?: string
  availableQuantity?: number
}

interface TaxRate {
  id: string
  code: string
  name: string
  rate: number
  isDefault: boolean
}

interface SalesCase {
  id: string
  caseNumber: string
  title: string
  customer: {
    id: string
    customerNumber: string
    name: string
    email: string
    phone?: string
    address?: string
    taxId?: string
    currency: string
    paymentTerms: number
  }
}

interface QuotationFormEnhancedProps {
  salesCaseId?: string
  quotationId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function QuotationFormEnhanced({
  salesCaseId,
  quotationId,
  onSuccess,
  onCancel
}: QuotationFormEnhancedProps) {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  
  // Form state
  const [salesCase, setSalesCase] = useState<SalesCase | null>(null)
  const [lines, setLines] = useState<QuotationLine[]>([])
  const [validUntil, setValidUntil] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [deliveryTerms, setDeliveryTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  
  // Reference data
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [defaultTaxRate, setDefaultTaxRate] = useState<TaxRate | null>(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [currentLineNumber, setCurrentLineNumber] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'client' | 'internal'>('edit')
  
  // Totals
  const [subtotal, setSubtotal] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [taxAmount, setTaxAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  // Load sales case and quotation data
  useEffect(() => {
    if (salesCaseId) {
      loadSalesCase(salesCaseId)
    }
    if (quotationId) {
      loadQuotation(quotationId)
    }
    loadTaxRates()
  }, [salesCaseId, quotationId])

  // Calculate totals whenever lines change
  useEffect(() => {
    calculateTotals()
  }, [lines])

  const loadSalesCase = async (id: string) => {
    try {
      setLoading(true)
      const response = await apiClient<{ data: any[] }>(`/api/sales-cases/${id}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to load sales case')
      }
      
      setSalesCase(response?.data)
      
      // Set default payment terms from customer
      if (response?.data.customer.paymentTerms) {
        setPaymentTerms(`Net ${response?.data.customer.paymentTerms}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales case')
    } finally {
      setLoading(false)
    }
  }

  const loadQuotation = async (id: string) => {
    try {
      setLoading(true)
      const response = await apiClient<{ data: any[] }>(`/api/quotations/${id}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to load quotation')
      }
      
      const quotation = response?.data
      
      // Set form fields
      setValidUntil(quotation.validUntil.split('T')[0])
      setPaymentTerms(quotation.paymentTerms || '')
      setDeliveryTerms(quotation.deliveryTerms || '')
      setNotes(quotation.notes || '')
      setInternalNotes(quotation.internalNotes || '')
      
      // Group items into lines
      const lineMap = new Map<number, QuotationItem[]>()
      quotation.items.forEach((item: QuotationItem) => {
        if (!lineMap.has(item.lineNumber)) {
          lineMap.set(item.lineNumber, [])
        }
        lineMap.get(item.lineNumber)?.push(item)
      })
      
      const quotationLines: QuotationLine[] = Array.from(lineMap.entries()).map(([lineNumber, items]) => {
        const lineHeader = items.find(item => item.isLineHeader)
        return {
          lineNumber,
          lineDescription: lineHeader?.lineDescription || undefined,
          items: items.sort((a, b) => a.sortOrder - b.sortOrder)
        }
      })
      
      setLines(quotationLines.sort((a, b) => a.lineNumber - b.lineNumber))
      
      // Load sales case if not already loaded
      if (!salesCase && quotation.salesCase) {
        setSalesCase(quotation.salesCase)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotation')
    } finally {
      setLoading(false)
    }
  }

  const loadTaxRates = async (): Promise<void> => {
    try {
      const response = await apiClient<{ data: any }>('/api/tax-rates?taxType=SALES&isActive=true', {
        method: 'GET'
      })
      
      if (response.ok) {
        const rates = response?.data || []
        setTaxRates(rates)
        const defaultRate = rates.find((r: TaxRate) => r.isDefault)
        setDefaultTaxRate(defaultRate || null)
      }
    } catch (err) {
      console.error('Error loading tax rates:', err)
    }
  }

  const calculateTotals = () => {
    let subTotal = 0
    let discountTotal = 0
    let taxTotal = 0
    
    lines.forEach(line => {
      line.items.forEach(item => {
        subTotal += item.subtotal
        discountTotal += item.discountAmount
        taxTotal += item.taxAmount
      })
    })
    
    setSubtotal(subTotal)
    setDiscountAmount(discountTotal)
    setTaxAmount(taxTotal)
    setTotalAmount(subTotal - discountTotal + taxTotal)
  }

  const addNewLine = () => {
    const newLineNumber = lines.length > 0 ? Math.max(...lines.map(l => l.lineNumber)) + 1 : 1
    setLines([...lines, {
      lineNumber: newLineNumber,
      lineDescription: '',
      items: []
    }])
  }

  const updateLineDescription = (lineNumber: number, description: string) => {
    setLines(lines.map(line => 
      line.lineNumber === lineNumber 
        ? { ...line, lineDescription: description }
        : line
    ))
  }

  const deleteLine = (lineNumber: number) => {
    setLines(lines.filter(line => line.lineNumber !== lineNumber))
  }

  const openItemSelector = (lineNumber: number) => {
    setCurrentLineNumber(lineNumber)
    setShowItemSelector(true)
  }

  const handleItemsSelected = (selectedItems: any[]) => {
    if (currentLineNumber === null) return
    
    const line = lines.find(l => l.lineNumber === currentLineNumber)
    if (!line) return
    
    // Convert selected items to quotation items
    const newItems: QuotationItem[] = selectedItems.map((item, index) => {
      const isFirstItem = line.items.length === 0 && index === 0
      const sortOrder = line.items.length + index
      
      // Calculate item totals
      const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
      const discountAmount = subtotal * (item.discount || 0) / 100
      const taxableAmount = subtotal - discountAmount
      const taxRate = item.taxRate || defaultTaxRate?.rate || 0
      const taxAmount = taxableAmount * taxRate / 100
      const totalAmount = taxableAmount + taxAmount
      
      return {
        lineNumber: currentLineNumber,
        lineDescription: isFirstItem ? line.lineDescription : undefined,
        isLineHeader: isFirstItem,
        sortOrder,
        itemType: item.type,
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitOfMeasureId: item.unitOfMeasureId,
        cost: item.cost,
        discount: item.discount || 0,
        taxRate,
        taxRateId: item.taxRateId || defaultTaxRate?.id,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        availabilityStatus: item.availableStock !== undefined ? 
          (item.availableStock >= item.quantity ? 'IN_STOCK' : 'INSUFFICIENT_STOCK') : 
          undefined,
        availableQuantity: item.availableStock
      }
    })
    
    // Update the line with new items
    setLines(lines.map(l => 
      l.lineNumber === currentLineNumber
        ? { ...l, items: [...l.items, ...newItems] }
        : l
    ))
  }

  const updateItemQuantity = (lineNumber: number, itemIndex: number, quantity: number) => {
    setLines(lines.map(line => {
      if (line.lineNumber !== lineNumber) return line
      
      const updatedItems = [...line.items]
      const item = updatedItems[itemIndex]
      
      // Recalculate totals
      const subtotal = quantity * item.unitPrice
      const discountAmount = subtotal * (item.discount || 0) / 100
      const taxableAmount = subtotal - discountAmount
      const taxAmount = taxableAmount * item.taxRate / 100
      const totalAmount = taxableAmount + taxAmount
      
      updatedItems[itemIndex] = {
        ...item,
        quantity,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount
      }
      
      return { ...line, items: updatedItems }
    }))
  }

  const updateItemPrice = (lineNumber: number, itemIndex: number, unitPrice: number) => {
    setLines(lines.map(line => {
      if (line.lineNumber !== lineNumber) return line
      
      const updatedItems = [...line.items]
      const item = updatedItems[itemIndex]
      
      // Recalculate totals
      const subtotal = Number(item.quantity || 0) * Number(unitPrice || 0)
      const discountAmount = subtotal * (item.discount || 0) / 100
      const taxableAmount = subtotal - discountAmount
      const taxAmount = taxableAmount * item.taxRate / 100
      const totalAmount = taxableAmount + taxAmount
      
      updatedItems[itemIndex] = {
        ...item,
        unitPrice,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount
      }
      
      return { ...line, items: updatedItems }
    }))
  }

  const updateItemDiscount = (lineNumber: number, itemIndex: number, discount: number) => {
    setLines(lines.map(line => {
      if (line.lineNumber !== lineNumber) return line
      
      const updatedItems = [...line.items]
      const item = updatedItems[itemIndex]
      
      // Recalculate totals
      const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
      const discountAmount = subtotal * discount / 100
      const taxableAmount = subtotal - discountAmount
      const taxAmount = taxableAmount * item.taxRate / 100
      const totalAmount = taxableAmount + taxAmount
      
      updatedItems[itemIndex] = {
        ...item,
        discount,
        discountAmount,
        taxAmount,
        totalAmount
      }
      
      return { ...line, items: updatedItems }
    }))
  }

  const updateItemTaxRate = (lineNumber: number, itemIndex: number, taxRateId: string) => {
    const taxRate = taxRates.find(r => r.id === taxRateId)
    if (!taxRate) return
    
    setLines(lines.map(line => {
      if (line.lineNumber !== lineNumber) return line
      
      const updatedItems = [...line.items]
      const item = updatedItems[itemIndex]
      
      // Recalculate totals
      const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
      const discountAmount = subtotal * (item.discount || 0) / 100
      const taxableAmount = subtotal - discountAmount
      const taxAmount = taxableAmount * taxRate.rate / 100
      const totalAmount = taxableAmount + taxAmount
      
      updatedItems[itemIndex] = {
        ...item,
        taxRate: taxRate.rate,
        taxRateId,
        taxAmount,
        totalAmount
      }
      
      return { ...line, items: updatedItems }
    }))
  }

  const deleteItem = (lineNumber: number, itemIndex: number) => {
    setLines(lines.map(line => {
      if (line.lineNumber !== lineNumber) return line
      
      const updatedItems = line.items.filter((_, index) => index !== itemIndex)
      
      // Update isLineHeader for the first item if needed
      if (updatedItems.length > 0 && itemIndex === 0) {
        updatedItems[0] = {
          ...updatedItems[0],
          isLineHeader: true,
          lineDescription: line.lineDescription
        }
      }
      
      return { ...line, items: updatedItems }
    }))
  }

  const handleSave: () => Promise<void>= async() => {
    try {
      setSaving(true)
      setError(null)
      
      // Validate
      if (!salesCase) {
        throw new Error('Sales case is required')
      }
      
      if (!validUntil) {
        throw new Error('Valid until date is required')
      }
      
      if (lines.length === 0 || lines.every(line => line.items.length === 0)) {
        throw new Error('At least one item is required')
      }
      
      // Prepare items for API
      const items = []
      let sortOrder = 0
      
      for (const line of lines) {
        for (let i = 0; i < line.items.length; i++) {
          const item = line.items[i]
          items.push({
            lineNumber: line.lineNumber,
            lineDescription: i === 0 ? line.lineDescription : undefined,
            isLineHeader: i === 0,
            itemType: item.itemType,
            itemId: item.itemId,
            itemCode: item.itemCode,
            description: item.description,
            internalDescription: item.internalDescription,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitOfMeasureId: item.unitOfMeasureId,
            cost: item.cost,
            discount: item.discount,
            taxRateId: item.taxRateId,
            sortOrder: sortOrder++
          })
        }
      }
      
      const data = {
        salesCaseId: salesCase.id,
        validUntil: new Date(validUntil).toISOString(),
        paymentTerms,
        deliveryTerms,
        notes,
        internalNotes,
        items
      }
      
      let response
      if (quotationId) {
        response = await apiClient(`/api/quotations/${quotationId}`, {
          method: 'PUT',
          data
        })
      } else {
        response = await apiClient('/api/quotations', {
          method: 'POST',
          data
        })
      }
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to save quotation')
      }
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }

  const renderClientView = () => {
    return (
      <div className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>
                <p className="font-medium">{salesCase?.customer.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <p>{salesCase?.customer.email}</p>
              </div>
              {salesCase?.customer.phone && (
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p>{salesCase.customer.phone}</p>
                </div>
              )}
              {salesCase?.customer.address && (
                <div>
                  <span className="text-gray-500">Address:</span>
                  <p>{salesCase.customer.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quotation Lines (Client View) */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Quotation Items</h3>
            <div className="space-y-4">
              {lines.map((line) => {
                const lineTotal = line.items.reduce((sum, item) => sum + item.totalAmount, 0)
                return (
                  <div key={line.lineNumber} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          Line {line.lineNumber}: {line.lineDescription || 'No description'}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {line.items.length} item{line.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {notes && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderInternalView = () => {
    return (
      <div className="space-y-6">
        {/* All details including costs and margins */}
        {lines.map((line) => (
          <Card key={line.lineNumber}>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">
                Line {line.lineNumber}: {line.lineDescription || 'No description'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2">Item</th>
                      <th className="text-right pb-2">Qty</th>
                      <th className="text-right pb-2">Price</th>
                      <th className="text-right pb-2">Cost</th>
                      <th className="text-right pb-2">Margin</th>
                      <th className="text-right pb-2">Discount</th>
                      <th className="text-right pb-2">Tax</th>
                      <th className="text-right pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {line.items.map((item, index) => {
                      const margin = item.cost ? ((Number(item.unitPrice || 0) - Number(item.cost || 0)) / Number(item.unitPrice || 1) * 100) : 0
                      return (
                        <tr key={index} className="border-b">
                          <td className="py-2">
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.internalDescription && (
                                <p className="text-xs text-gray-500">{item.internalDescription}</p>
                              )}
                              <p className="text-xs text-gray-400">{item.itemCode}</p>
                            </div>
                          </td>
                          <td className="text-right py-2">{item.quantity}</td>
                          <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right py-2">
                            {item.cost ? formatCurrency(item.cost) : '-'}
                          </td>
                          <td className="text-right py-2">
                            {item.cost ? (
                              <span className={margin > 30 ? 'text-green-600' : margin < 10 ? 'text-red-600' : ''}>
                                {margin.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                          <td className="text-right py-2">
                            {item.discount ? `${item.discount}%` : '-'}
                          </td>
                          <td className="text-right py-2">{item.taxRate}%</td>
                          <td className="text-right py-2 font-medium">
                            {formatCurrency(item.totalAmount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Internal Notes */}
        {internalNotes && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Internal Notes</h3>
              <p className="text-sm whitespace-pre-wrap bg-yellow-50 p-3 rounded">
                {internalNotes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {quotationId ? 'Edit Quotation' : 'New Quotation'}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('edit')}
            className={viewMode === 'edit' ? 'bg-gray-100' : ''}
          >
            <FileText className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('client')}
            className={viewMode === 'client' ? 'bg-gray-100' : ''}
          >
            <Eye className="h-4 w-4 mr-1" />
            Client View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('internal')}
            className={viewMode === 'internal' ? 'bg-gray-100' : ''}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Internal View
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Sales Case Info */}
      {salesCase && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-500">Sales Case</span>
                <p className="font-medium">{salesCase.caseNumber} - {salesCase.title}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Customer</span>
                <p className="font-medium">{salesCase.customer.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Currency</span>
                <p className="font-medium">{salesCase.customer.currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Different views based on mode */}
      {viewMode === 'client' && renderClientView()}
      {viewMode === 'internal' && renderInternalView()}
      
      {viewMode === 'edit' && (
        <>
          {/* Quotation Details */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Quotation Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Valid Until*</label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Terms</label>
                  <Input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g., Net 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Terms</label>
                  <Input
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                    placeholder="e.g., FOB Destination"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Line Items</h2>
                <Button
                  type="button"
                  onClick={addNewLine}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>

              {lines.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No lines added yet</p>
                  <Button
                    type="button"
                    onClick={addNewLine}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Line
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lines.map((line) => (
                    <div key={line.lineNumber} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-1">
                            Line {line.lineNumber} Description
                          </label>
                          <Input
                            value={line.lineDescription}
                            onChange={(e) => updateLineDescription(line.lineNumber, e.target.value)}
                            placeholder="Enter line description (visible to client)"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLine(line.lineNumber)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {line.items.length === 0 ? (
                        <div className="text-center py-4 bg-gray-50 rounded">
                          <Button
                            type="button"
                            onClick={() => openItemSelector(line.lineNumber)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Items to Line
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {line.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="bg-gray-50 p-3 rounded">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{item.description}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {item.itemCode}
                                      </Badge>
                                      {item.availabilityStatus === 'INSUFFICIENT_STOCK' && (
                                        <Badge variant="destructive" className="text-xs">
                                          Low Stock
                                        </Badge>
                                      )}
                                    </div>
                                    {item.internalDescription && (
                                      <p className="text-sm text-gray-500 mt-1">
                                        Internal: {item.internalDescription}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteItem(line.lineNumber, itemIndex)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-5 gap-2 mt-3">
                                  <div>
                                    <label className="text-xs text-gray-500">Quantity</label>
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateItemQuantity(line.lineNumber, itemIndex, parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="0.01"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Unit Price</label>
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => updateItemPrice(line.lineNumber, itemIndex, parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="0.01"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Discount %</label>
                                    <Input
                                      type="number"
                                      value={item.discount || 0}
                                      onChange={(e) => updateItemDiscount(line.lineNumber, itemIndex, parseFloat(e.target.value) || 0)}
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Tax Rate</label>
                                    <select
                                      value={item.taxRateId || ''}
                                      onChange={(e) => updateItemTaxRate(line.lineNumber, itemIndex, e.target.value)}
                                      className="w-full h-8 px-2 border rounded text-sm"
                                    >
                                      <option value="">Select tax</option>
                                      {taxRates.map((rate) => (
                                        <option key={rate.id} value={rate.id}>
                                          {rate.name} ({rate.rate}%)
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Total</label>
                                    <div className="h-8 px-2 bg-gray-100 rounded flex items-center text-sm font-medium">
                                      {formatCurrency(item.totalAmount)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2">
                            <Button
                              type="button"
                              onClick={() => openItemSelector(line.lineNumber)}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add More Items
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Notes</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (visible to client)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Enter notes visible to the client..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Internal Notes</label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Enter internal notes (not visible to client)..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Totals</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Total Discount</span>
                    <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Total Tax</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total Amount</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Quotation'}
            </Button>
          </div>
        </>
      )}

      {/* Item Selector Modal */}
      <ItemSelectorModal
        open={showItemSelector}
        onClose={() => {
          setShowItemSelector(false)
          setCurrentLineNumber(null)
        }}
        onSelect={handleItemsSelected}
        multiSelect={true}
        showCreateNew={true}
        excludeItemIds={lines.flatMap(line => 
          line.items.filter(item => item.itemId).map(item => item.itemId!)
        )}
      />
    </div>
  )
}