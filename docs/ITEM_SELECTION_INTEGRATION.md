# Enhanced Item Selection Integration Guide

This guide explains how to integrate the enhanced item selection functionality with on-the-go item creation into quotations, sales orders, and invoices.

## Overview

The enhanced item selection provides:
- Search and filter existing inventory items
- Create new items on-the-go without leaving the form
- Multi-select capability for bulk item addition
- Real-time stock availability display
- Automatic inventory movement creation for initial stock
- Full validation and business rules enforcement

## Components

### 1. QuickItemForm (`/components/inventory/quick-item-form.tsx`)
A comprehensive quick item creation form that can be used standalone or integrated into other components.

### 2. ItemSelectorModalEnhanced (`/components/inventory/item-selector-modal-enhanced.tsx`)
An enhanced modal that combines item search/selection with quick creation capabilities.

### 3. LineItemEditorV3 (`/components/quotations/line-item-editor-v3.tsx`)
Enhanced quotation/sales order line editor with integrated item selector.

### 4. InvoiceLineEditorEnhanced (`/components/invoices/invoice-line-editor-enhanced.tsx`)
Enhanced invoice line editor with integrated item selector.

## Integration Steps

### For Quotations

1. Replace the import in your quotation form:
```typescript
// Old
import { LineItemEditorV2 } from '@/components/quotations/line-item-editor-v2'

// New
import { LineItemEditorV3 } from '@/components/quotations/line-item-editor-v3'
```

2. Update the component usage:
```typescript
<LineItemEditorV3
  quotationItems={quotationItems}
  onChange={handleItemsChange}
  disabled={isSubmitting}
/>
```

### For Sales Orders

Sales orders already use a wrapper component that delegates to the quotation line editor. To use the enhanced version:

1. Update `/components/sales-orders/sales-order-line-editor.tsx`:
```typescript
// Change the import from CleanLineEditor to LineItemEditorV3
import { LineItemEditorV3 } from '@/components/quotations/line-item-editor-v3'

// Update the render to use LineItemEditorV3 directly
return (
  <LineItemEditorV3
    quotationItems={convertToQuotationItems(items)}
    onChange={(newItems) => onChange(convertToSalesOrderItems(newItems))}
    disabled={disabled}
  />
)
```

### For Invoices

1. Replace the import in your invoice form:
```typescript
// Old
import { InvoiceLineEditor } from '@/components/invoices/invoice-line-editor'

// New
import { InvoiceLineEditorEnhanced } from '@/components/invoices/invoice-line-editor-enhanced'
```

2. Update the component usage:
```typescript
<InvoiceLineEditorEnhanced
  lines={invoiceLines}
  onLinesChange={handleLinesChange}
  viewMode={viewMode}
  readOnly={isSubmitting}
/>
```

## Features Explained

### Quick Item Creation
- Users can create items without leaving the document form
- Supports all item types (Product, Service, Raw Material)
- Automatic code generation based on category
- Initial stock quantity with OPENING movement creation
- GL account configuration
- Full validation matching the main item form

### Inventory Movement Integration
When creating items with initial stock:
1. Item is created in the inventory
2. An OPENING type stock movement is automatically created
3. Stock lots are created with FIFO tracking
4. Inventory balances are updated
5. GL journal entries are created if configured

### Multi-Select Capability
- Select multiple items at once
- Adjust quantities and prices before adding
- View selected items summary with totals
- Bulk add to document lines

### Real-Time Validation
- Item code uniqueness checking
- Required field validation
- Business rule enforcement (e.g., services can't track inventory)
- Stock level validations
- Price and cost validations

## Usage Example

```typescript
// Demo page showing all integrations
import { LineItemEditorV3 } from '@/components/quotations/line-item-editor-v3'
import { InvoiceLineEditorEnhanced } from '@/components/invoices/invoice-line-editor-enhanced'

// For quotations and sales orders
<LineItemEditorV3
  quotationItems={items}
  onChange={setItems}
  disabled={false}
/>

// For invoices
<InvoiceLineEditorEnhanced
  lines={invoiceLines}
  onLinesChange={setInvoiceLines}
  viewMode="internal"
  readOnly={false}
/>
```

## Benefits

1. **Improved Productivity**: No need to pre-create items before adding to documents
2. **Data Consistency**: Items created on-the-go follow all business rules
3. **Better UX**: Single workflow for item selection and creation
4. **Inventory Accuracy**: Automatic stock tracking from creation
5. **Cost Management**: FIFO tracking ensures accurate costing

## Migration Notes

- The enhanced components are backward compatible
- Existing data structures remain unchanged
- Only the UI components need updating
- No database migrations required

## Demo

View the working demo at: `/demo/integrated-item-selection`

This shows the enhanced item selection working in:
- Quotations
- Sales Orders  
- Invoices