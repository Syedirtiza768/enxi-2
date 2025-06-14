
# Type System Validation Report
Generated: 2025-06-14T02:58:50.343Z

## Summary
- Total type definitions: 898
- Unique type names: 719
- Duplicate types: 23
- Naming issues: 10
- Inconsistencies: 2
- Missing common types: 0

## Duplicate Type Definitions

### SelectOption
- **scripts/final-type-cleanup.ts:237** (interface)
  `interface SelectOption {`
- **lib/types/ui.types.ts:13** (interface, exported)
  `export interface SelectOption {`

### UserResponse
- **scripts/final-type-cleanup.ts:262** (type)
  `type UserResponse = { ... }`
- **scripts/final-type-cleanup.ts:266** (interface)
  `interface UserResponse { ... }`
- **lib/validators/auth.validator.ts:30** (type, exported)
  `export type UserResponse = z.infer<typeof userResponseSchema>`

### ShipmentStatus
- **tests/unit/shipment.service.test.ts:5** (enum)
  `enum ShipmentStatus {`
- **app/api/shipments/route.ts:6** (type)
  `type ShipmentStatus = {`

### OrderStatus
- **tests/unit/shipment.service.test.ts:15** (enum)
  `enum OrderStatus {`
- **lib/types/common.types.ts:206** (type, exported)
  `export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'`

### InventoryItem
- **modules/inventory/index.ts:5** (interface, exported)
  `export interface InventoryItem {`
- **components/quotations/line-item-editor-v2.tsx:61** (interface)
  `interface InventoryItem {`

### StockMovement
- **modules/inventory/index.ts:31** (interface, exported)
  `export interface StockMovement {`
- **app/(auth)/inventory/movements/page.tsx:32** (interface)
  `interface StockMovement {`

### JournalEntry
- **modules/accounting/index.ts:25** (interface, exported)
  `export interface JournalEntry {`
- **app/(auth)/accounting/journal-entries/page.tsx:22** (interface)
  `interface JournalEntry {`

### JournalLine
- **modules/accounting/index.ts:38** (interface, exported)
  `export interface JournalLine {`
- **app/(auth)/accounting/journal-entries/page.tsx:14** (interface)
  `interface JournalLine {`

### TaxRate
- **modules/accounting/index.ts:57** (interface, exported)
  `export interface TaxRate {`
- **components/quotations/quotation-form-enhanced.tsx:46** (interface)
  `interface TaxRate {`

### ErrorReport
- **lib/utils/global-error-handler.ts:25** (interface, exported)
  `export interface ErrorReport {`
- **app/(auth)/system/health/page.tsx:51** (interface)
  `interface ErrorReport {`

### DateRange
- **lib/types/common.types.ts:92** (interface, exported)
  `export interface DateRange {`
- **components/calendar/date-range-picker.tsx:15** (interface)
  `interface DateRange {`

### Permission
- **lib/types/common.types.ts:297** (interface, exported)
  `export interface Permission {`
- **app/(auth)/users/[id]/page.tsx:44** (interface)
  `interface Permission {`

### SortDirection
- **lib/types/common.types.ts:361** (type, exported)
  `export type SortDirection = 'asc' | 'desc'`
- **components/accessibility/AccessibleTable.tsx:3** (type, exported)
  `export type SortDirection = BaseSortDirection | 'none'`

### Account
- **lib/types/accounting.types.ts:10** (interface, exported)
  `export interface Account {`
- **components/supplier-invoices/supplier-invoice-form.tsx:56** (interface)
  `interface Account {`

### SalesCaseSummary
- **lib/services/sales-case.service.ts:82** (interface, exported)
  `export interface SalesCaseSummary {`
- **components/sales-cases/sales-case-detail-tabs.tsx:51** (interface)
  `interface SalesCaseSummary {`

### TimelineEvent
- **lib/services/lead.service.ts:6** (interface, exported)
  `export interface TimelineEvent {`
- **components/sales-orders/order-timeline.tsx:9** (interface)
  `interface TimelineEvent {`

### ExportJob
- **lib/services/export.service.ts:42** (interface, exported)
  `export interface ExportJob {`
- **components/export/export-dialog.tsx:35** (interface)
  `interface ExportJob {`

### CompanySettings
- **lib/services/company-settings.service.ts:5** (interface, exported)
  `export interface CompanySettings {`
- **components/design-system/organisms/AppLayoutOptimized.tsx:90** (interface)
  `interface CompanySettings {`

### TextareaProps
- **components/ui/textarea.tsx:5** (type, exported)
  `export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>`
- **components/design-system/atoms/Textarea.tsx:7** (interface, exported)
  `export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {`

### ButtonProps
- **components/ui/button.tsx:36** (interface, exported)
  `export interface ButtonProps`
- **components/design-system/atoms/Button.tsx:7** (interface, exported)
  `export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {`

### BadgeProps
- **components/ui/badge.tsx:26** (interface, exported)
  `export interface BadgeProps`
- **components/design-system/atoms/Badge.tsx:6** (interface, exported)
  `export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {`

### Item
- **components/inventory/stock-transfer-form.tsx:13** (interface)
  `interface Item {`
- **components/inventory/item-list.tsx:14** (interface, exported)
  `export interface Item {`

### Category
- **components/inventory/item-selector-modal.tsx:38** (interface)
  `interface Category {`
- **components/inventory/category-tree.tsx:6** (interface, exported)
  `export interface Category {`

## Naming Convention Issues

- **scripts/final-type-cleanup.ts**: 'UserResponse' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/validators/auth.validator.ts**: 'UserResponse' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/validators/lead.validator.ts**: 'CreateLeadInput' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/validators/lead.validator.ts**: 'UpdateLeadInput' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/validators/lead.validator.ts**: 'LeadListQueryInput' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/validators/auth.validator.ts**: 'LoginInput' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/validators/auth.validator.ts**: 'CreateUserInput' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/validators/auth.validator.ts**: 'TokenResponse' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/types/common.types.ts**: 'ApiResponse' should be an interface, not a type
  Suggestion: Convert to interface

- **lib/services/reporting/inventory-analytics.service.ts**: Interface 'ABC_Analysis' should use PascalCase
  Suggestion: ABC_Analysis

## Type System Inconsistencies

### Duplicate SelectOption interfaces
Multiple SelectOption interfaces found with potentially different structures

Files affected:
- scripts/final-type-cleanup.ts
- lib/types/ui.types.ts

### Inconsistent API Response patterns
Multiple different response interface patterns found

Files affected:
- scripts/final-type-cleanup.ts
- scripts/final-type-cleanup.ts
- scripts/final-type-cleanup.ts
- scripts/final-type-cleanup.ts
- lib/validators/auth.validator.ts
- lib/utils/global-error-handler.ts
- lib/types/lead.types.ts
- lib/types/lead.types.ts
- lib/types/index.ts
- lib/types/index.ts
- lib/types/common.types.ts
- lib/types/common.types.ts
- lib/types/common.types.ts
- lib/types/api.types.ts
- components/users/user-list.tsx
- components/shipments/shipment-list.tsx

## Recommendations

1. Consolidate duplicate interfaces by creating a shared types file for common interfaces
2. Standardize API response patterns by using a common base interface
3. Update type names to follow consistent PascalCase convention
4. Consolidate SelectOption interfaces into a single shared definition in lib/types/ui.types.ts
5. Consider creating a central index.ts file for all type exports

## Type Distribution

Top 10 files by type definition count:

- **lib/types/common.types.ts**: 50 types
- **lib/types/index.ts**: 21 types
- **lib/accessibility/aria-utils.ts**: 20 types
- **lib/types/accounting.types.ts**: 16 types
- **modules/reporting/index.ts**: 13 types
- **lib/validators/audit.validator.ts**: 13 types
- **scripts/final-type-cleanup.ts**: 11 types
- **components/accessibility/LiveRegion.tsx**: 11 types
- **lib/validators/sales-case.validator.ts**: 10 types
- **components/export/excel-exporter.tsx**: 10 types
