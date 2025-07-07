# Prisma Schema Dependency Analysis

## Foreign Key Relationships and Deletion Order

### 1. Independent Models (No Foreign Keys)
These models can be deleted first as they don't reference other models:
- **Sequence** - Simple sequence counter
- **ExchangeRate** - Currency exchange rates
- **Permission** - System permissions

### 2. Primary Reference Models (Referenced by Many Others)
These models are referenced by many others and should be deleted last:
- **User** - Referenced by 13+ models
- **Account** - Referenced by 15+ models  
- **Category** - Referenced by Item
- **UnitOfMeasure** - Referenced by Item and many line items
- **TaxCategory** - Referenced by TaxRate
- **CompanySettings** - References Account (4 relations)

### 3. Core Business Models
#### **Customer** Dependencies:
- References: Lead, User (assignedTo), Account
- Referenced by: CustomerPO, Invoice, Payment, SalesCase

#### **Lead** Dependencies:
- References: User (creator)
- Referenced by: Customer

#### **SalesCase** Dependencies:
- References: Customer
- Referenced by: CaseExpense, CustomerPO, Quotation, SalesOrder

#### **Item** Dependencies:
- References: Category, UnitOfMeasure, Account (3 relations)
- Referenced by: 15+ models (all line items, stock operations)

#### **Supplier** Dependencies:
- References: Account
- Referenced by: PurchaseOrder, StockLot, SupplierInvoice, SupplierPayment

#### **Location** Dependencies:
- References: Account
- Referenced by: InventoryBalance, LocationStockLot, PhysicalCount, StockMovement, StockTransfer

### 4. Document Models (Quotations, Orders, Invoices)
#### **Quotation** Dependencies:
- References: SalesCase
- Referenced by: CustomerPO, QuotationItem, SalesOrder

#### **SalesOrder** Dependencies:
- References: Quotation, SalesCase
- Referenced by: CustomerPO, Invoice, SalesOrderItem, Shipment, StockReservation

#### **PurchaseOrder** Dependencies:
- References: Supplier
- Referenced by: GoodsReceipt, PurchaseOrderItem, SupplierInvoice

#### **Invoice** Dependencies:
- References: Customer, SalesOrder
- Referenced by: InvoiceItem, Payment

### 5. Line Item Models
These reference parent documents and items:
- **QuotationItem** - References: Quotation, Item, TaxRate, UnitOfMeasure
- **SalesOrderItem** - References: SalesOrder, Item, TaxRate, UnitOfMeasure
- **PurchaseOrderItem** - References: PurchaseOrder, Item, TaxRate, UnitOfMeasure
- **InvoiceItem** - References: Invoice, Item, TaxRate, UnitOfMeasure

### 6. Stock and Inventory Models
#### **StockLot** Dependencies:
- References: Item, Supplier
- Referenced by: LocationStockLot, PhysicalCountItem, StockMovement, StockTransferItem

#### **StockMovement** Dependencies:
- References: Item, StockLot, UnitOfMeasure, Location, JournalEntry, GoodsReceipt

#### **InventoryBalance** Dependencies:
- References: Location, Item

### 7. Template Models
#### **QuotationTemplate** Dependencies:
- No foreign keys (independent)
- Referenced by: QuotationTemplateItem

#### **SalesOrderTemplate** Dependencies:
- No foreign keys (independent)
- Referenced by: SalesOrderTemplateItem

### 8. Accounting Models
#### **JournalEntry** Dependencies:
- No foreign keys (independent)
- Referenced by: CaseExpense, JournalLine, StockMovement, SupplierInvoice, SupplierPayment

#### **JournalLine** Dependencies:
- References: JournalEntry, Account

### 9. Tax Models
#### **TaxRate** Dependencies:
- References: TaxCategory, Account (2 relations)
- Referenced by: All line item models, TaxExemption

#### **TaxExemption** Dependencies:
- References: TaxRate

### 10. User and Permission Models
#### **UserProfile** Dependencies:
- References: User

#### **UserSession** Dependencies:
- References: User

#### **UserPermission** Dependencies:
- References: User, Permission

#### **RolePermission** Dependencies:
- References: Permission

#### **SalesTeamMember** Dependencies:
- References: User

### 11. Audit and Logging
#### **AuditLog** Dependencies:
- References: User

## Complete Deletion Order (Safe to Delete)

### Phase 1: Leaf Nodes (No Dependencies)
1. **AuditLog**
2. **UserSession**
3. **UserProfile**
4. **UserPermission**
5. **RolePermission**
6. **SalesTeamMember**
7. **TaxExemption**
8. **Payment**
9. **InvoiceItem**
10. **ShipmentItem**
11. **SalesOrderItem**
12. **StockReservation**
13. **QuotationItem**
14. **QuotationTemplateItem**
15. **SalesOrderTemplateItem**
16. **GoodsReceiptItem**
17. **PurchaseOrderItem**
18. **SupplierPayment**
19. **CaseExpense**
20. **JournalLine**
21. **StockMovement**
22. **PhysicalCountItem**
23. **StockTransferItem**
24. **LocationStockLot**
25. **InventoryBalance**

### Phase 2: Document Level
26. **Shipment**
27. **Invoice**
28. **SalesOrder**
29. **Quotation**
30. **CustomerPO**
31. **GoodsReceipt**
32. **PurchaseOrder**
33. **SupplierInvoice**
34. **StockTransfer**
35. **PhysicalCount**
36. **JournalEntry**

### Phase 3: Master Data with Dependencies
37. **StockLot**
38. **SalesCase**
39. **Customer**
40. **Lead**
41. **Supplier**
42. **Location**
43. **Item**
44. **TaxRate**
45. **TaxCategory**

### Phase 4: Templates and Settings
46. **QuotationTemplate**
47. **SalesOrderTemplate**
48. **CompanySettings**

### Phase 5: Core Reference Data
49. **Account** (hierarchical - delete children first)
50. **Category** (hierarchical - delete children first)
51. **UnitOfMeasure** (hierarchical - delete children first)
52. **User** (hierarchical - delete children first)

### Phase 6: Independent Models
53. **Permission**
54. **ExchangeRate**
55. **Sequence**

## Critical Hierarchical Relationships

### Account Hierarchy
- **Account** has self-referencing parentId
- Must delete child accounts before parent accounts

### Category Hierarchy
- **Category** has self-referencing parentId
- Must delete child categories before parent categories

### UnitOfMeasure Hierarchy
- **UnitOfMeasure** has self-referencing baseUnitId
- Must delete derived units before base units

### User Hierarchy
- **User** has self-referencing managerId
- Must delete subordinate users before manager users

## Key Constraints to Consider

1. **Cascade Deletions**: Many relationships use `onDelete: Cascade`
   - JournalLine → JournalEntry
   - Line items → Parent documents
   - Template items → Templates

2. **Unique Constraints**: Several models have unique fields that might prevent deletion if referenced elsewhere

3. **Circular Dependencies**: Watch for potential circular references in:
   - User management hierarchy
   - Account chart of accounts
   - Category hierarchies

## Recommended Deletion Strategy

1. **Start with leaf nodes** (Phase 1) - these have no dependents
2. **Move to documents** (Phase 2) - business transaction records
3. **Clean up master data** (Phase 3) - core business entities
4. **Remove templates/settings** (Phase 4) - configuration data
5. **Delete reference data** (Phase 5) - fundamental system entities
6. **Finally remove independent models** (Phase 6)

This order ensures that foreign key constraints are not violated during deletion operations.