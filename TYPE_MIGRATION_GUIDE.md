
# Type System Migration Guide

This guide explains the changes made to consolidate the type system and eliminate duplicates.

## Key Changes

### 1. Consolidated SelectOption Interface
- **Location**: `lib/types/ui.types.ts`
- **Migration**: Replace all local `SelectOption` interfaces with import from `@/lib/types/ui.types`

### 2. Standardized API Response Types
- **Primary Location**: `lib/types/common.types.ts`
- **New Standard**: `StandardApiResponse<T>` in `lib/types/index.ts`
- **Migration**: Gradually migrate to `StandardApiResponse` for new code

### 3. Central Type Index
- **Location**: `lib/types/index.ts`
- **Purpose**: Single source of truth for all type exports
- **Usage**: Import common types from `@/lib/types` instead of individual files

### 4. Eliminated Duplicates

The following interfaces were consolidated:

#### UI Components
- `SelectOption` → `@/lib/types/ui.types`
- `FormErrors` → `@/lib/types/common.types`
- `TableColumn` → `@/lib/types/common.types`

#### Accounting
- `TrialBalance` → `@/lib/types/accounting.types`
- `BalanceSheet` → `@/lib/types/accounting.types`
- `IncomeStatement` → `@/lib/types/accounting.types`
- `AccountBalance` → `@/lib/types/accounting.types`

#### Inventory
- `StockMovement` → `@/lib/types` (from Prisma)
- `InventoryItem` → `@/lib/types` (from Prisma)

#### General
- `ApiResponse` → `@/lib/types/common.types`
- `TimelineEvent` → `@/lib/types/common.types`
- `ValidationResult` → `@/lib/types/common.types`

## Best Practices Going Forward

1. **Always check `lib/types/index.ts` first** before creating new interfaces
2. **Import from central locations**: Use `@/lib/types` for common types
3. **Avoid local duplicates**: Import existing types instead of redefining
4. **Use TypeScript's utility types** like `Partial<T>`, `Pick<T, K>`, etc.
5. **Follow naming conventions**: PascalCase for interfaces and types

## Import Examples

```typescript
// ✅ Good - Central import
import type { SelectOption, FormErrors, ApiResponse } from '@/lib/types'

// ✅ Good - Specific import
import type { TrialBalance } from '@/lib/types/accounting.types'

// ❌ Bad - Local duplicate
interface SelectOption {
  value: string
  label: string
}

// ❌ Bad - Multiple imports for same concepts
import { ApiResponse } from './api.types'
import { ApiResponse as CommonApiResponse } from './common.types'
```

## Validation

Run the type validation script to check for new duplicates:

```bash
npx tsx scripts/validate-type-system.ts
```
