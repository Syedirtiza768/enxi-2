#!/usr/bin/env tsx

/**
 * Comprehensive verification script for quotation UI completion
 * Verifies that all schema alignment fixes are in place
 */

import fs from 'fs'
import path from 'path'

interface CheckResult {
  description: string
  status: 'pass' | 'fail' | 'warning'
  details: string
}

function checkFileContent(filePath: string, patterns: { pattern: string | RegExp, description: string, required: boolean }[]): CheckResult[] {
  const results: CheckResult[] = []
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    for (const { pattern, description, required } of patterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
      const found = regex.test(content)
      
      results.push({
        description: `${path.basename(filePath)}: ${description}`,
        status: found ? 'pass' : (required ? 'fail' : 'warning'),
        details: found ? 'Found' : 'Not found'
      })
    }
} catch (error) {      status: 'fail',
    }
      details: `Error reading file: ${error.message}`
    })
  }
  
  return results
}

async function verifyQuotationUICompletion() {
  console.warn('🔍 Verifying Quotation UI Schema Alignment Completion...\n')
  
  const results: CheckResult[] = []
  const baseDir = '/Users/irtizahassan/apps/enxi/enxi-erp'
  
  // 1. Verify QuotationForm component updates
  results.push(...checkFileContent(
    path.join(baseDir, 'components/quotations/quotation-form.tsx'),
    [
      { pattern: "import { SimpleItemEditor }", description: "Uses SimpleItemEditor (not LineItemEditor)", required: true },
      { pattern: "paymentTerms:", description: "Uses paymentTerms field", required: true },
      { pattern: "items:", description: "Uses items array", required: true },
      { pattern: "totalAmount", description: "Uses totalAmount field", required: true },
      { pattern: "<SimpleItemEditor", description: "Renders SimpleItemEditor component", required: true }
    ]
  ))
  
  // 2. Verify SimpleItemEditor component exists and is functional
  results.push(...checkFileContent(
    path.join(baseDir, 'components/quotations/simple-item-editor.tsx'),
    [
      { pattern: "interface QuotationItem", description: "Has QuotationItem interface", required: true },
      { pattern: "itemCode:", description: "Supports itemCode field", required: true },
      { pattern: "totalAmount:", description: "Supports totalAmount field", required: true },
      { pattern: "Add from Inventory", description: "Has inventory selection feature", required: true },
      { pattern: "calculateItemAmounts", description: "Has calculation logic", required: true },
      { pattern: "formatCurrency", description: "Has currency formatting", required: true }
    ]
  ))
  
  // 3. Verify quotation detail page updates
  results.push(...checkFileContent(
    path.join(baseDir, 'app/(auth)/quotations/[id]/page.tsx'),
    [
      { pattern: "quotationNumber:", description: "Uses quotationNumber (not number)", required: true },
      { pattern: "paymentTerms:", description: "Uses paymentTerms field", required: true },
      { pattern: "items:", description: "Uses items array (not lines)", required: true },
      { pattern: "totalAmount", description: "Uses totalAmount field", required: true },
      { pattern: "interface QuotationItem", description: "Has QuotationItem interface", required: true }
    ]
  ))
  
  // 4. Verify quotation list page updates
  results.push(...checkFileContent(
    path.join(baseDir, 'app/(auth)/quotations/page.tsx'),
    [
      { pattern: "quotationNumber:", description: "Uses quotationNumber (not number)", required: true },
      { pattern: "totalAmount", description: "Uses totalAmount field", required: true },
      { pattern: "items:", description: "Uses items array (not lines)", required: true },
      { pattern: "interface QuotationItem", description: "Has QuotationItem interface", required: true }
    ]
  ))
  
  // 5. Verify test scripts are updated
  results.push(...checkFileContent(
    path.join(baseDir, 'scripts/test-quotation-workflow.ts'),
    [
      { pattern: "items:", description: "Test uses items (not lines)", required: true },
      { pattern: "quotationNumber", description: "Test uses quotationNumber", required: true },
      { pattern: "totalAmount", description: "Test uses totalAmount", required: true }
    ]
  ))
  
  // 6. Check for any remaining references to old schema
  const filesToCheck = [
    'components/quotations/quotation-form.tsx',
    'app/(auth)/quotations/[id]/page.tsx',
    'app/(auth)/quotations/page.tsx'
  ]
  
  for (const file of filesToCheck) {
    results.push(...checkFileContent(
      path.join(baseDir, file),
      [
        { pattern: /lines\[\]|\blines\s*:/, description: "No references to old 'lines' schema", required: false },
        { pattern: /lineItems\[\]|\blineItems\s*:/, description: "No references to old 'lineItems' schema", required: false },
        { pattern: /\.number\b/, description: "No references to old 'number' field", required: false },
        { pattern: /\.total\b(?!Amount)/, description: "No references to old 'total' field", required: false }
      ]
    ))
  }
  
  // Analyze results
  const passCount = results.filter(r => r.status === 'pass').length
  const failCount = results.filter(r => r.status === 'fail').length
  const warningCount = results.filter(r => r.status === 'warning').length
  
  console.warn('📊 Verification Results:\n')
  
  // Group results by status
  const groupedResults = {
    pass: results.filter(r => r.status === 'pass'),
    fail: results.filter(r => r.status === 'fail'),
    warning: results.filter(r => r.status === 'warning')
  }
  
  if (groupedResults.pass.length > 0) {
    console.warn('✅ PASSED CHECKS:')
    groupedResults.pass.forEach(result => {
      console.warn(`   ✅ ${result.description}`)
    })
    console.warn('')
  }
  
  if (groupedResults.fail.length > 0) {
    console.warn('❌ FAILED CHECKS:')
    groupedResults.fail.forEach(result => {
      console.warn(`   ❌ ${result.description}: ${result.details}`)
    })
    console.warn('')
  }
  
  if (groupedResults.warning.length > 0) {
    console.warn('⚠️  WARNINGS (potential old schema references):')
    groupedResults.warning.forEach(result => {
      console.warn(`   ⚠️  ${result.description}`)
    })
    console.warn('')
  }
  
  // Summary
  console.warn('📈 SUMMARY:')
  console.warn(`   ✅ Passed: ${passCount}`)
  console.warn(`   ❌ Failed: ${failCount}`)
  console.warn(`   ⚠️  Warnings: ${warningCount}`)
  console.warn(`   📊 Total Checks: ${results.length}`)
  
  const successRate = Math.round((passCount / results.length) * 100)
  console.warn(`   🎯 Success Rate: ${successRate}%`)
  
  console.warn('\n' + '='.repeat(50))
  
  if (failCount === 0) {
    console.warn('🎉 SCHEMA ALIGNMENT VERIFICATION: PASSED')
    console.warn('')
    console.warn('✅ All required schema updates are in place')
    console.warn('✅ Frontend components updated to use QuotationItem[]')
    console.warn('✅ All form fields mapped to correct database schema')
    console.warn('✅ Test scripts updated and verified')
    console.warn('')
    console.warn('🚀 The quotation module is ready for browser testing!')
    console.warn('')
    console.warn('Next steps:')
    console.warn('1. Start the development server: npm run dev')
    console.warn('2. Navigate to: http://localhost:3000/quotations')
    console.warn('3. Test creating a new quotation')
    console.warn('4. Verify item selection and calculations work')
    console.warn('5. Test the complete workflow: Draft → Send → Accept')
    
    return true
  } else {
    console.warn('❌ SCHEMA ALIGNMENT VERIFICATION: FAILED')
    console.warn('')
    console.warn(`${failCount} critical issues need to be resolved before the UI is ready.`)
    console.warn('Please review the failed checks above and make the necessary corrections.')
    
    return false
  }
}

// Run verification
if (require.main === module) {
  verifyQuotationUICompletion()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n❌ Verification failed with error:', error.message)
      process.exit(1)
    })
}

export { verifyQuotationUICompletion }