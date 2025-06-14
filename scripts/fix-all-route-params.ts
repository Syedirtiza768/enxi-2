#!/usr/bin/env tsx

import fs from 'fs/promises';
import { glob } from 'glob';

async function fixAllRouteParams(): Promise<void> {
  console.log('Fixing all remaining RouteParams in API routes...');
  
  // Find all route.ts files in app/api directory
  const files = await glob('app/api/**/route.ts');
  
  let fixedCount = 0;
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    let updatedContent = content;
    
    // Pattern 1: Fix interface RouteParams with context
    if (content.includes('interface RouteParams') && content.includes('context: RouteParams')) {
      // Replace interface declarations
      updatedContent = updatedContent.replace(
        /interface RouteParams\s*{\s*params:\s*{\s*(\w+):\s*string\s*}\s*}/g,
        ''
      );
      
      // Replace function signatures with context: RouteParams
      updatedContent = updatedContent.replace(
        /export\s+(async\s+)?function\s+(\w+)\s*\([^)]*\),\s*context:\s*RouteParams\s*\)/g,
        (match, async, method) => {
          const asyncKeyword = async || '';
          return `export ${asyncKeyword}function ${method}(request: NextRequest, { params }: { params: Promise<{ id: string }> })`;
        }
      );
      
      // Replace params access
      updatedContent = updatedContent.replace(
        /const\s*{\s*params\s*}\s*=\s*context;?\s*\n\s*const\s*{\s*(\w+)\s*}\s*=\s*params;?/g,
        'const { $1 } = await params;'
      );
    }
    
    // Pattern 2: Fix type RouteParams
    if (content.includes('type RouteParams')) {
      updatedContent = updatedContent.replace(
        /type\s+RouteParams\s*=\s*{\s*params:\s*Promise<{\s*(\w+):\s*string\s*}>\s*}/g,
        ''
      );
      
      updatedContent = updatedContent.replace(
        /export\s+async\s+function\s+(\w+)\s*\(\s*request:\s*NextRequest,\s*{\s*params\s*}:\s*RouteParams\s*\)/g,
        'export async function $1(request: NextRequest, { params }: { params: Promise<{ id: string }> })'
      );
    }
    
    // Pattern 3: Fix { params }: RouteParams
    if (content.includes('{ params }: RouteParams')) {
      // First remove interface if exists
      updatedContent = updatedContent.replace(
        /interface RouteParams\s*{\s*params:\s*{\s*(\w+):\s*string\s*}\s*}/g,
        ''
      );
      
      // Fix the function signatures
      updatedContent = updatedContent.replace(
        /export\s+async\s+function\s+(\w+)\s*\(\s*request:\s*NextRequest,\s*{\s*params\s*}:\s*RouteParams\s*\)/g,
        'export async function $1(request: NextRequest, { params }: { params: Promise<{ id: string }> })'
      );
      
      // Add await params if not already present
      if (!updatedContent.includes('await params')) {
        // Find the first use of params.id and add await
        updatedContent = updatedContent.replace(
          /const\s*{\s*id\s*}\s*=\s*params;?/g,
          'const { id } = await params;'
        );
        
        // Also handle direct usage
        updatedContent = updatedContent.replace(
          /params\.id/g,
          '(await params).id'
        );
      }
    }
    
    if (updatedContent !== content) {
      console.log(`✅ Fixed: ${file}`);
      await fs.writeFile(file, updatedContent);
      fixedCount++;
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} files!`);
}

fixAllRouteParams().catch(console.error);