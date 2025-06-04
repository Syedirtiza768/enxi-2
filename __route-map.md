# Route Map - ENXI ERP System

## Web Page Routes (App Router)

### Public Routes
- `/` - Home page
- `/login` - Login page

### Authenticated Routes (auth group)
- `/dashboard` - Main dashboard
- `/leads` - Lead management
- `/customers` - Customer list
- `/customers/:id` - Customer details
- `/sales-cases` - Sales case list
- `/sales-cases/:id` - Sales case details
- `/accounting` - Accounting overview
- `/accounting/journal-entries` - Journal entries
- `/accounting/reports/trial-balance` - Trial balance report
- `/accounting/reports/balance-sheet` - Balance sheet report
- `/accounting/reports/income-statement` - Income statement
- `/audit` - Audit trail

## API Routes

### Authentication
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Lead Management
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/stats` - Lead statistics
- `GET /api/leads/metrics` - Lead metrics
- `GET /api/leads/:id` - Get lead details
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `POST /api/leads/:id/convert` - Convert lead to customer
- `PATCH /api/leads/:id/status` - Update lead status
- `GET /api/leads/:id/timeline` - Get lead timeline
- `POST /api/leads/bulk-status` - Bulk update lead status

### Customer Management
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/:id/balance` - Get customer balance
- `GET /api/customers/:id/credit-check` - Check customer credit
- `PUT /api/customers/:id/credit-limit` - Update credit limit

### Sales Case Management
- `GET /api/sales-cases` - List sales cases
- `POST /api/sales-cases` - Create sales case
- `GET /api/sales-cases/metrics` - Sales case metrics
- `GET /api/sales-cases/:id` - Get sales case details
- `PUT /api/sales-cases/:id` - Update sales case
- `PUT /api/sales-cases/:id/assign` - Assign sales case
- `PUT /api/sales-cases/:id/close` - Close sales case
- `GET /api/sales-cases/:id/timeline` - Get sales case timeline
- `GET /api/sales-cases/:id/summary` - Get sales case summary
- `GET /api/sales-cases/:id/expenses` - List case expenses
- `POST /api/sales-cases/:id/expenses` - Create case expense

### Expense Management
- `PATCH /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/:id/approve` - Approve expense
- `POST /api/expenses/:id/reject` - Reject expense

### Quotation Management
- `GET /api/quotations` - List quotations
- `POST /api/quotations` - Create quotation
- `GET /api/quotations/:id` - Get quotation details
- `PUT /api/quotations/:id` - Update quotation
- `DELETE /api/quotations/:id` - Delete quotation
- `POST /api/quotations/:id/send` - Send quotation
- `POST /api/quotations/:id/accept` - Accept quotation
- `POST /api/quotations/:id/reject` - Reject quotation
- `POST /api/quotations/:id/cancel` - Cancel quotation
- `POST /api/quotations/:id/convert-to-order` - Convert to sales order
- `GET /api/quotations/:id/pdf` - Generate PDF
- `GET /api/quotations/number/:quotationNumber` - Get by number
- `GET /api/quotations/versions/:salesCaseId` - Get versions

### Customer PO Management
- `GET /api/customer-pos` - List customer POs
- `POST /api/customer-pos` - Create customer PO
- `GET /api/customer-pos/:id` - Get PO details
- `PATCH /api/customer-pos/:id` - Update PO
- `POST /api/customer-pos/:id/accept` - Accept PO
- `POST /api/customer-pos/validate-amount` - Validate PO amount

### Sales Order Management
- `GET /api/sales-orders` - List sales orders
- `POST /api/sales-orders` - Create sales order
- `GET /api/sales-orders/:id` - Get order details
- `PUT /api/sales-orders/:id` - Update order
- `POST /api/sales-orders/:id/approve` - Approve order
- `POST /api/sales-orders/:id/cancel` - Cancel order
- `POST /api/sales-orders/:id/create-invoice` - Create invoice

### Invoice Management
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id` - Update invoice
- `POST /api/invoices/:id/send` - Send invoice
- `POST /api/invoices/:id/payments` - Record payment

### Accounting
- `GET /api/accounting/accounts` - List accounts
- `POST /api/accounting/accounts` - Create account
- `GET /api/accounting/accounts/tree` - Get account tree
- `GET /api/accounting/accounts/standard` - Get standard accounts
- `GET /api/accounting/accounts/:id` - Get account details
- `PUT /api/accounting/accounts/:id` - Update account
- `GET /api/accounting/journal-entries` - List journal entries
- `POST /api/accounting/journal-entries` - Create journal entry
- `GET /api/accounting/journal-entries/:id` - Get journal entry
- `POST /api/accounting/journal-entries/:id/post` - Post journal entry
- `POST /api/accounting/journal-entries/:id/cancel` - Cancel journal entry
- `GET /api/accounting/exchange-rates` - Manage exchange rates
- `GET /api/accounting/reports/trial-balance` - Trial balance report
- `GET /api/accounting/reports/balance-sheet` - Balance sheet report
- `GET /api/accounting/reports/income-statement` - Income statement

### Inventory Management
- `GET /api/inventory/categories` - List categories
- `POST /api/inventory/categories` - Create category
- `GET /api/inventory/categories/tree` - Category tree
- `GET /api/inventory/categories/:id` - Get category
- `PUT /api/inventory/categories/:id` - Update category
- `GET /api/inventory/items` - List items
- `POST /api/inventory/items` - Create item
- `GET /api/inventory/items/:id` - Get item details
- `PUT /api/inventory/items/:id` - Update item
- `GET /api/inventory/units-of-measure` - List units
- `GET /api/inventory/stock-movements` - List movements
- `POST /api/inventory/stock-movements` - Create movement
- `POST /api/inventory/stock-movements/opening` - Opening stock
- `POST /api/inventory/stock-movements/adjust` - Adjust stock
- `GET /api/inventory/stock-lots` - List stock lots
- `GET /api/inventory/low-stock` - Low stock items
- `GET /api/inventory/valuation` - Stock valuation
- `GET /api/inventory/reports/stock-summary` - Stock summary
- `GET /api/inventory/reports/stock-value` - Stock value report
- `GET /api/inventory/reports/expiring-lots` - Expiring lots

### Reporting & Analytics
- `GET /api/reporting/dashboard` - Dashboard metrics
- `GET /api/reporting/dashboard/financial-summary` - Financial summary
- `GET /api/reporting/dashboard/sales-analytics` - Sales analytics
- `GET /api/reporting/dashboard/kpi-metrics` - KPI metrics

### Audit & Monitoring
- `GET /api/audit` - Audit trail logs
- `GET /api/cron/quotation-expiry` - Quotation expiry cron

## Route Count Summary
- Web Page Routes: 16
- API Routes: 97
- Total Routes: 113