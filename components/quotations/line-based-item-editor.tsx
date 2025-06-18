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
import { formatCurrency } from '@/lib/utils/format';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface QuotationLine {
  lineNumber: number;
  lineDescription: string;
  items: QuotationItem[];
  isExpanded?: boolean;
}

interface QuotationItem {
  id?: string;
  inventoryItemId?: string;
  code: string;
  name: string;
  description: string;
  internalDescription?: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
  discount: number;
  taxRateId: string;
  subtotal: number;
  total: number;
}

interface LineBasedItemEditorProps {
  lines: QuotationLine[];
  onLinesChange: (lines: QuotationLine[]) => void;
  viewMode?: 'internal' | 'external';
}

export function LineBasedItemEditor({ lines, onLinesChange, viewMode = 'internal' }: LineBasedItemEditorProps) {
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [currentLineNumber, setCurrentLineNumber] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: QuotationItem; lineNumber: number; itemIndex: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalView, setInternalView] = useState(viewMode === 'internal');

  // Manual item entry state
  const [manualItem, setManualItem] = useState({
    name: '',
    description: '',
    internalDescription: '',
    quantity: 1,
    unitPrice: 0,
    taxRateId: '',
    discount: 0
  });

  const searchInventory = async (): Promise<unknown> => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await apiClient<{ data: any[]; total: number }>(`/api/inventory/items?search=${searchQuery}`);
      if (response.ok && response?.data?.data) {
        // The API returns { data: [...], total: number }
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

  const addLine = () => {
    const newLineNumber = lines.length + 1;
    const newLine: QuotationLine = {
      lineNumber: newLineNumber,
      lineDescription: '',
      items: [],
      isExpanded: true
    };
    onLinesChange([...lines, newLine]);
  };

  const updateLineDescription = (lineNumber: number, description: string) => {
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
    const newLines = lines
      .filter(line => line.lineNumber !== lineNumber)
      .map((line, index) => ({ ...line, lineNumber: index + 1 }));
    onLinesChange(newLines);
  };

  const addInventoryItem = (item: any) => {
    if (currentLineNumber === null) return;

    const newItem: QuotationItem = {
      inventoryItemId: item.id,
      code: item.code,
      name: item.name,
      description: item.description || '',
      internalDescription: '',
      quantity: 1,
      unitPrice: item.listPrice || 0,
      cost: item.cost || 0,
      discount: 0,
      taxRateId: '',
      subtotal: item.listPrice || 0,
      total: item.listPrice || 0
    };

    const newLines = lines.map(line => 
      line.lineNumber === currentLineNumber 
        ? { ...line, items: [...line.items, newItem] }
        : line
    );

    onLinesChange(newLines);
    setShowItemSearch(false);
    setSearchQuery('');
    setCurrentLineNumber(null);
  };

  const addManualItem = () => {
    if (!manualItem.name || manualItem.unitPrice <= 0 || currentLineNumber === null) return;

    const subtotal = Number(manualItem.quantity || 0) * Number(manualItem.unitPrice || 0) * (1 - Number(manualItem.discount || 0) / 100);
    const newItem: QuotationItem = {
      code: 'CUSTOM',
      name: manualItem.name,
      description: manualItem.description,
      internalDescription: manualItem.internalDescription,
      quantity: manualItem.quantity,
      unitPrice: manualItem.unitPrice,
      discount: manualItem.discount,
      taxRateId: manualItem.taxRateId,
      subtotal,
      total: subtotal,
      cost: 0
    };

    const newLines = lines.map(line => 
      line.lineNumber === currentLineNumber 
        ? { ...line, items: [...line.items, newItem] }
        : line
    );

    onLinesChange(newLines);
    setManualItem({
      name: '',
      description: '',
      internalDescription: '',
      quantity: 1,
      unitPrice: 0,
      taxRateId: '',
      discount: 0
    });
    setShowItemSearch(false);
    setCurrentLineNumber(null);
  };

  const updateItem = (lineNumber: number, itemIndex: number, updates: Partial<QuotationItem>) => {
    const newLines = lines.map(line => {
      if (line.lineNumber === lineNumber) {
        const newItems = [...line.items];
        const item = { ...newItems[itemIndex], ...updates };
        
        // Recalculate totals
        const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0) * (1 - Number(item.discount || 0) / 100);
        item.subtotal = subtotal;
        item.total = subtotal;
        
        newItems[itemIndex] = item;
        return { ...line, items: newItems };
      }
      return line;
    });
    onLinesChange(newLines);
  };

  const removeItem = (lineNumber: number, itemIndex: number) => {
    const newLines = lines.map(line => 
      line.lineNumber === lineNumber 
        ? { ...line, items: line.items.filter((_, i) => i !== itemIndex) }
        : line
    );
    onLinesChange(newLines);
  };

  const openEditItemDialog = (lineNumber: number, itemIndex: number) => {
    const line = lines.find(l => l.lineNumber === lineNumber);
    if (line && line.items[itemIndex]) {
      setEditingItem({
        item: { ...line.items[itemIndex] },
        lineNumber,
        itemIndex
      });
    }
  };

  const saveEditedItem = () => {
    if (editingItem) {
      updateItem(editingItem.lineNumber, editingItem.itemIndex, editingItem.item);
      setEditingItem(null);
    }
  };

  const calculateLineTotal = (line: QuotationLine) => {
    return line.items.reduce((sum, item) => sum + item.total, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Quote Lines</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInternalView(!internalView)}
            className="gap-2"
          >
            {internalView ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {internalView ? 'Internal View' : 'External View'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={addLine}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Line
          </Button>
        </div>
      </div>

      {lines.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">No lines added</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addLine}
          >
            Add your first line
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {lines.map((line) => (
            <Card key={line.lineNumber} className="overflow-hidden">
              {/* Line Header */}
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleLineExpansion(line.lineNumber)}
                      className="h-8 w-8"
                    >
                      {line.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium text-sm">Line {line.lineNumber}</span>
                      <Input
                        value={line.lineDescription}
                        onChange={(e) => updateLineDescription(line.lineNumber, e.target.value)}
                        placeholder="Line description (shown to client)"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{formatCurrency(calculateLineTotal(line))}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCurrentLineNumber(line.lineNumber);
                          setShowItemSearch(true);
                        }}
                        className="h-8 w-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.lineNumber)}
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items - Only show if expanded and in internal view */}
              {line.isExpanded && internalView && (
                <div className="p-4">
                  {line.items.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No items in this line</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentLineNumber(line.lineNumber);
                          setShowItemSearch(true);
                        }}
                        className="mt-2"
                      >
                        Add Item
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Item Headers */}
                      <div className="hidden md:grid md:grid-cols-12 gap-4 px-2 py-1 text-xs font-medium text-gray-600">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Items */}
                      {line.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-2 hover:bg-gray-50 rounded">
                          <div className="md:col-span-5">
                            <div className="font-medium text-sm">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-gray-600">{item.description}</div>
                            )}
                            {item.internalDescription && (
                              <div className="text-xs text-blue-600">Internal: {item.internalDescription}</div>
                            )}
                            {item.discount > 0 && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {item.discount}% off
                              </Badge>
                            )}
                          </div>
                          
                          <div className="md:col-span-2 flex items-center gap-2 md:justify-center">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(line.lineNumber, itemIndex, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-center h-8 text-sm"
                              min="1"
                              step="1"
                            />
                          </div>

                          <div className="md:col-span-2 hidden md:block text-right text-sm">
                            {formatCurrency(item.unitPrice)}
                          </div>

                          <div className="md:col-span-2 text-right font-medium text-sm">
                            {formatCurrency(item.total)}
                          </div>

                          <div className="md:col-span-1 flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditItemDialog(line.lineNumber, itemIndex)}
                              className="h-7 w-7"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(line.lineNumber, itemIndex)}
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showItemSearch} onOpenChange={setShowItemSearch}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Item to Line {currentLineNumber}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory..."
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Results or Manual Entry */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery.length > 2 ? (
                loading ? (
                  <div className="text-center py-8 text-gray-500">Searching...</div>
                ) : inventoryItems.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-4 text-gray-500">
                      No items found. Add manually below:
                    </div>
                    <Card className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Item Name</Label>
                          <Input
                            value={manualItem.name}
                            onChange={(e) => setManualItem(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter item name"
                          />
                        </div>
                        <div>
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            value={manualItem.unitPrice}
                            onChange={(e) => setManualItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Description (External)</Label>
                        <Textarea
                          value={manualItem.description}
                          onChange={(e) => setManualItem(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Description visible to customer"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Internal Description</Label>
                        <Textarea
                          value={manualItem.internalDescription}
                          onChange={(e) => setManualItem(prev => ({ ...prev, internalDescription: e.target.value }))}
                          placeholder="Internal notes (not visible to customer)"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={manualItem.quantity}
                            onChange={(e) => setManualItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                            min="1"
                          />
                        </div>
                        <div>
                          <Label>Discount %</Label>
                          <Input
                            type="number"
                            value={manualItem.discount}
                            onChange={(e) => setManualItem(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <Label>Tax Rate</Label>
                          <TaxRateSelector
                            value={manualItem.taxRateId}
                            onChange={(taxRateId, _taxRate) => setManualItem(prev => ({ ...prev, taxRateId: taxRateId || '' }))}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={addManualItem}
                        disabled={!manualItem.name || manualItem.unitPrice <= 0}
                        className="w-full"
                      >
                        Add Custom Item
                      </Button>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array.isArray(inventoryItems) && inventoryItems.map((item) => (
                      <Card
                        key={item.id}
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => addInventoryItem(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-600">{item.code}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(item.listPrice || 0)}</div>
                            {item.trackInventory && (
                              <div className="text-sm text-gray-500">Stock: {item.currentStock || 0}</div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Type at least 3 characters to search
                </div>
              )}
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
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={editingItem.item.quantity}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, quantity: parseFloat(e.target.value) || 0 }
                  })}
                  min="1"
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
                  value={editingItem.item.discount || 0}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, discount: parseFloat(e.target.value) || 0 }
                  })}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label>Tax Rate</Label>
                <TaxRateSelector
                  value={editingItem.item.taxRateId}
                  onChange={(taxRateId, _taxRate) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, taxRateId: taxRateId || '' }
                  })}
                />
              </div>
              <div>
                <Label>Description (External)</Label>
                <Textarea
                  value={editingItem.item.description || ''}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, description: e.target.value }
                  })}
                  rows={2}
                />
              </div>
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
              <div className="flex justify-end gap-2">
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
    </div>
  );
}