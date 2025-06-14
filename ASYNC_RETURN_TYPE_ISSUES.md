# Async Function Return Type Issues Report

Generated on: 2025-06-14T02:23:14.252Z

Total issues found: 156

## Summary by File Type

- .ts: 155 issues
- .tsx: 1 issues

## Issues by Category

### Async function without explicit return type (28 occurrences)

#### scripts/test-frontend-quick.ts
- Line 69: `login` - Add ": Promise<T>" return type

#### scripts/test-frontend-comprehensive.ts
- Line 75: `createTestUser` - Add ": Promise<T>" return type
- Line 98: `login` - Add ": Promise<T>" return type
- Line 531: `cleanupTestData` - Add ": Promise<T>" return type

#### scripts/test-complete-system.ts
- Line 44: `testServerHealth` - Add ": Promise<T>" return type
- Line 62: `testAuthentication` - Add ": Promise<T>" return type
- Line 100: `testBackendAPIs` - Add ": Promise<T>" return type
- Line 146: `testFrontendUI` - Add ": Promise<T>" return type
- Line 194: `testCompleteWorkflow` - Add ": Promise<T>" return type
- Line 227: `testDataIntegrity` - Add ": Promise<T>" return type

#### tests/helpers/setup.ts
- Line 8: `beforeAll` - Add ": Promise<T>" return type
- Line 17: `afterAll` - Add ": Promise<T>" return type
- Line 23: `beforeEach` - Add ": Promise<T>" return type
- Line 46: `createTestCustomer` - Add ": Promise<T>" return type
- Line 54: `createTestLead` - Add ": Promise<T>" return type

#### lib/services/export.service.ts
- Line 68: `ensureTempDir` - Add ": Promise<T>" return type

#### e2e/utils/test-helpers.ts
- Line 180: `generateTestData` - Add ": Promise<T>" return type

#### e2e/utils/database-helpers.ts
- Line 23: `cleanup` - Add ": Promise<T>" return type
- Line 331: `findTestEntities` - Add ": Promise<T>" return type
- Line 347: `closeConnection` - Add ": Promise<T>" return type

#### lib/services/reporting/sales-analytics.service.ts
- Line 704: `getSeasonalTrends` - Add ": Promise<T>" return type

#### lib/services/reporting/inventory-analytics.service.ts
- Line 624: `getInventoryAgeAnalysis` - Add ": Promise<T>" return type
- Line 692: `getCriticalStockItems` - Add ": Promise<T>" return type
- Line 714: `getOutOfStockItems` - Add ": Promise<T>" return type
- Line 732: `getExpiringItems` - Add ": Promise<T>" return type

#### lib/services/reporting/financial-dashboard.service.ts
- Line 315: `getOrderMetrics` - Add ": Promise<T>" return type
- Line 338: `getInvoiceMetrics` - Add ": Promise<T>" return type
- Line 368: `getInventoryMetrics` - Add ": Promise<T>" return type

### Async function returning value without Promise<T> type (12 occurrences)

#### prisma/seed-uae-diesel.ts
- Line 1291: `createCompanySettings` - Add explicit Promise<T> return type

#### lib/utils/global-error-handler.ts
- Line 462: `return` - Add explicit Promise<T> return type

#### lib/services/shipment.service.ts
- Line 363: `withLogging` - Add explicit Promise<T> return type
- Line 444: `withLogging` - Add explicit Promise<T> return type

#### lib/services/sales-order.service.ts
- Line 88: `withLogging` - Add explicit Promise<T> return type
- Line 149: `map` - Add explicit Promise<T> return type
- Line 359: `map` - Add explicit Promise<T> return type

#### lib/services/invoice.service.ts
- Line 87: `withLogging` - Add explicit Promise<T> return type
- Line 132: `map` - Add explicit Promise<T> return type
- Line 334: `map` - Add explicit Promise<T> return type

#### lib/middleware/error-middleware.ts
- Line 25: `async` - Add explicit Promise<T> return type
- Line 43: `async` - Add explicit Promise<T> return type

### Async arrow function without explicit return type (2 occurrences)

#### lib/utils/performance.ts
- Line 87: `fetch` - Add ": Promise<T>" return type

#### components/error/error-boundary.tsx
- Line 103: `copyErrorDetails` - Add ": Promise<T>" return type

### Service method without Promise<T> return type (95 occurrences)

#### lib/services/user.service.ts
- Line 54: `createUser` - Add explicit Promise<T> return type
- Line 91: `updateUser` - Add explicit Promise<T> return type
- Line 150: `getUser` - Add explicit Promise<T> return type
- Line 173: `listUsers` - Add explicit Promise<T> return type
- Line 218: `deactivateUser` - Add explicit Promise<T> return type
- Line 245: `login` - Add explicit Promise<T> return type
- Line 318: `logout` - Add explicit Promise<T> return type
- Line 340: `validateSession` - Add explicit Promise<T> return type
- Line 426: `assignPermission` - Add explicit Promise<T> return type
- Line 458: `revokePermission` - Add explicit Promise<T> return type
- Line 490: `getUserSessions` - Add explicit Promise<T> return type
- Line 502: `revokeSession` - Add explicit Promise<T> return type
- Line 519: `revokeAllSessions` - Add explicit Promise<T> return type
- Line 540: `resetPassword` - Add explicit Promise<T> return type
- Line 564: `changePassword` - Add explicit Promise<T> return type
- Line 598: `getUserActivity` - Add explicit Promise<T> return type
- Line 685: `getIndividualPermissions` - Add explicit Promise<T> return type
- Line 700: `removeUserPermission` - Add explicit Promise<T> return type
- Line 744: `assignRolePermission` - Add explicit Promise<T> return type
- Line 788: `revokeRolePermission` - Add explicit Promise<T> return type

#### lib/services/shipment.service.ts
- Line 53: `createShipmentFromOrder` - Add explicit Promise<T> return type
- Line 137: `confirmShipment` - Add explicit Promise<T> return type
- Line 238: `deliverShipment` - Add explicit Promise<T> return type
- Line 272: `cancelShipment` - Add explicit Promise<T> return type
- Line 362: `getShipmentsByOrder` - Add explicit Promise<T> return type
- Line 520: `createPartialShipment` - Add explicit Promise<T> return type
- Line 540: `updateOrderStatusAfterShipment` - Add explicit Promise<T> return type
- Line 559: `updateOrderStatusAfterDelivery` - Add explicit Promise<T> return type

#### lib/services/sales-workflow.service.ts
- Line 258: `allocateStockForOrder` - Add explicit Promise<T> return type
- Line 307: `createShipmentForOrder` - Add explicit Promise<T> return type
- Line 334: `createInvoiceFromShipment` - Add explicit Promise<T> return type
- Line 351: `createDeliveryGLEntries` - Add explicit Promise<T> return type
- Line 363: `updateCustomerBalance` - Add explicit Promise<T> return type

#### lib/services/sales-team.service.ts
- Line 13: `assignSalesManager` - Add explicit Promise<T> return type
- Line 127: `getTeamHierarchy` - Add explicit Promise<T> return type
- Line 311: `getTeamPerformance` - Add explicit Promise<T> return type

#### lib/services/sales-order.service.ts
- Line 550: `calculateTotals` - Add explicit Promise<T> return type
- Line 567: `calculateItemTotals` - Add explicit Promise<T> return type

#### lib/services/quotation.service.ts
- Line 728: `calculateItemTotals` - Add explicit Promise<T> return type
- Line 764: `calculateTotals` - Add explicit Promise<T> return type

#### lib/services/invoice.service.ts
- Line 558: `calculateTotals` - Add explicit Promise<T> return type
- Line 575: `calculateItemTotals` - Add explicit Promise<T> return type

#### lib/services/export.service.ts
- Line 68: `ensureTempDir` - Add explicit Promise<T> return type

#### lib/services/customer.service.ts
- Line 213: `getCustomer` - Add explicit Promise<T> return type

#### lib/services/audit.service.ts
- Line 22: `logAction` - Add explicit Promise<T> return type
- Line 69: `logBulkActions` - Add explicit Promise<T> return type
- Line 181: `getEntityHistory` - Add explicit Promise<T> return type
- Line 203: `getUserActivity` - Add explicit Promise<T> return type
- Line 227: `getAuditStats` - Add explicit Promise<T> return type
- Line 254: `exportAuditLogs` - Add explicit Promise<T> return type
- Line 274: `getComplianceReport` - Add explicit Promise<T> return type
- Line 305: `getSecurityEvents` - Add explicit Promise<T> return type
- Line 387: `archiveOldLogs` - Add explicit Promise<T> return type

#### lib/services/reporting/sales-analytics.service.ts
- Line 332: `getRevenueData` - Add explicit Promise<T> return type
- Line 346: `getOrdersData` - Add explicit Promise<T> return type
- Line 360: `getCustomersData` - Add explicit Promise<T> return type
- Line 417: `getDailySalesData` - Add explicit Promise<T> return type
- Line 437: `getMonthlySalesData` - Add explicit Promise<T> return type
- Line 485: `getQuarterlySalesData` - Add explicit Promise<T> return type
- Line 550: `getTopCustomers` - Add explicit Promise<T> return type
- Line 592: `getCustomerSegmentation` - Add explicit Promise<T> return type
- Line 614: `getCustomerRetention` - Add explicit Promise<T> return type
- Line 662: `getGeographicDistribution` - Add explicit Promise<T> return type
- Line 668: `getTopSellingProducts` - Add explicit Promise<T> return type
- Line 674: `getCategoryPerformance` - Add explicit Promise<T> return type
- Line 680: `getProductTrends` - Add explicit Promise<T> return type
- Line 686: `getSlowMovingProducts` - Add explicit Promise<T> return type
- Line 704: `getSeasonalTrends` - Add explicit Promise<T> return type
- Line 773: `getLeadToQuotationConversion` - Add explicit Promise<T> return type
- Line 795: `getQuotationToOrderConversion` - Add explicit Promise<T> return type
- Line 818: `getOrderToInvoiceConversion` - Add explicit Promise<T> return type
- Line 841: `getInvoiceToPaidConversion` - Add explicit Promise<T> return type

#### lib/services/reporting/inventory-analytics.service.ts
- Line 464: `getDailyMovements` - Add explicit Promise<T> return type
- Line 521: `getMovementsByType` - Add explicit Promise<T> return type
- Line 539: `getTopMovingItems` - Add explicit Promise<T> return type
- Line 568: `getLocationMovements` - Add explicit Promise<T> return type
- Line 624: `getInventoryAgeAnalysis` - Add explicit Promise<T> return type
- Line 692: `getCriticalStockItems` - Add explicit Promise<T> return type
- Line 714: `getOutOfStockItems` - Add explicit Promise<T> return type
- Line 732: `getExpiringItems` - Add explicit Promise<T> return type

#### lib/services/reporting/financial-dashboard.service.ts
- Line 262: `getRevenueMetrics` - Add explicit Promise<T> return type
- Line 315: `getOrderMetrics` - Add explicit Promise<T> return type
- Line 338: `getInvoiceMetrics` - Add explicit Promise<T> return type
- Line 368: `getInventoryMetrics` - Add explicit Promise<T> return type
- Line 412: `getCashFlowMetrics` - Add explicit Promise<T> return type
- Line 423: `getDailySales` - Add explicit Promise<T> return type
- Line 453: `getTopCustomers` - Add explicit Promise<T> return type
- Line 481: `getProductPerformance` - Add explicit Promise<T> return type
- Line 487: `getSalesByRegion` - Add explicit Promise<T> return type

#### lib/services/purchase/supplier-payment.service.ts
- Line 49: `createSupplierPayment` - Add explicit Promise<T> return type
- Line 200: `updateSupplierPayment` - Add explicit Promise<T> return type
- Line 236: `getSupplierPayment` - Add explicit Promise<T> return type
- Line 257: `getAllSupplierPayments` - Add explicit Promise<T> return type
- Line 310: `getPaymentsBySupplier` - Add explicit Promise<T> return type
- Line 327: `getPaymentsByInvoice` - Add explicit Promise<T> return type

### API route handler without Promise<NextResponse> return type (19 occurrences)

#### app/api/quotations/[id]/route.ts
- Line 6: `GET` - Add ": Promise<NextResponse>" return type
- Line 38: `PUT` - Add ": Promise<NextResponse>" return type

#### app/api/leads/[id]/route.ts
- Line 6: `GET` - Add ": Promise<NextResponse>" return type
- Line 42: `PUT` - Add ": Promise<NextResponse>" return type
- Line 84: `DELETE` - Add ": Promise<NextResponse>" return type

#### app/api/customers/[id]/route.ts
- Line 6: `GET` - Add ": Promise<NextResponse>" return type
- Line 37: `PUT` - Add ": Promise<NextResponse>" return type
- Line 82: `PATCH` - Add ": Promise<NextResponse>" return type
- Line 127: `DELETE` - Add ": Promise<NextResponse>" return type

#### app/api/customer-pos/[id]/route.ts
- Line 14: `GET` - Add ": Promise<NextResponse>" return type
- Line 39: `PATCH` - Add ": Promise<NextResponse>" return type

#### app/api/quotations/versions/[salesCaseId]/route.ts
- Line 6: `GET` - Add ": Promise<NextResponse>" return type

#### app/api/quotations/number/[quotationNumber]/route.ts
- Line 6: `GET` - Add ": Promise<NextResponse>" return type

#### app/api/quotations/[id]/send/route.ts
- Line 6: `POST` - Add ": Promise<NextResponse>" return type

#### app/api/quotations/[id]/reject/route.ts
- Line 6: `POST` - Add ": Promise<NextResponse>" return type

#### app/api/quotations/[id]/cancel/route.ts
- Line 6: `POST` - Add ": Promise<NextResponse>" return type

#### app/api/quotations/[id]/accept/route.ts
- Line 6: `POST` - Add ": Promise<NextResponse>" return type

#### app/api/customer-pos/[id]/accept/route.ts
- Line 11: `POST` - Add ": Promise<NextResponse>" return type

#### app/api/pdf/generate/[type]/[id]/route.ts
- Line 114: `POST` - Add ": Promise<NextResponse>" return type

## High Priority Fixes

These are the most critical issues that should be fixed first:

1. **lib/utils/performance.ts** (Line 87)
   - Function: `fetch`
   - Issue: Async arrow function without explicit return type
   - Fix: Add ": Promise<T>" return type

1. **lib/utils/global-error-handler.ts** (Line 462)
   - Function: `return`
   - Issue: Async function returning value without Promise<T> type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 54)
   - Function: `createUser`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 91)
   - Function: `updateUser`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 150)
   - Function: `getUser`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 173)
   - Function: `listUsers`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 218)
   - Function: `deactivateUser`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 245)
   - Function: `login`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 318)
   - Function: `logout`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 340)
   - Function: `validateSession`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 426)
   - Function: `assignPermission`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 458)
   - Function: `revokePermission`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 490)
   - Function: `getUserSessions`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 502)
   - Function: `revokeSession`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 519)
   - Function: `revokeAllSessions`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 540)
   - Function: `resetPassword`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 564)
   - Function: `changePassword`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 598)
   - Function: `getUserActivity`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 685)
   - Function: `getIndividualPermissions`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

1. **lib/services/user.service.ts** (Line 700)
   - Function: `removeUserPermission`
   - Issue: Service method without Promise<T> return type
   - Fix: Add explicit Promise<T> return type

