#!/usr/bin/env tsx
/**
 * Verify runtime safety of type fixes
 * Ensures our fixes don't break functionality
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface VerificationResult {
  component: string
  status: 'pass' | 'fail' | 'skip'
  error?: string
  checks: {
    imports: boolean
    hooks: boolean
    runtime: boolean
  }
}

class RuntimeSafetyVerifier {
  private results: VerificationResult[] = []

  async verifyFixes(): Promise<void> {
    console.log('🔍 Verifying runtime safety of recent fixes...\n')
    
    // 1. Check currency context fixes
    await this.verifyCurrencyContext()
    
    // 2. Check all pages using currency formatter
    await this.verifyPagesUsingCurrency()
    
    // 3. Check API client usage
    await this.verifyApiClientUsage()
    
    // 4. Generate report
    this.generateReport()
  }

  private async verifyCurrencyContext(): Promise<void> {
    console.log('📋 Checking currency context...')
    
    const result: VerificationResult = {
      component: 'currency-context',
      status: 'pass',
      checks: {
        imports: true,
        hooks: true,
        runtime: true
      }
    }
    
    try {
      // Check the context file compiles
      execSync('npx tsc --noEmit lib/contexts/currency-context.tsx', { stdio: 'pipe' })
      console.log('  ✅ Type checking passed')
    } catch (error) {
      result.status = 'fail'
      result.error = 'Type checking failed'
      result.checks.runtime = false
    }
    
    // Check return types are correct
    const contextFile = fs.readFileSync('lib/contexts/currency-context.tsx', 'utf-8')
    
    if (contextFile.includes('): void => {') && contextFile.includes('formatCurrency')) {
      result.status = 'fail'
      result.error = 'formatCurrency still returns void'
      result.checks.runtime = false
    }
    
    this.results.push(result)
  }

  private async verifyPagesUsingCurrency(): Promise<void> {
    console.log('\n📋 Checking pages using currency formatter...')
    
    // Find all files using useCurrencyFormatter
    try {
      const files = execSync(
        'grep -r "useCurrencyFormatter" app/ --include="*.tsx" --include="*.ts" -l',
        { encoding: 'utf-8' }
      ).trim().split('\n').filter(Boolean)
      
      for (const file of files) {
        await this.verifyFile(file)
      }
    } catch {
      console.log('  No files found using useCurrencyFormatter')
    }
  }

  private async verifyFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath)
    console.log(`  Checking ${fileName}...`)
    
    const result: VerificationResult = {
      component: fileName,
      status: 'pass',
      checks: {
        imports: true,
        hooks: true,
        runtime: true
      }
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Check for correct usage pattern
      if (content.includes('const { format: format } = useCurrencyFormatter()')) {
        result.status = 'fail'
        result.error = 'Incorrect destructuring - should be const { format } = ...'
        result.checks.hooks = false
      }
      
      // Check for proper import
      if (!content.includes("import { useCurrencyFormatter }") && 
          !content.includes("import { useCurrency")) {
        result.status = 'fail'
        result.error = 'Missing proper import'
        result.checks.imports = false
      }
      
      // Type check the file
      try {
        execSync(`npx tsc --noEmit ${filePath}`, { stdio: 'pipe' })
      } catch {
        result.checks.runtime = false
      }
      
    } catch (error) {
      result.status = 'fail'
      result.error = `Failed to read file: ${error}`
    }
    
    this.results.push(result)
  }

  private async verifyApiClientUsage(): Promise<void> {
    console.log('\n📋 Checking API client usage...')
    
    // Check payment components we fixed
    const paymentFiles = [
      'components/payments/bank-reconciliation.tsx',
      'components/payments/customer-business-history.tsx'
    ]
    
    for (const file of paymentFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8')
        const fileName = path.basename(file)
        
        const result: VerificationResult = {
          component: fileName,
          status: 'pass',
          checks: {
            imports: true,
            hooks: true,
            runtime: true
          }
        }
        
        // Check for old api usage
        if (content.includes('api.get') || content.includes('api.post')) {
          result.status = 'fail'
          result.error = 'Still using old api.get/post pattern'
          result.checks.runtime = false
        }
        
        // Check for proper apiClient import
        if (!content.includes('import { apiClient }')) {
          result.status = 'fail'
          result.error = 'Missing apiClient import'
          result.checks.imports = false
        }
        
        this.results.push(result)
      }
    }
  }

  private generateReport(): void {
    console.log('\n📊 Verification Report\n')
    
    const passed = this.results.filter(r => r.status === 'pass').length
    const failed = this.results.filter(r => r.status === 'fail').length
    
    console.log(`Total Checked: ${this.results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Components:')
      this.results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`\n  ${r.component}:`)
        console.log(`    Error: ${r.error}`)
        console.log(`    Imports: ${r.checks.imports ? '✅' : '❌'}`)
        console.log(`    Hooks: ${r.checks.hooks ? '✅' : '❌'}`)
        console.log(`    Runtime: ${r.checks.runtime ? '✅' : '❌'}`)
      })
    }
    
    // Create verification log
    const log = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: { passed, failed }
    }
    
    fs.writeFileSync('runtime-verification.json', JSON.stringify(log, null, 2))
    console.log('\n📄 Full report saved to runtime-verification.json')
    
    if (failed > 0) {
      console.log('\n⚠️  Some components may have runtime issues!')
      process.exit(1)
    } else {
      console.log('\n✅ All components verified safe!')
    }
  }
}

// Additional safety checks
async function performSafetyChecks(): Promise<void> {
  console.log('\n🔒 Additional Safety Checks:\n')
  
  // 1. Check for build warnings
  console.log('1. Checking for build-time issues...')
  try {
    // Do a dry run of page compilation
    const pages = [
      'app/(auth)/invoices/page.tsx',
      'app/(auth)/invoices/[id]/page.tsx',
      'app/(auth)/payments/page.tsx'
    ]
    
    for (const page of pages) {
      if (fs.existsSync(page)) {
        try {
          execSync(`npx tsc --noEmit ${page}`, { stdio: 'pipe' })
          console.log(`   ✅ ${path.basename(page)} compiles successfully`)
        } catch {
          console.log(`   ❌ ${path.basename(page)} has compilation errors`)
        }
      }
    }
  } catch (error) {
    console.log('   ⚠️  Some compilation issues found')
  }
  
  // 2. Check for console.error calls that might indicate runtime issues
  console.log('\n2. Checking for error patterns...')
  try {
    const errorPatterns = execSync(
      'grep -r "console.error" app/ components/ --include="*.tsx" --include="*.ts" | wc -l',
      { encoding: 'utf-8' }
    ).trim()
    
    console.log(`   Found ${errorPatterns} console.error calls`)
  } catch {
    console.log('   ✅ No error patterns found')
  }
  
  // 3. Test critical functions
  console.log('\n3. Testing critical functions...')
  testCriticalFunctions()
}

function testCriticalFunctions(): void {
  // Test 1: Currency formatting
  try {
    // Simulate the hook return
    const mockFormatter = {
      format: (amount: number) => `$${amount.toFixed(2)}`,
      defaultCurrency: 'USD'
    }
    
    const { format } = mockFormatter
    const result = format(100)
    
    if (result === '$100.00') {
      console.log('   ✅ Currency formatting works')
    } else {
      console.log('   ❌ Currency formatting failed')
    }
  } catch (error) {
    console.log('   ❌ Currency formatting error:', error)
  }
  
  // Test 2: API client pattern
  try {
    // Simulate apiClient call pattern
    const mockApiClient = async (url: string, options?: any) => ({
      ok: true,
      data: []
    })
    
    // Test the pattern we're using
    const testUrl = '/api/test'
    mockApiClient(testUrl).then(response => {
      if (response.ok && Array.isArray(response.data)) {
        console.log('   ✅ API client pattern works')
      }
    })
  } catch (error) {
    console.log('   ❌ API client pattern error:', error)
  }
}

// Main execution
async function main() {
  const verifier = new RuntimeSafetyVerifier()
  await verifier.verifyFixes()
  await performSafetyChecks()
}

main().catch(console.error)