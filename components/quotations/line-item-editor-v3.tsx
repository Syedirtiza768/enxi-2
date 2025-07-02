import type { Category } from '@/components/inventory/category-tree'
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Eye, Settings, Package, Briefcase, Search, ShoppingCart, AlertCircle, CheckCircle, CheckCircle2 } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrency } from '@/lib/contexts/currency-context'
import { TaxRateSelector } from '@/components/tax/tax-rate-selector'
import { TaxType } from '@/lib/types/shared-enums'
import { useDefaultTaxRate } from '@/hooks/use-default-tax-rate'
import { ItemSelectorModalEnhanced } from '@/components/inventory/item-selector-modal-enhanced'
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
  // Calculated totals for the line
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

interface LineItemEditorV3Props {
  quotationItems: QuotationItem[]
  onChange: (items: QuotationItem[]) => void
  disabled?: boolean
}

interface ItemValidationErrors {
  [itemId: string]: {
    [field: string]: string
  }
}

export function LineItemEditorV3({ quotationItems, onChange, disabled = false }: LineItemEditorV3Props): React.JSX.Element {
  const { formatCurrency } = useCurrency()
  const { defaultRate } = useDefaultTaxRate()
  const [viewMode, setViewMode] = useState<'client' | 'internal'>('internal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([1]))
  const [itemValidationErrors, setItemValidationErrors] = useState<ItemValidationErrors>({})
  
  // Enhanced item selector modal state
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [targetLineNumber, setTargetLineNumber] = useState<number | null>(null)
  
  // Helper functions
  const generateId = (): string => Math.random().toString(36).substr(2, 9)
  
  // Item validation
  const validateItem = useCallback((item: QuotationItem): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    // validateItemCode returns error message or null (null means valid)
    const itemCodeError = validateItemCode(item.itemCode)
    if (itemCodeError) {
      errors.itemCode = itemCodeError
    }
    
    const descriptionError = validateDescription(item.description)
    if (descriptionError) {
      errors.description = descriptionError
    }
    
    const quantityError = validateQuantity(item.quantity, item.isLineHeader)
    if (quantityError) {
      errors.quantity = quantityError
    }
    
    const priceError = validatePrice(item.unitPrice)
    if (priceError) {
      errors.unitPrice = priceError
    }
    
    const discountError = validateDiscount(item.discount || 0)
    if (discountError) {
      errors.discount = discountError
    }
    
    if (item.internalDescription && item.internalDescription.length > 1000) {
      errors.internalDescription = 'Internal description must be 1000 characters or less'
    }
    
    return errors
  }, [])
  
  // Validate items on initial load and when items change
  useEffect(() => {
    const errors: ItemValidationErrors = {}
    quotationItems.forEach(item => {
      if (!item.isLineHeader) {
        const itemErrors = validateItem(item)
        if (Object.keys(itemErrors).length > 0) {
          errors[item.id] = itemErrors
        }
      }
    })
    setItemValidationErrors(errors)
  }, [quotationItems, validateItem])

  // Group items by line number
  const groupItemsByLine = (items: QuotationItem[]): QuotationLine[] => {
    const lines: Map<number, QuotationLine> = new Map()
    
    items.forEach(item => {
      if (!lines.has(item.lineNumber)) {
        lines.set(item.lineNumber, {
          lineNumber: item.lineNumber,
          lineDescription: item.lineDescription || `Line ${item.lineNumber}`,
          items: []
        })
      }
      lines.get(item.lineNumber)!.items.push(item)
    })
    
    // Sort items within each line by sortOrder
    lines.forEach(line => {
      line.items.sort((a, b) => a.sortOrder - b.sortOrder)
      
      // Calculate line totals
      line.lineSubtotal = line.items.reduce((sum, item) => sum + item.subtotal, 0)
      line.lineDiscount = line.items.reduce((sum, item) => sum + item.discountAmount, 0)
      line.lineTax = line.items.reduce((sum, item) => sum + item.taxAmount, 0)
      line.lineTotal = line.items.reduce((sum, item) => sum + item.totalAmount, 0)
    })
    
    return Array.from(lines.values()).sort((a, b) => a.lineNumber - b.lineNumber)
  }

  const lines = groupItemsByLine(quotationItems)

  // Calculation functions
  const calculateItemAmounts = (item: Partial<QuotationItem>): Partial<QuotationItem> => {
    const quantity = item.quantity || 0
    const unitPrice = item.unitPrice || 0
    const discount = item.discount || 0
    const taxRate = item.taxRate || 0
    
    const subtotal = quantity * unitPrice
    const discountAmount = subtotal * (discount / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (taxRate / 100)
    const totalAmount = afterDiscount + taxAmount
    
    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    }
  }

  // Line management
  const addLine = (): void => {
    const maxLineNumber = Math.max(...quotationItems.map(item => item.lineNumber), 0)
    const newLine: QuotationItem = {
      id: generateId(),
      lineNumber: maxLineNumber + 1,
      lineDescription: `Line ${maxLineNumber + 1}`,
      isLineHeader: true,
      sortOrder: 0,
      itemType: 'PRODUCT',
      itemCode: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
      taxRate: defaultRate?.rate || 0,
      taxRateId: defaultRate?.id,
      ...calculateItemAmounts({ quantity: 0, unitPrice: 0, taxRate: defaultRate?.rate || 0 })
    } as QuotationItem
    
    onChange([...quotationItems, newLine])
    setExpandedLines(new Set([...expandedLines, maxLineNumber + 1]))
  }

  const removeLine = (lineNumber: number): void => {
    onChange(quotationItems.filter(item => item.lineNumber !== lineNumber))
    const newExpanded = new Set(expandedLines)
    newExpanded.delete(lineNumber)
    setExpandedLines(newExpanded)
  }

  const updateLineDescription = (lineNumber: number, description: string): void => {
    const updatedItems = quotationItems.map(item => 
      item.lineNumber === lineNumber && item.isLineHeader 
        ? { ...item, lineDescription: description }
        : item
    )
    onChange(updatedItems)
  }

  // Item management - Enhanced with item selector
  const openItemSelectorForLine = (lineNumber: number): void => {
    setTargetLineNumber(lineNumber)
    setShowItemSelector(true)
  }

  const handleItemsSelected = (selectedItems: any[]): void => {
    if (targetLineNumber === null) return

    const lineItems = quotationItems.filter(item => item.lineNumber === targetLineNumber)
    const maxSortOrder = Math.max(...lineItems.map(item => item.sortOrder), -1)
    
    const newItems = selectedItems.map((selected, index) => ({
      id: generateId(),
      lineNumber: targetLineNumber,
      isLineHeader: false,
      sortOrder: maxSortOrder + index + 1,
      itemType: selected.type || 'PRODUCT',
      itemId: selected.itemId,
      itemCode: selected.itemCode,
      description: selected.name,
      quantity: selected.quantity || 1,
      unitPrice: selected.unitPrice,
      cost: selected.cost,
      taxRate: defaultRate?.rate || 0,
      taxRateId: defaultRate?.id,
      ...calculateItemAmounts({ 
        quantity: selected.quantity || 1, 
        unitPrice: selected.unitPrice, 
        taxRate: defaultRate?.rate || 0 
      })
    } as QuotationItem))
    
    onChange([...quotationItems, ...newItems])
    setShowItemSelector(false)
    setTargetLineNumber(null)
  }

  const removeItem = (itemId: string): void => {
    onChange(quotationItems.filter(item => item.id !== itemId))
  }

  const updateItem = (itemId: string, updates: Partial<QuotationItem>): void => {
    const updatedItems = quotationItems.map(item => 
      item.id === itemId 
        ? { ...item, ...updates, ...calculateItemAmounts({ ...item, ...updates }) }
        : item
    )
    onChange(updatedItems)
  }

  // Calculate totals
  const totalSubtotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0)
  const totalDiscount = quotationItems.reduce((sum, item) => sum + item.discountAmount, 0)
  const totalTax = quotationItems.reduce((sum, item) => sum + item.taxAmount, 0)
  const grandTotal = quotationItems.reduce((sum, item) => sum + item.totalAmount, 0)

  const toggleLine = (lineNumber: number): void => {
    const newExpanded = new Set(expandedLines)
    if (newExpanded.has(lineNumber)) {
      newExpanded.delete(lineNumber)
    } else {
      newExpanded.add(lineNumber)
    }
    setExpandedLines(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {/* Validation Summary */}
      {Object.keys(itemValidationErrors).length > 0 && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
            <p className="text-orange-800 font-medium text-sm">
              {Object.keys(itemValidationErrors).length} item(s) have validation errors
            </p>
          </div>
          <p className="text-orange-700 text-xs">
            Please review and fix the highlighted issues before saving.
          </p>
        </div>
      )}
      
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Quotation Lines</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'client' ? 'default' : 'outline'}
            size="sm"
            onClick={(): void => setViewMode('client')}
            disabled={disabled}
          >
            <Eye className="h-4 w-4 mr-1" />
            Client View
          </Button>
          <Button
            variant={viewMode === 'internal' ? 'default' : 'outline'}
            size="sm"
            onClick={(): void => setViewMode('internal')}
            disabled={disabled}
          >
            <Settings className="h-4 w-4 mr-1" />
            Internal View
          </Button>
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-3">
        {lines.map(line => (
          <div key={line.lineNumber} className="border rounded-lg p-4">
            {/* Line Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(): void => toggleLine(line.lineNumber)}
                  className="p-1"
                >
                  {expandedLines.has(line.lineNumber) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                
                <Input
                  value={line.lineDescription}
                  onChange={(e): void => updateLineDescription(line.lineNumber, e.target.value)}
                  placeholder={`Line ${line.lineNumber} description`}
                  className="max-w-md"
                  disabled={disabled}
                />
                
                <div className="flex-1 flex items-center justify-end gap-4 text-sm">
                  <span>Items: {line.items.filter(i => !i.isLineHeader).length}</span>
                  {viewMode === 'internal' && (
                    <>
                      <span>Subtotal: {formatCurrency(line.lineSubtotal || 0)}</span>
                      <span className="font-medium">Total: {formatCurrency(line.lineTotal || 0)}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {viewMode === 'internal' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => removeLine(line.lineNumber)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Line Items - Only visible in internal view when expanded */}
            {viewMode === 'internal' && expandedLines.has(line.lineNumber) && (
              <div className="space-y-2 pl-8">
                {line.items.filter(item => !item.isLineHeader).map((item) => (
                  <div key={item.id} className="border rounded p-3 space-y-2">
                    <div className="grid grid-cols-14 gap-2">
                      <div className="col-span-1">
                        <Select
                          value={item.itemType}
                          onValueChange={(value): void => updateItem(item.id, { itemType: value as 'PRODUCT' | 'SERVICE' })}
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRODUCT">
                              <Package className="h-4 w-4 inline mr-1" />
                              Product
                            </SelectItem>
                            <SelectItem value="SERVICE">
                              <Briefcase className="h-4 w-4 inline mr-1" />
                              Service
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="relative">
                          <Input
                            value={item.itemCode}
                            onChange={(e): void => updateItem(item.id, { itemCode: e.target.value.toUpperCase() })}
                            placeholder="Item code"
                            disabled={disabled}
                            maxLength={MAX_ITEM_CODE_LENGTH}
                            className={itemValidationErrors[item.id]?.itemCode ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.itemCode && item.itemCode && (
                            <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.itemCode && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.itemCode && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].itemCode}</p>
                        )}
                      </div>

                      <div className="col-span-3">
                        <div className="relative">
                          <Input
                            value={item.description}
                            onChange={(e): void => updateItem(item.id, { description: e.target.value })}
                            placeholder="Item description"
                            disabled={disabled}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            className={itemValidationErrors[item.id]?.description ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.description && item.description && (
                            <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.description && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.description && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].description}</p>
                        )}
                      </div>

                      <div className="col-span-1">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e): void => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            placeholder="Qty"
                            disabled={disabled}
                            min="0.01"
                            max="999999"
                            step="0.01"
                            className={itemValidationErrors[item.id]?.quantity ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.quantity && item.quantity > 0 && (
                            <CheckCircle2 className="absolute right-2 top-2 h-3 w-3 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.quantity && (
                            <AlertCircle className="absolute right-2 top-2 h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.quantity && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].quantity}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e): void => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                            placeholder="Unit price"
                            disabled={disabled}
                            min="0"
                            max="9999999.99"
                            step="0.01"
                            className={itemValidationErrors[item.id]?.unitPrice ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.unitPrice && item.unitPrice >= 0 && (
                            <CheckCircle2 className="absolute right-2 top-2 h-3 w-3 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.unitPrice && (
                            <AlertCircle className="absolute right-2 top-2 h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.unitPrice && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].unitPrice}</p>
                        )}
                      </div>

                      <div className="col-span-1">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e): void => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                            placeholder="Disc %"
                            disabled={disabled}
                            min="0"
                            max="100"
                            step="0.01"
                            className={itemValidationErrors[item.id]?.discount ? 'border-red-300 focus:border-red-500' : ''}
                          />
                          {!itemValidationErrors[item.id]?.discount && (
                            <CheckCircle2 className="absolute right-2 top-2 h-3 w-3 text-green-500" />
                          )}
                          {itemValidationErrors[item.id]?.discount && (
                            <AlertCircle className="absolute right-2 top-2 h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {itemValidationErrors[item.id]?.discount && (
                          <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].discount}</p>
                        )}
                      </div>

                      <div className="col-span-1">
                        <TaxRateSelector
                          value={item.taxRateId}
                          onChange={(taxRateId, taxRate): void => {
                            updateItem(item.id, { 
                              taxRateId, 
                              taxRate 
                            })
                          }}
                          disabled={disabled}
                          className="w-full h-9"
                          placeholder="Tax"
                          taxType={TaxType.SALES}
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatCurrency(item.totalAmount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(): void => removeItem(item.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Internal notes */}
                    <div>
                      <div className="relative">
                        <Textarea
                          value={item.internalDescription || ''}
                          onChange={(e): void => updateItem(item.id, { internalDescription: e.target.value })}
                          placeholder="Internal notes (not shown to client)"
                          className={`h-16 resize-none ${
                            itemValidationErrors[item.id]?.internalDescription ? 'border-red-300 focus:border-red-500' : ''
                          }`}
                          disabled={disabled}
                          maxLength={1000}
                        />
                        {!itemValidationErrors[item.id]?.internalDescription && item.internalDescription && (
                          <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                        )}
                        {itemValidationErrors[item.id]?.internalDescription && (
                          <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {itemValidationErrors[item.id]?.internalDescription && (
                        <p className="text-xs text-red-600 mt-1">{itemValidationErrors[item.id].internalDescription}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {(item.internalDescription || '').length}/1000 characters
                      </div>
                    </div>

                    {/* Cost and margin info */}
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <label className="text-gray-600">Cost:</label>
                        <Input
                          type="number"
                          value={item.cost || 0}
                          onChange={(e): void => updateItem(item.id, { cost: parseFloat(e.target.value) || 0 })}
                          disabled={disabled}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600">Margin:</label>
                        <div className={`font-medium ${
                          item.cost && item.unitPrice > 0 
                            ? ((Number(item.unitPrice || 0) - Number(item.cost || 0)) / Number(item.unitPrice || 1) * 100) < 0 
                              ? 'text-red-600' 
                              : ((Number(item.unitPrice || 0) - Number(item.cost || 0)) / Number(item.unitPrice || 1) * 100) < 10 
                                ? 'text-orange-600' 
                                : 'text-green-600'
                            : 'text-gray-500'
                        }`}>
                          {item.cost && item.unitPrice > 0 
                            ? `${((Number(item.unitPrice || 0) - Number(item.cost || 0)) / Number(item.unitPrice || 1) * 100).toFixed(1)}%`
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-600">Subtotal:</label>
                        <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                      </div>
                      <div>
                        <label className="text-gray-600">Total:</label>
                        <div className="font-medium">{formatCurrency(item.totalAmount)}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add item button - Now opens the enhanced item selector */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => openItemSelectorForLine(line.lineNumber)}
                  disabled={disabled}
                  className="w-full"
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Select or Create Items
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add line button - only in internal view */}
      {viewMode === 'internal' && (
        <Button
          variant="outline"
          onClick={addLine}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add New Line
        </Button>
      )}

      {/* Totals with validation status */}
      <div className="mt-6 border-t pt-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span>Items:</span>
            <span className="flex items-center gap-2">
              {quotationItems.filter(item => !item.isLineHeader).length}
              {Object.keys(itemValidationErrors).length > 0 && (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(totalSubtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {totalTax > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span className="flex items-center gap-2">
              {formatCurrency(grandTotal)}
              {Object.keys(itemValidationErrors).length === 0 && quotationItems.filter(item => !item.isLineHeader).length > 0 && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Item Selector Modal */}
      <ItemSelectorModalEnhanced
        open={showItemSelector}
        onClose={() => {
          setShowItemSelector(false)
          setTargetLineNumber(null)
        }}
        onSelect={handleItemsSelected}
        multiSelect={true}
        showCreateNew={true}
        title="Select or Create Items"
        submitLabel="Add to Quotation"
      />
    </div>
  )
}