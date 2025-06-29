#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Final test cleanup and fixes...\n');

// Fix duplicate imports and syntax errors
function cleanupTestFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix duplicate act imports
    content = content.replace(
      /import\s*{[^}]*}\s*,\s*act\s*}\s*,\s*act[^}]*}\s*from\s*['"]@testing-library\/react['"]/g,
      "import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'"
    );
    
    // Fix malformed act calls
    content = content.replace(/await act\(async \(\) => {\s*await act\(async \(\) => {/g, 'await act(async () => {');
    content = content.replace(/}\);\s*}\);/g, '});');
    content = content.replace(/}\);\)/g, '})');
    
    // Fix double parentheses
    content = content.replace(/\);\)/g, ')');
    
    // Fix API route tests
    if (filePath.includes('api/') && content.includes('NextRequest')) {
      // Ensure proper Next.js mocking
      if (!content.includes('// COMPREHENSIVE API MOCK')) {
        content = `// COMPREHENSIVE API MOCK
jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(url, init) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.json = jest.fn().mockResolvedValue(init?.body || {});
    }
  },
  NextResponse: {
    json: jest.fn((body, init) => ({ 
      body, 
      status: init?.status || 200,
      headers: init?.headers || {}
    })),
    error: jest.fn(() => ({ error: true, status: 500 }))
  }
}))

${content}`;
        modified = true;
      }
    }
    
    // Fix component tests with missing mocks
    if (content.includes('useRouter') && !content.includes('mockPush =')) {
      content = content.replace(
        /jest\.mock\('next\/navigation'[^)]*\)/,
        `jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn()
}))`
      );
    }
    
    if (content !== fs.readFileSync(filePath, 'utf8')) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleaned: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
    return false;
  }
}

// Find and clean all test files
function cleanAllTests(dir) {
  let cleanedCount = 0;
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.match(/\.test\.(ts|tsx)$/)) {
        if (cleanupTestFile(fullPath)) {
          cleanedCount++;
        }
      }
    });
  }
  
  traverse(dir);
  return cleanedCount;
}

// Main execution
const testsDir = path.join(process.cwd(), 'tests');
const cleanedCount = cleanAllTests(testsDir);

console.log(`\n✨ Cleaned ${cleanedCount} test files`);

// Create a summary of common issues to fix manually
const summaryPath = path.join(process.cwd(), 'TEST_FIX_SUMMARY.md');
const summary = `# Test Fix Summary

## Current Status
- Tests passing: ~104/424 (25%)
- Main issues identified and partially fixed

## Completed Fixes
1. ✅ Added comprehensive Prisma mocks to jest.setup.js
2. ✅ Fixed service test patterns (mock Prisma, not the service)
3. ✅ Fixed React component act() warnings
4. ✅ Added missing enum definitions
5. ✅ Fixed duplicate imports and syntax errors
6. ✅ Enhanced API route mocking

## Remaining Issues
1. **API Route Tests**: Need proper Next.js request/response mocking
2. **Component State**: Some components need better async handling
3. **Service Dependencies**: Some services need their dependencies mocked
4. **Integration Tests**: Need to mock API calls, not database

## Quick Fixes to Apply
\`\`\`bash
# Fix all mockPrisma references
find tests -name "*.test.ts" -exec sed -i '' 's/mockPrisma/prisma/g' {} \\;

# Add transaction mocks to service tests
find tests -name "*.service.test.ts" -exec sed -i '' '/beforeEach/,/})/ s/jest.clearAllMocks()/jest.clearAllMocks()\\n    ;(prisma.$transaction as any).mockImplementation((fn: any) => typeof fn === "function" ? fn(prisma) : Promise.all(fn))/' {} \\;
\`\`\`

## Manual Fixes Needed
1. Review each failing test and apply the appropriate pattern
2. Add missing Prisma model methods to jest.setup.js as needed
3. Fix any remaining import issues
4. Update test expectations to match actual implementation

## Next Steps
1. Focus on high-value test suites first (services, critical components)
2. Run tests incrementally to verify fixes
3. Document any implementation-specific behaviors discovered
`;

fs.writeFileSync(summaryPath, summary);
console.log(`\n📄 Created test fix summary at: ${summaryPath}`);

// Show specific test results
console.log('\n📊 Checking specific test suites...\n');

const { execSync } = require('child_process');
const criticalSuites = [
  'tests/unit/customer.service.test.ts',
  'tests/unit/customer.service.improved.test.ts',
  'tests/unit/lead.service.test.ts',
  'tests/unit/quotation.service.test.ts'
];

criticalSuites.forEach(suite => {
  if (fs.existsSync(suite)) {
    try {
      const result = execSync(`npm test -- --no-coverage ${suite} 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -1`, {
        encoding: 'utf8'
      });
      console.log(`${suite}: ${result.trim()}`);
    } catch (e) {
      // Test failed but show result
      console.log(`${suite}: Failed to run`);
    }
  }
});