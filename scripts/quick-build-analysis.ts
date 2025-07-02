#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface CriticalError {
  pattern: RegExp;
  category: string;
  impact: 'blocking' | 'high';
  fix: string;
  count?: number;
}

class QuickBuildAnalyzer {
  private criticalPatterns: CriticalError[] = [
    {
      pattern: /useCurrencyFormatter\(\)/g,
      category: 'Currency Formatter Usage',
      impact: 'blocking',
      fix: 'Change to: const { format } = useCurrencyFormatter()'
    },
    {
      pattern: /import\s*{\s*api\s*}\s*from\s*['"]@\/lib\/api\/client['"]/g,
      category: 'Old API Import',
      impact: 'blocking',
      fix: 'Change to: import { apiClient } from "@/lib/api/client"'
    },
    {
      pattern: /api\.(get|post|put|patch|delete)\(/g,
      category: 'Old API Method Calls',
      impact: 'blocking',
      fix: 'Change api.method() to apiClient()'
    },
    {
      pattern: /formatCurrency.*:\s*void/g,
      category: 'Currency Return Type',
      impact: 'blocking',
      fix: 'Change return type from void to string'
    },
    {
      pattern: /Cannot find module|Module not found/g,
      category: 'Missing Imports',
      impact: 'blocking',
      fix: 'Fix import paths or install dependencies'
    },
    {
      pattern: /is not a function/g,
      category: 'Function Call Errors',
      impact: 'blocking',
      fix: 'Check destructuring and function invocations'
    },
    {
      pattern: /Property.*does not exist on type/g,
      category: 'Property Access',
      impact: 'high',
      fix: 'Add type definitions or use optional chaining'
    },
    {
      pattern: /Type.*is not assignable to type/g,
      category: 'Type Mismatches',
      impact: 'high',
      fix: 'Update type definitions or fix assignments'
    }
  ];

  async analyze() {
    console.log('🚀 Quick Build Blocker Analysis\n');
    console.log('='.repeat(60));
    
    // First, try to identify errors from a sample build
    await this.sampleBuildErrors();
    
    // Scan critical files
    await this.scanCriticalFiles();
    
    // Generate fix script
    await this.generateQuickFixes();
  }

  private async sampleBuildErrors() {
    console.log('\n📊 Checking for common build blockers...\n');
    
    try {
      // Try a quick type check on critical files only
      const criticalDirs = [
        'app/(auth)/invoices',
        'app/(auth)/payments', 
        'app/(auth)/customers',
        'components/payments',
        'components/invoices',
        'lib/contexts',
        'lib/api'
      ];
      
      for (const dir of criticalDirs) {
        const fullPath = path.join(process.cwd(), dir);
        if (fs.existsSync(fullPath)) {
          await this.scanDirectory(fullPath);
        }
      }
    } catch (error) {
      console.error('Error during scan:', error);
    }
  }

  private async scanDirectory(dir: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.')) {
        await this.scanDirectory(fullPath);
      } else if (file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))) {
        await this.scanFile(fullPath);
      }
    }
  }

  private async scanFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const pattern of this.criticalPatterns) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          pattern.count = (pattern.count || 0) + matches.length;
          
          if (pattern.count === matches.length) { // First occurrence
            console.log(`❌ ${pattern.category} found in ${path.relative(process.cwd(), filePath)}`);
            console.log(`   Fix: ${pattern.fix}\n`);
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  private async scanCriticalFiles() {
    console.log('\n🔍 Scanning critical files for errors...\n');
    
    // Check specific files that commonly cause build issues
    const criticalFiles = [
      'lib/contexts/currency-context.tsx',
      'app/(auth)/invoices/page.tsx',
      'app/(auth)/payments/page.tsx',
      'components/payments/payment-form.tsx',
      'lib/api/client.ts'
    ];
    
    for (const file of criticalFiles) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        console.log(`Checking: ${file}`);
        await this.scanFile(fullPath);
      }
    }
  }

  private async generateQuickFixes() {
    console.log('\n📋 Summary of Critical Issues:\n');
    
    const blockingErrors = this.criticalPatterns.filter(p => p.impact === 'blocking' && (p.count || 0) > 0);
    const highErrors = this.criticalPatterns.filter(p => p.impact === 'high' && (p.count || 0) > 0);
    
    if (blockingErrors.length > 0) {
      console.log('🚨 BLOCKING ERRORS (Must fix for build):');
      for (const error of blockingErrors) {
        console.log(`  - ${error.category}: ${error.count} occurrences`);
      }
    }
    
    if (highErrors.length > 0) {
      console.log('\n⚠️  HIGH PRIORITY ERRORS:');
      for (const error of highErrors) {
        console.log(`  - ${error.category}: ${error.count} occurrences`);
      }
    }
    
    // Create automated fix script
    await this.createAutomatedFix();
  }

  private async createAutomatedFix() {
    const script = `#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

class CriticalBuildFixer {
  private fixCount = 0;
  
  async fix() {
    console.log('🔧 Fixing critical build blockers...\\n');
    
    // Fix currency formatter usage
    await this.fixCurrencyFormatter();
    
    // Fix API imports
    await this.fixApiImports();
    
    // Fix currency context return types
    await this.fixCurrencyContext();
    
    console.log(\`\\n✅ Applied \${this.fixCount} fixes\`);
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
            /const\\s+(\\w+)\\s*=\\s*useCurrencyFormatter\\(\\)/g,
            'const { format: $1 } = useCurrencyFormatter()'
          );
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
          console.log(\`  ✅ Fixed currency formatter in \${file}\`);
          this.fixCount++;
        }
      } catch (error) {
        // Skip
      }
    }
  }
  
  private async fixApiImports() {
    console.log('\\nFixing API imports...');
    
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
            /import\\s*{\\s*api\\s*}\\s*from\\s*['"]@\\/lib\\/api\\/client['"]/g,
            "import { apiClient } from '@/lib/api/client'"
          );
          
          // Fix method calls
          content = content.replace(/\\bapi\\.(get|post|put|patch|delete)\\(/g, 'apiClient(');
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
          console.log(\`  ✅ Fixed API imports in \${file}\`);
          this.fixCount++;
        }
      } catch (error) {
        // Skip
      }
    }
  }
  
  private async fixCurrencyContext() {
    console.log('\\nFixing currency context...');
    
    const contextFile = 'lib/contexts/currency-context.tsx';
    if (fs.existsSync(contextFile)) {
      try {
        let content = fs.readFileSync(contextFile, 'utf8');
        
        // Fix return type
        content = content.replace(
          /formatCurrency.*:\\s*void\\s*{/g,
          'formatCurrency: (amount: number, currency?: string): string => {'
        );
        
        fs.writeFileSync(contextFile, content);
        console.log(\`  ✅ Fixed currency context return types\`);
        this.fixCount++;
      } catch (error) {
        console.error('  ❌ Failed to fix currency context:', error);
      }
    }
  }
}

const fixer = new CriticalBuildFixer();
fixer.fix().catch(console.error);
`;

    fs.writeFileSync(
      path.join(process.cwd(), 'scripts/fix-critical-build-blockers.ts'),
      script
    );
    
    console.log('\n✅ Created fix script: scripts/fix-critical-build-blockers.ts');
    console.log('\nRun it with: npx tsx scripts/fix-critical-build-blockers.ts');
  }
}

// Run the analyzer
const analyzer = new QuickBuildAnalyzer();
analyzer.analyze().catch(console.error);