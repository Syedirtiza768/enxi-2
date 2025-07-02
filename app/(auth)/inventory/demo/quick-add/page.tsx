'use client'

import React, { useState } from 'react'
import { QuickItemForm } from '@/components/inventory/quick-item-form'
import { ItemSelectorModalEnhanced } from '@/components/inventory/item-selector-modal-enhanced'
import { Button } from '@/components/ui/button'
import { Plus, Package, ShoppingCart, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api/client'

export default function QuickAddItemDemo() {
  const { toast } = useToast()
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [createdItems, setCreatedItems] = useState<any[]>([])
  
  const handleItemCreated = (item: any) => {
    setCreatedItems(prev => [...prev, item])
    toast({
      title: 'Item Created Successfully',
      description: `${item.name} (${item.code}) has been created with initial stock.`,
      variant: 'default'
    })
  }
  
  const handleItemsSelected = (items: any[]) => {
    setSelectedItems(items)
    toast({
      title: 'Items Selected',
      description: `${items.length} item(s) have been selected.`,
      variant: 'default'
    })
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quick Add Item Demo</h1>
        <p className="text-gray-600">
          Demonstrating the on-the-go item creation functionality with full inventory tracking
        </p>
      </div>
      
      {/* Demo Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Standalone Quick Add</h2>
              <p className="text-sm text-gray-600">Create items directly with all features</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-4">Create New Item</h3>
            <QuickItemForm
              onSuccess={handleItemCreated}
              compact={false}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Item Selector with Quick Add</h2>
              <p className="text-sm text-gray-600">Select existing items or create new ones</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              The enhanced item selector modal allows you to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Search and filter existing items</li>
              <li>Create new items on-the-fly</li>
              <li>Set initial stock quantities</li>
              <li>Configure all item properties</li>
              <li>Auto-select newly created items</li>
            </ul>
            
            <Button
              onClick={() => setShowItemSelector(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Open Item Selector
            </Button>
          </div>
        </div>
      </div>
      
      {/* Results Display */}
      {(createdItems.length > 0 || selectedItems.length > 0) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          
          {createdItems.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-3">Created Items</h3>
              <div className="space-y-2">
                {createdItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        Code: {item.code} | Type: {item.type} | Price: ${item.listPrice}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await apiClient(`/api/inventory/items/${item.id}`, {
                            method: 'GET'
                          })
                          if (response.ok) {
                            console.log('Item details:', response.data)
                            toast({
                              title: 'Item Details',
                              description: 'Check console for full item details',
                              variant: 'default'
                            })
                          }
                        } catch (error) {
                          console.error('Error fetching item:', error)
                        }
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedItems.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Selected Items</h3>
              <div className="space-y-2">
                {selectedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        Code: {item.itemCode} | Quantity: {item.quantity} | Price: ${item.unitPrice}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      Total: ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Feature Summary */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Key Features Implemented
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Item Creation</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>All fields from main item form</li>
              <li>Auto-code generation</li>
              <li>Type-specific settings (Product/Service/Raw Material)</li>
              <li>Category and unit of measure selection</li>
              <li>Pricing configuration</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Inventory Management</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Initial stock quantity with OPENING movement</li>
              <li>Stock level settings (min/max/reorder)</li>
              <li>Location-based inventory</li>
              <li>FIFO cost tracking</li>
              <li>GL account integration</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Validation & Business Rules</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Comprehensive field validation</li>
              <li>Code uniqueness checking</li>
              <li>Service items cannot track inventory</li>
              <li>Price and cost validations</li>
              <li>Stock level consistency checks</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">User Experience</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Compact and full form modes</li>
              <li>Real-time validation feedback</li>
              <li>Auto-selection after creation</li>
              <li>Default values from company settings</li>
              <li>Contextual help and guidance</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Item Selector Modal */}
      <ItemSelectorModalEnhanced
        open={showItemSelector}
        onClose={() => setShowItemSelector(false)}
        onSelect={handleItemsSelected}
        multiSelect={true}
        showCreateNew={true}
        title="Select or Create Items"
        submitLabel="Add to Selection"
      />
    </div>
  )
}