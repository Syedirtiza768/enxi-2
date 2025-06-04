# Frontend Gaps Analysis - Business Requirements vs Current State

## Executive Summary
The current frontend is missing critical implementations for the complete business workflow: **Lead → Sales Case → Quotations → PO → Orders → Delivery → Invoices → Payments**. While backend APIs exist, the frontend lacks essential UI for quotations, inventory, orders, and the connections between modules.

## Business Workflow Requirements vs Current State

### 1. Lead → Sales Case Management
**Requirement**: "For every lead the user can make multiple sales cases"
- **Current State**: ✅ Leads module exists, ✅ Sales cases module exists
- **Gap**: ❌ No UI to create sales case directly from lead
- **Missing**: 
  - "Create Sales Case" button on lead detail page
  - Sales cases tab on lead detail showing related cases
  - Lead-to-customer conversion tracking

### 2. Sales Case → Quotations
**Requirement**: "While viewing a sales case the user can send quotations"
- **Current State**: ✅ Sales case detail page exists
- **Gap**: ❌ No quotations UI at all
- **Missing**:
  - Quotations tab on sales case detail page
  - "Create Quotation" button on sales case
  - List of quotations for a sales case
  - Quotation version management

### 3. Inventory Setup & Management
**Requirement**: "Basic setup for inventory - categories, items, stock movements"
- **Current State**: ✅ Backend APIs exist
- **Gap**: ❌ No inventory frontend at all
- **Missing Pages**:
  ```
  /inventory/setup/
    ├── categories/          # Category hierarchy management
    ├── items/              # Item master with FIFO costing
    └── units/              # Units of measure
  
  /inventory/transactions/
    ├── stock-in/           # Purchase receipts
    ├── stock-out/          # Sales/consumption
    ├── adjustments/        # Stock corrections
    └── movements/          # Movement history with GL impact
  ```

### 4. Quotation Structure
**Requirement**: "Quotation has multiple lines, each line has description and multiple items"
- **Current State**: ❌ No quotation UI
- **Gap**: Complex line item structure not implemented
- **Missing Components**:
  ```typescript
  // Required quotation structure
  interface Quotation {
    lines: QuotationLine[]
  }
  
  interface QuotationLine {
    description: string        // Client-visible
    lineItems: LineItem[]     // Internal breakdown
  }
  
  interface LineItem {
    type: 'inventory' | 'service'
    itemId: string
    quantity: number
    unitPrice: number
    cost: number  // FIFO calculated for inventory
  }
  ```

### 5. Quotation Dual Views
**Requirement**: "Client facing external and internal view"
- **Current State**: ❌ No quotation views
- **Missing**:
  - `/quotations/[id]/preview` - Client view (descriptions only)
  - `/quotations/[id]/internal` - Internal view (full item details)
  - PDF generation with view toggle
  - Email template for client version

### 6. PO → Order Management
**Requirement**: "When quotation accepted, PO received, create order"
- **Current State**: ❌ No PO tracking UI, ❌ No orders UI
- **Missing Modules**:
  ```
  /customer-pos/
    ├── page.tsx            # List of POs
    ├── new/               # Record PO (file upload or details)
    └── [id]/              # PO details linked to quotation
  
  /orders/
    ├── page.tsx           # Order list
    ├── [id]/              # Order details
    └── [id]/deliveries/   # Partial/full delivery tracking
  ```

### 7. Delivery Management
**Requirement**: "Deliver in full or parts, inventory and/or services"
- **Current State**: ❌ No delivery tracking UI
- **Missing**:
  - Delivery note creation from order
  - Partial delivery tracking
  - Stock-out automation for inventory items
  - Service completion tracking
  - Delivery status on order page

### 8. FIFO Costing Integration
**Requirement**: "Inventory cost calculated through FIFO"
- **Current State**: ⚠️ Backend supports but no UI
- **Missing**:
  - Cost layer visibility on item detail
  - FIFO calculation display on sales case profitability
  - Stock valuation reports showing FIFO layers
  - Cost of goods sold calculation UI

### 9. Sales Case Profitability
**Requirement**: "See profitability with inventory costs and expenses"
- **Current State**: ❌ No profitability analysis UI
- **Missing Components**:
  ```
  /sales-cases/[id]/profitability/
    ├── Revenue (from quotations/invoices)
    ├── Costs
    │   ├── Inventory (FIFO)
    │   ├── Service costs
    │   └── Expenses
    └── Profit margin analysis
  ```

### 10. Expense Tracking
**Requirement**: "Expenses logged into sales case"
- **Current State**: ❌ No expense tracking UI
- **Missing**:
  - "Add Expense" button on sales case
  - Expense categories setup
  - Expense list with GL account mapping
  - Expense approval workflow

### 11. Invoice Generation
**Requirement**: "Raise invoices upon successful delivery"
- **Current State**: ❌ No invoice UI
- **Missing**:
  - Create invoice from delivery/order
  - Invoice line items from order items
  - Tax calculation (VAT)
  - Invoice approval process

### 12. Payment Recording
**Requirement**: "Payments recorded against invoices, full or partial"
- **Current State**: ❌ No payment UI
- **Missing**:
  - Payment recording form
  - Partial payment allocation
  - Payment methods setup
  - Outstanding balance tracking
  - Payment receipt generation

### 13. Tax Handling
**Requirement**: "VAT as part of MVP"
- **Current State**: ⚠️ Tax fields in DB but no UI
- **Missing**:
  - Tax rates configuration
  - Tax calculation on quotations/invoices
  - Tax reports
  - Tax account mapping in GL

### 14. General Ledger Integration
**Requirement**: "All transactions linked with GL"
- **Current State**: ⚠️ GL exists but limited integration UI
- **Missing UI for GL postings from**:
  - Inventory movements (stock in/out)
  - Sales (revenue recognition)
  - COGS (cost of goods sold)
  - Expenses
  - Tax postings
  - Payment receipts

### 15. Audit Trail
**Requirement**: "Audit trail of user activity"
- **Current State**: ✅ Basic audit page exists
- **Gap**: ⚠️ Limited filtering and search
- **Missing**:
  - Advanced filters by module/action
  - User activity reports
  - Change history for specific records

## Critical Missing UI Workflows

### 1. Quotation Creation Flow
```
Sales Case Detail 
  → Create Quotation button
    → Add description lines
      → Add items to each line
        → Set quantities/prices
          → Preview client/internal views
            → Send to customer
```
**Status**: ❌ Completely missing

### 2. Order Fulfillment Flow  
```
Quotation Accepted
  → Record PO
    → Create Order
      → Plan Delivery
        → Update Inventory
          → Create Invoice
            → Record Payment
```
**Status**: ❌ Completely missing

### 3. Profitability Analysis Flow
```
Sales Case
  → View P&L
    → Revenue from invoices
    → FIFO costs from deliveries  
    → Logged expenses
    → Calculate margin
```
**Status**: ❌ Completely missing

## Implementation Priority

### Phase 1: Core Business Flow (Critical)
1. **Quotations Module** - The main bottleneck
   - Multi-line structure with items
   - Dual view (client/internal)
   - Version management
   - Email/PDF generation

2. **Basic Inventory** - Required for quotations
   - Categories and items setup
   - Stock movements UI
   - FIFO cost tracking display

3. **Orders Module** - Bridge quotations to delivery
   - PO recording
   - Order creation from quotation
   - Delivery planning

### Phase 2: Financial Flow (High)
4. **Invoicing** - Revenue recognition
   - Create from orders
   - Tax calculation
   - Send to customer

5. **Payments** - Cash collection
   - Record against invoices
   - Partial payment handling

6. **GL Integration UI** - Financial visibility
   - Transaction posting review
   - Account balance impact

### Phase 3: Analytics (Medium)
7. **Sales Case Profitability**
   - P&L by sales case
   - Margin analysis
   - Expense tracking

8. **Enhanced Reporting**
   - Sales analytics
   - Inventory analytics
   - Financial dashboards

## Technical Implementation Notes

### 1. Complex Data Structures Needed
- Nested quotation lines with items
- Partial delivery tracking
- Payment allocation logic
- FIFO cost layer management

### 2. State Management Challenges
- Multi-step forms (quotation creation)
- Real-time inventory updates
- Complex calculations (tax, FIFO)
- Cross-module data dependencies

### 3. UI/UX Considerations
- Drag-drop for quotation lines
- Inline editing for quick updates
- Split views (client/internal)
- Progress indicators for workflow stages

## Summary

**Current State**: 
- ✅ Lead → Sales Case flow exists
- ✅ Basic modules (customers, accounting structure)
- ❌ No quotations, inventory UI, orders, or complete workflow

**Critical Gaps**:
1. **Quotations** - Core of sales process, completely missing
2. **Inventory UI** - Required for items in quotations
3. **Order Management** - Links quotations to delivery
4. **Connected Workflows** - Modules work in isolation

**Business Impact**: 
The system cannot support the basic sales cycle from quotation to payment. Users have backends ready but no way to execute the business process through the UI.