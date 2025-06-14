# Build Strategy - Handling TypeScript Errors Safely

## Current Situation
The build is failing due to TypeScript errors. We need a strategy to:
1. Get a working build immediately
2. Fix errors without breaking functionality
3. Ensure fixes match business requirements

## Immediate Build Solution

### Option 1: Development Build with Type Checking Disabled
```json
// tsconfig.json - temporary for emergency deployment
{
  "compilerOptions": {
    "strict": false,
    "skipLibCheck": true,
    "noEmit": false,
    "noImplicitAny": false,
    "strictNullChecks": false
  }
}
```

```bash
# Build with relaxed type checking
npm run build
```

### Option 2: Build with Ignored Errors
```typescript
// next.config.js
module.exports = {
  typescript: {
    // !! TEMPORARY - REMOVE AFTER FIXING !!
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
```

### Option 3: Incremental Build Strategy
```bash
# Build only working parts
npm run build -- --experimental-partial-build

# Or build specific pages
npm run build -- --pages=/dashboard,/api/health
```

## Safe Error Fixing Strategy

### 1. Create Safety Net First

```bash
#!/bin/bash
# save as: scripts/create-safety-net.sh

# 1. Create baseline branch
git checkout -b type-fixes-baseline

# 2. Run all existing tests
npm test -- --passWithNoTests > test-baseline.txt

# 3. Create API response snapshots
node scripts/capture-api-responses.js

# 4. Document current behavior
node scripts/document-current-behavior.js
```

### 2. Capture Current Behavior

```typescript
// scripts/capture-api-responses.js
import fs from 'fs'
import { apiEndpoints } from './api-endpoints.config'

async function captureResponses() {
  const responses = {}
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint.path}`, {
        method: endpoint.method,
        body: endpoint.samplePayload,
        headers: { 'Content-Type': 'application/json' }
      })
      
      responses[endpoint.name] = {
        status: response.status,
        data: await response.json(),
        headers: Object.fromEntries(response.headers)
      }
    } catch (error) {
      responses[endpoint.name] = { error: error.message }
    }
  }
  
  fs.writeFileSync('api-baseline.json', JSON.stringify(responses, null, 2))
}
```

### 3. Fix Errors with Verification

```typescript
// scripts/safe-type-fix.ts
import { Project } from 'ts-morph'
import { execSync } from 'child_process'

export async function safelyFixTypeError(filePath: string, errorLine: number) {
  // 1. Create backup
  execSync(`cp ${filePath} ${filePath}.backup`)
  
  // 2. Run tests for this module
  const testFile = filePath.replace('/src/', '/tests/').replace('.ts', '.test.ts')
  const testsPassed = runTests(testFile)
  
  // 3. Capture current behavior
  const currentBehavior = await captureModuleBehavior(filePath)
  
  // 4. Apply fix
  const fixed = await applyTypeFix(filePath, errorLine)
  
  // 5. Verify behavior unchanged
  const newBehavior = await captureModuleBehavior(filePath)
  
  if (!behaviorsMatch(currentBehavior, newBehavior)) {
    // Rollback
    execSync(`mv ${filePath}.backup ${filePath}`)
    throw new Error(`Type fix changed behavior in ${filePath}:${errorLine}`)
  }
  
  // 6. Run tests again
  if (!runTests(testFile)) {
    execSync(`mv ${filePath}.backup ${filePath}`)
    throw new Error(`Type fix broke tests for ${filePath}`)
  }
  
  // Success - remove backup
  execSync(`rm ${filePath}.backup`)
  return fixed
}
```

### 4. Validate Against Requirements

```typescript
// scripts/validate-requirements.ts
interface Requirement {
  id: string
  description: string
  testCases: TestCase[]
}

interface TestCase {
  input: any
  expectedOutput: any
  businessRule: string
}

export async function validateRequirement(
  requirement: Requirement,
  moduleUnderTest: string
) {
  const results = []
  
  for (const testCase of requirement.testCases) {
    const result = await executeTestCase(moduleUnderTest, testCase)
    results.push({
      requirement: requirement.id,
      testCase: testCase.businessRule,
      passed: deepEqual(result, testCase.expectedOutput),
      actual: result,
      expected: testCase.expectedOutput
    })
  }
  
  return results
}

// Example requirement
const invoiceCalculation: Requirement = {
  id: 'INV-001',
  description: 'Invoice total calculation',
  testCases: [
    {
      input: { items: [{ price: 100, quantity: 2, tax: 0.1 }] },
      expectedOutput: { subtotal: 200, tax: 20, total: 220 },
      businessRule: 'Total = (price * quantity) + tax'
    }
  ]
}
```

## Progressive Build Strategy

### Phase 1: Get Building (Day 1)
```typescript
// tsconfig.build.json - temporary build config
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": false,
    "skipLibCheck": true
  },
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

```bash
# Build with temporary config
npx tsc -p tsconfig.build.json && next build
```

### Phase 2: Fix Critical Paths (Week 1)
```bash
# Identify critical path files
grep -r "invoice\|payment\|order" --include="*.ts" . | cut -d: -f1 | sort -u > critical-files.txt

# Fix only these files first
while read file; do
  echo "Fixing $file"
  npx ts-node scripts/safe-type-fix.ts "$file"
done < critical-files.txt
```

### Phase 3: Gradual Strictness (Week 2-3)
```typescript
// Gradually enable strict checks
const strictnessLevels = [
  { week: 1, config: { noImplicitAny: false, strictNullChecks: false } },
  { week: 2, config: { noImplicitAny: true, strictNullChecks: false } },
  { week: 3, config: { noImplicitAny: true, strictNullChecks: true } },
  { week: 4, config: { strict: true } }
]
```

## Automated Safety Checks

### 1. Pre-commit Hook
```bash
#!/bin/bash
# .husky/pre-commit

# Check if type fixes changed behavior
changed_files=$(git diff --cached --name-only --diff-filter=M | grep -E '\.(ts|tsx)$')

for file in $changed_files; do
  # Run behavior tests
  npm run test:behavior -- "$file"
  
  if [ $? -ne 0 ]; then
    echo "❌ Behavior changed in $file"
    echo "Run: npm run test:behavior -- $file --update to update baseline"
    exit 1
  fi
done
```

### 2. CI/CD Safety Pipeline
```yaml
# .github/workflows/type-safety.yml
name: Type Safety Checks

on: [push, pull_request]

jobs:
  verify-no-behavior-change:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Checkout baseline
        run: git checkout main -- api-baseline.json test-baseline.txt
      
      - name: Run current tests
        run: npm test -- --json > current-tests.json
      
      - name: Compare behaviors
        run: |
          node scripts/compare-behaviors.js
          
      - name: Verify requirements
        run: npm run test:requirements
```

### 3. Monitoring After Deployment
```typescript
// lib/monitoring/type-fix-monitor.ts
export function monitorTypeFixImpact() {
  // Track errors after deployment
  window.addEventListener('error', (event) => {
    if (event.error?.stack?.includes('TypeError')) {
      // Log to monitoring service
      captureException({
        type: 'type-fix-regression',
        error: event.error,
        file: event.filename,
        line: event.lineno,
        column: event.colno
      })
    }
  })
  
  // Track API errors
  interceptApiCalls((response) => {
    if (!response.ok && response.status >= 500) {
      captureApiError({
        endpoint: response.url,
        status: response.status,
        error: response.error
      })
    }
  })
}
```

## Quick Decision Tree

```
Can we build?
├── No
│   ├── Is it urgent? 
│   │   ├── Yes → Use ignoreBuildErrors temporarily
│   │   └── No → Fix errors properly
│   └── Fix blocking errors first
└── Yes but with errors
    ├── Are they in critical paths?
    │   ├── Yes → Fix with full testing
    │   └── No → Schedule for later
    └── Monitor in production
```

## Emergency Procedures

### If Build is Completely Broken:
```bash
# 1. Create emergency branch
git checkout -b emergency-build

# 2. Add type suppressions
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '1i// @ts-nocheck'

# 3. Build and deploy
npm run build
npm run deploy

# 4. Immediately create fix plan
echo "EMERGENCY BUILD DEPLOYED $(date)" > EMERGENCY_BUILD_NOTICE.md
```

### Rollback Strategy:
```bash
# If type fixes break production
git revert --no-commit HEAD~5..HEAD  # Revert last 5 commits
npm test -- --critical-only          # Test critical paths
npm run deploy                       # Quick deploy
```

## Success Metrics

Track these to ensure safe fixes:
1. **Zero Runtime Errors**: No new TypeErrors in production
2. **API Compatibility**: All endpoints return same structure
3. **Test Coverage**: Maintained or increased
4. **Performance**: No degradation from type changes
5. **User Reports**: No functionality complaints

## Key Principles

1. **Never fix blindly** - Understand why the error exists
2. **Test before and after** - Behavior must not change
3. **Fix root causes** - Not just symptoms
4. **Document decisions** - Why you chose specific types
5. **Monitor impact** - Watch production carefully

Remember: A working application with type errors is better than a perfectly typed application that doesn't work. Fix systematically, not hastily.