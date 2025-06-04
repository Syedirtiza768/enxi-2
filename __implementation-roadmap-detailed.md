# Detailed Implementation Roadmap - Business Workflow Completion

## Overview
This roadmap addresses the complete business workflow: **Lead → Sales Case → Quotation → PO → Order → Delivery → Invoice → Payment** with full inventory and accounting integration.

## Week 1-2: Inventory Foundation (Prerequisites)

### Day 1-3: Inventory Categories & Setup
**Files to Create:**
```
/app/(auth)/inventory/
├── layout.tsx
├── page.tsx (dashboard)
└── setup/
    ├── page.tsx
    ├── categories/
    │   └── page.tsx
    └── units/
        └── page.tsx
```

**Components:**
```typescript
// /components/inventory/category-tree.tsx
interface CategoryNode {
  id: string
  name: string
  code: string
  parentId?: string
  children: CategoryNode[]
  glAccounts: {
    inventory: string
    cogs: string
    variance: string
  }
}

// Features:
- Drag-drop hierarchy
- GL account assignment per category
- Bulk import from CSV
```

### Day 4-7: Inventory Items Master
**Files to Create:**
```
/app/(auth)/inventory/items/
├── page.tsx
├── new/page.tsx
├── [id]/page.tsx
└── import/page.tsx
```

**Key Features:**
```typescript
// Item structure for FIFO
interface InventoryItem {
  id: string
  sku: string
  name: string
  category: Category
  costingMethod: 'FIFO'
  stockLevels: {
    onHand: number
    available: number
    allocated: number
  }
  fifoCostLayers: CostLayer[]
}

interface CostLayer {
  date: Date
  quantity: number
  unitCost: number
  remaining: number
}
```

### Day 8-10: Stock Movements
**Files to Create:**
```
/app/(auth)/inventory/movements/
├── page.tsx
├── stock-in/page.tsx
├── stock-out/page.tsx
└── adjustments/page.tsx
```

**GL Integration UI:**
- Show GL entries preview before posting
- Double-entry display for each movement
- Account balance impact visualization

## Week 3-4: Quotations with Multi-Line Structure

### Day 1-4: Quotation Core Structure
**Files to Create:**
```
/app/(auth)/quotations/
├── page.tsx
├── new/page.tsx
├── [id]/
│   ├── page.tsx
│   ├── edit/page.tsx
│   ├── preview/page.tsx (client view)
│   └── internal/page.tsx (internal view)
└── templates/page.tsx
```

**Complex Line Editor Component:**
```typescript
// /components/quotations/line-editor.tsx
interface QuotationLineEditor {
  lines: QuotationLine[]
  onLinesChange: (lines: QuotationLine[]) => void
}

interface QuotationLine {
  id: string
  sequence: number
  description: string // Client visible
  internalNotes?: string
  items: QuotationLineItem[]
  totalAmount: number
}

interface QuotationLineItem {
  type: 'inventory' | 'service'
  itemId?: string // For inventory
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discount?: number
  taxRate: number
  total: number
}

// Features:
- Drag to reorder lines
- Expand/collapse item details
- Add items from inventory search
- Calculate line totals
- Tax calculations per item
```

### Day 5-7: Dual View Implementation
**Client Preview Features:**
- Hide item-level details
- Show only line descriptions
- Professional PDF layout
- Email template with preview
- Customer portal view

**Internal View Features:**
- Full item breakdown
- Cost analysis (FIFO)
- Margin calculation
- Internal notes
- Approval workflow

### Day 8-10: Sales Case Integration
**Update Sales Case Detail:**
```typescript
// /app/(auth)/sales-cases/[id]/page.tsx
// Add new tab for quotations
<Tabs>
  <TabsList>
    <TabsTrigger>Overview</TabsTrigger>
    <TabsTrigger>Quotations</TabsTrigger> {/* NEW */}
    <TabsTrigger>Expenses</TabsTrigger>
    <TabsTrigger>Timeline</TabsTrigger>
  </TabsList>
  <TabsContent value="quotations">
    <QuotationsList salesCaseId={id} />
    <Button onClick={createQuotation}>Create Quotation</Button>
  </TabsContent>
</Tabs>
```

## Week 5: PO and Order Management

### Day 1-3: Customer PO Recording
**Files to Create:**
```
/app/(auth)/customer-pos/
├── page.tsx
├── new/page.tsx
└── [id]/page.tsx
```

**PO Recording Form:**
```typescript
interface CustomerPO {
  poNumber: string
  poDate: Date
  customer: Customer
  quotation: Quotation
  poType: 'written' | 'verbal'
  fileAttachment?: File
  amount: number
  status: 'received' | 'validated' | 'processed'
}
```

### Day 4-7: Sales Order Creation
**Files to Create:**
```
/app/(auth)/orders/
├── page.tsx
├── [id]/
│   ├── page.tsx
│   └── deliveries/page.tsx
└── fulfillment/page.tsx
```

**Order from Quotation:**
- Auto-create order when PO accepted
- Copy all line items
- Set delivery requirements
- Allocate inventory
- Track fulfillment status

### Day 8-10: Delivery Management
**Delivery Planning UI:**
```typescript
interface DeliveryPlan {
  order: Order
  deliveries: Delivery[]
}

interface Delivery {
  id: string
  deliveryDate: Date
  items: DeliveryItem[]
  status: 'planned' | 'in_progress' | 'completed'
}

interface DeliveryItem {
  orderLineId: string
  quantity: number
  inventoryMovements?: StockMovement[]
  serviceCompletion?: ServiceRecord
}
```

## Week 6: Invoicing with Tax

### Day 1-3: Tax Configuration
**Files to Create:**
```
/app/(auth)/settings/tax/
├── page.tsx
├── rates/page.tsx
└── rules/page.tsx
```

**Tax Setup:**
- VAT rates by product/service
- Tax accounts in GL
- Tax calculation rules
- Multi-jurisdiction support

### Day 4-7: Invoice Generation
**Files to Create:**
```
/app/(auth)/invoices/
├── page.tsx
├── new/page.tsx
├── [id]/
│   ├── page.tsx
│   └── payments/page.tsx
└── from-order/[orderId]/page.tsx
```

**Invoice from Delivery:**
- Auto-generate from completed deliveries
- Apply tax calculations
- GL posting preview
- Revenue recognition rules

### Day 8-10: Payment Recording
**Payment Allocation UI:**
```typescript
interface PaymentAllocation {
  payment: Payment
  allocations: InvoiceAllocation[]
}

interface InvoiceAllocation {
  invoiceId: string
  amount: number
  discountApplied?: number
}

// Features:
- Auto-suggest allocation
- Partial payment handling
- Multiple invoice payment
- Overpayment as credit
```

## Week 7: Financial Integration & Profitability

### Day 1-3: GL Posting Interface
**Files to Create:**
```
/app/(auth)/accounting/gl-interface/
├── page.tsx
├── pending/page.tsx
└── review/[transactionId]/page.tsx
```

**GL Integration Dashboard:**
- Pending transactions queue
- Posting preview with T-accounts
- Batch posting approval
- Error handling for failed postings

### Day 4-6: Sales Case Profitability
**Files to Create:**
```
/app/(auth)/sales-cases/[id]/profitability/
└── page.tsx
```

**Profitability Analysis:**
```typescript
interface SalesCaseProfitability {
  revenue: {
    quotations: QuotationRevenue[]
    invoiced: number
    pending: number
  }
  costs: {
    inventory: FIFOCost[]
    services: ServiceCost[]
    expenses: Expense[]
  }
  margin: {
    gross: number
    net: number
    percentage: number
  }
}
```

### Day 7-10: Expense Management
**Files to Create:**
```
/app/(auth)/sales-cases/[id]/expenses/
├── page.tsx
└── new/page.tsx
```

**Expense Categories:**
- Travel
- Materials
- Subcontractor
- Other direct costs
- GL account mapping

## Week 8: Workflow Completion & Polish

### Day 1-2: Lead Enhancement
**Update Lead Detail:**
- Add "Convert to Sales Case" workflow
- Show related sales cases
- Track conversion metrics

### Day 3-4: Audit Trail Enhancement
**Improvements:**
- Module-specific filtering
- Activity timeline view
- Change comparison view
- Export audit reports

### Day 5-7: Integration Testing
**End-to-End Workflows:**
1. Lead → Sales Case creation
2. Quotation with multi-line items
3. PO receipt → Order generation
4. Delivery → Inventory update → GL posting
5. Invoice → Payment → GL reconciliation
6. Profitability calculation verification

### Day 8-10: Performance & UX
- Loading states for complex calculations
- Keyboard shortcuts for frequent actions
- Bulk operations
- Mobile responsive testing

## Component Library Additions

### Shared Components to Build:
```
/components/shared/
├── line-item-editor/
│   ├── index.tsx
│   ├── line-row.tsx
│   └── item-selector.tsx
├── document-viewer/
│   ├── index.tsx
│   ├── client-view.tsx
│   └── internal-view.tsx
├── gl-preview/
│   ├── index.tsx
│   └── t-account.tsx
├── workflow-status/
│   ├── index.tsx
│   └── status-timeline.tsx
└── amount-allocation/
    ├── index.tsx
    └── allocation-row.tsx
```

## Database Queries Optimization

### Views to Create:
```sql
-- Sales case profitability view
CREATE VIEW sales_case_profitability AS
SELECT 
  sc.id,
  SUM(inv.total) as revenue,
  SUM(fifo.cost) as inventory_cost,
  SUM(exp.amount) as expenses,
  (revenue - inventory_cost - expenses) as profit
FROM sales_cases sc
-- Complex joins for calculations

-- Inventory FIFO layers view
CREATE VIEW inventory_fifo_layers AS
SELECT 
  item_id,
  layer_date,
  quantity,
  unit_cost,
  remaining_quantity
FROM stock_movements
-- FIFO calculation logic
```

## Success Metrics

### Business Metrics:
- Complete quote-to-cash cycle < 10 clicks
- Quotation creation < 3 minutes
- Invoice generation < 30 seconds
- Real-time profitability visibility

### Technical Metrics:
- Page load < 1 second
- Complex calculations < 2 seconds
- API response < 200ms
- Zero data inconsistencies

## Risk Mitigation

### Complex Areas:
1. **FIFO Calculations**: Pre-calculate and cache
2. **Multi-line Quotations**: Optimize React rendering
3. **GL Postings**: Queue system for batch processing
4. **Tax Calculations**: Comprehensive testing matrix

### Fallback Plans:
- Phase complex features (basic → advanced)
- Implement manual overrides for calculations
- Add approval queues for critical operations
- Extensive validation before GL posting