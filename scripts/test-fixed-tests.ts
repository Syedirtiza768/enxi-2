#!/usr/bin/env ts-node

import { execSync } from 'child_process'

interface TestResult {
  test: string
  status: 'passed' | 'failed' | 'error'
  error?: string
}

const testsToRun = [
  {
    name: 'Auth Service Tests',
    path: 'tests/unit/services/auth.service.test.ts'
  },
  {
    name: 'Financial Statements Date Validation',
    path: 'tests/unit/accounting/financial-statements.test.ts',
    testName: 'should validate that fromDate is before toDate'
  },
  {
    name: 'End-to-End P2P Workflow',
    path: 'tests/integration/end-to-end-p2p-workflow.test.ts',
    testName: 'should complete full procurement-to-pay cycle successfully'
  }
]

async function runTest(test: typeof testsToRun[0]): Promise<TestResult> {
  try {
    const testCommand = test.testName 
      ? `npm test -- ${test.path} --testNamePattern="${test.testName}" --silent`
      : `npm test -- ${test.path} --silent`
    
    console.log(`\n🧪 Running ${test.name}...`)
    
    execSync(testCommand, { stdio: 'inherit' })
    
    return {
      test: test.name,
      status: 'passed'
    }
  } catch (error) {
    return {
      test: test.name,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function main(): Promise<void> {
  console.log('🔧 Running Fixed Tests\n')
  console.log('This script will test the specific fixes applied to the test suite.\n')

  const results: TestResult[] = []

  for (const test of testsToRun) {
    const result = await runTest(test)
    results.push(result)
  }

  console.log('\n\n📊 Test Results Summary:')
  console.log('========================')
  
  const passed = results.filter(r => r.status === 'passed').length
  const failed = results.filter(r => r.status === 'failed').length
  
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌'
    console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  console.log('\n------------------------')
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests are still failing. Additional fixes may be needed.')
    process.exit(1)
  } else {
    console.log('\n✨ All tested fixes are working correctly!')
  }
}

main().catch(console.error)