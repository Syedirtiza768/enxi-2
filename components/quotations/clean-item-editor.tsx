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
  X,
  Edit2
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

interface CleanItemEditorProps {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export function CleanItemEditor({ items, onItemsChange }: CleanItemEditorProps) {
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual item entry state
  const [manualItem, setManualItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRateId: '',
    discount: 0
  });

  const searchInventory = async (): Promise<unknown> => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await apiClient<{ data: any[] }>(`/api/inventory/items?search=${searchQuery}`);
      
      if (response.ok && response.data) {
        setInventoryItems(response.data);
      } else {
        setInventoryItems([]);
      }
    } catch (error) {
      console.error('Failed to search inventory:', error);
      setInventoryItems([]); // Reset to empty array on error
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

  const addInventoryItem = (item: any) => {
    const newItem = {
      inventoryItemId: item.id,
      code: item.code,
      name: item.name,
      description: item.description || item.name || '',
      quantity: 1,
      unitPrice: item.listPrice || 0,
      cost: item.standardCost || 0,
      discount: 0,
      taxRateId: '',
      unitOfMeasureId: item.unitOfMeasureId,
      subtotal: item.listPrice || 0,
      total: item.listPrice || 0
    };

    onItemsChange([...items, newItem]);
    setShowItemSearch(false);
    setSearchQuery('');
  };

  const addManualItem = () => {
    if (!manualItem.name || manualItem.unitPrice <= 0) return;

    const subtotal = Number(manualItem.quantity || 0) * Number(manualItem.unitPrice || 0) * (1 - Number(manualItem.discount || 0) / 100);
    const newItem = {
      ...manualItem,
      code: 'CUSTOM',
      subtotal,
      total: subtotal, // Tax will be calculated separately
      cost: 0
    };

    onItemsChange([...items, newItem]);
    setManualItem({
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRateId: '',
      discount: 0
    });
    setShowItemSearch(false);
  };

  const updateItem = (index: number, updates: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...updates };
    
    // Recalculate totals
    const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0) * (1 - Number(item.discount || 0) / 100);
    item.subtotal = subtotal;
    item.total = subtotal; // Tax calculation happens on backend
    
    newItems[index] = item;
    onItemsChange(newItems);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const openEditDialog = (item: any, index: number) => {
    setEditingItem({ ...item });
    setEditingIndex(index);
  };

  const saveEditedItem = () => {
    if (editingIndex !== null && editingItem) {
      updateItem(editingIndex, editingItem);
      setEditingItem(null);
      setEditingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Items</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setShowItemSearch(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">No items added</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowItemSearch(true)}
          >
            Add your first item
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Headers */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-600">
            <div className="col-span-5">Item</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          {items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-5">
                  <div className="font-medium">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-600">{item.description}</div>
                  )}
                  {item.discount > 0 && (
                    <Badge variant="secondary" className="mt-1">
                      {item.discount}% off
                    </Badge>
                  )}
                </div>
                
                <div className="md:col-span-2 flex items-center gap-2 md:justify-center">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                    className="w-20 text-center"
                    min="1"
                    step="1"
                  />
                  <span className="text-sm text-gray-500 md:hidden">× {formatCurrency(item.unitPrice)}</span>
                </div>

                <div className="md:col-span-2 hidden md:block text-right">
                  {formatCurrency(item.unitPrice)}
                </div>

                <div className="md:col-span-2 text-right font-medium">
                  {formatCurrency(item.total)}
                </div>

                <div className="md:col-span-1 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(item, index)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showItemSearch} onOpenChange={setShowItemSearch}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
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
                        <Label>Description</Label>
                        <Textarea
                          value={manualItem.description}
                          onChange={(e) => setManualItem(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Optional description"
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
                            onChange={(taxRateId) => setManualItem(prev => ({ ...prev, taxRateId }))}
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
                    {inventoryItems.map((item) => (
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
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={editingItem.quantity}
                  onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })}
                  min="1"
                />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  value={editingItem.unitPrice}
                  onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Discount %</Label>
                <Input
                  type="number"
                  value={editingItem.discount || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, discount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label>Tax Rate</Label>
                <TaxRateSelector
                  value={editingItem.taxRateId}
                  onChange={(taxRateId) => setEditingItem({ ...editingItem, taxRateId })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}