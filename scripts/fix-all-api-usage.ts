#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

class ComprehensiveAPIFixer {
  private fixCount = 0;
  private filesFixed: Set<string> = new Set();
  
  async fix() {
    console.log('🔍 Finding and fixing ALL api.* usage patterns...\n');
    
    // Find all TypeScript files
    const files = await glob('**/*.{ts,tsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**']
    });
    
    console.log(`Scanning ${files.length} files...\n`);
    
    for (const file of files) {
      await this.fixFile(file);
    }
    
    console.log('\n📊 Summary:');
    console.log(`- Files scanned: ${files.length}`);
    console.log(`- Files fixed: ${this.filesFixed.size}`);
    console.log(`- Total fixes: ${this.fixCount}`);
    
    if (this.filesFixed.size > 0) {
      console.log('\n📝 Fixed files:');
      for (const file of this.filesFixed) {
        console.log(`  - ${file}`);
      }
    }
  }
  
  private async fixFile(filePath: string) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let modified = false;
      
      // Pattern 1: Fix api.method() calls
      const apiMethodPattern = /\bapi\.(get|post|put|patch|delete)\(/g;
      if (apiMethodPattern.test(content)) {
        content = content.replace(apiMethodPattern, 'apiClient(');
        modified = true;
      }
      
      // Pattern 2: Fix imports - but be careful not to break exports
      // Only fix if it's importing from @/lib/api/client
      const importPattern = /import\s*{\s*api\s*}\s*from\s*['"]@\/lib\/api\/client['"]/g;
      if (importPattern.test(content)) {
        content = content.replace(importPattern, "import { apiClient } from '@/lib/api/client'");
        modified = true;
      }
      
      // Pattern 3: Fix imports with multiple items
      const multiImportPattern = /import\s*{\s*api\s*,\s*([^}]+)\s*}\s*from\s*['"]@\/lib\/api\/client['"]/g;
      if (multiImportPattern.test(content)) {
        content = content.replace(multiImportPattern, "import { apiClient, $1 } from '@/lib/api/client'");
        modified = true;
      }
      
      // Pattern 4: Fix cases where api is imported but used as apiClient
      // This might happen in test files
      const standaloneApiPattern = /\bapi\s*</g;
      const matches = content.match(standaloneApiPattern);
      if (matches && content.includes('@/lib/api/client')) {
        // Only fix if it's likely referring to the API client
        content = content.replace(/\bapi\s*</g, 'apiClient<');
        modified = true;
      }
      
      if (modified && content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.filesFixed.add(filePath);
        
        // Count the number of fixes in this file
        const fixes = this.countDifferences(originalContent, content);
        this.fixCount += fixes;
        
        console.log(`✅ Fixed ${fixes} occurrences in: ${filePath}`);
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  private countDifferences(original: string, modified: string): number {
    let count = 0;
    
    // Count api.method replacements
    const methodMatches = original.match(/\bapi\.(get|post|put|patch|delete)\(/g);
    if (methodMatches) count += methodMatches.length;
    
    // Count import replacements
    const importMatches = original.match(/import\s*{\s*api[\s,}]/g);
    if (importMatches) count += importMatches.length;
    
    return count;
  }
}

// Run the fixer
const fixer = new ComprehensiveAPIFixer();
fixer.fix().catch(console.error);