# Immediate Action Plan - Enxi ERP Recovery

## 🚨 Day 1: Stop the Bleeding (8 hours)

### Morning (4 hours)
1. **Fix Dependencies** (30 min)
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   npm install --save-dev @testing-library/dom @testing-library/jest-dom ts-morph
   ```

2. **Run Automated Type Fixes** (1 hour)
   ```bash
   npx ts-node scripts/fix-common-type-errors.ts
   ```

3. **Fix Critical Prisma Issues** (2.5 hours)
   - Fix enum mismatches in seed files
   - Update Prisma client imports
   - Regenerate Prisma client
   ```bash
   npx prisma generate
   npx prisma db push --skip-seed
   ```

### Afternoon (4 hours)
4. **Fix Top 10 Most Critical Type Errors**
   Priority files to fix manually:
   - `components/quotations/quotation-form.tsx` (35 errors)
   - `components/supplier-invoices/supplier-invoice-form.tsx` (21 errors)
   - `lib/services/inventory.service.ts` (14 errors)
   - `app/(auth)/inventory/stock-in/page.tsx` (6 errors)
   - `app/(auth)/inventory/stock-out/page.tsx` (5 errors)

5. **Create Emergency Type Definitions**
   ```typescript
   // lib/types/emergency-types.d.ts
   declare module '*' {
     const content: any;
     export default content;
   }
   ```

## 🔧 Day 2-3: Core Stability (16 hours)

### Day 2: Service Layer
1. **Fix All Service Files** (8 hours)
   - Start with base.service.ts
   - Fix return types for all async methods
   - Remove all `any` types
   - Add proper error handling types

### Day 3: API Routes
2. **Fix API Route Types** (8 hours)
   - Add NextRequest/NextResponse types
   - Fix response types
   - Ensure all routes return proper status codes
   - Add error response types

## 🏗️ Day 4-5: Component Recovery (16 hours)

### Day 4: Critical Components
1. **Fix Form Components** (8 hours)
   - QuotationForm
   - SupplierInvoiceForm
   - PaymentForm
   - All other form components

### Day 5: Page Components
2. **Fix Page Components** (8 hours)
   - Start with auth pages
   - Then dashboard
   - Then feature pages

## 🧪 Day 6-7: Testing Recovery (16 hours)

### Day 6: Test Infrastructure
1. **Fix Test Setup** (4 hours)
   - Update jest configuration
   - Fix test database setup
   - Mock external dependencies

2. **Fix Unit Tests** (4 hours)
   - Start with service tests
   - Then component tests
   - Then integration tests

### Day 7: E2E and Verification
3. **Fix E2E Tests** (4 hours)
   - Update Playwright config
   - Fix selectors
   - Test critical user flows

4. **Run Functionality Verification** (4 hours)
   ```bash
   npx ts-node scripts/verify-functionality.ts
   ```

## 📋 Daily Checklist

### Every Morning:
```bash
# Run health check
./scripts/health-check.sh

# Check TypeScript errors
npx tsc --noEmit | grep "error TS" | wc -l

# Check ESLint errors
npm run lint 2>&1 | grep "error" | wc -l
```

### Every Evening:
```bash
# Commit progress
git add -A
git commit -m "fix: resolve type errors in [module]"

# Update progress tracking
echo "$(date): Fixed X TypeScript errors, Y ESLint errors" >> recovery-log.txt
```

## 🎯 Success Metrics

### Week 1 Goals:
- [ ] TypeScript errors < 100
- [ ] ESLint errors < 50
- [ ] At least 1 test suite passing
- [ ] Core services compilable

### Week 2 Goals:
- [ ] TypeScript errors = 0
- [ ] ESLint errors < 10
- [ ] 80% tests passing
- [ ] All critical features working

## 🚀 Quick Wins

1. **Auto-fixable Issues** (2 hours)
   ```bash
   # Fix ESLint issues
   npx eslint . --fix
   
   # Format code
   npx prettier --write "**/*.{ts,tsx}"
   ```

2. **Bulk Type Replacements** (1 hour)
   ```bash
   # Replace common patterns
   find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/: any/: unknown/g'
   find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/Trade Show/TRADE_SHOW/g'
   ```

3. **Add Missing Imports** (1 hour)
   - Add NextRequest/NextResponse imports to all API routes
   - Add Prisma imports where missing

## 💡 Tips for Faster Recovery

1. **Use TypeScript's Quick Fixes**
   - VS Code: Cmd+. on errors
   - Auto-import missing types
   - Auto-add return types

2. **Parallel Work**
   - One person on services
   - One person on components
   - One person on tests

3. **Type Assertion Escape Hatch**
   ```typescript
   // Temporary fix for complex types
   const result = complexOperation() as unknown as ExpectedType
   ```

4. **Progressive Enhancement**
   - First make it compile
   - Then make it type-safe
   - Finally make it elegant

## 🆘 Emergency Contacts

- **TypeScript Issues**: Check TypeScript handbook
- **Prisma Issues**: Check Prisma documentation
- **Next.js Issues**: Check Next.js documentation
- **Testing Issues**: Check Jest/Playwright docs

Remember: The goal is to get a working, type-safe codebase. Perfect is the enemy of good. Fix critical issues first, refinements can come later.