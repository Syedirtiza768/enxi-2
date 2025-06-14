# Systematic Codebase Recovery Plan - Enxi ERP

## Overview
This plan provides a structured approach to restore stability, type safety, and functionality across the entire codebase.

## Phase 1: Foundation Stabilization (Week 1)

### 1.1 Fix Build Infrastructure
```bash
# Step 1: Clean install with proper dependency resolution
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Step 2: Install missing test dependencies
npm install --save-dev @testing-library/dom @testing-library/jest-dom

# Step 3: Verify Prisma schema
npx prisma generate
npx prisma db push --accept-data-loss # Only in development
```

### 1.2 Create Type System Foundation
```typescript
// lib/types/base.types.ts
export type ApiResponse<T> = {
  data: T
  error?: string
  status: number
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// Establish strict type rules
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]
```

### 1.3 Fix Critical Type Errors First
Priority order:
1. **Prisma Model Alignment**
   - Update all seed files to use correct enum values
   - Fix Prisma client type imports
   - Ensure all relations are properly typed

2. **API Response Types**
   - Create consistent response types for all endpoints
   - Remove all `any` types from API routes
   - Implement proper error typing

## Phase 2: Systematic Type Migration (Week 2-3)

### 2.1 Create Migration Scripts

```typescript
// scripts/fix-type-errors.ts
import { Project } from 'ts-morph'

const project = new Project({
  tsConfigFilePath: './tsconfig.json'
})

// Auto-fix common patterns
async function fixCommonTypeErrors() {
  const sourceFiles = project.getSourceFiles()
  
  for (const file of sourceFiles) {
    // Replace any types with unknown
    file.getDescendantsOfKind(SyntaxKind.AnyKeyword).forEach(node => {
      node.replaceWithText('unknown')
    })
    
    // Add missing return types
    file.getFunctions().forEach(func => {
      if (!func.getReturnType()) {
        func.setReturnType('void')
      }
    })
  }
  
  await project.save()
}
```

### 2.2 Module-by-Module Fix Strategy

#### Order of Attack:
1. **Core Services** (lib/services/)
   - Fix base.service.ts first
   - Then fix each service in dependency order
   - Add proper return types to all methods

2. **API Routes** (app/api/)
   - Start with simplest endpoints (health, auth)
   - Move to CRUD operations
   - Finally complex business logic endpoints

3. **Components** (components/)
   - Fix design system atoms first
   - Then molecules and organisms
   - Finally page-level components

4. **Pages** (app/(auth)/)
   - Fix in order of business criticality
   - Start with authentication pages
   - Then core business flows

### 2.3 Type Safety Checklist per Module
- [ ] No `any` types
- [ ] All functions have return types
- [ ] All component props are typed
- [ ] All API calls use typed responses
- [ ] All database queries use Prisma types
- [ ] Error handling is properly typed

## Phase 3: Test Recovery (Week 3-4)

### 3.1 Test Infrastructure Fix
```json
// jest.config.js updates
{
  "testEnvironment": "node",
  "testPathIgnorePatterns": ["/node_modules/", "/.next/"],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  },
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"]
}
```

### 3.2 Test Recovery Strategy
1. **Unit Tests**
   - Fix test setup and mocking
   - Update tests for new types
   - Achieve 80% coverage minimum

2. **Integration Tests**
   - Fix database connection issues
   - Use test database properly
   - Mock external services

3. **E2E Tests**
   - Update Playwright configuration
   - Fix selector issues
   - Test critical user flows

## Phase 4: Functionality Verification (Week 4-5)

### 4.1 Create Functionality Matrix
```typescript
// scripts/functionality-check.ts
interface FunctionalityTest {
  module: string
  feature: string
  testType: 'unit' | 'integration' | 'e2e' | 'manual'
  status: 'passing' | 'failing' | 'not-tested'
  criticalPath: boolean
}

const functionalityMatrix: FunctionalityTest[] = [
  // Authentication
  { module: 'auth', feature: 'login', testType: 'e2e', status: 'not-tested', criticalPath: true },
  { module: 'auth', feature: 'logout', testType: 'e2e', status: 'not-tested', criticalPath: true },
  
  // Inventory
  { module: 'inventory', feature: 'create-item', testType: 'integration', status: 'not-tested', criticalPath: true },
  { module: 'inventory', feature: 'stock-movement', testType: 'integration', status: 'not-tested', criticalPath: true },
  
  // Sales
  { module: 'sales', feature: 'create-quotation', testType: 'integration', status: 'not-tested', criticalPath: true },
  { module: 'sales', feature: 'convert-to-order', testType: 'integration', status: 'not-tested', criticalPath: true },
  
  // ... add all features
]
```

### 4.2 Manual Testing Protocol
For each critical path feature:
1. Document expected behavior
2. Test happy path
3. Test error scenarios
4. Test edge cases
5. Record results in matrix

## Phase 5: Prevention & Monitoring (Ongoing)

### 5.1 Pre-commit Hooks
```json
// .husky/pre-commit
#!/bin/sh
npm run type-check
npm run lint
npm run test:unit
```

### 5.2 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run type-check
      
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run lint
      
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
```

### 5.3 Type Safety Rules
```typescript
// tsconfig.json - Strict mode
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Implementation Schedule

### Week 1: Foundation
- Day 1-2: Fix build and dependencies
- Day 3-4: Create base types and fix Prisma issues
- Day 5: Fix critical compilation errors

### Week 2-3: Type Migration
- Week 2: Services and API routes
- Week 3: Components and pages

### Week 4: Testing
- Day 1-2: Fix test infrastructure
- Day 3-4: Unit and integration tests
- Day 5: E2E tests

### Week 5: Verification
- Day 1-3: Functionality matrix testing
- Day 4-5: Documentation and training

## Success Metrics
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors (warnings acceptable)
- [ ] 90%+ test coverage
- [ ] All critical path features tested
- [ ] CI/CD pipeline green
- [ ] No runtime type errors in production

## Tooling & Scripts

### Daily Health Check Script
```bash
#!/bin/bash
# scripts/health-check.sh

echo "🏥 Codebase Health Check"
echo "========================"

echo "📦 Dependencies..."
npm audit

echo "🔍 TypeScript Check..."
npx tsc --noEmit | tail -n 1

echo "🧹 ESLint Check..."
npm run lint 2>&1 | tail -n 1

echo "🧪 Test Summary..."
npm test -- --passWithNoTests 2>&1 | grep -E "(Test Suites:|Tests:)"

echo "📊 TODO/FIXME Count..."
grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" . | wc -l
```

## Risk Mitigation

### Potential Blockers:
1. **Complex type dependencies**
   - Solution: Use temporary `unknown` types, then refine
   
2. **Breaking changes in APIs**
   - Solution: Version APIs, maintain backwards compatibility
   
3. **Third-party library types**
   - Solution: Create custom type definitions if needed

### Rollback Strategy:
- Tag current state before major changes
- Implement changes in feature branches
- Test thoroughly before merging
- Keep old code commented for reference during transition

## Communication Plan
- Daily standup on progress
- Weekly type safety metrics report
- Blocker escalation process
- Team training on TypeScript best practices

This systematic approach ensures we restore stability while maintaining business continuity.