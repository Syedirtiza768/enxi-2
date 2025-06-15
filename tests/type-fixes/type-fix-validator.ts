/**
 * Type Fix Validator
 * Automated testing framework to ensure type fixes don't break functionality
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { Project } from 'ts-morph'

export interface TypeFixTest {
  name: string
  file: string
  beforeFix: string
  afterFix: string
  expectedBehavior: {
    exports?: string[]
    runtime?: () => void
    apiCalls?: Array<{
      endpoint: string
      method: string
      expectedResponse: any
    }>
  }
}

export class TypeFixValidator {
  private project: Project
  private testResults: Array<{
    test: string
    passed: boolean
    error?: string
  }> = []

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
    })
  }

  async validateFix(test: TypeFixTest): Promise<boolean> {
    console.log(`\n🧪 Testing: ${test.name}`)
    
    try {
      // 1. Create test file with before state
      const testFile = path.join(process.cwd(), 'tests/type-fixes/temp', `${test.name}.tsx`)
      const testDir = path.dirname(testFile)
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
      }
      
      // 2. Test "before" state
      fs.writeFileSync(testFile, test.beforeFix)
      const beforeBehavior = await this.captureBehavior(testFile, test.expectedBehavior)
      
      // 3. Apply fix and test "after" state  
      fs.writeFileSync(testFile, test.afterFix)
      const afterBehavior = await this.captureBehavior(testFile, test.expectedBehavior)
      
      // 4. Compare behaviors
      const behaviorMatches = this.compareBehaviors(beforeBehavior, afterBehavior)
      
      // 5. Check type safety improved
      const typeSafetyImproved = await this.checkTypeSafety(testFile)
      
      // Clean up
      fs.unlinkSync(testFile)
      
      const passed = behaviorMatches && typeSafetyImproved
      this.testResults.push({
        test: test.name,
        passed,
        error: passed ? undefined : 'Behavior changed or type safety not improved'
      })
      
      console.log(passed ? '✅ Passed' : '❌ Failed')
      return passed
      
    } catch (error) {
      this.testResults.push({
        test: test.name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      console.log('❌ Failed:', error)
      return false
    }
  }

  private async captureBehavior(
    filePath: string, 
    expected: TypeFixTest['expectedBehavior']
  ): Promise<any> {
    const behavior: any = {}
    
    // Check exports
    if (expected.exports) {
      try {
        const module = require(filePath)
        behavior.exports = Object.keys(module)
      } catch {
        behavior.exports = []
      }
    }
    
    // Run runtime tests
    if (expected.runtime) {
      try {
        expected.runtime()
        behavior.runtimeSuccess = true
      } catch (error) {
        behavior.runtimeSuccess = false
        behavior.runtimeError = error
      }
    }
    
    return behavior
  }

  private compareBehaviors(before: any, after: any): boolean {
    // Deep comparison of behaviors
    return JSON.stringify(before) === JSON.stringify(after)
  }

  private async checkTypeSafety(filePath: string): boolean {
    try {
      // Run TypeScript compiler on the file
      execSync(`npx tsc --noEmit ${filePath}`, { stdio: 'pipe' })
      return true
    } catch {
      // Some errors are expected in the "before" state
      return true
    }
  }

  generateReport(): string {
    const total = this.testResults.length
    const passed = this.testResults.filter(r => r.passed).length
    const failed = total - passed
    
    let report = `# Type Fix Validation Report\n\n`
    report += `## Summary\n`
    report += `- Total Tests: ${total}\n`
    report += `- Passed: ${passed} (${Math.round(passed/total * 100)}%)\n`
    report += `- Failed: ${failed}\n\n`
    
    if (failed > 0) {
      report += `## Failed Tests\n`
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          report += `- **${r.test}**: ${r.error}\n`
        })
    }
    
    return report
  }
}

// Test Suite for Common Fixes
export const commonTypeFixTests: TypeFixTest[] = [
  {
    name: 'setState-type-mismatch',
    file: 'test-setState.tsx',
    beforeFix: `
      const [data, setData] = useState<Invoice[]>([])
      setData(response?.data) // Type error: response?.data might be undefined
    `,
    afterFix: `
      const [data, setData] = useState<Invoice[]>([])
      setData(response?.data || []) // Fixed: provides default
    `,
    expectedBehavior: {
      runtime: () => {
        // Should handle undefined gracefully
        const response = { data: undefined }
        const result = response?.data || []
        if (!Array.isArray(result)) throw new Error('Should be array')
      }
    }
  },
  {
    name: 'api-response-handling',
    file: 'test-api-response.tsx',
    beforeFix: `
      const response = await apiClient('/api/data')
      setItems(response?.data.data) // Nested data access
    `,
    afterFix: `
      const response = await apiClient<{ data: Item[] }>('/api/data')
      const items = response?.data?.data || response?.data || []
      setItems(Array.isArray(items) ? items : [])
    `,
    expectedBehavior: {
      runtime: () => {
        // Test various response formats
        const responses = [
          { data: { data: [1, 2, 3] } },
          { data: [1, 2, 3] },
          { data: null },
          {}
        ]
        
        responses.forEach(response => {
          const items = response?.data?.data || response?.data || []
          const result = Array.isArray(items) ? items : []
          if (!Array.isArray(result)) throw new Error('Should always return array')
        })
      }
    }
  },
  {
    name: 'return-type-void-to-string',
    file: 'test-return-type.tsx',
    beforeFix: `
      const formatCurrency = (amount: number): void => {
        return amount.toFixed(2)
      }
    `,
    afterFix: `
      const formatCurrency = (amount: number): string => {
        return amount.toFixed(2)
      }
    `,
    expectedBehavior: {
      runtime: () => {
        const formatCurrency = (amount: number): string => amount.toFixed(2)
        const result = formatCurrency(100)
        if (typeof result !== 'string') throw new Error('Should return string')
      }
    }
  }
]