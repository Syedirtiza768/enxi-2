'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  Search,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InventoryItem } from '@/lib/services/inventory.service';
import { QuotationItem } from '@/lib/services/quotation.service';

interface SimplifiedItemEditorProps {
  items: QuotationItem[];
  onItemsChange: (items: QuotationItem[]) => void;
  viewMode: 'client' | 'internal';
}

export function SimplifiedItemEditor({ 
  items, 
  onItemsChange,
  viewMode = 'client' 
}: SimplifiedItemEditorProps): React.JSX.Element {
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const addItem = (): void => {
    setShowItemSearch(true);
  };

  const selectInventoryItem = (inventoryItem: InventoryItem): void => {
    const newItem: QuotationItem = {
      inventory_item_id: inventoryItem.id,
      inventory_item: inventoryItem,
      name: inventoryItem.name,
      description: inventoryItem.description || '',
      quantity: 1,
      unit_price: inventoryItem.selling_price || 0,
      discount_percentage: 0,
      tax_rate: 5, // Default VAT
      internal_notes: '',
      cost: inventoryItem.cost || 0,
      subtotal: inventoryItem.selling_price || 0,
      total: (inventoryItem.selling_price || 0) * 1.05, // Including default tax
    };

    onItemsChange([...items, newItem]);
    setShowItemSearch(false);
    setSearchQuery('');
  };

  const updateItem = (index: number, updates: Partial<QuotationItem>): void => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Recalculate totals
    const item = newItems[index];
    const subtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
    const discountAmount = subtotal * (Number(item.discount_percentage || 0) / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (Number(item.tax_rate || 0) / 100);
    
    newItems[index].subtotal = afterDiscount;
    newItems[index].total = afterDiscount + taxAmount;
    
    onItemsChange(newItems);
  };

  const removeItem = (index: number): void => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const toggleExpanded = (index: number): void => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const searchInventory = async (query: string): void => {
    // This would be replaced with actual API call
    try {
      const response = await fetch(`/api/inventory?search=${query}&available=true`);
      const data = await response.json();
      setInventoryItems(data.items || []);
    } catch (error) {
      console.error('Failed to search inventory:', error);
    }
  };

  React.useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(() => searchInventory(searchQuery), 300);
      return (): void => clearTimeout(timer);
    }
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Items</h3>
        <Button onClick={addItem} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No items added yet</p>
          <p className="text-sm mt-2">Click "Add Item" to get started</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={index} className="p-4">
              {/* Main Item Row - Always Visible */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-600 line-clamp-1">
                      {item.description}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e): void => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                    className="w-20 text-center"
                    min="0"
                    step="1"
                  />
                  <span className="text-gray-500">×</span>
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e): void => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-28"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                  />
                  <span className="font-medium w-28 text-right">
                    AED {item.total.toFixed(2)}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => toggleExpanded(index)}
                  >
                    {expandedItems.has(index) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Expanded Details - Only shown when expanded */}
              {expandedItems.has(index) && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Discount %</label>
                      <Input
                        type="number"
                        value={item.discount_percentage}
                        onChange={(e): void => updateItem(index, { discount_percentage: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Tax %</label>
                      <Input
                        type="number"
                        value={item.tax_rate}
                        onChange={(e): void => updateItem(index, { tax_rate: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Subtotal</label>
                      <div className="text-lg font-medium mt-1">
                        AED {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {viewMode === 'internal' && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
                      <div>
                        <label className="text-sm text-gray-600">Cost</label>
                        <div className="font-medium">AED {item.cost.toFixed(2)}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Margin</label>
                        <div className="font-medium">
                          {item.unit_price > 0 
                            ? `${(((item.unit_price - item.cost) / item.unit_price) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-600">Internal Notes</label>
                    <Input
                      value={item.internal_notes || ''}
                      onChange={(e): void => updateItem(index, { internal_notes: e.target.value })}
                      placeholder="Add notes for internal use..."
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Item Search Modal */}
      <Dialog open={showItemSearch} onOpenChange={setShowItemSearch}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e): void => setSearchQuery(e.target.value)}
                placeholder="Search inventory items..."
                className="pl-10"
                autoFocus
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {inventoryItems.length === 0 && searchQuery.length > 2 ? (
                <div className="text-center py-8 text-gray-500">
                  No items found matching "{searchQuery}"
                </div>
              ) : (
                inventoryItems.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={(): void => selectInventoryItem(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 mt-2">
                          SKU: {item.sku} | Stock: {item.current_stock}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          AED {item.selling_price?.toFixed(2)}
                        </div>
                        {viewMode === 'internal' && item.cost && (
                          <div className="text-sm text-gray-500">
                            Cost: AED {item.cost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={(): void => setShowItemSearch(false)}>
                Cancel
              </Button>
              <Button variant="link" className="text-sm">
                Can't find item? Create new
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}