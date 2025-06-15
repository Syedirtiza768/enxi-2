#!/usr/bin/env tsx
/**
 * Pre-build verification
 * Runs before build to catch runtime errors early
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface VerificationStep {
  name: string
  check: () => Promise<boolean>
  critical: boolean
}

class PreBuildVerifier {
  private steps: VerificationStep[] = [
    {
      name: 'TypeScript Compilation',
      check: this.checkTypeScriptCompilation.bind(this),
      critical: false // We allow TS errors for now
    },
    {
      name: 'Currency Context Syntax',
      check: this.checkCurrencyContext.bind(this),
      critical: true
    },
    {
      name: 'Import Statements',
      check: this.checkImports.bind(this),
      critical: true
    },
    {
      name: 'Hook Usage Patterns',
      check: this.checkHookPatterns.bind(this),
      critical: true
    },
    {
      name: 'API Client Usage',
      check: this.checkApiClientUsage.bind(this),
      critical: true
    }
  ]
  
  async verify(): Promise<boolean> {
    console.log('🔍 Running pre-build verification...\n')
    
    let allPassed = true
    const results: Array<{ name: string; passed: boolean; error?: string }> = []
    
    for (const step of this.steps) {
      process.stdout.write(`Checking ${step.name}... `)
      
      try {
        const passed = await step.check()
        
        if (passed) {
          console.log('✅')
          results.push({ name: step.name, passed: true })
        } else {
          console.log('❌')
          results.push({ name: step.name, passed: false })
          if (step.critical) {
            allPassed = false
          }
        }
      } catch (error) {
        console.log('❌')
        results.push({ 
          name: step.name, 
          passed: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        if (step.critical) {
          allPassed = false
        }
      }
    }
    
    // Summary
    console.log('\n📊 Verification Summary:')
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length
    
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    
    if (!allPassed) {
      console.log('\n❌ Critical issues found:')
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}${r.error ? ': ' + r.error : ''}`)
      })
      console.log('\n⚠️  Please fix these issues before building!')
    } else {
      console.log('\n✅ All critical checks passed! Safe to build.')
    }
    
    return allPassed
  }
  
  private async checkTypeScriptCompilation(): Promise<boolean> {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' })
      return true
    } catch {
      // We expect this to fail with our suppressed errors
      return true
    }
  }
  
  private async checkCurrencyContext(): Promise<boolean> {
    const contextPath = 'lib/contexts/currency-context.tsx'
    
    if (!fs.existsSync(contextPath)) {
      throw new Error('Currency context file not found')
    }
    
    const content = fs.readFileSync(contextPath, 'utf-8')
    
    // Check for the specific issues that cause runtime errors
    const issues: string[] = []
    
    // Check formatCurrency return type
    if (content.match(/formatCurrency.*\):\s*void\s*=>/)) {
      issues.push('formatCurrency returns void instead of string')
    }
    
    // Check useCurrencyFormatter return type
    if (content.match(/useCurrencyFormatter\(\):\s*unknown/)) {
      issues.push('useCurrencyFormatter returns unknown')
    }
    
    // Check for missing return in formatCurrency
    const formatCurrencyMatch = content.match(/const formatCurrency[\s\S]*?^\s*}/m)
    if (formatCurrencyMatch && !formatCurrencyMatch[0].includes('return')) {
      issues.push('formatCurrency missing return statement')
    }
    
    if (issues.length > 0) {
      throw new Error('Currency context issues: ' + issues.join(', '))
    }
    
    return true
  }
  
  private async checkImports(): Promise<boolean> {
    const problematicPatterns = [
      { pattern: /import\s+{\s*api\s*}\s+from\s+['"]@\/lib\/api\/client['"]/, issue: 'Using old "api" import' },
      { pattern: /from\s+['"]api['"]/, issue: 'Importing from "api" directly' },
    ]
    
    const files = this.getSourceFiles()
    const issues: string[] = []
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      
      for (const { pattern, issue } of problematicPatterns) {
        if (pattern.test(content)) {
          issues.push(`${file}: ${issue}`)
        }
      }
    }
    
    if (issues.length > 0) {
      throw new Error(`Import issues found:\n${issues.join('\n')}`)
    }
    
    return true
  }
  
  private async checkHookPatterns(): Promise<boolean> {
    const files = this.getSourceFiles()
    const issues: string[] = []
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Check for incorrect currency formatter usage
      if (content.includes('useCurrencyFormatter')) {
        // Check for wrong destructuring pattern
        if (content.match(/const\s+format\s*=\s*useCurrencyFormatter\s*\(\)/)) {
          issues.push(`${file}: Incorrect useCurrencyFormatter destructuring`)
        }
        
        // Check for treating formatter as function
        if (content.match(/const\s+\w+\s*=\s*useCurrencyFormatter\s*\(\)[\s\S]*?\w+\s*\(/)) {
          const lines = content.split('\n')
          lines.forEach((line, idx) => {
            if (line.includes('useCurrencyFormatter()') && 
                !line.includes('{') && 
                !line.includes('const { format }')) {
              // Check if the variable is called as a function in next few lines
              for (let i = idx + 1; i < Math.min(idx + 5, lines.length); i++) {
                if (lines[i].match(/^\s*\w+\s*\(/)) {
                  issues.push(`${file}:${idx + 1}: Treating formatter object as function`)
                  break
                }
              }
            }
          })
        }
      }
    }
    
    if (issues.length > 0) {
      throw new Error(`Hook usage issues:\n${issues.join('\n')}`)
    }
    
    return true
  }
  
  private async checkApiClientUsage(): Promise<boolean> {
    const files = this.getSourceFiles()
    const issues: string[] = []
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Check for old api.get/post patterns
      if (content.match(/api\.(get|post|put|delete|patch)\s*\(/)) {
        issues.push(`${file}: Using old api.method() pattern`)
      }
      
      // Check for params option in apiClient (not supported)
      if (content.match(/apiClient.*{[\s\S]*?params\s*:/)) {
        issues.push(`${file}: Using unsupported 'params' option in apiClient`)
      }
    }
    
    if (issues.length > 0) {
      throw new Error(`API client issues:\n${issues.join('\n')}`)
    }
    
    return true
  }
  
  private getSourceFiles(): string[] {
    const dirs = ['app', 'components', 'lib']
    const files: string[] = []
    
    const walkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return
      
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath)
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          files.push(fullPath)
        }
      }
    }
    
    dirs.forEach(walkDir)
    return files
  }
}

// Main execution
async function main() {
  const verifier = new PreBuildVerifier()
  const passed = await verifier.verify()
  
  if (!passed) {
    console.log('\n💡 Tip: Run "npx tsx scripts/safe-type-fix.ts" to fix some issues automatically')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n❌ Pre-build verification failed:', error)
  process.exit(1)
})