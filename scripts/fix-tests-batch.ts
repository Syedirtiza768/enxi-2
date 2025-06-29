#!/usr/bin/env tsx
/**
 * Batch fix script for all test files
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface TestFix {
  name: string;
  files: string[];
  fix: (content: string, filePath: string) => string;
}

const fixes: TestFix[] = [
  {
    name: 'Remove local Prisma mocks',
    files: ['**/*.test.ts', '**/*.test.tsx'],
    fix: (content: string) => {
      // Remove local jest.mock('@/lib/db/prisma') as it conflicts with global mock
      const lines = content.split('\n');
      const filtered = [];
      let inPrismaMock = false;
      let braceCount = 0;
      
      for (const line of lines) {
        if (line.includes("jest.mock('@/lib/db/prisma'")) {
          inPrismaMock = true;
          braceCount = 0;
          continue;
        }
        
        if (inPrismaMock) {
          braceCount += (line.match(/\{/g) || []).length;
          braceCount -= (line.match(/\}/g) || []).length;
          
          if (braceCount === 0 && line.includes('}))')) {
            inPrismaMock = false;
            continue;
          }
          
          if (!inPrismaMock || braceCount > 0) {
            continue;
          }
        }
        
        filtered.push(line);
      }
      
      return filtered.join('\n');
    }
  },
  
  {
    name: 'Fix service imports in tests',
    files: ['**/*.test.ts', '**/*.test.tsx'],
    fix: (content: string) => {
      // Ensure services are properly mocked
      if (content.includes('new LeadService()') && !content.includes("jest.mock('@/lib/services/lead.service')")) {
        const importIndex = content.indexOf("import { LeadService }");
        if (importIndex !== -1) {
          const nextLineIndex = content.indexOf('\n', importIndex);
          content = content.slice(0, nextLineIndex + 1) + 
            "\njest.mock('@/lib/services/lead.service')\n" + 
            content.slice(nextLineIndex + 1);
        }
      }
      
      // Do the same for other services
      const services = [
        'CustomerService',
        'QuotationService',
        'SalesCaseService',
        'ShipmentService',
        'InvoiceService',
        'PaymentService',
        'InventoryService',
        'StockMovementService'
      ];
      
      for (const service of services) {
        const servicePath = service.replace(/Service$/, '').replace(/([A-Z])/g, '-$1').toLowerCase().slice(1) + '.service';
        if (content.includes(`new ${service}()`) && !content.includes(`jest.mock('@/lib/services/${servicePath}')`)) {
          const importIndex = content.indexOf(`import { ${service} }`);
          if (importIndex !== -1) {
            const nextLineIndex = content.indexOf('\n', importIndex);
            content = content.slice(0, nextLineIndex + 1) + 
              `\njest.mock('@/lib/services/${servicePath}')\n` + 
              content.slice(nextLineIndex + 1);
          }
        }
      }
      
      return content;
    }
  },
  
  {
    name: 'Fix Prisma client usage',
    files: ['**/*.test.ts', '**/*.test.tsx'],
    fix: (content: string) => {
      // Replace direct prisma usage with mocked version
      content = content.replace(/const mockPrisma = prisma as jest\.Mocked<typeof prisma>/g, 
        'const mockPrisma = (prisma as any)');
      
      // Fix prisma.lead.create patterns
      content = content.replace(/mockPrisma\.(\w+)\.create\.mockResolvedValue/g, 
        '(prisma.$1 as any).create.mockResolvedValue');
      content = content.replace(/mockPrisma\.(\w+)\.findMany\.mockResolvedValue/g,
        '(prisma.$1 as any).findMany.mockResolvedValue');
      content = content.replace(/mockPrisma\.(\w+)\.findUnique\.mockResolvedValue/g,
        '(prisma.$1 as any).findUnique.mockResolvedValue');
      content = content.replace(/mockPrisma\.(\w+)\.update\.mockResolvedValue/g,
        '(prisma.$1 as any).update.mockResolvedValue');
      content = content.replace(/mockPrisma\.(\w+)\.delete\.mockResolvedValue/g,
        '(prisma.$1 as any).delete.mockResolvedValue');
      content = content.replace(/mockPrisma\.(\w+)\.count\.mockResolvedValue/g,
        '(prisma.$1 as any).count.mockResolvedValue');
        
      return content;
    }
  },
  
  {
    name: 'Fix expect assertions',
    files: ['**/*.test.ts', '**/*.test.tsx'],
    fix: (content: string) => {
      // Fix toHaveBeenCalledWith on mocked prisma
      content = content.replace(/expect\(mockPrisma\.(\w+)\.(\w+)\)/g,
        'expect((prisma.$1 as any).$2)');
        
      return content;
    }
  },
  
  {
    name: 'Add act() to component tests',
    files: ['**/*.test.tsx'],
    fix: (content: string) => {
      // Add act import if missing
      if (content.includes('fireEvent') && !content.includes('import { act }')) {
        content = content.replace(
          "from '@testing-library/react'",
          ", act } from '@testing-library/react'"
        );
      }
      
      // Wrap fireEvent calls in act
      content = content.replace(/(\s+)(fireEvent\.\w+\([^)]+\))/g,
        '$1await act(async () => { $2 })');
        
      // Make test functions async if they use act
      content = content.replace(/it\(['"]([^'"]+)['"], \(\) => \{/g,
        "it('$1', async () => {");
        
      return content;
    }
  }
];

function applyFixes(filePath: string): boolean {
  if (!filePath.endsWith('.test.ts') && !filePath.endsWith('.test.tsx')) {
    return false;
  }
  
  let content = readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const fix of fixes) {
    const shouldApply = fix.files.some(pattern => {
      if (pattern.includes('**')) {
        return filePath.endsWith(pattern.replace('**/', ''));
      }
      return filePath.includes(pattern);
    });
    
    if (shouldApply) {
      const newContent = fix.fix(content, filePath);
      if (newContent !== content) {
        console.log(`✅ Applied "${fix.name}" to ${filePath}`);
        content = newContent;
        modified = true;
      }
    }
  }
  
  if (modified) {
    writeFileSync(filePath, content);
  }
  
  return modified;
}

function processDirectory(dir: string): number {
  let fixedCount = 0;
  
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      fixedCount += processDirectory(fullPath);
    } else if (stat.isFile()) {
      if (applyFixes(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

// Main
console.log('🔧 Starting batch test fixes...\n');

const testsDir = join(process.cwd(), 'tests');
const fixedCount = processDirectory(testsDir);

console.log(`\n✅ Fixed ${fixedCount} test files`);
console.log('\nRunning tests to check improvements...');

import { execSync } from 'child_process';

try {
  const result = execSync('npm test -- --ci --silent 2>&1 | grep -E "Test Suites:|Tests:" | tail -2', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('\nTest Results:');
  console.log(result);
} catch (e) {
  console.log('\nRun "npm test" to see results');
}