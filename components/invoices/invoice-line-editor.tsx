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
  EyeOff
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
import { apiClient } from '@/lib/api/client';
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

interface InvoiceLineEditorProps {
  lines: InvoiceLine[];
  onLinesChange: (lines: InvoiceLine[]) => void;
  viewMode?: 'internal' | 'client';
  readOnly?: boolean;
}

export function InvoiceLineEditor({ 
  lines, 
  onLinesChange, 
  viewMode = 'internal',
  readOnly = false
}: InvoiceLineEditorProps) {
  const { formatCurrency } = useCurrency();
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [currentLineNumber, setCurrentLineNumber] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: InvoiceItem; lineNumber: number; itemIndex: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual item entry state
  const [manualItem, setManualItem] = useState({
    description: '',
    internalDescription: '',
    quantity: 1,
    unitPrice: 0,
    taxRateId: '',
    taxRate: 0,
    discount: 0
  });

  const searchInventory = async (): Promise<void> => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await apiClient(`/api/inventory/items?search=${searchQuery}`);
      if (response.ok && response?.data?.data) {
        const items = Array.isArray(response.data.data) ? response.data.data : [];
        setInventoryItems(items);
      } else {
        setInventoryItems([]);
      }
    } catch (error) {
      console.error('Failed to search inventory:', error);
      setInventoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2) {
        searchInventory();
      } else {
        setInventoryItems([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      lineDescription: '',
      items: [],
      isExpanded: true
    };
    onLinesChange([...lines, newLine]);
  };

  const updateLineDescription = (lineNumber: number, description: string) => {
    if (readOnly) return;
    
    const newLines = lines.map(line => 
      line.lineNumber === lineNumber 
        ? { ...line, lineDescription: description }
        : line
    );
    onLinesChange(newLines);
  };

  const toggleLineExpansion = (lineNumber: number) => {
    const newLines = lines.map(line => 
      line.lineNumber === lineNumber 
        ? { ...line, isExpanded: !line.isExpanded }
        : line
    );
    onLinesChange(newLines);
  };

  const removeLine = (lineNumber: number) => {
    if (readOnly) return;
    
    const newLines = lines
      .filter(line => line.lineNumber !== lineNumber)
      .map((line, index) => ({ ...line, lineNumber: index + 1 }));
    onLinesChange(newLines);
  };

  const addItemToLine = (lineNumber: number, item: any) => {
    if (readOnly) return;
    
    const newItem = calculateItemTotals({
      itemId: item.id,
      itemCode: item.code || item.itemCode || 'MANUAL',
      description: item.description || item.name,
      internalDescription: item.internalDescription || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.listPrice || 0,
      cost: item.cost || item.standardCost || 0,
      discount: item.discount || 0,
      taxRate: item.taxRate || 0,
      taxRateId: item.taxRateId,
      unitOfMeasureId: item.unitOfMeasureId
    });

    const newLines = lines.map(line => {
      if (line.lineNumber === lineNumber) {
        return { ...line, items: [...line.items, newItem] };
      }
      return line;
    });
    onLinesChange(newLines);
  };

  const updateItem = (lineNumber: number, itemIndex: number, updates: Partial<InvoiceItem>) => {
    if (readOnly) return;
    
    const newLines = lines.map(line => {
      if (line.lineNumber === lineNumber) {
        const newItems = [...line.items];
        newItems[itemIndex] = calculateItemTotals({ ...newItems[itemIndex], ...updates });
        return { ...line, items: newItems };
      }
      return line;
    });
    onLinesChange(newLines);
  };

  const removeItem = (lineNumber: number, itemIndex: number) => {
    if (readOnly) return;
    
    const newLines = lines.map(line => {
      if (line.lineNumber === lineNumber) {
        const newItems = line.items.filter((_, index) => index !== itemIndex);
        return { ...line, items: newItems };
      }
      return line;
    });
    onLinesChange(newLines);
  };

  const handleAddManualItem = () => {
    if (!currentLineNumber || readOnly) return;
    
    const newItem = calculateItemTotals({
      itemCode: 'MANUAL',
      description: manualItem.description,
      internalDescription: manualItem.internalDescription,
      quantity: manualItem.quantity,
      unitPrice: manualItem.unitPrice,
      discount: manualItem.discount,
      taxRate: manualItem.taxRate,
      taxRateId: manualItem.taxRateId
    });

    addItemToLine(currentLineNumber, newItem);
    
    // Reset form
    setManualItem({
      description: '',
      internalDescription: '',
      quantity: 1,
      unitPrice: 0,
      taxRateId: '',
      taxRate: 0,
      discount: 0
    });
    setShowItemSearch(false);
    setCurrentLineNumber(null);
  };

  const getLineTotals = (line: InvoiceLine) => {
    const subtotal = line.items.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = line.items.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxAmount = line.items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = line.items.reduce((sum, item) => sum + item.totalAmount, 0);
    
    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Invoice Lines</h3>
        <div className="flex gap-2">
          {viewMode === 'internal' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLinesChange(lines)}
              className="gap-2"
            >
              {viewMode === 'internal' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {viewMode === 'internal' ? 'Internal View' : 'Client View'}
            </Button>
          )}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={addLine}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </Button>
          )}
        </div>
      </div>

      {lines.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No invoice lines added yet</p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={addLine}
              className="mt-4 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add First Line
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {lines.map((line, lineIndex) => {
            const lineTotals = getLineTotals(line);
            
            return (
              <Card key={line.lineNumber} className="overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => toggleLineExpansion(line.lineNumber)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {line.isExpanded ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </button>
                      <Badge variant="outline">Line {line.lineNumber}</Badge>
                      {!readOnly ? (
                        <Input
                          placeholder="Enter line description (visible to client)"
                          value={line.lineDescription}
                          onChange={(e) => updateLineDescription(line.lineNumber, e.target.value)}
                          className="flex-1 max-w-xl"
                        />
                      ) : (
                        <span className="flex-1 text-sm">
                          {line.lineDescription || '(No description)'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(lineTotals.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">{line.items.length} items</p>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(line.lineNumber)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {line.isExpanded && (
                  <div className="p-4">
                    {viewMode === 'internal' ? (
                      // Internal view - show all item details
                      <div className="space-y-2">
                        {line.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 grid grid-cols-6 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Code</p>
                                <p className="text-sm font-medium">{item.itemCode}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground">Description</p>
                                <p className="text-sm">{item.description}</p>
                                {item.internalDescription && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Internal: {item.internalDescription}
                                  </p>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Qty</p>
                                <p className="text-sm font-medium">{item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Unit Price</p>
                                <p className="text-sm font-medium">{formatCurrency(item.unitPrice)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="text-sm font-medium">{formatCurrency(item.totalAmount)}</p>
                              </div>
                            </div>
                            {!readOnly && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingItem({ item, lineNumber: line.lineNumber, itemIndex })}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(line.lineNumber, itemIndex)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Client view - show only line description
                      <div className="text-center py-4 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2" />
                        <p>Client view shows line descriptions only</p>
                      </div>
                    )}

                    {!readOnly && viewMode === 'internal' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentLineNumber(line.lineNumber);
                          setShowItemSearch(true);
                        }}
                        className="mt-2 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Item Search Dialog */}
      <Dialog open={showItemSearch} onOpenChange={setShowItemSearch}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Item to Line {currentLineNumber}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search inventory items */}
            <div>
              <Label>Search Inventory</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by item code or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={searchInventory} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search results */}
            {inventoryItems.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {inventoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      if (currentLineNumber) {
                        addItemToLine(currentLineNumber, item);
                        setShowItemSearch(false);
                        setSearchQuery('');
                        setCurrentLineNumber(null);
                      }
                    }}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.code}</p>
                        <p className="text-sm text-gray-600">{item.name}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.listPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Or Add Manual Item</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={manualItem.description}
                    onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })}
                    placeholder="Item description"
                  />
                </div>
                {viewMode === 'internal' && (
                  <div className="col-span-2">
                    <Label>Internal Description</Label>
                    <Textarea
                      value={manualItem.internalDescription}
                      onChange={(e) => setManualItem({ ...manualItem, internalDescription: e.target.value })}
                      placeholder="Internal notes (not shown to client)"
                      rows={2}
                    />
                  </div>
                )}
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={manualItem.quantity}
                    onChange={(e) => setManualItem({ ...manualItem, quantity: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    value={manualItem.unitPrice}
                    onChange={(e) => setManualItem({ ...manualItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    value={manualItem.discount}
                    onChange={(e) => setManualItem({ ...manualItem, discount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Tax Rate</Label>
                  <TaxRateSelector
                    value={manualItem.taxRateId}
                    onChange={(value) => {
                      const rate = parseFloat(value) || 0;
                      setManualItem({ 
                        ...manualItem, 
                        taxRateId: value,
                        taxRate: rate
                      });
                    }}
                    taxType={TaxType.SALES}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" onClick={() => {
                  setShowItemSearch(false);
                  setCurrentLineNumber(null);
                  setSearchQuery('');
                }}>
                  Cancel
                </Button>
                <Button onClick={handleAddManualItem}>
                  Add Item
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                    rows={2}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
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
                    value={editingItem.item.taxRateId || ''}
                    onChange={(value) => {
                      const rate = parseFloat(value) || 0;
                      setEditingItem({
                        ...editingItem,
                        item: { 
                          ...editingItem.item, 
                          taxRateId: value,
                          taxRate: rate
                        }
                      });
                    }}
                    taxType={TaxType.SALES}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (editingItem) {
                    updateItem(editingItem.lineNumber, editingItem.itemIndex, editingItem.item);
                    setEditingItem(null);
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}