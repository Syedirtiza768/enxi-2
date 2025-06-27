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

async function fixSystemUserAuth(filePath: string): Promise<FixResult> {
  const result: FixResult = {
    file: filePath,
    changes: [],
    errors: [],
  };

  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;

    // Skip if this is a test file, seed file, or script
    if (filePath.includes('/tests/') || 
        filePath.includes('/prisma/seed') || 
        filePath.includes('/scripts/') ||
        filePath.includes('.test.') ||
        filePath.includes('.spec.')) {
      return result;
    }

    // Only process API routes
    if (!filePath.includes('/api/') || !filePath.endsWith('route.ts')) {
      return result;
    }

    // Check if file has hardcoded userId: 'system'
    if (!content.includes("userId: 'system'")) {
      return result;
    }

    // Special handling for cron routes
    if (filePath.includes('/cron/')) {
      // For cron jobs, we use 'system' as a fallback since they run without user context
      // But we should still try to get user if available
      if (!content.includes('getUserFromRequest')) {
        // Add import
        const firstImport = content.match(/^import\s+/m);
        if (firstImport) {
          content = content.replace(
            firstImport[0],
            `import { getUserFromRequest } from '@/lib/auth/session';\n${firstImport[0]}`
          );
        }
      }

      // Add user extraction at the beginning of each route handler
      const routeHandlerRegex = /(export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*request[^)]*\)\s*(?::\s*[^{]+)?\s*{)/g;
      content = content.replace(routeHandlerRegex, (match, fullMatch, method) => {
        if (!content.includes('const user = await getUserFromRequest(request)')) {
          return `${fullMatch}\n  const user = await getUserFromRequest(request);`;
        }
        return match;
      });

      // Replace userId: 'system' with conditional
      content = content.replace(
        /userId:\s*['"]system['"]/g,
        "userId: user?.id || 'system'"
      );

      result.changes.push('Added optional user authentication for cron job with system fallback');
    } else {
      // For regular API routes, require authentication
      
      // Add getUserFromRequest import if not present
      if (!content.includes('getUserFromRequest')) {
        const authImportRegex = /from\s+['"]@\/lib\/auth\/session['"]/;
        if (!authImportRegex.test(content)) {
          // Add the import
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

      // Add user extraction and authentication check
      const routeHandlerRegex = /(export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*request[^)]*\)\s*(?::\s*[^{]+)?\s*{)/g;
      
      content = content.replace(routeHandlerRegex, (match, fullMatch, method) => {
        // Check if user extraction already exists
        const functionBody = content.substring(content.indexOf(match) + match.length);
        const hasUserExtraction = functionBody.includes('getUserFromRequest(request)');
        
        if (!hasUserExtraction) {
          // Add user extraction and auth check
          return `${fullMatch}
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }`;
        }
        return match;
      });

      // Replace userId: 'system' with user.id
      content = content.replace(
        /userId:\s*['"]system['"]/g,
        "userId: user.id"
      );

      result.changes.push('Added proper user authentication and replaced hardcoded system user');
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
  console.log(`${colors.bright}${colors.blue}🔐 Fixing System User Authentication Issues${colors.reset}\n`);

  // Find all API route files
  const files = await glob('**/api/**/route.ts', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      '.git/**',
    ],
    cwd: process.cwd(),
  });

  console.log(`Found ${colors.yellow}${files.length}${colors.reset} API route files to check\n`);

  const results: FixResult[] = [];
  let filesFixed = 0;
  let totalChanges = 0;
  let totalErrors = 0;

  // Process files
  for (const file of files) {
    const result = await fixSystemUserAuth(path.join(process.cwd(), file));
    
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

  // Summary
  console.log(`\n${colors.bright}${colors.blue}📊 Summary${colors.reset}`);
  console.log(`${colors.green}Files fixed:${colors.reset} ${filesFixed}`);
  console.log(`${colors.yellow}Total changes:${colors.reset} ${totalChanges}`);
  console.log(`${colors.red}Total errors:${colors.reset} ${totalErrors}`);

  console.log(`\n${colors.bright}${colors.green}✅ Authentication fix completed!${colors.reset}`);
  console.log(`\nNext steps:`);
  console.log(`1. Test API routes to ensure authentication works`);
  console.log(`2. Update any frontend code that might need auth headers`);
  console.log(`3. Consider adding middleware for consistent auth handling`);
}

main().catch(console.error);