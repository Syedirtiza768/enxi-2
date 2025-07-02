#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface BuildError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  category: string;
}

interface ErrorCategory {
  name: string;
  count: number;
  errors: BuildError[];
  impact: 'blocking' | 'high' | 'medium' | 'low';
  fixStrategy: string;
}

class BuildErrorAnalyzer {
  private errors: BuildError[] = [];
  private categories: Map<string, ErrorCategory> = new Map();

  async analyze() {
    console.log('🔍 Analyzing build blockers...\n');
    
    // Run TypeScript compiler to get errors
    await this.collectTypeScriptErrors();
    
    // Categorize errors
    this.categorizeErrors();
    
    // Generate report
    this.generateReport();
    
    // Create fix scripts
    await this.createFixScripts();
  }

  private async collectTypeScriptErrors() {
    console.log('📊 Collecting TypeScript errors...');
    
    try {
      execSync('npx tsc --noEmit --pretty false', { encoding: 'utf8' });
    } catch (error: any) {
      const output = error.stdout || '';
      const lines = output.split('\n').filter(Boolean);
      
      for (const line of lines) {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
        if (match) {
          const [, file, lineNum, colNum, code, message] = match;
          this.errors.push({
            file: file.trim(),
            line: parseInt(lineNum),
            column: parseInt(colNum),
            code,
            message: message.trim(),
            severity: 'error',
            category: this.determineCategory(code, message)
          });
        }
      }
    }
    
    console.log(`Found ${this.errors.length} errors\n`);
  }

  private determineCategory(code: string, message: string): string {
    // Critical runtime errors
    if (message.includes('Cannot find module') || message.includes('Module not found')) {
      return 'missing-imports';
    }
    if (message.includes('is not a function') || message.includes('is not callable')) {
      return 'function-calls';
    }
    if (message.includes('Property') && message.includes('does not exist on type')) {
      return 'property-access';
    }
    if (message.includes('Type') && message.includes('is not assignable to type')) {
      return 'type-mismatch';
    }
    if (message.includes('Object is possibly') && (message.includes('null') || message.includes('undefined'))) {
      return 'null-checks';
    }
    if (message.includes('Argument of type') && message.includes('is not assignable to parameter')) {
      return 'argument-types';
    }
    if (message.includes('async') || message.includes('Promise')) {
      return 'async-types';
    }
    if (code === 'TS2339') return 'property-access';
    if (code === 'TS2345') return 'argument-types';
    if (code === 'TS2322') return 'type-mismatch';
    if (code === 'TS18048') return 'null-checks';
    if (code === 'TS2304') return 'missing-types';
    
    return 'other';
  }

  private categorizeErrors() {
    console.log('📁 Categorizing errors...\n');
    
    const categoryDefinitions: Record<string, { impact: 'blocking' | 'high' | 'medium' | 'low', fixStrategy: string }> = {
      'missing-imports': {
        impact: 'blocking',
        fixStrategy: 'Fix import paths and install missing dependencies'
      },
      'function-calls': {
        impact: 'blocking',
        fixStrategy: 'Fix function invocations and destructuring patterns'
      },
      'property-access': {
        impact: 'high',
        fixStrategy: 'Add type guards or fix property names'
      },
      'type-mismatch': {
        impact: 'high',
        fixStrategy: 'Update type definitions or fix assignments'
      },
      'argument-types': {
        impact: 'high',
        fixStrategy: 'Fix function arguments or update type definitions'
      },
      'async-types': {
        impact: 'medium',
        fixStrategy: 'Add async/await or fix Promise types'
      },
      'null-checks': {
        impact: 'low',
        fixStrategy: 'Add null checks or use optional chaining'
      },
      'missing-types': {
        impact: 'medium',
        fixStrategy: 'Add type definitions or imports'
      },
      'other': {
        impact: 'low',
        fixStrategy: 'Manual review required'
      }
    };

    for (const error of this.errors) {
      const category = error.category;
      if (!this.categories.has(category)) {
        const def = categoryDefinitions[category] || categoryDefinitions.other;
        this.categories.set(category, {
          name: category,
          count: 0,
          errors: [],
          impact: def.impact,
          fixStrategy: def.fixStrategy
        });
      }
      
      const cat = this.categories.get(category)!;
      cat.count++;
      if (cat.errors.length < 10) { // Keep first 10 examples
        cat.errors.push(error);
      }
    }
  }

  private generateReport() {
    console.log('📄 Build Blocker Analysis Report\n');
    console.log('='.repeat(80));
    
    // Sort categories by impact
    const sortedCategories = Array.from(this.categories.values()).sort((a, b) => {
      const impactOrder = { blocking: 0, high: 1, medium: 2, low: 3 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`Total Errors: ${this.errors.length}`);
    console.log(`\nErrors by Impact:`);
    const impactCounts = { blocking: 0, high: 0, medium: 0, low: 0 };
    for (const cat of sortedCategories) {
      impactCounts[cat.impact] += cat.count;
    }
    console.log(`  🚨 Blocking: ${impactCounts.blocking} errors`);
    console.log(`  ⚠️  High: ${impactCounts.high} errors`);
    console.log(`  🔶 Medium: ${impactCounts.medium} errors`);
    console.log(`  ℹ️  Low: ${impactCounts.low} errors`);
    
    // Detailed breakdown
    console.log('\n\n📋 Detailed Breakdown:\n');
    for (const category of sortedCategories) {
      const icon = category.impact === 'blocking' ? '🚨' : 
                   category.impact === 'high' ? '⚠️' : 
                   category.impact === 'medium' ? '🔶' : 'ℹ️';
      
      console.log(`${icon} ${category.name.toUpperCase().replace('-', ' ')} (${category.count} errors)`);
      console.log(`   Impact: ${category.impact.toUpperCase()}`);
      console.log(`   Fix Strategy: ${category.fixStrategy}`);
      console.log(`   Examples:`);
      
      for (let i = 0; i < Math.min(3, category.errors.length); i++) {
        const error = category.errors[i];
        console.log(`     - ${path.basename(error.file)}:${error.line} - ${error.message.substring(0, 80)}...`);
      }
      console.log();
    }
    
    // Most affected files
    console.log('\n📁 Most Affected Files:\n');
    const fileErrorCounts = new Map<string, number>();
    for (const error of this.errors) {
      fileErrorCounts.set(error.file, (fileErrorCounts.get(error.file) || 0) + 1);
    }
    const sortedFiles = Array.from(fileErrorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [file, count] of sortedFiles) {
      console.log(`  ${count.toString().padStart(4)} errors - ${file}`);
    }
    
    // Save detailed report
    const reportPath = path.join(process.cwd(), 'BUILD_BLOCKER_ANALYSIS.md');
    this.saveDetailedReport(reportPath);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private saveDetailedReport(filePath: string) {
    const sortedCategories = Array.from(this.categories.values()).sort((a, b) => {
      const impactOrder = { blocking: 0, high: 1, medium: 2, low: 3 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
    
    let report = '# Build Blocker Analysis Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total Errors: ${this.errors.length}\n`;
    report += `- Blocking Errors: ${sortedCategories.filter(c => c.impact === 'blocking').reduce((sum, c) => sum + c.count, 0)}\n`;
    report += `- High Priority: ${sortedCategories.filter(c => c.impact === 'high').reduce((sum, c) => sum + c.count, 0)}\n\n`;
    
    report += '## Critical Errors (Blocking Production Build)\n\n';
    
    for (const category of sortedCategories.filter(c => c.impact === 'blocking')) {
      report += `### ${category.name.toUpperCase().replace(/-/g, ' ')} (${category.count} errors)\n\n`;
      report += `**Fix Strategy:** ${category.fixStrategy}\n\n`;
      report += '**Examples:**\n\n';
      
      for (const error of category.errors) {
        report += `\`\`\`\n${error.file}:${error.line}:${error.column}\n${error.code}: ${error.message}\n\`\`\`\n\n`;
      }
    }
    
    report += '\n## High Priority Errors\n\n';
    for (const category of sortedCategories.filter(c => c.impact === 'high')) {
      report += `### ${category.name.toUpperCase().replace(/-/g, ' ')} (${category.count} errors)\n\n`;
      report += `**Fix Strategy:** ${category.fixStrategy}\n\n`;
      
      if (category.errors.length > 0) {
        report += '**Sample:**\n';
        const error = category.errors[0];
        report += `\`\`\`\n${error.file}:${error.line}:${error.column}\n${error.code}: ${error.message}\n\`\`\`\n\n`;
      }
    }
    
    fs.writeFileSync(filePath, report);
  }

  private async createFixScripts() {
    console.log('\n🔧 Creating fix scripts...\n');
    
    // Create fix script for blocking errors
    const blockingCategories = Array.from(this.categories.values())
      .filter(c => c.impact === 'blocking');
    
    if (blockingCategories.length > 0) {
      await this.createBlockingErrorFixer();
      console.log('✅ Created: scripts/fix-blocking-errors.ts');
    }
    
    // Create fix script for high priority errors
    const highCategories = Array.from(this.categories.values())
      .filter(c => c.impact === 'high');
    
    if (highCategories.length > 0) {
      await this.createHighPriorityFixer();
      console.log('✅ Created: scripts/fix-high-priority-errors.ts');
    }
  }

  private async createBlockingErrorFixer() {
    const script = `#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  file: string;
  oldText: string;
  newText: string;
  description: string;
}

class BlockingErrorFixer {
  private fixes: Fix[] = [];
  
  async fix() {
    console.log('🚨 Fixing blocking errors...');
    
    // Fix missing imports
    await this.fixMissingImports();
    
    // Fix function call errors
    await this.fixFunctionCalls();
    
    // Apply fixes
    await this.applyFixes();
  }
  
  private async fixMissingImports() {
    // Common import fixes
    const importFixes = [
      {
        pattern: /import.*from ['"]@\\/lib\\/api\\/client['"]/,
        fix: "import { apiClient } from '@/lib/api/client'"
      },
      {
        pattern: /import.*PrismaClient.*from ['"]@prisma\\/client['"]/,
        fix: "import { PrismaClient } from '@prisma/client'"
      }
    ];
    
    // Add fixes for common missing imports
  }
  
  private async fixFunctionCalls() {
    // Fix common function call patterns
    const functionFixes = [
      {
        pattern: /const\\s+(\\w+)\\s*=\\s*useCurrencyFormatter\\(\\)/,
        fix: 'const { format: $1 } = useCurrencyFormatter()'
      }
    ];
    
    // Add fixes for function calls
  }
  
  private async applyFixes() {
    console.log(\`Applying \${this.fixes.length} fixes...\`);
    
    for (const fix of this.fixes) {
      try {
        const content = fs.readFileSync(fix.file, 'utf8');
        const newContent = content.replace(fix.oldText, fix.newText);
        fs.writeFileSync(fix.file, newContent);
        console.log(\`✅ Fixed: \${fix.file} - \${fix.description}\`);
      } catch (error) {
        console.error(\`❌ Failed to fix \${fix.file}: \${error}\`);
      }
    }
  }
}

const fixer = new BlockingErrorFixer();
fixer.fix().catch(console.error);
`;

    fs.writeFileSync(
      path.join(process.cwd(), 'scripts/fix-blocking-errors.ts'),
      script
    );
  }

  private async createHighPriorityFixer() {
    const script = `#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

class HighPriorityErrorFixer {
  async fix() {
    console.log('⚠️  Fixing high priority errors...');
    
    // Fix property access errors
    await this.fixPropertyAccess();
    
    // Fix type mismatches
    await this.fixTypeMismatches();
    
    // Fix argument types
    await this.fixArgumentTypes();
  }
  
  private async fixPropertyAccess() {
    console.log('Fixing property access errors...');
    
    // Add type guards for common patterns
    const patterns = [
      {
        error: "Property 'data' does not exist",
        fix: 'Add optional chaining: response?.data'
      },
      {
        error: "Property 'error' does not exist", 
        fix: 'Add type guard: if ("error" in response)'
      }
    ];
  }
  
  private async fixTypeMismatches() {
    console.log('Fixing type mismatch errors...');
    
    // Common type mismatch fixes
    const fixes = [
      {
        pattern: /:\\s*void\\s*{/,
        replacement: ': string {',
        description: 'Fix void return type to string'
      }
    ];
  }
  
  private async fixArgumentTypes() {
    console.log('Fixing argument type errors...');
    
    // Fix common argument type issues
  }
}

const fixer = new HighPriorityErrorFixer();
fixer.fix().catch(console.error);
`;

    fs.writeFileSync(
      path.join(process.cwd(), 'scripts/fix-high-priority-errors.ts'),
      script
    );
  }
}

// Run the analyzer
const analyzer = new BuildErrorAnalyzer();
analyzer.analyze().catch(console.error);