# Database Seeding Guide

This project uses Prisma for ORM. The `prisma/seed-complete.ts` script creates a fully populated demo database for local development and testing.

## Seeding Order

1. **Permissions** – basic permission records and role assignments.
2. **Users** – admin, sales, accountant and warehouse accounts.
3. **Chart of Accounts** – minimal GL accounts.
4. **Categories and Units** – required for item creation.
5. **Items** – single demo product.
6. **Locations and Inventory** – warehouse, stock lot and opening movement.
7. **Customers and Leads** – one customer and one lead.
8. **Sales Cases and Quotations** – opportunity tracking with audit logs.
9. **Customer POs and Sales Orders** – customer purchase order converted to a sales order.
10. **Shipments and Inventory Movements** – stock is relieved with history entries.
11. **Invoices and Payments** – billing for the sales order.
12. **Case Expenses** – travel and other costs recorded against the sales case.
13. **Profitability Calculation** – sales case updated with revenue and margin.
14. **Suppliers** – vendor master data.
15. **Purchase Orders, Goods Receipts and Supplier Invoices/Payments** – simple procurement flow.

Every entity that references another uses IDs from records created in previous steps to avoid orphaned rows. The script also clears all tables in dependency order before inserting new data.

## Running the Seed

```bash
npm run tsx prisma/seed-complete.ts
```

This populates all tables with coherent sample data so the application can be explored without manual setup.
