# Type Error Recovery Plan

## Current State
- Total suppressed errors: 2365
- Build enabled on: 2025-06-14T21:01:12.086Z

## Priority Order

### 🔴 Critical (Fix within 1 week)
- [ ] .next/types/app/api/sales-orders/[id]/approve/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/sales-orders/[id]/approve/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] app/(auth)/invoices/[id]/page.tsx:86 - TS2345: Argument of type 'any[] | { data: any[]; } | undefined' is not assignable to parameter of type 'SetStateAction<Invoice | null>'.
- [ ] app/(auth)/invoices/[id]/page.tsx:113 - TS2345: Argument of type 'any[] | { data: any[]; } | undefined' is not assignable to parameter of type 'SetStateAction<Invoice | null>'.
- [ ] app/(auth)/invoices/[id]/page.tsx:130 - TS2345: Argument of type 'any[] | { data: any[]; } | undefined' is not assignable to parameter of type 'SetStateAction<Invoice | null>'.
- [ ] app/(auth)/invoices/new/page.tsx:25 - TS2339: Property 'id' does not exist on type 'any[]'.
- [ ] app/(auth)/invoices/new/page.tsx:25 - TS2339: Property 'id' does not exist on type '{ data: any[]; }'.
- [ ] app/(auth)/invoices/page.tsx:42 - TS2339: Property 'format' does not exist on type 'unknown'.
- [ ] app/(auth)/invoices/page.tsx:102 - TS2339: Property 'total' does not exist on type '{ data: any[]; }'.
- [ ] app/(auth)/invoices/page.tsx:102 - TS2339: Property 'length' does not exist on type 'any[] | { data: any[]; }'.
- [ ] app/(auth)/invoices/page.tsx:103 - TS2339: Property 'total' does not exist on type '{ data: any[]; }'.

### 🟡 High (Fix within 2 weeks)
- [ ] .next/types/app/api/permissions/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/permissions/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/roles/[role]/permissions/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/roles/[role]/permissions/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/roles/permissions/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/roles/permissions/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/sales-team/assign-customer/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/sales-team/assign-customer/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/sales-team/assign-manager/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/sales-team/assign-manager/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/sales-team/performance/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/sales-team/performance/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/sales-team/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/sales-team/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/shipments/[id]/deliver/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/shipments/[id]/deliver/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/users/[id]/password/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/users/[id]/password/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.
- [ ] .next/types/app/api/users/[id]/permissions/[code]/route.ts:30 - TS2344: Type 'typeof import("/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/api/users/[id]/permissions/[code]/route")' does not satisfy the constraint '{ GET?: Function | undefined; HEAD?: Function | undefined; OPTIONS?: Function | undefined; POST?: Function | undefined; PUT?: Function | undefined; ... 10 more ...; maxDuration?: number | undefined; }'.

## Daily Tasks
1. Fix 10-20 errors per developer
2. Test each fix thoroughly
3. Update suppressed-errors.json
4. Never break working functionality

## Success Criteria
- [ ] All critical errors fixed
- [ ] No runtime TypeErrors in production
- [ ] All tests passing
- [ ] Remove ignoreBuildErrors from next.config.js
