# Team Onboarding: TypeScript Error Recovery System

## 🎯 Overview
We've implemented a temporary system to build and deploy with TypeScript errors while systematically fixing them. This guide will help you work effectively within this system.

## 🚀 Quick Start

### 1. First Time Setup
```bash
# Clone and install
git clone <repo>
cd enxi-2
npm install --legacy-peer-deps

# Check current error count
npx tsc --noEmit 2>&1 | grep -c "error TS"
# Current: ~2,324 errors (decreasing daily)
```

### 2. Daily Workflow

#### Morning
1. **Check monitoring dashboard**: http://localhost:3000/system/monitoring
2. **Review your area's errors**: 
   ```bash
   npx tsc --noEmit 2>&1 | grep "components/your-area"
   ```

#### During Development
1. **Before making changes**:
   ```bash
   # See errors in your file
   npx tsc --noEmit path/to/your/file.tsx 2>&1
   ```

2. **After making changes**:
   ```bash
   # Ensure you didn't add new errors
   git add .
   git commit -m "your message"
   # Pre-commit hook will check for new errors
   ```

#### End of Day
1. **Run the build**: `npm run build`
2. **Check monitoring**: Ensure no runtime TypeErrors

## 📋 Current System Status

### What's Working
- ✅ **Build succeeds** (with suppressed errors)
- ✅ **Deployment ready**
- ✅ **Runtime monitoring active**
- ✅ **Error tracking in place**

### What's Temporary
- ⚠️ `ignoreBuildErrors: true` in next.config.ts
- ⚠️ 2,324 TypeScript errors suppressed
- ⚠️ Some `any` types used for quick fixes

## 🛠️ How to Fix Type Errors

### Option 1: Manual Fix (Recommended for small changes)
```typescript
// Before (error)
const response = await apiClient('/api/data')
setData(response.data) // Error: data might be undefined

// After (fixed)
const response = await apiClient<{ data: Item[] }>('/api/data')
setData(response.data || [])
```

### Option 2: Use Safe Fixer Tool
```bash
# For specific patterns
npx tsx scripts/safe-type-fix.ts

# For payment components
npx tsx scripts/fix-payment-components.ts
```

### Option 3: Batch Fix Common Patterns
```bash
# Fix common patterns in a directory
npx tsx scripts/fix-common-type-errors.ts --dir components/your-area
```

## 🚨 Important Rules

### DO ✅
1. **Fix errors in files you're already modifying**
2. **Test functionality after fixing types**
3. **Use proper types instead of `any` when possible**
4. **Check monitoring after deployment**

### DON'T ❌
1. **Don't add new `any` types without good reason**
2. **Don't ignore pre-commit warnings**
3. **Don't fix types without understanding the code**
4. **Don't make behavior changes when fixing types**

## 📊 Priority Guide

### Critical (Fix immediately)
- Payment processing (`components/payments/*`)
- Invoice management (`components/invoices/*`)
- Order workflows (`components/sales-orders/*`)

### High (Fix within sprint)
- API services (`lib/services/*`)
- Form components (`components/forms/*`)
- Data models (`lib/types/*`)

### Low (Fix when touching file)
- UI utilities (`lib/utils/*`)
- Test files (`*.test.ts`)
- Generated files (`.next/types/*`)

## 🔍 Common Patterns & Fixes

### 1. API Response Handling
```typescript
// ❌ Bad
const data = response.data.items

// ✅ Good
const data = response.data?.items || []
```

### 2. setState Type Mismatches
```typescript
// ❌ Bad
setItems(response.data)

// ✅ Good
setItems(Array.isArray(response.data) ? response.data : [])
```

### 3. Optional Chaining
```typescript
// ❌ Bad
const name = user.profile.name

// ✅ Good
const name = user?.profile?.name || 'Unknown'
```

## 📈 Tracking Progress

### View Current Status
- **Monitoring Dashboard**: `/system/monitoring`
- **Type Error Stats**: `/system/type-errors`
- **Raw count**: `npx tsc --noEmit 2>&1 | grep -c "error TS"`

### Track Your Contributions
```bash
# See your fixes in git history
git log --author="your-name" --grep="fix.*type"
```

## 🆘 Getting Help

### Resources
1. **Recovery Plan**: `TYPE_ERROR_RECOVERY_PLAN.md`
2. **System Docs**: `TYPE_ERROR_RECOVERY_SYSTEM.md`
3. **Fix Examples**: `tests/type-fixes/*`

### Common Issues

**Q: Build fails locally**
```bash
# Ensure you have the latest config
git pull
npm install --legacy-peer-deps
npm run build
```

**Q: Too many errors to fix**
```bash
# Focus on your current file only
npx tsc --noEmit src/your-file.tsx 2>&1
```

**Q: Not sure if fix is safe**
```bash
# Run tests for your component
npm test components/your-component
```

## 🎯 Goals & Metrics

### Sprint Goals
- Fix 100 errors per sprint (team total)
- Zero new errors in PRs
- Maintain 0 runtime TypeErrors

### Long-term Goals (1 month)
- Remove `ignoreBuildErrors`
- Achieve full type safety
- 80% test coverage

## 💡 Tips for Success

1. **Fix as you go**: When editing a file, fix its type errors
2. **Small commits**: Fix a few errors per commit for easy review
3. **Test everything**: Ensure fixes don't break functionality
4. **Ask questions**: Unsure about a fix? Ask the team
5. **Document patterns**: Found a common fix? Add it here

## 📝 Checklist for New PRs

- [ ] No new TypeScript errors added
- [ ] Fixed existing errors in modified files
- [ ] Tests pass for changed components
- [ ] No new `any` types without justification
- [ ] Monitoring checked after deployment

---

*Last Updated: 2025-06-14*
*Current Errors: 2,324*
*Target: 0 by end of month*