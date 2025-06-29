#!/usr/bin/env tsx
/**
 * Script to fix all test issues systematically
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Common test file patterns to fix
const TEST_PATTERNS = {
  // Fix service instantiation issues
  SERVICE_MOCK: {
    pattern: /jest\.mock\(['"]@\/lib\/services\/([^'"]+)['"]\)/g,
    replacement: (match: string, servicePath: string) => {
      const serviceName = servicePath.split('/').pop()?.replace('.service', '');
      const className = serviceName ? 
        serviceName.charAt(0).toUpperCase() + serviceName.slice(1) + 'Service' : 
        'Service';
      
      return `jest.mock('@/lib/services/${servicePath}', () => ({
  ${className}: jest.fn().mockImplementation(() => ({
    // Add mock methods as needed
  }))
}))`;
    }
  },
  
  // Fix Prisma direct usage in tests
  PRISMA_DIRECT: {
    pattern: /await prisma\.([\w]+)\.(create|update|delete|findMany|findUnique|findFirst)\(/g,
    replacement: 'await mockPrismaClient.$1.$2('
  },
  
  // Fix missing act() warnings
  SET_STATE_NO_ACT: {
    pattern: /(fireEvent\.\w+\([^)]+\))/g,
    replacement: 'await act(async () => { $1; await new Promise(r => setTimeout(r, 0)); })'
  },
  
  // Fix component async updates
  WAIT_FOR_ELEMENT: {
    pattern: /expect\(.*?\)\.toBeInTheDocument\(\)/g,
    replacement: (match: string) => `await waitFor(() => ${match})`
  }
};

// Fix a single file
function fixTestFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Skip if not a test file
    if (!filePath.endsWith('.test.ts') && !filePath.endsWith('.test.tsx')) {
      return false;
    }
    
    // Apply fixes
    for (const [fixName, fix] of Object.entries(TEST_PATTERNS)) {
      const originalContent = content;
      if (typeof fix.replacement === 'string') {
        content = content.replace(fix.pattern, fix.replacement);
      } else {
        content = content.replace(fix.pattern, fix.replacement as any);
      }
      
      if (content !== originalContent) {
        console.log(`✅ Applied ${fixName} fix to ${filePath}`);
        modified = true;
      }
    }
    
    // Add necessary imports if missing
    if (modified) {
      // Add act import if needed
      if (content.includes('act(') && !content.includes("import { act }")) {
        content = `import { act } from '@testing-library/react';\n${content}`;
      }
      
      // Add waitFor import if needed
      if (content.includes('waitFor(') && !content.includes("import { waitFor }")) {
        content = content.replace(
          /from '@testing-library\/react'/,
          ", waitFor } from '@testing-library/react'"
        );
      }
      
      writeFileSync(filePath, content);
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Recursively fix all test files
function fixTestsInDirectory(dir: string): number {
  let fixedCount = 0;
  
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      fixedCount += fixTestsInDirectory(fullPath);
    } else if (stat.isFile()) {
      if (fixTestFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

// Main execution
async function main() {
  console.log('🔧 Starting test fix process...\n');
  
  const testsDir = join(process.cwd(), 'tests');
  const fixedCount = fixTestsInDirectory(testsDir);
  
  console.log(`\n✅ Fixed ${fixedCount} test files`);
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes made');
  console.log('2. Run: npm test');
  console.log('3. Fix any remaining issues manually');
}

main().catch(console.error);