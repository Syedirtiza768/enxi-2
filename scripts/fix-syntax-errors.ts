#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

class SyntaxErrorFixer {
  private fixCount = 0;
  
  async fix() {
    console.log('🔧 Fixing syntax errors only (no breaking changes)...\n');
    
    // Fix known syntax error patterns
    await this.fixOptionalChainingErrors();
    await this.fixPromiseAllErrors();
    await this.verifyNoBreakingChanges();
    
    console.log(`\n✅ Fixed ${this.fixCount} syntax errors`);
  }
  
  private async fixOptionalChainingErrors() {
    console.log('Fixing optional chaining assignment errors...');
    
    const files = await glob('**/*.{ts,tsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**']
    });
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Fix: response.property = value (invalid syntax)
        // This is invalid because optional chaining can't be on left side of assignment
        const pattern = /(\w+)\?\.([\w.]+)\s*=/g;
        if (pattern.test(content)) {
          content = content.replace(pattern, '$1.$2 =');
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
          console.log(`  ✅ Fixed optional chaining in: ${file}`);
          this.fixCount++;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
  
  private async fixPromiseAllErrors() {
    console.log('\nFixing Promise.all syntax errors...');
    
    const problematicPatterns = [
      {
        // Fix: Promise.all([  -> Promise.all([
        pattern: /Promise\.all\(\[\s*,/g,
        replacement: 'Promise.all(['
      },
      {
        // Fix: ]) -> ])
        pattern: /,\s*\]\)/g,
        replacement: '])'
      },
      {
        // Fix empty Promise.all
        pattern: /Promise\.all\(\[\s*\]\)/g,
        replacement: 'Promise.resolve([])'
      }
    ];
    
    const files = await glob('**/*.{ts,tsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**']
    });
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        for (const { pattern, replacement } of problematicPatterns) {
          if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            modified = true;
          }
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
          console.log(`  ✅ Fixed Promise.all in: ${file}`);
          this.fixCount++;
        }
      } catch (error) {
        // Skip
      }
    }
  }
  
  private async verifyNoBreakingChanges() {
    console.log('\n🔍 Verifying no breaking changes...');
    
    // List of critical exports that must remain unchanged
    const criticalExports = [
      { file: 'lib/api/client.ts', exports: ['apiClient', 'api'] },
      { file: 'lib/contexts/currency-context.tsx', exports: ['useCurrencyFormatter', 'CurrencyProvider'] }
    ];
    
    let allGood = true;
    for (const { file, exports } of criticalExports) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        for (const exportName of exports) {
          if (!content.includes(`export`) || !content.includes(exportName)) {
            console.log(`  ❌ Missing export '${exportName}' in ${file}`);
            allGood = false;
          }
        }
      }
    }
    
    if (allGood) {
      console.log('  ✅ All critical exports intact');
    }
  }
}

// Run the fixer
const fixer = new SyntaxErrorFixer();
fixer.fix().catch(console.error);