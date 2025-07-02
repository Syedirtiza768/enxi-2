'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  Edit2,
  FileText,
  Eye,
  EyeOff,
  ShoppingCart
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TaxRateSelector } from '@/components/tax/tax-rate-selector';
import { TaxType } from '@/lib/types/shared-enums';
import { useCurrency } from '@/lib/contexts/currency-context';
import { ItemSelectorModalEnhanced } from '@/components/inventory/item-selector-modal-enhanced';
import { cn } from '@/lib/utils';

interface InvoiceLine {
  lineNumber: number;
  lineDescription: string;
  items: InvoiceItem[];
  isExpanded?: boolean;
}

interface InvoiceItem {
  id?: string;
  itemId?: string;
  itemCode: string;
  description: string;
  internalDescription?: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
  discount: number;
  taxRate: number;
  taxRateId?: string;
  unitOfMeasureId?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

interface InvoiceLineEditorEnhancedProps {
  lines: InvoiceLine[];
  onLinesChange: (lines: InvoiceLine[]) => void;
  viewMode?: 'internal' | 'client';
  readOnly?: boolean;
}

export function InvoiceLineEditorEnhanced({ 
  lines, 
  onLinesChange, 
  viewMode = 'internal',
  readOnly = false
}: InvoiceLineEditorEnhancedProps) {
  const { formatCurrency } = useCurrency();
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [currentLineNumber, setCurrentLineNumber] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: InvoiceItem; lineNumber: number; itemIndex: number } | null>(null);

  const calculateItemTotals = (item: Partial<InvoiceItem>): InvoiceItem => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const discount = item.discount || 0;
    const taxRate = item.taxRate || 0;

    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const totalAmount = taxableAmount + taxAmount;

    return {
      ...item,
      quantity,
      unitPrice,
      discount,
      taxRate,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    } as InvoiceItem;
  };

  const addLine = () => {
    if (readOnly) return;
    
    const newLineNumber = lines.length + 1;
    const newLine: InvoiceLine = {
      lineNumber: newLineNumber,
      lineDescription: `Invoice Line ${newLineNumber}`,
      items: [],
      isExpanded: true
    };
    
    onLinesChange([...lines, newLine]);
  };

  const removeLine = (lineNumber: number) => {
    if (readOnly) return;
    onLinesChange(lines.filter(line => line.lineNumber !== lineNumber));
  };

  const toggleLine = (lineNumber: number) => {
    onLinesChange(
      lines.map(line =>
        line.lineNumber === lineNumber
          ? { ...line, isExpanded: !line.isExpanded }
          : line
      )
    );
  };

  const updateLineDescription = (lineNumber: number, description: string) => {
    if (readOnly) return;
    onLinesChange(
      lines.map(line =>
        line.lineNumber === lineNumber
          ? { ...line, lineDescription: description }
          : line
      )
    );
  };

  const openItemSelectorForLine = (lineNumber: number) => {
    setCurrentLineNumber(lineNumber);
    setShowItemSelector(true);
  };

  const handleItemsSelected = (selectedItems: any[]) => {
    if (currentLineNumber === null) return;

    const updatedLines = lines.map(line => {
      if (line.lineNumber === currentLineNumber) {
        const newItems = selectedItems.map(selected => calculateItemTotals({
          itemId: selected.itemId,
          itemCode: selected.itemCode,
          description: selected.name,
          quantity: selected.quantity || 1,
          unitPrice: selected.unitPrice,
          cost: selected.cost,
          discount: 0,
          taxRateId: selected.taxRateId,
          taxRate: selected.taxRate || 0,
          unitOfMeasureId: selected.unitOfMeasureId
        }));
        
        return {
          ...line,
          items: [...line.items, ...newItems]
        };
      }
      return line;
    });

    onLinesChange(updatedLines);
    setShowItemSelector(false);
    setCurrentLineNumber(null);
  };

  const removeItem = (lineNumber: number, itemIndex: number) => {
    if (readOnly) return;
    
    onLinesChange(
      lines.map(line =>
        line.lineNumber === lineNumber
          ? { ...line, items: line.items.filter((_, idx) => idx !== itemIndex) }
          : line
      )
    );
  };

  const updateItem = (lineNumber: number, itemIndex: number, updates: Partial<InvoiceItem>) => {
    if (readOnly) return;
    
    onLinesChange(
      lines.map(line =>
        line.lineNumber === lineNumber
          ? {
              ...line,
              items: line.items.map((item, idx) =>
                idx === itemIndex ? calculateItemTotals({ ...item, ...updates }) : item
              )
            }
          : line
      )
    );
  };

  const saveEditedItem = () => {
    if (!editingItem || readOnly) return;
    
    const { item, lineNumber, itemIndex } = editingItem;
    updateItem(lineNumber, itemIndex, item);
    setEditingItem(null);
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let total = 0;

    lines.forEach(line => {
      line.items.forEach(item => {
        subtotal += item.subtotal;
        totalDiscount += item.discountAmount;
        totalTax += item.taxAmount;
        total += item.totalAmount;
      });
    });

    return { subtotal, totalDiscount, totalTax, total };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Invoice Lines</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {viewMode === 'internal' ? 'Internal View' : 'Client View'}
          </Badge>
          {!readOnly && (
            <Button onClick={addLine} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          )}
        </div>
      </div>

      {/* Lines */}
      {lines.map((line) => (
        <Card key={line.lineNumber} className="p-4">
          {/* Line Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleLine(line.lineNumber)}
                className="p-1"
              >
                {line.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              <Input
                value={line.lineDescription}
                onChange={(e) => updateLineDescription(line.lineNumber, e.target.value)}
                placeholder="Line description"
                className="max-w-md"
                disabled={readOnly}
              />
              
              <div className="flex-1 text-right text-sm text-gray-600">
                {line.items.length} item{line.items.length !== 1 ? 's' : ''}
                {line.items.length > 0 && (
                  <span className="ml-2 font-medium">
                    • Total: {formatCurrency(
                      line.items.reduce((sum, item) => sum + item.totalAmount, 0)
                    )}
                  </span>
                )}
              </div>
            </div>
            
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLine(line.lineNumber)}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Line Items */}
          {line.isExpanded && (
            <div className="space-y-3">
              {line.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="bg-gray-50 rounded-lg p-3 space-y-2"
                >
                  {/* Item Details */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2">
                      <div className="font-medium text-sm">{item.itemCode}</div>
                      <div className="text-xs text-gray-500">Code</div>
                    </div>
                    
                    <div className="col-span-3">
                      <div className="text-sm">{item.description}</div>
                      <div className="text-xs text-gray-500">Description</div>
                    </div>
                    
                    <div className="col-span-1">
                      <div className="text-sm">{item.quantity}</div>
                      <div className="text-xs text-gray-500">Qty</div>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="text-sm">{formatCurrency(item.unitPrice)}</div>
                      <div className="text-xs text-gray-500">Unit Price</div>
                    </div>
                    
                    <div className="col-span-1">
                      <div className="text-sm">{item.discount}%</div>
                      <div className="text-xs text-gray-500">Disc</div>
                    </div>
                    
                    <div className="col-span-1">
                      <div className="text-sm">{item.taxRate}%</div>
                      <div className="text-xs text-gray-500">Tax</div>
                    </div>
                    
                    <div className="col-span-2 text-right">
                      <div className="font-medium">{formatCurrency(item.totalAmount)}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>

                  {/* Internal Description (Internal View Only) */}
                  {viewMode === 'internal' && item.internalDescription && (
                    <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                      <FileText className="h-3 w-3 inline mr-1" />
                      Internal: {item.internalDescription}
                    </div>
                  )}

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingItem({ item: { ...item }, lineNumber: line.lineNumber, itemIndex })}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(line.lineNumber, itemIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Item Button */}
              {!readOnly && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openItemSelectorForLine(line.lineNumber)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Select or Create Items
                </Button>
              )}
            </div>
          )}
        </Card>
      ))}

      {/* Totals */}
      <Card className="p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.totalDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-{formatCurrency(totals.totalDiscount)}</span>
            </div>
          )}
          {totals.totalTax > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(totals.totalTax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </Card>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item Code</Label>
                  <Input
                    value={editingItem.item.itemCode}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, itemCode: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={editingItem.item.quantity}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, quantity: parseFloat(e.target.value) || 0 }
                    })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Input
                  value={editingItem.item.description}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, description: e.target.value }
                  })}
                />
              </div>
              
              {viewMode === 'internal' && (
                <div>
                  <Label>Internal Description</Label>
                  <Textarea
                    value={editingItem.item.internalDescription || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, internalDescription: e.target.value }
                    })}
                    placeholder="Internal notes (not shown to client)"
                    rows={3}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    value={editingItem.item.unitPrice}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, unitPrice: parseFloat(e.target.value) || 0 }
                    })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    value={editingItem.item.discount}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, discount: parseFloat(e.target.value) || 0 }
                    })}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Tax Rate</Label>
                  <TaxRateSelector
                    value={editingItem.item.taxRateId}
                    onChange={(taxRateId, taxRate) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, taxRateId, taxRate }
                    })}
                    taxType={TaxType.SALES}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button onClick={saveEditedItem}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Enhanced Item Selector Modal */}
      <ItemSelectorModalEnhanced
        open={showItemSelector}
        onClose={() => {
          setShowItemSelector(false);
          setCurrentLineNumber(null);
        }}
        onSelect={handleItemsSelected}
        multiSelect={true}
        showCreateNew={true}
        title="Select or Create Items"
        submitLabel="Add to Invoice"
      />
    </div>
  );
}