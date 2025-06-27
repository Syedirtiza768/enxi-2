#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

interface FixResult {
  file: string;
  changes: string[];
  errors: string[];
}

async function fixFile(filePath: string): Promise<FixResult> {
  const result: FixResult = {
    file: filePath,
    changes: [],
    errors: [],
  };

  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;

    // Fix 1: Replace incorrect enum imports
    // Replace imports from @/lib/generated/prisma with @prisma/client
    const enumImportRegex = /from\s+['"]@\/lib\/generated\/prisma['"]/g;
    if (enumImportRegex.test(content)) {
      content = content.replace(enumImportRegex, 'from "@prisma/client"');
      result.changes.push('Fixed enum imports from @/lib/generated/prisma to @prisma/client');
    }

    // Fix 2: Replace imports from @/lib/types/shared-enums with @prisma/client for Prisma enums
    const sharedEnumsRegex = /import\s+{([^}]+)}\s+from\s+['"]@\/lib\/types\/shared-enums['"]/g;
    const prismaEnums = [
      'UserRole', 'UserStatus', 'CaseStatus', 
      'CasePriority', 'QuotationStatus', 'InvoiceStatus', 'PaymentStatus',
      'PaymentMethod', 'TransactionType', 'AccountSubType',
      'JournalEntryStatus', 'InventoryTransactionType', 'StockStatus',
      'GoodsReceiptStatus', 'PurchaseOrderStatus', 'SupplierStatus',
      'CustomerStatus', 'ProductType', 'ProductStatus',
      'DiscountType', 'ShipmentStatus', 'ShipmentMethod', 'DeliveryStatus'
    ];
    // Note: LeadStatus, LeadSource, AccountType, and SalesCaseStatus are defined in shared-enums
    
    let match;
    while ((match = sharedEnumsRegex.exec(originalContent)) !== null) {
      const imports = match[1].split(',').map(i => i.trim());
      const prismaImports = imports.filter(imp => prismaEnums.includes(imp));
      const otherImports = imports.filter(imp => !prismaEnums.includes(imp));
      
      if (prismaImports.length > 0) {
        // Add Prisma import if not already present
        if (!content.includes('from "@prisma/client"')) {
          const firstImport = content.match(/^import\s+/m);
          if (firstImport) {
            content = content.replace(
              firstImport[0],
              `import { ${prismaImports.join(', ')} } from "@prisma/client";\n${firstImport[0]}`
            );
          }
        } else {
          // Merge with existing Prisma import
          content = content.replace(
            /import\s+{([^}]+)}\s+from\s+["']@prisma\/client["']/,
            (match, imports) => {
              const existingImports = imports.split(',').map((i: string) => i.trim());
              const allImports = [...new Set([...existingImports, ...prismaImports])];
              return `import { ${allImports.join(', ')} } from "@prisma/client"`;
            }
          );
        }
        
        // Update or remove shared-enums import
        if (otherImports.length > 0) {
          content = content.replace(
            match[0],
            `import { ${otherImports.join(', ')} } from "@/lib/types/shared-enums"`
          );
        } else {
          content = content.replace(match[0] + ';', '');
          content = content.replace(match[0], '');
        }
        
        result.changes.push(`Moved Prisma enums (${prismaImports.join(', ')}) to @prisma/client import`);
      }
    }

    // Fix 3: Fix z.nativeEnum usage
    // Look for z.nativeEnum patterns and check if they're using correct imports
    const nativeEnumRegex = /z\.nativeEnum\(([^)]+)\)/g;
    const nativeEnumMatches = content.match(nativeEnumRegex);
    if (nativeEnumMatches) {
      nativeEnumMatches.forEach(match => {
        const enumName = match.match(/z\.nativeEnum\(([^)]+)\)/)?.[1];
        if (enumName && prismaEnums.includes(enumName)) {
          // Ensure the enum is imported from @prisma/client
          if (!content.includes(`import { ${enumName} } from "@prisma/client"`)) {
            result.changes.push(`z.nativeEnum(${enumName}) found - ensure ${enumName} is imported from @prisma/client`);
          }
        }
      });
    }

    // Fix 4: Replace hardcoded userId: 'system' with proper authentication
    if (filePath.includes('/api/') && content.includes("userId: 'system'")) {
      // Add getUserFromRequest import if not present
      if (!content.includes('getUserFromRequest')) {
        const authImportRegex = /from\s+['"]@\/lib\/auth\/session['"]/;
        if (!authImportRegex.test(content)) {
          // Add the import at the top
          const firstImport = content.match(/^import\s+/m);
          if (firstImport) {
            content = content.replace(
              firstImport[0],
              `import { getUserFromRequest } from '@/lib/auth/session';\n${firstImport[0]}`
            );
          }
        } else {
          // Add to existing import
          content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]@\/lib\/auth\/session['"]/,
            (match, imports) => {
              const importList = imports.split(',').map((i: string) => i.trim());
              if (!importList.includes('getUserFromRequest')) {
                importList.push('getUserFromRequest');
              }
              return `import { ${importList.join(', ')} } from '@/lib/auth/session'`;
            }
          );
        }
      }

      // Replace userId: 'system' with proper user extraction
      content = content.replace(
        /userId:\s*['"]system['"]/g,
        "userId: user?.id || 'system'"
      );

      // Ensure user is extracted from request in route handlers
      if (content.includes('export async function') && !content.includes('getUserFromRequest(request)')) {
        // Add user extraction at the beginning of each route handler
        content = content.replace(
          /(export\s+async\s+function\s+\w+\s*\([^)]*request[^)]*\)\s*{)/g,
          '$1\n  const user = await getUserFromRequest(request);'
        );
        result.changes.push('Added proper user authentication instead of hardcoded system user');
      }
    }

    // Fix 5: Ensure route handlers have proper try-catch and error handling
    if (filePath.includes('/api/') && filePath.endsWith('route.ts')) {
      const routeHandlerRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*{/g;
      let routeMatch;
      while ((routeMatch = routeHandlerRegex.exec(content)) !== null) {
        const method = routeMatch[1];
        const functionStart = routeMatch.index + routeMatch[0].length;
        
        // Check if there's a try-catch block
        const functionBody = content.substring(functionStart);
        if (!functionBody.startsWith('\n  try {')) {
          result.changes.push(`Consider adding try-catch error handling to ${method} handler`);
        }
      }
    }

    // Only write if changes were made
    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf8');
      return result;
    }

    return result;
  } catch (error) {
    result.errors.push(`Error processing file: ${error}`);
    return result;
  }
}

async function main() {
  console.log(`${colors.bright}${colors.blue}🔧 Starting API Issue Fixes${colors.reset}\n`);

  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      '.git/**',
      'scripts/fix-api-issues.ts',
      'lib/generated/**',
    ],
    cwd: process.cwd(),
  });

  console.log(`Found ${colors.yellow}${files.length}${colors.reset} TypeScript files to check\n`);

  const results: FixResult[] = [];
  let filesFixed = 0;
  let totalChanges = 0;
  let totalErrors = 0;

  // Process files in batches
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(file => fixFile(path.join(process.cwd(), file)))
    );
    
    for (const result of batchResults) {
      if (result.changes.length > 0 || result.errors.length > 0) {
        results.push(result);
        
        if (result.changes.length > 0) {
          filesFixed++;
          totalChanges += result.changes.length;
          console.log(`${colors.green}✓${colors.reset} ${result.file}`);
          result.changes.forEach(change => {
            console.log(`  ${colors.yellow}→${colors.reset} ${change}`);
          });
        }
        
        if (result.errors.length > 0) {
          totalErrors += result.errors.length;
          console.log(`${colors.red}✗${colors.reset} ${result.file}`);
          result.errors.forEach(error => {
            console.log(`  ${colors.red}→${colors.reset} ${error}`);
          });
        }
      }
    }
    
    // Progress indicator
    const progress = Math.round(((i + batch.length) / files.length) * 100);
    process.stdout.write(`\rProgress: ${progress}%`);
  }

  console.log('\n');

  // Summary
  console.log(`${colors.bright}${colors.blue}📊 Summary${colors.reset}`);
  console.log(`${colors.green}Files fixed:${colors.reset} ${filesFixed}`);
  console.log(`${colors.yellow}Total changes:${colors.reset} ${totalChanges}`);
  console.log(`${colors.red}Total errors:${colors.reset} ${totalErrors}`);

  // Critical files to test
  const criticalFiles = [
    '/api/invoices/route.ts',
    '/api/goods-receipts/[id]/route.ts',
    '/api/sales-orders/[id]/create-invoice/route.ts',
    '/api/leads/[id]/status/route.ts',
    '/api/users/[id]/route.ts',
  ];

  console.log(`\n${colors.bright}${colors.yellow}⚠️  Critical API routes to test:${colors.reset}`);
  criticalFiles.forEach(file => {
    const result = results.find(r => r.file.includes(file));
    if (result && result.changes.length > 0) {
      console.log(`  • ${file}`);
    }
  });

  console.log(`\n${colors.bright}${colors.green}✅ Fix script completed!${colors.reset}`);
  console.log(`\nNext steps:`);
  console.log(`1. Run ${colors.yellow}npm run build${colors.reset} to check for TypeScript errors`);
  console.log(`2. Run ${colors.yellow}npm test${colors.reset} to ensure tests pass`);
  console.log(`3. Test critical API endpoints manually`);
}

main().catch(console.error);