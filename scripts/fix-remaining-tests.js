#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Systematically fixing remaining test files...\n');

// Patterns to fix across all test files
const fixes = [
  // Fix Prisma mock references
  {
    pattern: /mockPrisma\.([\w]+)\.([\w]+)\.mock/g,
    replacement: '(prisma.$1 as any).$2.mock'
  },
  {
    pattern: /expect\(mockPrisma\.([\w]+)\.([\w]+)\)/g,
    replacement: 'expect((prisma.$1 as any).$2)'
  },
  {
    pattern: /const mockPrisma = prisma as jest\.Mocked<typeof prisma>/g,
    replacement: '// Using global prisma mock from jest.setup.js'
  },
  
  // Fix async test functions
  {
    pattern: /it\(['"]([^'"]+)['"]\s*,\s*\(\)\s*=>\s*\{/g,
    replacement: "it('$1', async () => {"
  },
  {
    pattern: /test\(['"]([^'"]+)['"]\s*,\s*\(\)\s*=>\s*\{/g,
    replacement: "test('$1', async () => {"
  },
  
  // Fix React Testing Library usage
  {
    pattern: /fireEvent\.(\w+)\(([^)]+)\)/g,
    replacement: 'await act(async () => { fireEvent.$1($2) })'
  },
  {
    pattern: /userEvent\.(\w+)\(([^)]+)\)/g,
    replacement: 'await act(async () => { await userEvent.$1($2) })'
  },
  
  // Fix service mocks
  {
    pattern: /jest\.mock\(['"]@\/lib\/services\/([\w-]+)\.service['"]\)/g,
    replacement: (match, serviceName) => {
      const className = serviceName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('') + 'Service';
      return `jest.mock('@/lib/services/${serviceName}.service', () => ({
  ${className}: jest.fn().mockImplementation(() => ({
    // Add mock methods as needed
  }))
}))`
    }
  },
  
  // Fix missing act imports
  {
    pattern: /(from ['"]@testing-library\/react['"])/,
    replacement: (match, p1) => {
      if (!match.includes('act')) {
        return ", act } from '@testing-library/react'";
      }
      return match;
    }
  },
  
  // Fix transaction mocks
  {
    pattern: /prisma\.\$transaction\.mockImplementation/g,
    replacement: '(prisma.$transaction as any).mockImplementation'
  },
  
  // Fix enum imports
  {
    pattern: /import\s*{\s*(\w+Status)\s*}\s*from\s*['"]@prisma\/client['"]/g,
    replacement: '// Define $1 enum for tests\nenum $1 {\n  // Add enum values as needed\n}'
  }
];

// Function to apply fixes to a file
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Skip if already marked as fixed
    if (content.includes('// FIXED BY SCRIPT')) {
      return false;
    }
    
    fixes.forEach(fix => {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // Add specific fixes for common patterns
    if (filePath.endsWith('.test.tsx')) {
      // Ensure act and waitFor are imported
      if (content.includes('fireEvent') && !content.includes('import { act')) {
        content = content.replace(
          /from ['"]@testing-library\/react['"]/,
          ", act, waitFor } from '@testing-library/react'"
        );
        modified = true;
      }
    }
    
    if (filePath.endsWith('.service.test.ts')) {
      // Ensure transaction mock is added
      if (!content.includes('prisma.$transaction') && content.includes('beforeEach')) {
        content = content.replace(
          /beforeEach\(\(\) => {/,
          `beforeEach(() => {
    ;(prisma.$transaction as any).mockImplementation((fn: any) => 
      typeof fn === 'function' ? fn(prisma) : Promise.all(fn)
    )`
        );
        modified = true;
      }
    }
    
    if (modified) {
      // Mark as fixed
      content = '// FIXED BY SCRIPT\n' + content;
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Find all test files
function findTestFiles(dir) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.match(/\.test\.(ts|tsx)$/)) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

// Main execution
const testsDir = path.join(process.cwd(), 'tests');
const testFiles = findTestFiles(testsDir);

console.log(`Found ${testFiles.length} test files to process\n`);

let fixedCount = 0;
testFiles.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} test files`);

// Run specific high-value test suites to verify fixes
console.log('\n📊 Running sample tests to verify fixes...\n');

const testSuites = [
  'tests/unit/customer.service.test.ts',
  'tests/unit/lead.service.test.ts',
  'tests/unit/quotation.service.test.ts',
  'tests/unit/invoice.service.test.ts'
];

testSuites.forEach(suite => {
  if (fs.existsSync(suite)) {
    try {
      console.log(`Testing ${suite}...`);
      const result = execSync(`npm test -- --no-coverage ${suite} 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -3`, {
        encoding: 'utf8'
      });
      console.log(result);
    } catch (e) {
      // Test might fail but we still want to see the output
    }
  }
});

console.log('\n💡 Next steps:');
console.log('1. Review the fixed files for any specific issues');
console.log('2. Run npm test to see overall progress');
console.log('3. Fix any remaining type errors or missing mocks');
console.log('4. Add missing mock methods to jest.setup.js as needed');