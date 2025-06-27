# API Error Patterns Report

## Summary

Based on my search across the codebase, I've identified several recurring patterns similar to the issues we fixed in the leads API:

## 1. Incorrect Enum Imports (132 files affected)

Many files are importing enums from `@/lib/generated/prisma` instead of `@prisma/client`. This causes issues with `z.nativeEnum()` validation.

### Affected Files (Sample):
- `/app/api/goods-receipts/[id]/route.ts` - Line 5: `import { ReceiptStatus } from '@/lib/types/shared-enums'`
- `/app/api/invoices/route.ts` - Line 3: `import { InvoiceType, InvoiceStatus } from '@/lib/generated/prisma'`
- `/app/api/sales-orders/[id]/create-invoice/route.ts` - Line 3: `import { InvoiceType } from '@/lib/generated/prisma'`

### Fix Pattern:
```typescript
// ❌ INCORRECT
import { InvoiceStatus, InvoiceType } from '@/lib/generated/prisma'
import { ReceiptStatus } from '@/lib/types/shared-enums'

// ✅ CORRECT
import { InvoiceStatus, InvoiceType, ReceiptStatus } from '@prisma/client'
```

## 2. z.nativeEnum Usage with Wrong Imports (9 files affected)

Files using `z.nativeEnum()` with enums imported from the wrong location:

### Affected Files:
- `/app/api/goods-receipts/[id]/route.ts` - Line 68: `z.nativeEnum(ReceiptStatus)`
- `/app/api/invoices/route.ts` - Lines 12, 40, 41: `z.nativeEnum(InvoiceType)`, `z.nativeEnum(InvoiceStatus)`
- `/app/api/sales-orders/[id]/create-invoice/route.ts` - Line 7: `z.nativeEnum(InvoiceType)`
- `/app/api/leads/[id]/status/route.ts`
- `/app/api/leads/bulk-status/route.ts`
- `/app/api/users/[id]/route.ts`

**Note**: Files in `/app/api/audit/` are correctly using local enums from `/lib/validators/audit.validator.ts`

## 3. Hardcoded 'system' User IDs (21 files affected)

Many API routes have hardcoded `userId: 'system'` instead of getting the actual user from the request:

### Affected Files:
- `/app/api/goods-receipts/[id]/route.ts` - Lines 14, 58, 196
- `/app/api/invoices/route.ts` - Lines 32, 88
- `/app/api/payments/[id]/route.ts`
- `/app/api/cron/quotation-expiry/route.ts`
- `/lib/services/inventory/inventory.service.ts`
- `/lib/cron/quotation-expiry.ts`

### Fix Pattern:
```typescript
// ❌ INCORRECT
const session = { user: { id: 'system' } }

// ✅ CORRECT
const user = await getUserFromRequest(request)
```

## 4. Potential TypeScript Return Type Issues

All API route handlers appear to have proper return type annotations (`Promise<NextResponse>`), but some might be missing return statements in error paths.

## 5. Common Import Patterns to Fix

### Wrong Import Locations:
- `@/lib/generated/prisma` → `@prisma/client`
- `@/lib/types/shared-enums` → `@prisma/client`

## Recommendations

1. **Global Search & Replace**: Run a codebase-wide search and replace for incorrect import paths
2. **Update All z.nativeEnum Usage**: Ensure all enums used with `z.nativeEnum()` are imported from `@prisma/client`
3. **Fix Authentication**: Replace all hardcoded 'system' user IDs with proper authentication
4. **Add ESLint Rules**: Consider adding ESLint rules to prevent these patterns:
   - No imports from `@/lib/generated/prisma`
   - No hardcoded 'system' user IDs in API routes
   - Require return type annotations for API handlers

## Priority Files to Fix

Based on usage patterns, prioritize fixing:
1. `/app/api/invoices/route.ts` - Core financial functionality
2. `/app/api/goods-receipts/[id]/route.ts` - Inventory management
3. `/app/api/sales-orders/[id]/create-invoice/route.ts` - Sales workflow
4. `/app/api/payments/[id]/route.ts` - Payment processing

These files handle critical business operations and should be fixed first to prevent runtime errors.