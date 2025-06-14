# Enxi ERP Frontend Requirements Matrix

## Overview
This document provides comprehensive frontend requirements extracted from the backend analysis, including models, validations, API endpoints, business rules, and permission requirements.

## Table of Contents
1. [Authentication & User Management](#authentication--user-management)
2. [Lead Management](#lead-management)
3. [Customer Management](#customer-management)
4. [Sales Cases](#sales-cases)
5. [Quotations](#quotations)
6. [Sales Orders](#sales-orders)
7. [Inventory Management](#inventory-management)
8. [Purchase Orders](#purchase-orders)
9. [Shipments](#shipments)
10. [Invoices & Payments](#invoices--payments)
11. [Accounting](#accounting)
12. [Reports & Analytics](#reports--analytics)

---

## 1. Authentication & User Management

### Entity: User
**Model Fields:**
- `id` (string, cuid, required)
- `username` (string, unique, required)
- `email` (string, unique, required)
- `password` (string, required - hashed)
- `role` (enum: SUPER_ADMIN, ADMIN, MANAGER, SALES_REP, ACCOUNTANT, WAREHOUSE, VIEWER, USER)
- `isActive` (boolean, default: true)
- `managerId` (string, optional) - for sales hierarchy
- `createdAt`, `updatedAt` (timestamps)

**List View Requirements:**
- Columns: Username, Email, Role, Status (Active/Inactive), Manager, Created Date
- Filters: Role, Active Status, Manager
- Sorting: Username, Email, Created Date
- Pagination: 20 items per page
- Actions: View, Edit, Delete, Toggle Active Status
- Permissions: `users.read`, `users.view_all`

**Create/Update Form Requirements:**
- Fields:
  - Username* (text, min 3 chars, unique validation)
  - Email* (email format, unique validation)
  - Password* (min 6 chars, only on create)
  - Role* (dropdown with enum values)
  - Manager (searchable dropdown of users with MANAGER role)
  - Active Status (toggle)
- Validation:
  - Username: Required, min 3 chars, alphanumeric + underscore
  - Email: Required, valid email format
  - Password: Required on create, min 6 chars
  - Role: Required, must be valid enum value
- Permissions: `users.create`, `users.update`

**API Endpoints:**
- GET `/api/users` - List users
- POST `/api/users` - Create user
- GET `/api/users/[id]` - Get user details
- PUT `/api/users/[id]` - Update user
- DELETE `/api/users/[id]` - Delete user
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout
- GET `/api/auth/profile` - Get current user profile
- POST `/api/auth/register` - Register new user
- GET `/api/auth/validate` - Validate session

**Business Rules:**
- Users cannot delete themselves
- Only ADMIN/SUPER_ADMIN can manage users
- Sales hierarchy must be maintained (manager must have appropriate role)
- Email and username must be unique across system
- Inactive users cannot login

---

## 2. Lead Management

### Entity: Lead
**Model Fields:**
- `id` (string, cuid, required)
- `firstName` (string, required, max 100)
- `lastName` (string, required, max 100)
- `email` (string, required, max 255)
- `phone` (string, optional)
- `company` (string, optional, max 255)
- `jobTitle` (string, optional, max 100)
- `source` (enum: WEBSITE, REFERRAL, SOCIAL_MEDIA, EMAIL_CAMPAIGN, PHONE_CALL, TRADE_SHOW, ADVERTISING, OTHER)
- `status` (enum: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATING, CONVERTED, LOST, DISQUALIFIED)
- `notes` (string, optional, max 1000)
- `createdBy`, `updatedBy` (user references)
- `createdAt`, `updatedAt` (timestamps)

**List View Requirements:**
- Columns: Name, Email, Company, Phone, Source, Status, Created Date
- Filters: Status, Source, Date Range, Search (name/email/company)
- Sorting: Name, Created Date, Status
- Pagination: 10 items default, configurable (10, 20, 50, 100)
- Actions: View, Edit, Delete, Convert to Customer, Update Status
- Bulk Actions: Update Status, Delete
- Permissions: `leads.read`, `leads.view_all` (for all leads)

**Create/Update Form Requirements:**
- Fields:
  - First Name* (text, max 100)
  - Last Name* (text, max 100)
  - Email* (email format, max 255)
  - Phone (tel format)
  - Company (text, max 255)
  - Job Title (text, max 100)
  - Source* (dropdown with enum values)
  - Status (dropdown with enum values, default: NEW)
  - Notes (textarea, max 1000)
- Validation:
  - First Name: Required, 1-100 characters
  - Last Name: Required, 1-100 characters
  - Email: Required, valid email format
  - Source: Required, must be valid enum
- Permissions: `leads.create`, `leads.update`

**Lead Conversion Requirements:**
- Convert button visible only for qualified leads
- Creates customer with:
  - Name: `${firstName} ${lastName}` or Company name
  - Email, Phone carried over
  - Generates unique customer number
  - Creates AR account automatically
- Links lead to customer via `leadId`
- Updates lead status to CONVERTED
- Permissions: `leads.convert`

**API Endpoints:**
- GET `/api/leads` - List leads with filters
- POST `/api/leads` - Create new lead
- GET `/api/leads/[id]` - Get lead details
- PUT `/api/leads/[id]` - Update lead
- DELETE `/api/leads/[id]` - Delete lead
- POST `/api/leads/[id]/convert` - Convert to customer
- PUT `/api/leads/[id]/status` - Update lead status
- POST `/api/leads/bulk-status` - Bulk update status
- GET `/api/leads/metrics` - Lead analytics
- GET `/api/leads/[id]/timeline` - Lead activity timeline

---

## 3. Customer Management

### Entity: Customer
**Model Fields:**
- `id` (string, cuid, required)
- `customerNumber` (string, unique, auto-generated)
- `name` (string, required, max 255)
- `email` (string, unique, required)
- `phone` (string, optional)
- `industry` (string, optional)
- `website` (string, optional, URL format)
- `address` (string, optional)
- `taxId` (string, optional)
- `currency` (string, default: "USD", now "AED")
- `creditLimit` (float, default: 0, min: 0)
- `paymentTerms` (int, default: 30, days)
- `leadId` (string, optional, unique) - link to original lead
- `assignedToId` (string, optional) - assigned sales rep
- `assignedAt`, `assignedBy`, `assignmentNotes` (assignment tracking)
- `accountId` (string, optional) - AR account link
- `createdBy`, `createdAt`, `updatedAt` (audit fields)

**List View Requirements:**
- Columns: Customer #, Name, Email, Phone, Currency, Credit Limit, Payment Terms, Assigned To
- Filters: Currency, Industry, Assigned To, Search (name/email/customer#)
- Sorting: Name, Customer Number, Created Date
- Pagination: 20 items default
- Actions: View, Edit, Delete, View Sales Cases, Create Sales Case, Manage Credit
- Export: CSV, Excel
- Permissions: `customers.read`, `customers.view_all`

**Create/Update Form Requirements:**
- Fields:
  - Name* (text, max 255)
  - Email* (email format, unique)
  - Phone (tel format)
  - Industry (text or dropdown)
  - Website (URL format)
  - Address (textarea)
  - Tax ID (text)
  - Currency (dropdown: USD, EUR, GBP, AED, etc.)
  - Credit Limit (number, min 0)
  - Payment Terms (number, days, min 0)
  - Assigned To (searchable user dropdown)
  - Assignment Notes (textarea)
- Validation:
  - Name: Required
  - Email: Required, valid format, unique check
  - Website: Optional, must be valid URL if provided
  - Credit Limit: Non-negative number
  - Payment Terms: Positive integer
- Auto-generation:
  - Customer Number: Format "CUST-XXXXXX"
  - AR Account: Created automatically with code "AR-CUST-XXXXXX"
- Permissions: `customers.create`, `customers.update`

**Credit Management Requirements:**
- Separate form/modal for credit limit updates
- Shows current balance and credit utilization
- Requires approval notes
- Audit trail for credit changes
- Permissions: `customers.manage_credit`

**API Endpoints:**
- GET `/api/customers` - List customers with search
- POST `/api/customers` - Create customer
- GET `/api/customers/[id]` - Get customer details
- PUT `/api/customers/[id]` - Update customer
- DELETE `/api/customers/[id]` - Delete customer
- PUT `/api/customers/[id]/credit-limit` - Update credit limit
- POST `/api/customers/[id]/assign` - Assign to sales rep

---

## 4. Sales Cases

### Entity: SalesCase
**Model Fields:**
- `id` (string, cuid, required)
- `caseNumber` (string, unique, auto-generated)
- `customerId` (string, required, FK)
- `title` (string, required)
- `description` (string, optional)
- `status` (enum: OPEN, IN_PROGRESS, WON, LOST, CANCELLED)
- `estimatedValue` (float, default: 0)
- `actualValue` (float, default: 0)
- `cost` (float, default: 0)
- `profitMargin` (float, default: 0)
- `createdBy`, `assignedTo` (user references)
- `createdAt`, `updatedAt`, `closedAt` (timestamps)

**List View Requirements:**
- Columns: Case #, Title, Customer, Status, Est. Value, Actual Value, Profit %, Created Date
- Filters: Status, Customer, Date Range, Value Range, Assigned To
- Sorting: Case Number, Created Date, Value, Status
- Pagination: 20 items per page
- Actions: View, Edit, Delete, Create Quotation, View Quotations, Add Expense, Close Case
- KPI Cards: Total Cases, Open Cases, Won Rate, Total Revenue
- Permissions: `sales_cases.read`, `sales_cases.view_all`, `sales_cases.view_team`

**Create/Update Form Requirements:**
- Fields:
  - Customer* (searchable dropdown)
  - Title* (text)
  - Description (textarea)
  - Status (dropdown with enum values)
  - Estimated Value (currency input)
  - Assigned To (user dropdown)
- Validation:
  - Customer: Required, must exist
  - Title: Required
  - Status: Can only be closed if has associated orders
- Auto-generation:
  - Case Number: Format "SC-YYYY-XXXXXX"
- Calculated Fields:
  - Actual Value: Sum of associated invoices
  - Cost: Sum of case expenses
  - Profit Margin: ((Actual Value - Cost) / Actual Value) * 100
- Permissions: `sales_cases.create`, `sales_cases.update`

**Case Expense Management:**
- Add expense form:
  - Date* (date picker)
  - Category* (dropdown: Travel, Materials, Labor, etc.)
  - Description* (text)
  - Amount* (currency)
  - Currency (dropdown)
  - Receipt # (text)
  - Vendor (text)
  - Attachment (file upload)
- Expense list with approval workflow
- Total expenses calculation
- Permissions: `sales_cases.manage_expenses`

**API Endpoints:**
- GET `/api/sales-cases` - List cases
- POST `/api/sales-cases` - Create case
- GET `/api/sales-cases/[id]` - Get case details
- PUT `/api/sales-cases/[id]` - Update case
- DELETE `/api/sales-cases/[id]` - Delete case
- GET `/api/sales-cases/[id]/summary` - Case financial summary
- POST `/api/sales-cases/[id]/expenses` - Add expense
- GET `/api/sales-cases/[id]/expenses` - List case expenses
- GET `/api/sales-cases/metrics` - Sales metrics

---

## 5. Quotations

### Entity: Quotation
**Model Fields:**
- `id` (string, cuid, required)
- `quotationNumber` (string, unique, auto-generated)
- `salesCaseId` (string, required, FK)
- `version` (int, default: 1)
- `status` (enum: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CANCELLED)
- `validUntil` (datetime, required)
- `subtotal`, `taxAmount`, `discountAmount`, `totalAmount` (float)
- `paymentTerms`, `deliveryTerms` (string, optional)
- `notes` (string, optional - visible to client)
- `internalNotes` (string, optional - internal only)
- `createdBy`, `createdAt`, `updatedAt` (audit fields)

**List View Requirements:**
- Columns: Quote #, Sales Case, Customer, Status, Total, Valid Until, Created Date
- Filters: Status, Sales Case, Customer, Date Range, Amount Range
- Sorting: Quote Number, Created Date, Total Amount, Valid Until
- Pagination: 20 items per page
- Actions: View, Edit, Delete, Clone, Convert to Order, Send to Customer, Print PDF
- Status Badges: Color-coded by status
- Permissions: `quotations.read`, `quotations.view_all`

**Create/Update Form Requirements:**
- Header Section:
  - Sales Case* (dropdown, filters to OPEN/IN_PROGRESS cases)
  - Valid Until* (date picker, min: tomorrow)
  - Payment Terms (text/dropdown)
  - Delivery Terms (text/dropdown)
  - Customer Notes (textarea - visible on PDF)
  - Internal Notes (textarea - internal only)
  
- Line Items Section (Complex):
  - Line-based grouping (multiple items per line)
  - For each line:
    - Line Description (text - shown to client)
    - Items within line:
      - Item Type (PRODUCT/SERVICE toggle)
      - Item Code (text or dropdown from inventory)
      - Description (text, auto-fills from item)
      - Internal Description (text - not on PDF)
      - Quantity* (number, min: 0.01)
      - Unit Price* (currency, min: 0)
      - Cost (currency - for margin calculation)
      - Discount % (number, 0-100)
      - Tax Rate (dropdown from tax config or manual %)
      - UOM (unit of measure dropdown)
    - Line totals calculation
  - Add Line / Add Item to Line buttons
  - Drag-drop reordering
  - Availability check for inventory items
  
- Totals Section:
  - Subtotal (auto-calculated)
  - Discount (auto-calculated)
  - Tax (auto-calculated)
  - Total (auto-calculated)
  - Show margin % (internal view only)

- Validation:
  - Sales Case: Required, must be OPEN/IN_PROGRESS
  - Valid Until: Required, must be future date
  - At least one line item required
  - Quantity and Unit Price must be positive
  
- Permissions: `quotations.create`, `quotations.update`

**Quotation Actions:**
- **Send to Customer**: 
  - Changes status to SENT
  - Logs send date/time
  - Email integration optional
  - Permissions: `quotations.send`
  
- **Convert to Sales Order**:
  - Only for ACCEPTED quotations
  - Requires Customer PO number
  - Copies all line items
  - Links quotation to order
  - Permissions: `quotations.convert`

**API Endpoints:**
- GET `/api/quotations` - List quotations
- POST `/api/quotations` - Create quotation
- GET `/api/quotations/[id]` - Get quotation details
- PUT `/api/quotations/[id]` - Update quotation
- DELETE `/api/quotations/[id]` - Delete quotation
- POST `/api/quotations/[id]/convert-to-order` - Convert to sales order
- GET `/api/quotations/[id]/pdf` - Generate PDF
- POST `/api/quotations/[id]/send` - Send to customer
- POST `/api/quotations/[id]/accept` - Mark as accepted
- POST `/api/quotations/[id]/reject` - Mark as rejected

---

## 6. Sales Orders

### Entity: SalesOrder
**Model Fields:**
- `id` (string, cuid, required)
- `orderNumber` (string, unique, auto-generated)
- `quotationId` (string, optional, FK)
- `salesCaseId` (string, required, FK)
- `status` (enum: PENDING, APPROVED, PROCESSING, SHIPPED, DELIVERED, INVOICED, COMPLETED, CANCELLED, ON_HOLD)
- `orderDate` (datetime, default: now)
- `requestedDate`, `promisedDate` (datetime, optional)
- `subtotal`, `taxAmount`, `discountAmount`, `shippingAmount`, `totalAmount` (float)
- `paymentTerms`, `shippingTerms` (string, optional)
- `shippingAddress`, `billingAddress` (string, optional)
- `customerPO` (string, optional)
- `notes` (string, optional)
- `fulfilledAmount`, `shippedAmount`, `invoicedAmount` (float, tracking)
- `createdBy`, `approvedBy`, `approvedAt` (approval tracking)
- `cancelledBy`, `cancelledAt`, `cancellationReason` (cancellation tracking)

**List View Requirements:**
- Columns: Order #, Customer, Status, Total, Order Date, Requested Date, Fulfillment %
- Filters: Status, Customer, Date Range, Amount Range, Fulfillment Status
- Sorting: Order Number, Order Date, Total Amount, Status
- Pagination: 20 items per page
- Actions: View, Edit (if PENDING), Approve, Cancel, Create Shipment, Create Invoice
- Status Workflow Indicators
- Permissions: `sales_orders.read`, `sales_orders.view_all`

**Create Form Requirements:**
- Two methods:
  1. **From Quotation**: 
     - Select accepted quotation
     - Add Customer PO number
     - Auto-fills all details
  2. **Manual Creation**:
     - Sales Case* (dropdown)
     - Customer info (auto-filled from case)
     - Requested/Promised dates
     - Payment/Shipping terms
     - Addresses
     - Line items (similar to quotation)
     
- Validation:
  - Sales Case required
  - At least one line item
  - Requested date must be future
  - Customer PO recommended
  
- Permissions: `sales_orders.create`

**Update Form Requirements:**
- Only PENDING orders can be edited
- Can modify:
  - Dates
  - Terms
  - Addresses
  - Customer PO
  - Notes
  - Line items (with recalculation)
- Cannot modify if partially fulfilled
- Permissions: `sales_orders.update`

**Order Actions:**
- **Approve Order**:
  - Changes status to APPROVED
  - Triggers stock allocation workflow
  - Creates stock reservations
  - Notifies warehouse
  - Permissions: `sales_orders.approve`
  
- **Cancel Order**:
  - Requires cancellation reason
  - Releases stock reservations
  - Cannot cancel if shipped/invoiced
  - Permissions: `sales_orders.cancel`

**API Endpoints:**
- GET `/api/sales-orders` - List orders
- POST `/api/sales-orders` - Create order
- GET `/api/sales-orders/[id]` - Get order details
- PUT `/api/sales-orders/[id]` - Update order
- DELETE `/api/sales-orders/[id]` - Delete order
- POST `/api/sales-orders/[id]/approve` - Approve order
- POST `/api/sales-orders/[id]/cancel` - Cancel order
- POST `/api/sales-orders/[id]/create-invoice` - Create invoice
- POST `/api/sales-orders/[id]/hold` - Put on hold

---

## 7. Inventory Management

### Entity: Item
**Model Fields:**
- `id` (string, cuid, required)
- `code` (string, unique, required)
- `name` (string, required)
- `description` (string, optional)
- `categoryId` (string, required, FK)
- `type` (enum: PRODUCT, SERVICE, ASSEMBLY)
- `unitOfMeasureId` (string, required, FK)
- `trackInventory` (boolean, default: true)
- `minStockLevel`, `maxStockLevel`, `reorderPoint` (float)
- `standardCost`, `listPrice` (float)
- `inventoryAccountId`, `cogsAccountId`, `salesAccountId` (GL accounts)
- `isActive`, `isSaleable`, `isPurchaseable` (boolean flags)

**List View Requirements:**
- Columns: Code, Name, Category, Type, UOM, Stock Level, Cost, Price, Status
- Filters: Category, Type, Stock Status (Low/OK/Excess), Active Status
- Sorting: Code, Name, Stock Level, Cost
- Pagination: 50 items per page
- Actions: View, Edit, Delete, View Stock History, Adjust Stock
- Quick Stats: Total Items, Low Stock Count, Total Value
- Permissions: `inventory.read`

**Create/Update Form Requirements:**
- Basic Info:
  - Code* (text, unique)
  - Name* (text)
  - Description (textarea)
  - Category* (dropdown, hierarchical)
  - Type* (radio: Product/Service)
  - Unit of Measure* (dropdown)
  
- Inventory Settings (if Product):
  - Track Inventory (toggle)
  - Min Stock Level (number)
  - Max Stock Level (number)
  - Reorder Point (number)
  
- Pricing:
  - Standard Cost (currency)
  - List Price (currency)
  - Margin % (calculated)
  
- GL Accounts:
  - Inventory Account (dropdown)
  - COGS Account (dropdown)
  - Sales Account (dropdown)
  
- Flags:
  - Active (toggle)
  - Saleable (toggle)
  - Purchaseable (toggle)
  
- Validation:
  - Code: Required, unique, alphanumeric
  - Name: Required
  - Category: Required
  - Prices: Non-negative
  - Stock levels: Logical (min < reorder < max)
  
- Permissions: `inventory.create`, `inventory.update`

### Entity: StockMovement
**Model Fields:**
- `id` (string, cuid, required)
- `movementNumber` (string, unique, auto-generated)
- `itemId`, `stockLotId` (references)
- `movementType` (enum: STOCK_IN, STOCK_OUT, TRANSFER, ADJUSTMENT, OPENING)
- `movementDate` (datetime)
- `quantity` (float, positive for IN, negative for OUT)
- `unitCost`, `totalCost` (float)
- `referenceType`, `referenceId`, `referenceNumber` (tracking source)
- `locationId` (string, FK)
- `notes` (string, optional)
- `approvedBy`, `approvedAt` (approval tracking)

**Stock Adjustment Form:**
- Fields:
  - Item* (searchable dropdown)
  - Location* (dropdown)
  - Adjustment Type* (IN/OUT)
  - Quantity* (number, positive)
  - Unit Cost (currency)
  - Reason* (dropdown: Damaged, Lost, Found, Correction, etc.)
  - Notes (textarea)
  
- Validation:
  - Cannot adjust below zero (unless allowed)
  - Requires approval for large adjustments
  
- Permissions: `inventory.adjust`

**API Endpoints:**
- GET `/api/inventory/items` - List items
- POST `/api/inventory/items` - Create item
- GET `/api/inventory/items/[id]` - Get item details
- PUT `/api/inventory/items/[id]` - Update item
- DELETE `/api/inventory/items/[id]` - Delete item
- GET `/api/inventory/stock-movements` - Stock history
- POST `/api/inventory/stock-movements/adjust` - Stock adjustment
- GET `/api/inventory/low-stock` - Low stock report
- GET `/api/inventory/valuation` - Inventory valuation
- GET `/api/inventory/categories` - List categories
- POST `/api/inventory/categories` - Create category

---

## 8. Purchase Orders

### Entity: PurchaseOrder
**Model Fields:**
- `id` (string, cuid, required)
- `poNumber` (string, unique, auto-generated)
- `supplierId` (string, required, FK)
- `status` (enum: DRAFT, SUBMITTED, APPROVED, ORDERED, PARTIAL_RECEIVED, RECEIVED, PARTIAL_INVOICED, INVOICED, COMPLETED, CANCELLED, ON_HOLD)
- `orderDate` (datetime, default: now)
- `expectedDate` (datetime, optional)
- `requestedBy` (string, optional)
- `subtotal`, `taxAmount`, `discountAmount`, `shippingAmount`, `totalAmount` (float)
- `receivedAmount`, `invoicedAmount`, `paidAmount` (float, tracking)
- `paymentTerms`, `deliveryTerms` (string)
- `shippingAddress`, `billingAddress` (string)
- `notes`, `internalNotes` (string)
- `approvedBy`, `approvedAt`, `sentToSupplier`, `sentAt` (workflow tracking)
- `currency`, `exchangeRate` (multi-currency support)

**List View Requirements:**
- Columns: PO #, Supplier, Status, Total, Order Date, Expected Date, Received %
- Filters: Status, Supplier, Date Range, Receipt Status
- Sorting: PO Number, Order Date, Total, Status
- Pagination: 20 items per page
- Actions: View, Edit (if DRAFT), Approve, Send to Supplier, Receive Goods, View Receipts
- Three-way Matching Indicator
- Permissions: `purchase_orders.read`, `purchase_orders.view_all`

**Create/Update Form Requirements:**
- Header:
  - Supplier* (searchable dropdown)
  - Order Date (date, default: today)
  - Expected Date (date picker)
  - Requested By (text)
  - Currency (dropdown)
  - Exchange Rate (number, auto-fetch)
  
- Terms:
  - Payment Terms (text/dropdown)
  - Delivery Terms (text/dropdown)
  - Shipping Address (textarea)
  - Billing Address (textarea)
  
- Line Items:
  - Item (dropdown from purchaseable items)
  - Item Code (text)
  - Description (text)
  - Quantity* (number)
  - Unit Price* (currency)
  - Discount % (number)
  - Tax Rate (dropdown/manual)
  - UOM (dropdown)
  - Line Total (calculated)
  
- Notes:
  - Supplier Notes (visible on PO)
  - Internal Notes (internal only)
  
- Validation:
  - Supplier: Required, must be active
  - At least one line item
  - Quantities and prices positive
  
- Permissions: `purchase_orders.create`, `purchase_orders.update`

**PO Actions:**
- **Approve PO**:
  - Validates budget/limits
  - Changes status to APPROVED
  - Logs approval
  - Permissions: `purchase_orders.approve`
  
- **Send to Supplier**:
  - Only approved POs
  - Generates PDF
  - Marks as sent
  - Changes status to ORDERED
  - Permissions: `purchase_orders.send`

### Entity: GoodsReceipt
**Model Fields:**
- `id` (string, cuid, required)
- `receiptNumber` (string, unique, auto-generated)
- `purchaseOrderId` (string, required, FK)
- `receiptDate` (datetime, default: now)
- `deliveryNote` (string, optional)
- `receivedBy` (string, required)
- `condition` (string: Good, Damaged, Incomplete)
- `status` (enum: PENDING, COMPLETED, REJECTED)
- `notes` (string, optional)

**Goods Receipt Form:**
- Header:
  - PO Number (display only)
  - Supplier (display only)
  - Receipt Date (date, default: today)
  - Delivery Note # (text)
  - Received By (current user)
  
- Line Items (from PO):
  - Item (display)
  - Ordered Qty (display)
  - Previously Received (display)
  - Receive Qty* (number, max: remaining)
  - Condition (dropdown per item)
  - Notes (text per item)
  
- Overall:
  - Condition (dropdown)
  - Notes (textarea)
  
- Actions:
  - Save as Draft
  - Complete Receipt (posts to inventory)
  - Reject Shipment
  
- Validation:
  - Cannot exceed ordered quantities
  - Must receive at least one item
  
- Permissions: `purchase_orders.receive`

**API Endpoints:**
- GET `/api/purchase-orders` - List POs
- POST `/api/purchase-orders` - Create PO
- GET `/api/purchase-orders/[id]` - Get PO details
- PUT `/api/purchase-orders/[id]` - Update PO
- DELETE `/api/purchase-orders/[id]` - Delete PO
- POST `/api/purchase-orders/[id]/approve` - Approve PO
- POST `/api/purchase-orders/[id]/send` - Send to supplier
- GET `/api/goods-receipts` - List receipts
- POST `/api/goods-receipts` - Create receipt
- GET `/api/goods-receipts/[id]` - Get receipt details

---

## 9. Shipments

### Entity: Shipment
**Model Fields:**
- `id` (string, cuid, required)
- `shipmentNumber` (string, unique, auto-generated)
- `salesOrderId` (string, required, FK)
- `status` (enum: PREPARING, READY, SHIPPED, IN_TRANSIT, DELIVERED, RETURNED, CANCELLED)
- `shipmentDate` (datetime, optional)
- `trackingNumber`, `carrier`, `shippingMethod` (string, optional)
- `shippingCost` (float, default: 0)
- `shipToAddress`, `shipFromAddress` (string)
- `createdBy`, `shippedBy`, `deliveredBy` (user tracking)
- `shippedAt`, `deliveredAt` (timestamps)

**List View Requirements:**
- Columns: Shipment #, Order #, Customer, Status, Ship Date, Carrier, Tracking #
- Filters: Status, Date Range, Carrier, Customer
- Sorting: Shipment Number, Ship Date, Status
- Pagination: 20 items per page
- Actions: View, Edit, Print Labels, Confirm Shipment, Mark Delivered, Track
- Permissions: `shipments.read`, `shipments.view_all`

**Create Shipment Form:**
- Auto-created from approved orders or manual
- Fields:
  - Sales Order* (dropdown of approved orders)
  - Ship Date (date picker)
  - Carrier (dropdown/text)
  - Shipping Method (dropdown)
  - Tracking Number (text)
  - Shipping Cost (currency)
  - Ship To Address (textarea, pre-filled)
  - Ship From Address (textarea, pre-filled)
  
- Line Items (from order):
  - Item (display)
  - Ordered Qty (display)
  - Shipped Previously (display)
  - Ship Qty* (number, max: remaining)
  
- Validation:
  - Cannot exceed ordered quantities
  - Must ship at least one item
  
- Permissions: `shipments.create`

**Shipment Actions:**
- **Confirm Shipment**:
  - Validates all items picked
  - Changes status to SHIPPED
  - Updates inventory
  - Sends notification
  - Permissions: `shipments.confirm`
  
- **Mark Delivered**:
  - Records delivery date
  - Updates order status
  - Triggers invoice creation
  - Permissions: `shipments.deliver`

**API Endpoints:**
- GET `/api/shipments` - List shipments
- POST `/api/shipments` - Create shipment
- GET `/api/shipments/[id]` - Get shipment details
- PUT `/api/shipments/[id]` - Update shipment
- POST `/api/shipments/[id]/confirm` - Confirm shipment
- POST `/api/shipments/[id]/deliver` - Mark delivered
- POST `/api/shipments/[id]/cancel` - Cancel shipment

---

## 10. Invoices & Payments

### Entity: Invoice
**Model Fields:**
- `id` (string, cuid, required)
- `invoiceNumber` (string, unique, auto-generated)
- `salesOrderId` (string, optional, FK)
- `customerId` (string, required, FK)
- `type` (enum: SALES, CREDIT_NOTE, DEBIT_NOTE, PROFORMA)
- `status` (enum: DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, CANCELLED, REFUNDED)
- `invoiceDate`, `dueDate` (datetime, required)
- `subtotal`, `taxAmount`, `discountAmount`, `totalAmount` (float)
- `paidAmount`, `balanceAmount` (float, calculated)
- `paymentTerms`, `billingAddress`, `notes` (string)
- `sentBy`, `sentAt`, `paidAt` (tracking)

**List View Requirements:**
- Columns: Invoice #, Customer, Type, Status, Total, Balance, Due Date, Age
- Filters: Status, Type, Customer, Date Range, Overdue Only
- Sorting: Invoice Number, Due Date, Total, Balance
- Pagination: 20 items per page
- Actions: View, Edit (if DRAFT), Send, Print, Record Payment, Void
- Aging Buckets: Current, 30, 60, 90+ days
- Permissions: `invoices.read`, `invoices.view_all`

**Create Invoice Form:**
- From Order or Manual
- Fields:
  - Customer* (dropdown)
  - Type* (dropdown)
  - Invoice Date* (date, default: today)
  - Due Date* (date, based on payment terms)
  - Payment Terms (text)
  - Billing Address (textarea)
  - Notes (textarea)
  
- Line Items:
  - Similar to sales order
  - Can reference shipment items
  
- Validation:
  - Due date must be >= invoice date
  - Cannot invoice more than shipped
  
- Permissions: `invoices.create`

### Entity: Payment
**Model Fields:**
- `id` (string, cuid, required)
- `paymentNumber` (string, unique, auto-generated)
- `invoiceId` (string, required, FK)
- `customerId` (string, required, FK)
- `amount` (float, required)
- `paymentDate` (datetime, default: now)
- `paymentMethod` (enum: CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, DEBIT_CARD, WIRE_TRANSFER, ONLINE, OTHER)
- `reference` (string, optional - check #, transaction ID)
- `notes` (string, optional)

**Payment Form:**
- Fields:
  - Invoice (display or dropdown)
  - Payment Date* (date, default: today)
  - Amount* (currency, max: balance due)
  - Payment Method* (dropdown)
  - Reference # (text)
  - Notes (textarea)
  
- Shows:
  - Invoice Total
  - Previous Payments
  - Balance Due
  - Payment Allocation
  
- Validation:
  - Amount cannot exceed balance
  - Amount must be positive
  - Date cannot be future
  
- Permissions: `payments.create`

**API Endpoints:**
- GET `/api/invoices` - List invoices
- POST `/api/invoices` - Create invoice
- GET `/api/invoices/[id]` - Get invoice details
- PUT `/api/invoices/[id]` - Update invoice
- POST `/api/invoices/[id]/send` - Send invoice
- POST `/api/invoices/[id]/void` - Void invoice
- GET `/api/payments` - List payments
- POST `/api/payments` - Record payment
- GET `/api/invoices/[id]/payments` - List invoice payments

---

## 11. Accounting

### Entity: Account (Chart of Accounts)
**Model Fields:**
- `id` (string, cuid, required)
- `code` (string, unique, required)
- `name` (string, required)
- `type` (enum: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
- `currency` (string, default: "USD")
- `description` (string, optional)
- `parentId` (string, optional - for hierarchy)
- `balance` (float, default: 0)
- `status` (enum: ACTIVE, INACTIVE, SYSTEM)
- `isSystemAccount` (boolean, default: false)

**Chart of Accounts View:**
- Tree/Hierarchical view
- Columns: Code, Name, Type, Balance, Status
- Filters: Type, Status, Parent Account
- Actions: View, Edit, Add Child, Deactivate
- Cannot delete accounts with transactions
- System accounts cannot be modified
- Permissions: `accounting.manage_accounts`

### Entity: JournalEntry
**Model Fields:**
- `id` (string, cuid, required)
- `entryNumber` (string, unique, auto-generated)
- `date` (datetime, required)
- `description` (string, required)
- `reference` (string, optional)
- `currency` (string, default: "USD")
- `exchangeRate` (float, default: 1.0)
- `status` (enum: DRAFT, POSTED, CANCELLED)
- `createdBy`, `postedBy`, `postedAt` (tracking)

**Journal Entry Form:**
- Header:
  - Date* (date picker)
  - Description* (text)
  - Reference (text)
  - Currency (dropdown)
  
- Lines (minimum 2):
  - Account* (searchable dropdown)
  - Description (text)
  - Debit (currency)
  - Credit (currency)
  - (One of debit/credit required)
  
- Validation:
  - Total debits must equal credits
  - At least 2 lines
  - Cannot post to inactive accounts
  - Date restrictions based on period
  
- Actions:
  - Save as Draft
  - Post (permanent)
  
- Permissions: `accounting.create_journal`, `accounting.post_journal`

**Financial Reports:**
1. **Trial Balance**
   - Account list with debit/credit balances
   - Date selection
   - Balance verification
   - Export to Excel/PDF
   
2. **Income Statement**
   - Revenue and expense summary
   - Period comparison
   - Profit margins
   
3. **Balance Sheet**
   - Assets, Liabilities, Equity
   - As of date
   - Account details drill-down

- Permissions: `accounting.view_reports`

**API Endpoints:**
- GET `/api/accounting/accounts` - List accounts
- POST `/api/accounting/accounts` - Create account
- GET `/api/accounting/accounts/tree` - Hierarchical view
- GET `/api/accounting/journal-entries` - List entries
- POST `/api/accounting/journal-entries` - Create entry
- POST `/api/accounting/journal-entries/[id]/post` - Post entry
- GET `/api/accounting/reports/trial-balance` - Trial balance
- GET `/api/accounting/reports/income-statement` - P&L
- GET `/api/accounting/reports/balance-sheet` - Balance sheet

---

## 12. Reports & Analytics

### Dashboard Requirements

**Sales Dashboard:**
- KPIs:
  - Total Revenue (MTD/YTD)
  - Number of Orders
  - Average Order Value
  - Conversion Rate
  - Sales Pipeline Value
- Charts:
  - Revenue Trend (line)
  - Sales by Product (pie)
  - Top Customers (bar)
  - Sales Team Performance (table)
- Filters: Date Range, Sales Rep, Product Category
- Permissions: `reports.sales`

**Inventory Dashboard:**
- KPIs:
  - Total Stock Value
  - Low Stock Items Count
  - Stock Turnover Rate
  - Dead Stock Value
- Charts:
  - Stock Levels by Category (bar)
  - Movement History (line)
  - Aging Analysis (table)
- Alerts: Low stock, Expiring items
- Permissions: `reports.inventory`

**Financial Dashboard:**
- KPIs:
  - Cash Position
  - AR/AP Balance
  - Profit Margins
  - Cash Flow
- Charts:
  - Income vs Expenses (line)
  - AR Aging (bar)
  - Budget vs Actual (table)
- Period Comparison
- Permissions: `reports.financial`

### Export Requirements
All list views and reports should support:
- Export to CSV
- Export to Excel (with formatting)
- Export to PDF (with headers/footers)
- Scheduled reports via email
- Custom report builder for advanced users
- Permissions: `reports.export`

---

## General UI/UX Requirements

### Navigation
- Sidebar with module grouping
- Quick search (Cmd/Ctrl + K)
- Breadcrumb navigation
- Recently viewed items
- Favorites/bookmarks

### Form Behaviors
- Auto-save drafts
- Validation on blur
- Loading states
- Success/error notifications
- Confirmation dialogs for destructive actions
- Keyboard shortcuts
- Tab navigation

### List View Features
- Column customization
- Save view preferences
- Bulk actions
- Quick filters
- Advanced search
- Infinite scroll or pagination
- Row selection

### Responsive Design
- Mobile-optimized views
- Touch-friendly controls
- Offline capability for critical features
- Progressive web app features

### Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

### Performance
- Lazy loading
- Debounced search
- Optimistic updates
- Caching strategy
- Background sync

---

## Security Requirements

### Authentication
- JWT token-based
- Session timeout (configurable)
- Remember me option
- Multi-factor authentication ready
- Password complexity rules

### Authorization
- Role-based access control (RBAC)
- Permission-based features
- Field-level security
- Record-level security (own vs all)
- API rate limiting

### Audit Trail
- All CRUD operations logged
- User, timestamp, IP address
- Before/after values for updates
- Audit log viewer with filters
- Retention policy

### Data Security
- HTTPS enforced
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens

---

## Integration Points

### Email Integration
- Send quotations
- Send invoices
- Payment reminders
- Order confirmations
- Low stock alerts

### External Systems
- Accounting software sync
- CRM integration
- E-commerce platforms
- Payment gateways
- Shipping carriers

### API Requirements
- RESTful design
- Consistent error responses
- Pagination standards
- Filtering syntax
- Rate limiting headers
- API documentation

---

## Workflow Automations

### Lead to Cash Workflow
1. Lead → Qualified Lead
2. Lead → Customer (conversion)
3. Customer → Sales Case
4. Sales Case → Quotation
5. Quotation → Sales Order
6. Sales Order → Shipment
7. Shipment → Invoice
8. Invoice → Payment

### Purchase to Pay Workflow
1. Purchase Requisition
2. Purchase Order
3. Goods Receipt
4. Three-way Matching
5. Supplier Invoice
6. Payment Processing

### Inventory Workflow
1. Stock Receipt
2. Quality Check
3. Put Away
4. Stock Allocation
5. Picking
6. Packing
7. Shipping

---

## Error Handling

### Validation Errors
- Field-level error messages
- Form-level error summary
- Clear error indicators
- Helpful error messages

### System Errors
- User-friendly error pages
- Error reporting mechanism
- Retry mechanisms
- Fallback options

### Business Rule Violations
- Clear explanation
- Suggested actions
- Contact support option
- Error codes for support

---

This requirements matrix provides a comprehensive guide for frontend development, ensuring all backend capabilities are properly exposed through the user interface with appropriate validations, permissions, and user experience considerations.