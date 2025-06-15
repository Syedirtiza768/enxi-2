'use client'

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Eye, Settings, Package, Briefcase, Search, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useCurrency } from '@/lib/contexts/currency-context'
import { TaxRateSelector } from '@/components/tax/tax-rate-selector'
import { useDefaultTaxRate } from '@/hooks/use-default-tax-rate'
import { useDebounce } from '@/lib/utils/performance'
import {
  validateItemCode,
  validateDescription,
  validateQuantity,
  validatePrice,
  validateDiscount,
  validateTaxRate,
  MAX_ITEM_CODE_LENGTH,
  MAX_DESCRIPTION_LENGTH
} from '@/lib/validators/quotation.validator'

interface QuotationLine {
  lineNumber: number
  lineDescription: string
  items: QuotationItem[]
  lineSubtotal?: number
  lineDiscount?: number
  lineTax?: number
  lineTotal?: number
}

interface QuotationItem {
  id: string
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
  cost?: number
  discount?: number
  taxRate?: number
  taxRateId?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface InventoryItem {
  id: string
  code: string
  name: string
  description?: string
  type: 'PRODUCT' | 'SERVICE'
  listPrice: number
  standardCost: number
  unitOfMeasure: {
    code: string
    name: string
  }
}

interface LineItemEditorOptimizedProps {
  lines: QuotationLine[]
  onLinesChange: (lines: QuotationLine[]) => void
  readonly?: boolean
  showCosts?: boolean
  customerId?: string
}

// Memoized line item component
const LineItemRow = memo(({
  item,
  lineIndex,
  itemIndex,
  onItemChange,
  onItemDelete,
  readonly,
  showCosts,
  inventoryItems,
  formatCurrency
}: {
  item: QuotationItem
  lineIndex: number
  itemIndex: number
  onItemChange: (lineIndex: number, itemIndex: number, updatedItem: Partial<QuotationItem>) => void
  onItemDelete: (lineIndex: number, itemIndex: number) => void
  readonly?: boolean
  showCosts?: boolean
  inventoryItems: InventoryItem[]
  formatCurrency: (amount: number) => string
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showItemSearch, setShowItemSearch] = useState(false)
  
  // Debounced search for inventory items
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // Memoized filtered inventory items
  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm) return inventoryItems.slice(0, 10)
    
    return inventoryItems.filter(invItem =>
      invItem.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      invItem.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ).slice(0, 10)
  }, [inventoryItems, debouncedSearchTerm])
  
  // Memoized calculations
  const calculations = useMemo(() => {
    const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
    const discountAmount = (subtotal * Number(item.discount || 0)) / 100
    const taxableAmount = subtotal - discountAmount
    const taxAmount = (taxableAmount * Number(item.taxRate || 0)) / 100
    const totalAmount = taxableAmount + taxAmount
    
    return { subtotal, discountAmount, taxAmount, totalAmount }
  }, [item.quantity, item.unitPrice, item.discount, item.taxRate])
  
  // Memoized change handlers
  const handleFieldChange = useCallback((field: keyof QuotationItem, value: any) => {
    onItemChange(lineIndex, itemIndex, { [field]: value })
  }, [lineIndex, itemIndex, onItemChange])
  
  const handleItemSelect = useCallback((selectedItem: InventoryItem) => {
    onItemChange(lineIndex, itemIndex, {
      itemId: selectedItem.id,
      itemCode: selectedItem.code,
      description: selectedItem.name,
      unitPrice: selectedItem.listPrice,
      cost: selectedItem.standardCost,
      itemType: selectedItem.type
    })
    setShowItemSearch(false)
  }, [lineIndex, itemIndex, onItemChange])
  
  const handleDelete = useCallback(() => {
    onItemDelete(lineIndex, itemIndex)
  }, [lineIndex, itemIndex, onItemDelete])
  
  if (readonly) {
    return (
      <tr className="border-b border-gray-100">
        <td className="p-3 text-sm font-mono">{item.itemCode}</td>
        <td className="p-3 text-sm">{item.description}</td>
        <td className="p-3 text-sm text-right">{item.quantity}</td>
        <td className="p-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
        {item.discount && (
          <td className="p-3 text-sm text-right">{item.discount}%</td>
        )}
        <td className="p-3 text-sm text-right">{formatCurrency(calculations.totalAmount)}</td>
      </tr>
    )
  }
  
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="p-3">
          <div className="flex items-center space-x-2">
            <Input
              value={item.itemCode}
              onChange={(e) => handleFieldChange('itemCode', e.target.value)}
              placeholder="Item code"
              className="w-32 text-sm font-mono"
              maxLength={MAX_ITEM_CODE_LENGTH}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowItemSearch(true)}
              className="px-2"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          {errors.itemCode && (
            <p className="text-xs text-red-500 mt-1">{errors.itemCode}</p>
          )}
        </td>
        
        <td className="p-3">
          <Textarea
            value={item.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Description"
            className="text-sm resize-none"
            rows={2}
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
        </td>
        
        <td className="p-3">
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)}
            placeholder="Qty"
            className="w-20 text-sm text-right"
            min="0"
            step="0.01"
          />
        </td>
        
        <td className="p-3">
          <Input
            type="number"
            value={item.unitPrice}
            onChange={(e) => handleFieldChange('unitPrice', parseFloat(e.target.value) || 0)}
            placeholder="Price"
            className="w-24 text-sm text-right"
            min="0"
            step="0.01"
          />
        </td>
        
        <td className="p-3">
          <Input
            type="number"
            value={item.discount || 0}
            onChange={(e) => handleFieldChange('discount', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-16 text-sm text-right"
            min="0"
            max="100"
            step="0.01"
          />
        </td>
        
        <td className="p-3">
          <TaxRateSelector
            value={item.taxRateId}
            onValueChange={(taxRateId, taxRate) => {
              handleFieldChange('taxRateId', taxRateId)
              handleFieldChange('taxRate', taxRate)
            }}
            className="w-20"
            size="sm"
          />
        </td>
        
        {showCosts && (
          <td className="p-3 text-sm text-right text-gray-600">
            {formatCurrency(item.cost || 0)}
          </td>
        )}
        
        <td className="p-3 text-sm text-right font-medium">
          {formatCurrency(calculations.totalAmount)}
        </td>
        
        <td className="p-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </td>
      </tr>
      
      {/* Item search dialog */}
      <Dialog open={showItemSearch} onOpenChange={setShowItemSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Item</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredItems.map((invItem) => (
                <div
                  key={invItem.id}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => handleItemSelect(invItem)}
                >
                  <div className="font-medium text-sm">{invItem.code}</div>
                  <div className="text-sm text-gray-600">{invItem.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(invItem.listPrice)} • {invItem.unitOfMeasure.code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

LineItemRow.displayName = 'LineItemRow'

// Memoized line header component
const LineHeader = memo(({
  line,
  lineIndex,
  onLineChange,
  onLineDelete,
  isExpanded,
  onToggleExpanded,
  readonly
}: {
  line: QuotationLine
  lineIndex: number
  onLineChange: (lineIndex: number, updates: Partial<QuotationLine>) => void
  onLineDelete: (lineIndex: number) => void
  isExpanded: boolean
  onToggleExpanded: () => void
  readonly?: boolean
}) => {
  const handleDescriptionChange = useCallback((description: string) => {
    onLineChange(lineIndex, { lineDescription: description })
  }, [lineIndex, onLineChange])
  
  const handleDelete = useCallback(() => {
    onLineDelete(lineIndex)
  }, [lineIndex, onLineDelete])
  
  return (
    <tr className="bg-blue-50 border-b-2 border-blue-200">
      <td colSpan={readonly ? 6 : 9} className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onToggleExpanded}
              className="p-1"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            
            <div className="flex-1">
              <Input
                value={line.lineDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Line description"
                className="font-medium bg-white"
                readOnly={readonly}
              />
            </div>
          </div>
          
          {!readonly && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
})

LineHeader.displayName = 'LineHeader'

// Main optimized component
export const LineItemEditorOptimized = memo(({
  lines,
  onLinesChange,
  readonly = false,
  showCosts = false,
  customerId
}: LineItemEditorOptimizedProps) => {
  const { formatCurrency } = useCurrency()
  const { defaultTaxRate } = useDefaultTaxRate()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([0]))
  const [loading, setLoading] = useState(false)
  
  // Memoized totals calculation
  const totals = useMemo(() => {
    return lines.reduce((acc, line) => {
      const lineTotal = line.items.reduce((itemAcc, item) => {
        const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
        const discountAmount = (subtotal * Number(item.discount || 0)) / 100
        const taxableAmount = subtotal - discountAmount
        const taxAmount = (taxableAmount * Number(item.taxRate || 0)) / 100
        const totalAmount = taxableAmount + taxAmount
        
        return {
          subtotal: itemAcc.subtotal + subtotal,
          discount: itemAcc.discount + discountAmount,
          tax: itemAcc.tax + taxAmount,
          total: itemAcc.total + totalAmount
        }
      }, { subtotal: 0, discount: 0, tax: 0, total: 0 })
      
      return {
        subtotal: acc.subtotal + lineTotal.subtotal,
        discount: acc.discount + lineTotal.discount,
        tax: acc.tax + lineTotal.tax,
        total: acc.total + lineTotal.total
      }
    }, { subtotal: 0, discount: 0, tax: 0, total: 0 })
  }, [lines])
  
  // Load inventory items
  useEffect(() => {
    const loadInventoryItems = async (): Promise<void> => {
      setLoading(true)
      try {
        const response = await apiClient.get('/api/inventory/items')
        setInventoryItems(response?.data || [])
      } catch (error) {
        console.error('Failed to load inventory items:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadInventoryItems()
  }, [])
  
  // Memoized change handlers
  const handleLineChange = useCallback((lineIndex: number, updates: Partial<QuotationLine>) => {
    const updatedLines = lines.map((line, index) =>
      index === lineIndex ? { ...line, ...updates } : line
    )
    onLinesChange(updatedLines)
  }, [lines, onLinesChange])
  
  const handleItemChange = useCallback((lineIndex: number, itemIndex: number, updates: Partial<QuotationItem>) => {
    const updatedLines = lines.map((line, lIndex) => {
      if (lIndex === lineIndex) {
        const updatedItems = line.items.map((item, iIndex) =>
          iIndex === itemIndex ? { ...item, ...updates } : item
        )
        return { ...line, items: updatedItems }
      }
      return line
    })
    onLinesChange(updatedLines)
  }, [lines, onLinesChange])
  
  const handleAddLine = useCallback(() => {
    const newLine: QuotationLine = {
      lineNumber: lines.length + 1,
      lineDescription: `Line ${lines.length + 1}`,
      items: []
    }
    onLinesChange([...lines, newLine])
    setExpandedLines(prev => new Set([...prev, lines.length]))
  }, [lines, onLinesChange])
  
  const handleAddItem = useCallback((lineIndex: number) => {
    const newItem: QuotationItem = {
      id: `temp-${Date.now()}`,
      lineNumber: lines[lineIndex].lineNumber,
      isLineHeader: false,
      sortOrder: lines[lineIndex].items.length + 1,
      itemType: 'PRODUCT',
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      taxRate: defaultTaxRate
    }
    
    handleLineChange(lineIndex, {
      items: [...lines[lineIndex].items, newItem]
    })
  }, [lines, handleLineChange, defaultTaxRate])
  
  const handleDeleteItem = useCallback((lineIndex: number, itemIndex: number) => {
    const updatedItems = lines[lineIndex].items.filter((_, index) => index !== itemIndex)
    handleLineChange(lineIndex, { items: updatedItems })
  }, [lines, handleLineChange])
  
  const handleDeleteLine = useCallback((lineIndex: number) => {
    const updatedLines = lines.filter((_, index) => index !== lineIndex)
    onLinesChange(updatedLines)
    setExpandedLines(prev => {
      const newSet = new Set(prev)
      newSet.delete(lineIndex)
      return newSet
    })
  }, [lines, onLinesChange])
  
  const toggleLineExpanded = useCallback((lineIndex: number) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lineIndex)) {
        newSet.delete(lineIndex)
      } else {
        newSet.add(lineIndex)
      }
      return newSet
    })
  }, [])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 text-left text-sm font-medium text-gray-900">Item Code</th>
              <th className="p-3 text-left text-sm font-medium text-gray-900">Description</th>
              <th className="p-3 text-right text-sm font-medium text-gray-900">Qty</th>
              <th className="p-3 text-right text-sm font-medium text-gray-900">Unit Price</th>
              <th className="p-3 text-right text-sm font-medium text-gray-900">Disc %</th>
              <th className="p-3 text-right text-sm font-medium text-gray-900">Tax</th>
              {showCosts && (
                <th className="p-3 text-right text-sm font-medium text-gray-900">Cost</th>
              )}
              <th className="p-3 text-right text-sm font-medium text-gray-900">Total</th>
              {!readonly && (
                <th className="p-3 text-center text-sm font-medium text-gray-900">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                <LineHeader
                  line={line}
                  lineIndex={lineIndex}
                  onLineChange={handleLineChange}
                  onLineDelete={handleDeleteLine}
                  isExpanded={expandedLines.has(lineIndex)}
                  onToggleExpanded={() => toggleLineExpanded(lineIndex)}
                  readonly={readonly}
                />
                
                {expandedLines.has(lineIndex) && line.items.map((item, itemIndex) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    lineIndex={lineIndex}
                    itemIndex={itemIndex}
                    onItemChange={handleItemChange}
                    onItemDelete={handleDeleteItem}
                    readonly={readonly}
                    showCosts={showCosts}
                    inventoryItems={inventoryItems}
                    formatCurrency={formatCurrency}
                  />
                ))}
                
                {!readonly && expandedLines.has(lineIndex) && (
                  <tr>
                    <td colSpan={showCosts ? 9 : 8} className="p-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddItem(lineIndex)}
                        className="w-full text-gray-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      {!readonly && (
        <div className="flex justify-between items-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddLine}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Line
          </Button>
          
          <div className="text-right space-y-1">
            <div className="text-sm text-gray-600">
              Subtotal: {formatCurrency(totals.subtotal)}
            </div>
            {totals.discount > 0 && (
              <div className="text-sm text-gray-600">
                Discount: -{formatCurrency(totals.discount)}
              </div>
            )}
            <div className="text-sm text-gray-600">
              Tax: {formatCurrency(totals.tax)}
            </div>
            <div className="text-lg font-bold text-gray-900">
              Total: {formatCurrency(totals.total)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

LineItemEditorOptimized.displayName = 'LineItemEditorOptimized'