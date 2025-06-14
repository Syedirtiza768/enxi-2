#!/usr/bin/env ts-node
/**
 * Functionality Verification Script
 * Systematically tests all critical features of Enxi ERP
 */

import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api'

interface TestResult {
  module: string
  feature: string
  status: 'pass' | 'fail' | 'skip'
  error?: string
  duration?: number
}

const results: TestResult[] = []

/**
 * Test utilities
 */
async function testEndpoint(
  method: string,
  endpoint: string,
  data?: any,
  expectedStatus = 200
): Promise<boolean> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      validateStatus: () => true, // Don't throw on any status
    })
    
    return response.status === expectedStatus
  } catch (error) {
    console.error(`Failed to test ${method} ${endpoint}:`, error.message)
    return false
  }
}

/**
 * Module Tests
 */

// 1. Authentication Module
async function testAuthModule() {
  const module = 'Authentication'
  
  // Test login endpoint exists
  await testFeature(module, 'Login Endpoint', async () => {
    return await testEndpoint('POST', '/auth/login', {
      email: 'test@example.com',
      password: 'password',
    }, 401) // Expect 401 for invalid credentials
  })
  
  // Test session management
  await testFeature(module, 'Session Check', async () => {
    return await testEndpoint('GET', '/auth/session', null, 401)
  })
}

// 2. Inventory Module
async function testInventoryModule() {
  const module = 'Inventory'
  
  // Test item CRUD
  await testFeature(module, 'List Items', async () => {
    return await testEndpoint('GET', '/inventory/items')
  })
  
  await testFeature(module, 'Create Item', async () => {
    return await testEndpoint('POST', '/inventory/items', {
      name: 'Test Item',
      sku: 'TEST-001',
      categoryId: '1',
    }, 201)
  })
  
  // Test stock movements
  await testFeature(module, 'Stock Movements', async () => {
    return await testEndpoint('GET', '/stock-movements')
  })
  
  // Test low stock alerts
  await testFeature(module, 'Low Stock Check', async () => {
    return await testEndpoint('GET', '/inventory/low-stock')
  })
}

// 3. Sales Module
async function testSalesModule() {
  const module = 'Sales'
  
  // Test quotations
  await testFeature(module, 'List Quotations', async () => {
    return await testEndpoint('GET', '/quotations')
  })
  
  await testFeature(module, 'Create Quotation', async () => {
    return await testEndpoint('POST', '/quotations', {
      customerId: '1',
      items: [],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }, 201)
  })
  
  // Test sales orders
  await testFeature(module, 'List Sales Orders', async () => {
    return await testEndpoint('GET', '/sales-orders')
  })
  
  // Test invoices
  await testFeature(module, 'List Invoices', async () => {
    return await testEndpoint('GET', '/invoices')
  })
}

// 4. Purchasing Module
async function testPurchasingModule() {
  const module = 'Purchasing'
  
  // Test purchase orders
  await testFeature(module, 'List Purchase Orders', async () => {
    return await testEndpoint('GET', '/purchase-orders')
  })
  
  // Test supplier invoices
  await testFeature(module, 'List Supplier Invoices', async () => {
    return await testEndpoint('GET', '/supplier-invoices')
  })
  
  // Test goods receipts
  await testFeature(module, 'List Goods Receipts', async () => {
    return await testEndpoint('GET', '/goods-receipts')
  })
}

// 5. Accounting Module
async function testAccountingModule() {
  const module = 'Accounting'
  
  // Test chart of accounts
  await testFeature(module, 'List Accounts', async () => {
    return await testEndpoint('GET', '/accounting/accounts')
  })
  
  // Test journal entries
  await testFeature(module, 'List Journal Entries', async () => {
    return await testEndpoint('GET', '/accounting/journal-entries')
  })
  
  // Test financial reports
  await testFeature(module, 'Trial Balance', async () => {
    return await testEndpoint('GET', '/accounting/reports/trial-balance')
  })
  
  await testFeature(module, 'Balance Sheet', async () => {
    return await testEndpoint('GET', '/accounting/reports/balance-sheet')
  })
  
  await testFeature(module, 'Income Statement', async () => {
    return await testEndpoint('GET', '/accounting/reports/income-statement')
  })
}

// 6. Database Connectivity
async function testDatabaseConnectivity() {
  const module = 'Database'
  
  await testFeature(module, 'Prisma Connection', async () => {
    try {
      await prisma.$connect()
      await prisma.$disconnect()
      return true
    } catch {
      return false
    }
  })
  
  await testFeature(module, 'Schema Validation', async () => {
    try {
      // Test a simple query
      await prisma.user.count()
      return true
    } catch {
      return false
    }
  })
}

// 7. Critical Business Flows
async function testCriticalFlows() {
  const module = 'Business Flows'
  
  // Quote to Cash flow
  await testFeature(module, 'Quote-to-Cash Flow', async () => {
    // This would test the entire flow from quotation to payment
    // For now, just check if the endpoints exist
    const endpoints = [
      '/quotations',
      '/sales-orders',
      '/invoices',
      '/payments',
    ]
    
    for (const endpoint of endpoints) {
      const exists = await testEndpoint('GET', endpoint)
      if (!exists) return false
    }
    return true
  })
  
  // Procure to Pay flow
  await testFeature(module, 'Procure-to-Pay Flow', async () => {
    const endpoints = [
      '/purchase-orders',
      '/goods-receipts',
      '/supplier-invoices',
      '/supplier-payments',
    ]
    
    for (const endpoint of endpoints) {
      const exists = await testEndpoint('GET', endpoint)
      if (!exists) return false
    }
    return true
  })
}

/**
 * Test runner utility
 */
async function testFeature(
  module: string,
  feature: string,
  testFn: () => Promise<boolean>
) {
  const startTime = Date.now()
  const result: TestResult = {
    module,
    feature,
    status: 'skip',
  }
  
  try {
    console.log(`Testing ${module} - ${feature}...`)
    const success = await testFn()
    result.status = success ? 'pass' : 'fail'
    result.duration = Date.now() - startTime
    
    if (!success) {
      result.error = 'Test returned false'
    }
  } catch (error) {
    result.status = 'fail'
    result.error = error.message
    result.duration = Date.now() - startTime
  }
  
  results.push(result)
  
  // Print immediate feedback
  const icon = result.status === 'pass' ? '✅' : '❌'
  console.log(`${icon} ${module} - ${feature} (${result.duration}ms)`)
  if (result.error) {
    console.log(`   Error: ${result.error}`)
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n📊 Functionality Verification Report')
  console.log('===================================\n')
  
  // Group by module
  const moduleResults = results.reduce((acc, result) => {
    if (!acc[result.module]) {
      acc[result.module] = []
    }
    acc[result.module].push(result)
    return acc
  }, {} as Record<string, TestResult[]>)
  
  // Summary
  const totalTests = results.length
  const passedTests = results.filter(r => r.status === 'pass').length
  const failedTests = results.filter(r => r.status === 'fail').length
  const skippedTests = results.filter(r => r.status === 'skip').length
  
  console.log('Summary:')
  console.log(`- Total Tests: ${totalTests}`)
  console.log(`- Passed: ${passedTests} (${Math.round(passedTests / totalTests * 100)}%)`)
  console.log(`- Failed: ${failedTests} (${Math.round(failedTests / totalTests * 100)}%)`)
  console.log(`- Skipped: ${skippedTests}`)
  console.log('')
  
  // Module breakdown
  console.log('Module Breakdown:')
  for (const [module, tests] of Object.entries(moduleResults)) {
    const passed = tests.filter(t => t.status === 'pass').length
    const total = tests.length
    const percentage = Math.round(passed / total * 100)
    
    console.log(`\n${module}: ${passed}/${total} (${percentage}%)`)
    
    // Show failed tests
    const failed = tests.filter(t => t.status === 'fail')
    if (failed.length > 0) {
      console.log('  Failed:')
      failed.forEach(test => {
        console.log(`    - ${test.feature}: ${test.error}`)
      })
    }
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      successRate: Math.round(passedTests / totalTests * 100),
    },
    modules: moduleResults,
    details: results,
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'functionality-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log('\n📄 Detailed report saved to: functionality-report.json')
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0)
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Starting Functionality Verification...\n')
  
  try {
    // Test all modules
    await testDatabaseConnectivity()
    await testAuthModule()
    await testInventoryModule()
    await testSalesModule()
    await testPurchasingModule()
    await testAccountingModule()
    await testCriticalFlows()
    
    // Generate report
    generateReport()
  } catch (error) {
    console.error('Fatal error during testing:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}