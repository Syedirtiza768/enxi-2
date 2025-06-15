#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

class CriticalBuildFixer {
  private fixCount = 0;
  
  async fix() {
    console.log('🔧 Fixing critical build blockers...\n');
    
    // Fix currency formatter usage
    await this.fixCurrencyFormatter();
    
    // Fix API imports
    await this.fixApiImports();
    
    // Fix currency context return types
    await this.fixCurrencyContext();
    
    console.log(`\n✅ Applied ${this.fixCount} fixes`);
  }
  
  private async fixCurrencyFormatter() {
    console.log('Fixing currency formatter usage...');
    
    const files = await glob('**/*.{ts,tsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**']
    });
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Fix: const { format: format } = useCurrencyFormatter()
        if (content.includes('useCurrencyFormatter()')) {
          content = content.replace(
            /const\s+(\w+)\s*=\s*useCurrencyFormatter\(\)/g,
            'const { format: $1 } = useCurrencyFormatter()'
          );
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
          console.log(`  ✅ Fixed currency formatter in ${file}`);
          this.fixCount++;
        }
      } catch (error) {
        // Skip
      }
    }
  }
  
  private async fixApiImports() {
    console.log('\nFixing API imports...');
    
    const files = await glob('**/*.{ts,tsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**']
    });
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Fix imports
        if (content.includes("import { api }") && content.includes("@/lib/api/client")) {
          content = content.replace(
            /import\s*{\s*api\s*}\s*from\s*['"]@\/lib\/api\/client['"]/g,
            "import { apiClient } from '@/lib/api/client'"
          );
          
          // Fix method calls
          content = content.replace(/\bapi\.(get|post|put|patch|delete)\(/g, 'apiClient(');
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
          console.log(`  ✅ Fixed API imports in ${file}`);
          this.fixCount++;
        }
      } catch (error) {
        // Skip
      }
    }
  }
  
  private async fixCurrencyContext() {
    console.log('\nFixing currency context...');
    
    const contextFile = 'lib/contexts/currency-context.tsx';
    if (fs.existsSync(contextFile)) {
      try {
        let content = fs.readFileSync(contextFile, 'utf8');
        
        // Fix return type
        content = content.replace(
          /formatCurrency.*:\s*void\s*{/g,
          'formatCurrency: (amount: number, currency?: string): string => {'
        );
        
        fs.writeFileSync(contextFile, content);
        console.log(`  ✅ Fixed currency context return types`);
        this.fixCount++;
      } catch (error) {
        console.error('  ❌ Failed to fix currency context:', error);
      }
    }
  }
}

const fixer = new CriticalBuildFixer();
fixer.fix().catch(console.error);
