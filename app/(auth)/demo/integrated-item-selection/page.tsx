'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineItemEditorV3 } from '@/components/quotations/line-item-editor-v3'
import { InvoiceLineEditorEnhanced } from '@/components/invoices/invoice-line-editor-enhanced'
import { FileText, ShoppingCart, Receipt, Package } from 'lucide-react'
import { useCurrency } from '@/lib/contexts/currency-context'

export default function IntegratedItemSelectionDemo() {
  const { formatCurrency } = useCurrency()
  
  // Quotation state
  const [quotationItems, setQuotationItems] = useState<any[]>([])
  
  // Invoice state
  const [invoiceLines, setInvoiceLines] = useState<any[]>([
    {
      lineNumber: 1,
      lineDescription: 'Invoice Line 1',
      items: [],
      isExpanded: true
    }
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integrated Item Selection Demo</h1>
        <p className="text-gray-600">
          Demonstrating the enhanced item selection with on-the-go creation in quotations, sales orders, and invoices
        </p>
      </div>

      <Tabs defaultValue="quotation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quotation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quotation
          </TabsTrigger>
          <TabsTrigger value="sales-order" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Sales Order
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotation">
          <Card>
            <CardHeader>
              <CardTitle>Quotation with Enhanced Item Selection</CardTitle>
              <CardDescription>
                Click "Select or Create Items" to add items from inventory or create new ones on-the-go
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LineItemEditorV3
                quotationItems={quotationItems}
                onChange={setQuotationItems}
                disabled={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-order">
          <Card>
            <CardHeader>
              <CardTitle>Sales Order with Enhanced Item Selection</CardTitle>
              <CardDescription>
                Sales orders use the same enhanced line editor as quotations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LineItemEditorV3
                quotationItems={quotationItems}
                onChange={setQuotationItems}
                disabled={false}
              />
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Sales orders share the same line editor component with quotations, 
                  providing a consistent experience across the system.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice with Enhanced Item Selection</CardTitle>
              <CardDescription>
                Click "Select or Create Items" within each line to add items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceLineEditorEnhanced
                lines={invoiceLines}
                onLinesChange={setInvoiceLines}
                viewMode="internal"
                readOnly={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Enhanced Item Selection Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✅ Search and filter existing inventory items</li>
              <li>✅ Create new items on-the-go without leaving the form</li>
              <li>✅ Multi-select capability for bulk item addition</li>
              <li>✅ Real-time stock availability display</li>
              <li>✅ Advanced filtering by category, price, and stock status</li>
              <li>✅ Automatic price and quantity adjustment</li>
              <li>✅ Initial stock quantity with inventory movement creation</li>
              <li>✅ Full validation and business rules enforcement</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Integration Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>📋 Consistent experience across all document types</li>
              <li>🚀 Faster item entry with bulk selection</li>
              <li>📦 No need to pre-create items in inventory</li>
              <li>💰 Automatic cost and pricing management</li>
              <li>📊 Real-time inventory tracking</li>
              <li>🔄 FIFO cost tracking for created items</li>
              <li>✨ Improved user productivity</li>
              <li>🛡️ Data integrity with comprehensive validation</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">For Quotations & Sales Orders:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Click "Add New Line" to create a line</li>
                <li>Expand the line by clicking the chevron</li>
                <li>Click "Select or Create Items" to open the enhanced item selector</li>
                <li>Search for existing items or click "New Item" to create on-the-go</li>
                <li>Select multiple items and adjust quantities/prices</li>
                <li>Click "Add to Quotation" to add all selected items</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">For Invoices:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Click "Add Line" to create an invoice line</li>
                <li>Within each line, click "Select or Create Items"</li>
                <li>Use the same enhanced selector to add items</li>
                <li>Edit individual items using the edit button</li>
                <li>View internal notes in internal view mode</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}