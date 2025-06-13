# Currency Formatting Issues Found and Fixed

## Summary
After searching through the codebase, I found several issues with the currency formatting implementation where hardcoded `$` symbols were being prepended to the `formatCurrency` function output, which would result in double currency symbols (e.g., "$$ 100.00" or "$AED 100.00").

## Files Fixed

### 1. `/components/three-way-matching/three-way-matching-detail.tsx` ✅
- Lines: 276, 399, 407, 496, 497, 552, 569, 570
- Fixed: `${formatCurrency(...)}` → `{formatCurrency(...)}`

### 2. `/components/three-way-matching/three-way-matching-dashboard.tsx` ✅
- Line: 486
- Fixed: `${formatCurrency(exception.variance)}` → `{formatCurrency(exception.variance)}`

### 3. `/components/purchase-orders/purchase-order-form.tsx` ✅
- Lines: 416, 483, 555, 563, 567
- Fixed: `${formatCurrency(...)}` → `{formatCurrency(...)}`

### 4. `/app/(auth)/supplier-payments/page.tsx` ✅
- Lines: 401, 421
- Fixed: `${formatCurrency(...)}` → `{formatCurrency(...)}`

### 5. `/components/supplier-payments/supplier-payment-form.tsx` ✅
- Line: 560
- Fixed: `${formatCurrency(...)} USD` → `{formatCurrency(...)} USD`

### 6. `/components/customer-pos/customer-po-form.tsx`
- Line: 81 - Left as-is (within a string template for display in a warning message)

## Additional Issues Found

### Hardcoded Currency Defaults
Many files still have hardcoded `'USD'` as the default currency instead of using the company's default currency from the context:

1. API Routes:
   - `/app/api/accounting/journal-entries/route.ts`
   - `/app/api/accounting/accounts/standard/route.ts`
   - `/app/api/accounting/accounts/route.ts`
   - `/app/api/accounting/reports/trial-balance/route.ts`
   - `/app/api/accounting/reports/income-statement/route.ts`
   - `/app/api/accounting/reports/balance-sheet/route.ts`
   - `/app/api/supplier-invoices/route.ts`

2. Pages:
   - Various accounting pages have `useState('USD')` instead of using the default from context
   - `/app/(auth)/payments/page.tsx`
   - `/app/(auth)/leads/page.tsx`
   - `/app/(auth)/sales-team/page.tsx`

## Correct Implementation
The currency context and utils are properly set up:
- Currency context provides `formatCurrency` function that uses the default currency
- The function already includes the currency symbol based on the currency code
- The context loads the default currency from company settings (defaults to USD if not set)

## Files Using Currency Correctly
- `/components/quotations/quotation-form.tsx`
- `/components/inventory/item-list.tsx`
- `/app/(auth)/sales-orders/page.tsx`
- Most other components that use `useCurrency` hook

## Recommendations
1. ✅ Fixed: Remove hardcoded `$` symbols from formatCurrency calls
2. TODO: Replace hardcoded `'USD'` defaults with the company's default currency from context
3. TODO: Ensure API routes access company settings to get the default currency