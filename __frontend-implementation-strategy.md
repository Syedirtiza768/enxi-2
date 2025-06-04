# Frontend Implementation Strategy - Missing Modules

## Overview
This document provides an exhaustive strategy for implementing the missing frontend modules in the Enxi ERP system. Currently, 4 major modules have complete backend implementations but no frontend UI, causing 404 errors when users click sidebar links.

## Module 1: Quotations Management

### Required Pages & Components

#### 1.1 Quotations List Page (`/quotations/page.tsx`)
**Features Needed:**
- Data table with columns: Quote #, Date, Customer, Sales Case, Amount, Status, Validity, Actions
- Search bar for quote number, customer name
- Filter dropdowns: Status (Draft, Sent, Accepted, Rejected, Expired), Date range, Sales rep
- Bulk actions: Delete drafts, Export to CSV
- "New Quotation" button
- Pagination (20 items per page)
- Sort by: Date, Amount, Customer name

**API Integration:**
- `GET /api/quotations` with query params for pagination, filters, search
- `DELETE /api/quotations/[id]` for deletion

#### 1.2 Create/Edit Quotation (`/quotations/new/page.tsx` & `/quotations/[id]/page.tsx`)
**Form Fields:**
- Customer selection (dropdown with search)
- Sales case selection (filtered by customer)
- Quotation date & validity period
- Currency selection
- Payment terms
- Line items:
  - Product/service selection
  - Description
  - Quantity
  - Unit price
  - Discount %
  - Tax rate
  - Line total
- Notes/terms section
- Internal notes (not shown to customer)
- Attachments upload

**Features:**
- Add/remove line items dynamically
- Auto-calculate totals
- Save as draft
- Preview before sending
- Version history (for revised quotes)
- Clone from existing quote
- Convert to sales order button

**API Integration:**
- `POST /api/quotations` for creation
- `PUT /api/quotations/[id]` for updates
- `GET /api/quotations/versions/[salesCaseId]` for version history

#### 1.3 Quotation Detail View (`/quotations/[id]/page.tsx`)
**Sections:**
- Header: Status badge, quote number, dates, customer info
- Actions toolbar: Edit, Send, Accept, Reject, Cancel, Convert to Order, Download PDF
- Line items table (read-only)
- Activity timeline: Created, sent, viewed by customer, accepted/rejected
- Email history
- Related documents: Sales case, resulting orders/invoices

**API Integration:**
- `GET /api/quotations/[id]`
- `POST /api/quotations/[id]/send`
- `POST /api/quotations/[id]/accept`
- `POST /api/quotations/[id]/reject`
- `POST /api/quotations/[id]/cancel`
- `POST /api/quotations/[id]/convert-to-order`
- `GET /api/quotations/[id]/pdf`

## Module 2: Inventory Management

### Required Pages & Components

#### 2.1 Inventory Dashboard (`/inventory/page.tsx`)
**Widgets:**
- Total inventory value
- Low stock alerts count
- Expiring items count
- Recent stock movements
- Top moving items chart
- Stock value by category pie chart
- Quick links to sub-modules

**API Integration:**
- `GET /api/inventory/reports/stock-value`
- `GET /api/inventory/low-stock`
- `GET /api/inventory/reports/expiring-lots`
- `GET /api/inventory/stock-movements?limit=10`

#### 2.2 Items List (`/inventory/items/page.tsx`)
**Features:**
- Data table: SKU, Name, Category, Current Stock, Unit, Cost, Status
- Search by SKU, name, barcode
- Filter by: Category (tree selector), Status, Stock level (out of stock, low stock, in stock)
- Bulk actions: Export, Import CSV, Deactivate
- "New Item" button
- Image thumbnails in table

**API Integration:**
- `GET /api/inventory/items` with filters
- `GET /api/inventory/categories/tree` for category filter

#### 2.3 Create/Edit Item (`/inventory/items/new/page.tsx` & `/inventory/items/[id]/page.tsx`)
**Form Sections:**
1. **Basic Information:**
   - SKU (auto-generate option)
   - Barcode
   - Name
   - Description
   - Category (hierarchical selector)
   - Unit of measure
   - Status (Active/Inactive)

2. **Stock Information:**
   - Current stock (read-only if editing)
   - Reorder level
   - Reorder quantity
   - Lead time (days)
   - Track lots/batches (yes/no)
   - Track expiry dates (yes/no)

3. **Costing:**
   - Cost method (FIFO)
   - Standard cost
   - Last purchase price
   - Average cost (calculated)

4. **Images:**
   - Primary image upload
   - Gallery images (up to 5)
   - Image crop/resize tool

**API Integration:**
- `POST /api/inventory/items` for creation
- `PUT /api/inventory/items/[id]` for updates
- `GET /api/inventory/units-of-measure` for dropdown

#### 2.4 Item Detail View (`/inventory/items/[id]/page.tsx`)
**Tabs:**
1. **Overview:** Basic info, current stock, images
2. **Stock History:** Movement history table with filters
3. **Lots/Batches:** If enabled, show lot details
4. **Suppliers:** Linked suppliers and purchase history
5. **Analytics:** Usage trends, turnover rate

**API Integration:**
- `GET /api/inventory/items/[id]`
- `GET /api/inventory/stock-movements?itemId=[id]`
- `GET /api/inventory/stock-lots?itemId=[id]`

#### 2.5 Categories Management (`/inventory/categories/page.tsx`)
**Features:**
- Tree view of categories (drag-drop to reorganize)
- Create/edit/delete categories
- Set parent category
- Category code and description
- Default GL accounts per category

**API Integration:**
- `GET /api/inventory/categories/tree`
- `POST /api/inventory/categories`
- `PUT /api/inventory/categories/[id]`
- `DELETE /api/inventory/categories/[id]`

#### 2.6 Stock Movements (`/inventory/stock-movements/page.tsx`)
**Features:**
- Movement history table: Date, Type, Item, Quantity, Reference, User
- Filter by: Type (Receipt, Issue, Adjustment, Transfer), Date range, Item
- Create manual adjustment
- Opening stock entry
- Stock transfer between locations
- Reason codes for adjustments

**API Integration:**
- `GET /api/inventory/stock-movements`
- `POST /api/inventory/stock-movements/adjust`
- `POST /api/inventory/stock-movements/opening`

#### 2.7 Inventory Reports (`/inventory/reports/page.tsx`)
**Report Types:**
1. **Stock Summary:** Current stock levels by category
2. **Stock Valuation:** Inventory value report
3. **Movement Analysis:** In/out analysis by period
4. **Expiring Items:** Items nearing expiry
5. **Reorder Report:** Items below reorder level
6. **Dead Stock:** Items with no movement in X days

**Features:**
- Date range selection
- Export to PDF/Excel
- Schedule email reports
- Save report preferences

**API Integration:**
- `GET /api/inventory/reports/stock-summary`
- `GET /api/inventory/reports/stock-value`
- `GET /api/inventory/reports/expiring-lots`

## Module 3: Invoice Management

### Required Pages & Components

#### 3.1 Invoices List (`/invoices/page.tsx`)
**Features:**
- Data table: Invoice #, Date, Customer, Amount, Paid, Balance, Status, Due Date
- Search by invoice number, customer
- Filter by: Status (Draft, Sent, Paid, Partial, Overdue), Date range, Customer
- Bulk actions: Send reminders, Export
- "New Invoice" button
- Color coding for overdue invoices

**API Integration:**
- `GET /api/invoices` with filters
- Calculate aging buckets client-side

#### 3.2 Create/Edit Invoice (`/invoices/new/page.tsx` & `/invoices/[id]/page.tsx`)
**Form Fields:**
- Customer selection (show balance)
- Invoice date & due date
- Payment terms (auto-set due date)
- Currency
- Reference (PO number)
- Line items (similar to quotations)
- Notes section
- Payment instructions

**Features:**
- Create from sales order
- Create from quotation
- Recurring invoice setup
- Partial invoicing
- Credit note creation

**API Integration:**
- `POST /api/invoices`
- `PUT /api/invoices/[id]`
- `POST /api/sales-orders/[id]/create-invoice`

#### 3.3 Invoice Detail View (`/invoices/[id]/page.tsx`)
**Sections:**
- Header with status, amounts, aging
- Actions: Edit (if draft), Send, Record Payment, Create Credit Note, Download PDF
- Payment history table
- Activity timeline
- Related documents

**Payment Recording:**
- Payment date
- Amount (allow partial)
- Payment method
- Reference number
- Bank account selection
- Auto-match suggestions

**API Integration:**
- `GET /api/invoices/[id]`
- `POST /api/invoices/[id]/send`
- `GET /api/invoices/[id]/payments`
- `POST /api/invoices/[id]/payments`

## Module 4: Payment Management

### Required Pages & Components

#### 4.1 Payments Dashboard (`/payments/page.tsx`)
**Widgets:**
- Payments this month
- Outstanding receivables
- Overdue amounts
- Payment methods breakdown
- Recent payments list
- Cash flow chart

#### 4.2 Payments List (`/payments/page.tsx`)
**Features:**
- Data table: Date, Customer, Invoice(s), Amount, Method, Reference, Status
- Search by customer, reference
- Filter by: Date range, Method, Status
- Bulk actions: Export, Print receipts
- "Record Payment" button

#### 4.3 Record Payment (`/payments/new/page.tsx`)
**Options:**
1. **Against Specific Invoices:**
   - Customer selection
   - Show open invoices
   - Select invoices to pay
   - Auto-allocate amount
   - Manual allocation option

2. **Advance Payment:**
   - Customer selection
   - Amount
   - Notes
   - Will create credit on account

**Fields:**
- Payment date
- Amount
- Payment method
- Bank account
- Reference/check number
- Notes

#### 4.4 Payment Detail (`/payments/[id]/page.tsx`)
**Sections:**
- Payment details
- Applied invoices table
- Receipt preview
- Actions: Print, Email receipt, Reverse (if allowed)

## Technical Implementation Guidelines

### Component Reuse Strategy
1. **Use existing components:**
   - `Button`, `Card`, `Input`, `Select` from `/components/ui`
   - `DataTable` pattern from customers/leads modules
   - Form validation patterns from existing forms

2. **Create shared components:**
   - `LineItemsEditor` for quotations/invoices
   - `CustomerSelector` with balance display
   - `StatusBadge` with consistent colors
   - `DateRangePicker` for reports
   - `AmountDisplay` with currency formatting

### State Management
- Use React Query for data fetching
- Implement optimistic updates for better UX
- Cache customer/item lists for dropdowns
- Use form libraries (react-hook-form) for complex forms

### Error Handling
- Show inline validation errors
- Toast notifications for actions
- Fallback UI for loading states
- Proper error boundaries

### Performance Considerations
- Implement virtual scrolling for large lists
- Lazy load images
- Debounce search inputs
- Paginate all lists (20-50 items)
- Use React.memo for expensive components

## Implementation Priority & Timeline

### Phase 1 (Week 1-2): Quotations
- Day 1-2: List page with filters
- Day 3-5: Create/edit form
- Day 6-7: Detail view with actions
- Day 8-9: PDF generation, email sending
- Day 10: Testing & refinements

### Phase 2 (Week 3-4): Invoices
- Day 1-2: List page
- Day 3-4: Create/edit form
- Day 5-6: Payment recording
- Day 7-8: Detail view
- Day 9-10: Testing & payment allocation

### Phase 3 (Week 5-7): Inventory
- Week 5: Items management (list, create, edit)
- Week 6: Stock movements, adjustments
- Week 7: Reports and dashboard

### Phase 4 (Week 8): Payments & Polish
- Day 1-3: Payment management
- Day 4-5: Integration testing
- Day 6-7: UI polish and responsiveness

## Success Metrics
- All sidebar links functional (no 404s)
- Page load time < 2 seconds
- Forms save/validate < 1 second
- Search results appear < 500ms
- Zero console errors
- Mobile responsive on all pages