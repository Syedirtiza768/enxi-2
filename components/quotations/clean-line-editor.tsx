'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Search, Package, Briefcase, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TaxRateSelector } from '@/components/tax/tax-rate-selector';
import { TaxType } from '@/lib/types/shared-enums';
import { apiClient } from '@/lib/api/client';
import { useCurrency } from '@/lib/contexts/currency-context';
import { useDefaultTaxRate } from '@/hooks/use-default-tax-rate';
import { cn } from '@/lib/utils';

interface QuotationItem {
  id: string;
  lineNumber: number;
  sortOrder: number;
  isLineHeader?: boolean;
  lineDescription?: string;
  itemId?: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRateId?: string;
  taxRate?: number;
  subtotal: number;
  totalAmount: number;
  itemType: 'PRODUCT' | 'SERVICE';
  cost?: number;
}

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  listPrice: number;
  standardCost?: number;
  category?: { name: string };
}

interface CleanLineEditorProps {
  items: QuotationItem[];
  onChange: (items: QuotationItem[]) => void;
  viewMode?: 'internal' | 'client';
  disabled?: boolean;
}

export function CleanLineEditor({ items, onChange, viewMode = 'internal', disabled = false }: CleanLineEditorProps) {
  const { formatCurrency } = useCurrency();
  const { defaultRate } = useDefaultTaxRate();
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([1]));
  const [showItemSearch, setShowItemSearch] = useState<{ lineNumber: number; itemId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Debug logging
  console.log('CleanLineEditor received:', {
    itemsCount: items?.length,
    items: items,
    viewMode,
    disabled
  });

  // Group items by line number
  const lineGroups = items.reduce((acc, item) => {
    if (!acc[item.lineNumber]) {
      acc[item.lineNumber] = {
        header: null,
        items: []
      };
    }
    if (item.isLineHeader) {
      acc[item.lineNumber].header = item;
    } else {
      acc[item.lineNumber].items.push(item);
    }
    return acc;
  }, {} as Record<number, { header: QuotationItem | null; items: QuotationItem[] }>);
  
  console.log('Line groups:', lineGroups);

  // Load inventory items
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const response = await apiClient<{ data: InventoryItem[] }>('/api/inventory/items?isSaleable=true&isActive=true');
        if (response.ok && response.data) {
          // Handle nested response structure
          let items = [];
          if (response.data.data) {
            items = response.data.data;
          } else if (Array.isArray(response.data)) {
            items = response.data;
          }
          setInventoryItems(items);
        }
      } catch (error) {
        console.error('Failed to load inventory:', error);
      }
    };
    loadInventory();
  }, []);

  // Search inventory
  const searchInventory = async () => {
    if (!searchQuery.trim()) {
      // If search is empty, load all items
      setLoading(true);
      try {
        const response = await apiClient<{ data: InventoryItem[] }>('/api/inventory/items?isSaleable=true&isActive=true');
        if (response.ok && response.data) {
          // Handle nested response structure
          let items = [];
          if (response.data.data) {
            items = response.data.data;
          } else if (Array.isArray(response.data)) {
            items = response.data;
          }
          setInventoryItems(items);
        }
      } catch (error) {
        console.error('Failed to load inventory:', error);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient<{ data: InventoryItem[] }>(
        `/api/inventory/items?search=${encodeURIComponent(searchQuery)}&isSaleable=true&isActive=true`
      );
      
      console.log('Inventory search response:', response);
      
      if (response.ok && response.data) {
        // Handle nested response structure
        let items = [];
        if (response.data.data) {
          items = response.data.data;
        } else if (Array.isArray(response.data)) {
          items = response.data;
        }
        console.log('Inventory items found:', items);
        setInventoryItems(items);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };


  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 1) {
        searchInventory();
      } else if (searchQuery.length === 0) {
        // Reload all items when search is cleared
        const loadAll = async () => {
          try {
            const response = await apiClient<{ data: InventoryItem[] }>('/api/inventory/items?isSaleable=true&isActive=true');
            if (response.ok && response.data) {
              setInventoryItems(response.data.data || []);
            }
          } catch (error) {
            console.error('Failed to load inventory:', error);
          }
        };
        loadAll();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const calculateItemTotals = (item: Partial<QuotationItem>): Partial<QuotationItem> => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const discount = item.discount || 0;
    const taxRate = item.taxRate || 0;
    
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const totalAmount = afterDiscount + taxAmount;
    
    return {
      ...item,
      subtotal,
      totalAmount
    };
  };

  const addLine = () => {
    const newLineNumber = Math.max(...Object.keys(lineGroups).map(Number), 0) + 1;
    const newHeader: QuotationItem = {
      id: `line-${Date.now()}`,
      lineNumber: newLineNumber,
      sortOrder: 0,
      isLineHeader: true,
      lineDescription: `Line ${newLineNumber}`, // Default description
      itemCode: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
      subtotal: 0,
      totalAmount: 0,
      itemType: 'SERVICE'
    };
    
    onChange([...items, newHeader]);
    setExpandedLines(new Set([...expandedLines, newLineNumber]));
  };

  const updateLineDescription = (lineNumber: number, description: string) => {
    onChange(items.map(item => 
      item.lineNumber === lineNumber
        ? { ...item, lineDescription: description }
        : item
    ));
  };

  const addItemToLine = (lineNumber: number) => {
    const lineItems = items.filter(item => item.lineNumber === lineNumber && !item.isLineHeader);
    const maxSortOrder = Math.max(...lineItems.map(item => item.sortOrder), 0);
    
    // Get line header to inherit line description
    const lineHeader = items.find(item => item.lineNumber === lineNumber && item.isLineHeader);
    const lineDescription = lineHeader?.lineDescription || `Line ${lineNumber}`;
    
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      lineNumber,
      lineDescription, // Inherit from line header
      sortOrder: maxSortOrder + 1,
      isLineHeader: false,
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: defaultRate?.rate || 0,
      taxRateId: defaultRate?.id,
      itemType: 'PRODUCT',
      ...calculateItemTotals({ quantity: 1, unitPrice: 0, taxRate: defaultRate?.rate || 0 })
    } as QuotationItem;
    
    onChange([...items, newItem]);
  };

  const updateItem = (itemId: string, updates: Partial<QuotationItem>) => {
    onChange(items.map(item => 
      item.id === itemId 
        ? { ...item, ...updates, ...calculateItemTotals({ ...item, ...updates }) }
        : item
    ));
  };

  const selectInventoryItem = (itemId: string, inventoryItem: InventoryItem) => {
    updateItem(itemId, {
      itemId: inventoryItem.id,
      itemCode: inventoryItem.code,
      description: inventoryItem.name,
      unitPrice: inventoryItem.listPrice,
      cost: inventoryItem.standardCost,
      itemType: inventoryItem.type
    });
    setShowItemSearch(null);
    setSearchQuery('');
  };

  const removeItem = (itemId: string) => {
    onChange(items.filter(item => item.id !== itemId));
  };

  const removeLine = (lineNumber: number) => {
    onChange(items.filter(item => item.lineNumber !== lineNumber));
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      newSet.delete(lineNumber);
      return newSet;
    });
  };

  const toggleLine = (lineNumber: number) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineNumber)) {
        newSet.delete(lineNumber);
      } else {
        newSet.add(lineNumber);
      }
      return newSet;
    });
  };

  // Calculate line totals
  const getLineTotals = (lineNumber: number) => {
    // Include all items for this line, including headers that have quantity/price
    const lineItems = items.filter(item => 
      item.lineNumber === lineNumber && 
      (!item.isLineHeader || (item.isLineHeader && item.quantity > 0 && item.unitPrice > 0))
    );
    return lineItems.reduce((acc, item) => ({
      subtotal: acc.subtotal + (item.subtotal || 0),
      total: acc.total + (item.totalAmount || 0)
    }), { subtotal: 0, total: 0 });
  };

  // Calculate grand totals
  const grandTotals = items.filter(item => 
    !item.isLineHeader || (item.isLineHeader && item.quantity > 0 && item.unitPrice > 0)
  ).reduce((acc, item) => ({
    subtotal: acc.subtotal + (item.subtotal || 0),
    total: acc.total + (item.totalAmount || 0)
  }), { subtotal: 0, total: 0 });

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Quotation Items</h3>
        <div className="flex items-center gap-2">
          <Badge variant={viewMode === 'internal' ? 'default' : 'outline'}>
            {viewMode === 'internal' ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            {viewMode === 'internal' ? 'Internal View' : 'Client View'}
          </Badge>
        </div>
      </div>

      {/* Lines */}
      {Object.entries(lineGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([lineNumber, group]) => {
        const lineNo = Number(lineNumber);
        const isExpanded = expandedLines.has(lineNo);
        const lineTotals = getLineTotals(lineNo);

        return (
          <Card key={lineNo} className="p-4">
            {/* Line Header */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLine(lineNo)}
                  disabled={disabled}
                  className="p-1"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Line {lineNo}</span>
                    <div className="flex-1">
                      <Input
                        placeholder="Line description (shown to client)"
                        value={group.header?.lineDescription || `Line ${lineNo}`}
                        onChange={(e) => updateLineDescription(lineNo, e.target.value)}
                        disabled={disabled}
                        className="font-medium"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(lineTotals.total)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(lineNo)}
                      disabled={disabled}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Line Items (only in internal view and when expanded) */}
              {viewMode === 'internal' && isExpanded && (
                <div className="ml-8 space-y-2">
                  {/* If header has quantity/price, show it as an item */}
                  {group.header && group.header.quantity > 0 && group.header.unitPrice > 0 && (
                    <div key={group.header.id} className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-700 mb-2">Line Header Item</div>
                      {/* First Row: Search, Description, Delete */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 md:col-span-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowItemSearch({ lineNumber: lineNo, itemId: group.header.id })}
                            disabled={disabled}
                            className="w-full"
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="col-span-10 md:col-span-10">
                          <Input
                            placeholder="Item description"
                            value={group.header.description}
                            onChange={(e) => updateItem(group.header.id, { description: e.target.value })}
                            disabled={disabled}
                          />
                        </div>
                        
                        <div className="col-span-1 md:col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(group.header.id)}
                            disabled={disabled}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Second Row: Quantity, Price, Tax */}
                      <div className="grid grid-cols-3 md:grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 md:col-span-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Quantity</Label>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={group.header.quantity}
                              onChange={(e) => updateItem(group.header.id, { quantity: parseFloat(e.target.value) || 0 })}
                              disabled={disabled}
                              min="0"
                              step="1"
                            />
                          </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Unit Price</Label>
                            <Input
                              type="number"
                              placeholder="Price"
                              value={group.header.unitPrice}
                              onChange={(e) => updateItem(group.header.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                              disabled={disabled}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tax</Label>
                            <TaxRateSelector
                              value={group.header.taxRateId}
                              onChange={(value, rate) => updateItem(group.header.id, { 
                                taxRateId: value, 
                                taxRate: rate?.rate || 0 
                              })}
                              disabled={disabled}
                              allowedTypes={[TaxType.SALES]}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Third Row: Item Code and Total */}
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div>
                          <Label className="text-xs text-muted-foreground">Item Code</Label>
                          <Input
                            placeholder="Item code"
                            value={group.header.itemCode}
                            onChange={(e) => updateItem(group.header.id, { itemCode: e.target.value })}
                            disabled={disabled}
                          />
                        </div>
                        <div className="text-right">
                          <Label className="text-xs text-muted-foreground">Total</Label>
                          <div className="text-lg font-semibold">{formatCurrency(group.header.totalAmount || 0)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show all non-header items for this line */}
                  {group.items.map((item) => (
                    <div key={item.id} className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {/* First Row: Search, Description, Delete */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 md:col-span-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowItemSearch({ lineNumber: lineNo, itemId: item.id })}
                            disabled={disabled}
                            className="w-full"
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="col-span-10 md:col-span-10">
                          <Input
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                            disabled={disabled}
                          />
                        </div>
                        
                        <div className="col-span-1 md:col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            disabled={disabled}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Second Row: Quantity, Price, Tax */}
                      <div className="grid grid-cols-3 md:grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 md:col-span-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Quantity</Label>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                              disabled={disabled}
                              min="0"
                              step="1"
                            />
                          </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Unit Price</Label>
                            <Input
                              type="number"
                              placeholder="Price"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                              disabled={disabled}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tax Rate</Label>
                            <TaxRateSelector
                              value={item.taxRateId}
                              onChange={(taxRateId, taxRate) => updateItem(item.id, { taxRateId, taxRate })}
                              disabled={disabled}
                              placeholder="Tax"
                              taxType={TaxType.SALES}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Third Row: Total */}
                      <div className="flex justify-end">
                        <div className="w-full md:w-1/3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground text-right">Line Total</Label>
                            <div className="h-10 px-3 py-2 bg-white border rounded-md flex items-center justify-end font-semibold text-lg">
                              {formatCurrency(item.totalAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addItemToLine(lineNo)}
                    disabled={disabled}
                    className="ml-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {/* Add Line Button */}
      <Button
        variant="outline"
        onClick={addLine}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Line
      </Button>

      {/* Totals */}
      <Card className="p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-xl font-bold">{formatCurrency(grandTotals.total)}</span>
        </div>
      </Card>

      {/* Item Search Dialog */}
      {showItemSearch && (
        <Dialog open={true} onOpenChange={() => setShowItemSearch(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Search Inventory</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <Input
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">Searching...</div>
                ) : inventoryItems.length === 0 ? (
                  <div className="text-center py-4 space-y-4">
                    <div className="text-muted-foreground">
                      {searchQuery ? `No items found matching "${searchQuery}"` : 'No saleable items available'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        {searchQuery ? 'Item not found? Create a new one:' : 'Get started by creating your first item:'}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.open('/inventory/items/new', '_blank');
                        }}
                        className="inline-flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Item
                      </Button>
                    </div>
                  </div>
                ) : (
                  inventoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectInventoryItem(showItemSearch.itemId, item)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {item.type === 'PRODUCT' ? 
                              <Package className="w-4 h-4 text-blue-500" /> : 
                              <Briefcase className="w-4 h-4 text-green-500" />
                            }
                            {item.code} - {item.name}
                          </div>
                          {item.category && (
                            <div className="text-sm text-muted-foreground">{item.category.name}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.listPrice)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}